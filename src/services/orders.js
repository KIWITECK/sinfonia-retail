import { randomUUID } from 'node:crypto';
import { createService, json, callJson, HttpError } from '../shared/http.js';
import { CircuitBreaker, CircuitOpenError } from '../shared/circuit-breaker.js';
import { retry } from '../shared/retry.js';
import { WorkQueue } from '../shared/queue.js';

function reasonFrom(err) {
  if (err instanceof CircuitOpenError) return 'payments-unavailable (circuito abierto)';
  if (err instanceof HttpError) return err.body?.error ?? `http-${err.status}`;
  return err.name === 'TimeoutError' ? 'timeout' : err.message;
}

/**
 * Servicio de pedidos. Acepta el pedido (202), lo encola y un trabajador ejecuta una
 * saga orquestada: reservar stock -> cobrar -> confirmar, o compensar liberando el stock.
 */
export async function startOrders({
  port = 0,
  catalogUrl,
  paymentsUrl,
  workers = 2,
  retryOptions = { retries: 2, baseMs: 100 },
  breakerOptions = { failureThreshold: 3, resetTimeoutMs: 5000 },
} = {}) {
  const orders = new Map();
  const events = [];
  const paymentsBreaker = new CircuitBreaker({ name: 'payments', ...breakerOptions });

  const emit = (type, order) => {
    events.push({ type, orderId: order.id, at: new Date().toISOString() });
    if (events.length > 200) events.shift();
  };
  const setStatus = (order, status, reason) => {
    order.status = status;
    if (reason) order.reason = reason;
    order.updatedAt = new Date().toISOString();
    emit(`Order${status[0]}${status.slice(1).toLowerCase()}`, order);
  };

  async function runSaga(order) {
    const reserved = [];
    try {
      let total = 0;
      for (const item of order.items) {
        const r = await retry(
          () => callJson(`${catalogUrl}/products/${item.productId}/reserve`, { method: 'POST', body: { qty: item.qty, orderId: order.id } }),
          retryOptions,
        );
        reserved.push(item);
        total += r.price * item.qty;
      }
      order.total = total;
      const payment = await retry(
        () => paymentsBreaker.exec(() => callJson(`${paymentsUrl}/payments`, {
          method: 'POST',
          headers: { 'idempotency-key': order.id },
          body: { orderId: order.id, amount: total },
        })),
        retryOptions,
      );
      order.paymentId = payment.paymentId;
      setStatus(order, 'CONFIRMED');
    } catch (err) {
      for (const item of reserved) {
        await callJson(`${catalogUrl}/products/${item.productId}/release`, { method: 'POST', body: { orderId: order.id } }).catch(() => {});
      }
      setStatus(order, 'CANCELLED', reasonFrom(err));
    }
  }

  const queue = new WorkQueue({
    workers,
    handler: (order) => {
      setStatus(order, 'PROCESSING');
      return runSaga(order);
    },
  });

  const routes = [
    { method: 'GET', path: /^\/health$/, handler: ({ res }) => json(res, 200, { service: 'orders', status: 'UP' }) },
    {
      method: 'GET',
      path: /^\/metrics$/,
      handler: ({ res }) => json(res, 200, { service: 'orders', queue: queue.stats(), breaker: paymentsBreaker.snapshot(), orders: orders.size }),
    },
    { method: 'GET', path: /^\/events$/, handler: ({ res }) => json(res, 200, events.slice(-50)) },
    {
      method: 'GET',
      path: /^\/orders$/,
      handler: ({ res }) => json(res, 200, [...orders.values()].reverse().slice(0, 50)),
    },
    {
      method: 'GET',
      path: /^\/orders\/(?<id>[\w-]+)$/,
      handler: ({ res, params }) => {
        const order = orders.get(params.id);
        return order ? json(res, 200, order) : json(res, 404, { error: 'order-not-found' });
      },
    },
    {
      method: 'POST',
      path: /^\/orders$/,
      handler: ({ res, body }) => {
        const items = body.items;
        const valid = Array.isArray(items) && items.length > 0
          && items.every((i) => typeof i.productId === 'string' && Number.isInteger(i.qty) && i.qty > 0);
        if (!body.customer || !valid) return json(res, 400, { error: 'invalid-order' });
        const now = new Date().toISOString();
        const order = {
          id: randomUUID(),
          customer: String(body.customer),
          items: items.map(({ productId, qty }) => ({ productId, qty })),
          status: 'PENDING',
          createdAt: now,
          updatedAt: now,
        };
        orders.set(order.id, order);
        emit('OrderCreated', order);
        queue.enqueue(order);
        json(res, 202, { id: order.id, status: order.status, links: { self: `/api/orders/${order.id}` } });
      },
    },
  ];

  const service = await createService({ name: 'orders', port, routes });
  service.breaker = paymentsBreaker;
  return service;
}
