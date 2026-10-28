import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CircuitBreaker, CircuitOpenError } from '../src/shared/circuit-breaker.js';
import { retry } from '../src/shared/retry.js';
import { CacheAside } from '../src/shared/cache.js';
import { WorkQueue } from '../src/shared/queue.js';
import { HttpError } from '../src/shared/http.js';

const fail = () => Promise.reject(new HttpError(503, {}));

test('Circuit Breaker: abre tras el umbral, rechaza rápido y se recupera en HALF_OPEN', async () => {
  let clock = 0;
  const cb = new CircuitBreaker({ name: 't', failureThreshold: 2, resetTimeoutMs: 1000, now: () => clock });
  await assert.rejects(cb.exec(fail));
  await assert.rejects(cb.exec(fail));
  assert.equal(cb.state, 'OPEN');
  await assert.rejects(cb.exec(async () => 'x'), CircuitOpenError);
  clock = 1500;
  assert.equal(await cb.exec(async () => 'ok'), 'ok');
  assert.equal(cb.state, 'CLOSED');
});

test('Circuit Breaker: una prueba fallida en HALF_OPEN reabre el circuito', async () => {
  let clock = 0;
  const cb = new CircuitBreaker({ name: 't', failureThreshold: 1, resetTimeoutMs: 100, now: () => clock });
  await assert.rejects(cb.exec(fail));
  clock = 200;
  await assert.rejects(cb.exec(fail));
  assert.equal(cb.state, 'OPEN');
});

test('Retry: reintenta fallos transitorios y no reintenta errores 4xx', async () => {
  let calls = 0;
  const value = await retry(async () => { calls += 1; if (calls < 3) throw new HttpError(503); return 'ok'; }, { baseMs: 1 });
  assert.equal(value, 'ok');
  assert.equal(calls, 3);

  calls = 0;
  await assert.rejects(retry(async () => { calls += 1; throw new HttpError(402); }, { baseMs: 1 }));
  assert.equal(calls, 1);
});

test('Cache-Aside: el segundo acceso es un acierto y expira por TTL', async () => {
  let clock = 0;
  const cache = new CacheAside({ ttlMs: 100, now: () => clock });
  let loads = 0;
  const loader = async () => { loads += 1; return 'v'; };
  await cache.get('k', loader);
  await cache.get('k', loader);
  assert.equal(loads, 1);
  clock = 200;
  await cache.get('k', loader);
  assert.equal(loads, 2);
  assert.deepEqual(cache.stats(), { hits: 1, misses: 2, size: 1 });
});

test('WorkQueue: respeta la concurrencia máxima y procesa todos los trabajos', async () => {
  let active = 0;
  let peak = 0;
  const done = [];
  const queue = new WorkQueue({
    workers: 2,
    handler: async (n) => {
      active += 1; peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 10));
      active -= 1; done.push(n);
    },
  });
  for (let i = 0; i < 6; i++) queue.enqueue(i);
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(done.length, 6);
  assert.equal(peak, 2);
});
