import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startAll } from '../src/main.js';
import { callJson, sleep } from '../src/shared/http.js';

let sys;
let base;

before(async () => {
  sys = await startAll({
    gatewayPort: 0,
    catalogOptions: { dbLatencyMs: 5 },
    paymentsOptions: { latencyMs: 5 },
    ordersOptions: { retryOptions: { retries: 1, baseMs: 5 }, breakerOptions: { failureThreshold: 3, resetTimeoutMs: 200 } },
  });
  base = sys.gateway.url;
});
after(() => sys.close());

async function waitFor(id, statuses) {
  for (let i = 0; i < 100; i++) {
    const o = await callJson(`${base}/api/orders/${id}`);
    if (statuses.includes(o.status)) return o;
    await sleep(20);
  }
  throw new Error('timeout esperando estado');
}

const createOrder = (productId, qty = 1) => callJson(`${base}/api/orders`, { method: 'POST', body: { customer: 'test', items: [{ productId, qty }] } });
const stockOf = async (id) => (await callJson(`${base}/api/products/${id}`)).stock;

test('el gateway agrega la salud de los tres servicios', async () => {
  const h = await callJson(`${base}/api/health`);
  assert.equal(h.status, 'UP');
  assert.equal(h.services.length, 3);
});

test('saga exitosa: el pedido se acepta con 202 y termina CONFIRMED descontando stock', async () => {
  const before = await stockOf('guitarra');
  const accepted = await createOrder('guitarra', 2);
  assert.equal(accepted.status, 'PENDING');
  const order = await waitFor(accepted.id, ['CONFIRMED', 'CANCELLED']);
  assert.equal(order.status, 'CONFIRMED');
  assert.equal(order.total, 1700000);
  await sleep(10);
  assert.equal((await stockOf('guitarra')), before - 2);
});

test('saga con compensación: stock insuficiente cancela el pedido sin alterar el inventario', async () => {
  const before = await stockOf('bateria');
  const accepted = await createOrder('bateria', 999);
  const order = await waitFor(accepted.id, ['CONFIRMED', 'CANCELLED']);
  assert.equal(order.status, 'CANCELLED');
  assert.equal(order.reason, 'insufficient-stock');
  assert.equal(await stockOf('bateria'), before);
});

test('pago rechazado (402) cancela y libera el stock reservado', async () => {
  const before = await stockOf('bateria');
  const accepted = await createOrder('bateria', 2); // 6.400.000 COP > límite de pagos
  const order = await waitFor(accepted.id, ['CONFIRMED', 'CANCELLED']);
  assert.equal(order.status, 'CANCELLED');
  assert.equal(order.reason, 'payment-declined');
  assert.equal(await stockOf('bateria'), before);
});

test('caída de pagos: abre el Circuit Breaker, cancela con compensación y se recupera', async () => {
  await callJson(`${base}/api/admin/chaos`, { method: 'POST', body: { failureRate: 1 } });
  const before = await stockOf('violin');
  const ids = [];
  for (let i = 0; i < 4; i++) ids.push((await createOrder('violin')).id);
  const orders = await Promise.all(ids.map((id) => waitFor(id, ['CONFIRMED', 'CANCELLED'])));
  assert.ok(orders.every((o) => o.status === 'CANCELLED'));
  assert.equal(sys.orders.breaker.state, 'OPEN');
  assert.ok(orders.some((o) => o.reason.includes('circuito abierto')));
  assert.equal(await stockOf('violin'), before);

  await callJson(`${base}/api/admin/chaos`, { method: 'POST', body: { failureRate: 0 } });
  await sleep(250);
  const ok = await waitFor((await createOrder('violin')).id, ['CONFIRMED', 'CANCELLED']);
  assert.equal(ok.status, 'CONFIRMED');
  assert.equal(sys.orders.breaker.state, 'CLOSED');
});

test('Cache-Aside en catálogo: lecturas repetidas generan aciertos', async () => {
  await callJson(`${base}/api/products`);
  await callJson(`${base}/api/products`);
  const m = await callJson(`${base}/api/metrics`);
  assert.ok(m.catalog.cache.hits >= 1);
});

test('validación: pedido inválido devuelve 400', async () => {
  await assert.rejects(callJson(`${base}/api/orders`, { method: 'POST', body: { items: [] } }), (e) => e.status === 400);
});
