// Mediciones del prototipo para el informe. Uso: node scripts/bench.mjs
import { startAll } from '../src/main.js';
import { callJson, sleep } from '../src/shared/http.js';

const now = () => performance.now();
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const sys = await startAll({ gatewayPort: 0, gatewayOptions: { rateLimit: { capacity: 1000, refillPerSec: 1000 } } });
const base = sys.gateway.url;
const post = (p, body) => callJson(`${base}/api${p}`, { method: 'POST', body });
const order = (productId = 'guitarra') => post('/orders', { customer: 'bench', items: [{ productId, qty: 1 }] });
async function settle(ids) {
  const t = now();
  for (;;) {
    const all = await callJson(`${base}/api/orders`);
    const os = all.filter((o) => ids.includes(o.id));
    if (os.length === ids.length && os.every((o) => ['CONFIRMED', 'CANCELLED'].includes(o.status))) return { ms: now() - t, os };
    await sleep(15);
  }
}

// 1. Cache-Aside
let t = now(); await callJson(`${base}/api/products`); const miss = now() - t;
const hits = [];
for (let i = 0; i < 30; i++) { t = now(); await callJson(`${base}/api/products`); hits.push(now() - t); }
console.log(`Cache-Aside  lectura sin caché: ${miss.toFixed(1)} ms | mediana con caché (n=30): ${median(hits).toFixed(1)} ms`);

// 2. Cola: 40 pedidos en ráfaga
const accept = []; const ids = []; const t0 = now();
await Promise.all(Array.from({ length: 40 }, async () => { const s = now(); const r = await order(); accept.push(now() - s); ids.push(r.id); }));
const burst = now() - t0;
const { ms } = await settle(ids);
console.log(`Cola         40 pedidos aceptados en ${burst.toFixed(0)} ms (mediana de aceptación ${median(accept).toFixed(1)} ms); procesados por completo en ${(burst + ms).toFixed(0)} ms`);

// 3. Circuit Breaker
await post('/admin/chaos', { failureRate: 1 });
const lat = [];
for (let i = 0; i < 6; i++) { const r = await order('violin'); const s = await settle([r.id]); lat.push({ ms: s.ms, reason: s.os[0].reason, breaker: sys.orders.breaker.state }); }
for (const [i, l] of lat.entries()) console.log(`Breaker      pedido ${i + 1}: cancelado en ${l.ms.toFixed(0)} ms, circuito ${l.breaker}, razón: ${l.reason}`);
await post('/admin/chaos', { failureRate: 0 });
await sleep(5200);
const r = await order('violin'); const s = await settle([r.id]);
console.log(`Recuperación tras 5 s: estado ${s.os[0].status}, circuito ${sys.orders.breaker.state}`);
const stock = await callJson(`${base}/api/products/violin`);
console.log(`Inventario violín tras compensaciones: ${stock.stock} (inicial 25, 1 vendido)`);
await sys.close();
