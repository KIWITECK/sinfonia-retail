import { randomUUID } from 'node:crypto';
import { createService, json, sleep } from '../shared/http.js';

const DECLINE_LIMIT = 5000000;

/**
 * Servicio de pagos simulado. Es idempotente por cabecera Idempotency-Key y permite
 * inyectar fallos (chaos) para demostrar Retry y Circuit Breaker.
 */
export async function startPayments({ port = 0, latencyMs = 80, failureRate = 0 } = {}) {
  const state = { failureRate };
  const processed = new Map(); // idempotency key -> respuesta

  const routes = [
    { method: 'GET', path: /^\/health$/, handler: ({ res }) => json(res, 200, { service: 'payments', status: 'UP', failureRate: state.failureRate }) },
    {
      method: 'POST',
      path: /^\/admin\/chaos$/,
      handler: ({ res, body }) => {
        const rate = Number(body.failureRate);
        if (!(rate >= 0 && rate <= 1)) return json(res, 400, { error: 'failureRate must be between 0 and 1' });
        state.failureRate = rate;
        json(res, 200, { failureRate: state.failureRate });
      },
    },
    {
      method: 'POST',
      path: /^\/payments$/,
      handler: async ({ req, res, body }) => {
        const key = req.headers['idempotency-key'];
        if (key && processed.has(key)) return json(res, 200, processed.get(key));
        await sleep(latencyMs);
        if (Math.random() < state.failureRate) return json(res, 503, { error: 'payment-gateway-unavailable' });
        if (!(body.amount > 0)) return json(res, 400, { error: 'invalid-amount' });
        if (body.amount > DECLINE_LIMIT) return json(res, 402, { error: 'payment-declined' });
        const response = { paymentId: randomUUID(), orderId: body.orderId, amount: body.amount, status: 'APPROVED' };
        if (key) processed.set(key, response);
        json(res, 200, response);
      },
    },
  ];

  const service = await createService({ name: 'payments', port, routes });
  service.state = state;
  return service;
}
