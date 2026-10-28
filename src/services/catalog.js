import { createService, json, sleep } from '../shared/http.js';
import { CacheAside } from '../shared/cache.js';

const SEED = [
  { id: 'violin', name: 'Violín 4/4', price: 1200000, stock: 25 },
  { id: 'guitarra', name: 'Guitarra acústica', price: 850000, stock: 40 },
  { id: 'teclado', name: 'Teclado 61 teclas', price: 1500000, stock: 15 },
  { id: 'bateria', name: 'Batería electrónica', price: 3200000, stock: 8 },
];

/** Servicio de catálogo e inventario. Usa Cache-Aside sobre una "base de datos" con latencia simulada. */
export async function startCatalog({ port = 0, dbLatencyMs = 100, cacheTtlMs = 5000 } = {}) {
  const db = new Map(SEED.map((p) => [p.id, { ...p }]));
  const reservations = new Map(); // `${orderId}:${productId}` -> qty (idempotencia)
  const cache = new CacheAside({ ttlMs: cacheTtlMs });

  const readProduct = async (id) => {
    await sleep(dbLatencyMs);
    const p = db.get(id);
    return p ? { ...p } : null;
  };

  const routes = [
    { method: 'GET', path: /^\/health$/, handler: ({ res }) => json(res, 200, { service: 'catalog', status: 'UP' }) },
    { method: 'GET', path: /^\/metrics$/, handler: ({ res }) => json(res, 200, { service: 'catalog', cache: cache.stats() }) },
    {
      method: 'GET',
      path: /^\/products$/,
      handler: async ({ res }) => {
        const list = await cache.get('all', async () => {
          await sleep(dbLatencyMs);
          return [...db.values()].map((p) => ({ ...p }));
        });
        json(res, 200, list);
      },
    },
    {
      method: 'GET',
      path: /^\/products\/(?<id>[\w-]+)$/,
      handler: async ({ res, params }) => {
        const p = await cache.get(`p:${params.id}`, () => readProduct(params.id));
        if (!p) return json(res, 404, { error: 'product-not-found' });
        json(res, 200, p);
      },
    },
    {
      method: 'POST',
      path: /^\/products\/(?<id>[\w-]+)\/reserve$/,
      handler: async ({ res, params, body }) => {
        const { qty, orderId } = body;
        const p = db.get(params.id);
        if (!p) return json(res, 404, { error: 'product-not-found' });
        if (!Number.isInteger(qty) || qty < 1 || !orderId) return json(res, 400, { error: 'invalid-request' });
        const key = `${orderId}:${p.id}`;
        if (!reservations.has(key)) {
          if (p.stock < qty) return json(res, 409, { error: 'insufficient-stock' });
          p.stock -= qty;
          reservations.set(key, qty);
          cache.invalidate();
        }
        json(res, 200, { productId: p.id, qty: reservations.get(key), price: p.price });
      },
    },
    {
      method: 'POST',
      path: /^\/products\/(?<id>[\w-]+)\/release$/,
      handler: ({ res, params, body }) => {
        const p = db.get(params.id);
        const key = `${body.orderId}:${params.id}`;
        if (p && reservations.has(key)) {
          p.stock += reservations.get(key);
          reservations.delete(key);
          cache.invalidate();
        }
        json(res, 200, { released: true });
      },
    },
  ];

  return createService({ name: 'catalog', port, routes });
}
