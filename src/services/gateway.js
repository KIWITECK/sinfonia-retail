import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createService, json, callJson } from '../shared/http.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');

/** Token bucket por cliente: protege los servicios internos de ráfagas. */
class RateLimiter {
  constructor({ capacity, refillPerSec }) {
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    this.buckets = new Map();
  }

  allow(key) {
    const now = Date.now();
    const b = this.buckets.get(key) ?? { tokens: this.capacity, at: now };
    b.tokens = Math.min(this.capacity, b.tokens + ((now - b.at) / 1000) * this.refillPerSec);
    b.at = now;
    const ok = b.tokens >= 1;
    if (ok) b.tokens -= 1;
    this.buckets.set(key, b);
    return ok;
  }
}

/** Patrón API Gateway: punto único de entrada, enrutamiento, límite de tasa y agregación de salud. */
export async function startGateway({ port = 8080, catalogUrl, ordersUrl, paymentsUrl, rateLimit = { capacity: 60, refillPerSec: 30 } } = {}) {
  const limiter = new RateLimiter(rateLimit);

  const proxy = (target, strip) => async ({ req, res, url, raw }) => {
    const ip = req.socket.remoteAddress ?? 'unknown';
    if (!limiter.allow(ip)) return json(res, 429, { error: 'rate-limit-exceeded' }, { 'retry-after': '1' });
    const requestId = req.headers['x-request-id'] ?? randomUUID();
    const upstream = target + url.pathname.replace(strip, '') + url.search;
    try {
      const r = await fetch(upstream, {
        method: req.method,
        headers: { 'content-type': 'application/json', 'x-request-id': requestId },
        body: raw || undefined,
        signal: AbortSignal.timeout(3000),
      });
      const text = await r.text();
      res.writeHead(r.status, { 'content-type': 'application/json; charset=utf-8', 'x-request-id': requestId });
      res.end(text);
    } catch (err) {
      json(res, 502, { error: 'upstream-unavailable', detail: err.name }, { 'x-request-id': requestId });
    }
  };

  const probe = async (name, url) => {
    try {
      await callJson(`${url}/health`, { timeoutMs: 800 });
      return { name, status: 'UP' };
    } catch {
      return { name, status: 'DOWN' };
    }
  };

  const routes = [
    {
      method: 'GET',
      path: /^\/api\/health$/,
      handler: async ({ res }) => {
        const services = await Promise.all([probe('catalog', catalogUrl), probe('orders', ordersUrl), probe('payments', paymentsUrl)]);
        const up = services.every((s) => s.status === 'UP');
        json(res, up ? 200 : 503, { gateway: 'UP', status: up ? 'UP' : 'DEGRADED', services });
      },
    },
    {
      method: 'GET',
      path: /^\/api\/metrics$/,
      handler: async ({ res }) => {
        const get = (u) => callJson(`${u}/metrics`, { timeoutMs: 800 }).catch(() => null);
        const [catalog, orders] = await Promise.all([get(catalogUrl), get(ordersUrl)]);
        json(res, 200, { catalog, orders });
      },
    },
    { method: '*', path: /^\/api\/(products|orders)(\/|$)/, handler: (ctx) => (ctx.url.pathname.startsWith('/api/products') ? proxy(catalogUrl, '/api') : proxy(ordersUrl, '/api'))(ctx) },
    { method: 'POST', path: /^\/api\/admin\/chaos$/, handler: proxy(paymentsUrl, '/api') },
    { method: 'GET', path: /^\/api\/events$/, handler: proxy(ordersUrl, '/api') },
  ];

  const fallback = async ({ res, url }) => {
    const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const full = path.join(PUBLIC_DIR, file);
    if (!full.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'forbidden' });
    try {
      const data = await readFile(full);
      res.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
      res.end(data);
    } catch {
      json(res, 404, { error: 'not-found' });
    }
  };

  return createService({ name: 'gateway', port, routes, fallback });
}
