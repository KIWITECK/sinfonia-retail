import http from 'node:http';

export class HttpError extends Error {
  constructor(status, body) {
    super(`HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

export function json(res, status, body, headers = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    ...headers,
  });
  res.end(data);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}

/**
 * Crea un servicio HTTP mínimo. Cada ruta es { method, path: RegExp, handler }.
 * method '*' acepta cualquier verbo (lo usa el API Gateway para el proxy).
 */
export function createService({ name, port = 0, routes, fallback }) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      for (const route of routes) {
        if (route.method !== '*' && route.method !== req.method) continue;
        const match = route.path.exec(url.pathname);
        if (!match) continue;
        const raw = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : '';
        let body = {};
        if (raw) {
          try {
            body = JSON.parse(raw);
          } catch {
            return json(res, 400, { error: 'invalid-json' });
          }
        }
        return await route.handler({ req, res, url, params: match.groups ?? {}, body, raw });
      }
      if (fallback) return await fallback({ req, res, url });
      return json(res, 404, { error: 'not-found' });
    } catch (err) {
      console.error(`[${name}] ${req.method} ${url.pathname}:`, err.message);
      return json(res, err.status ?? 500, { error: err.message });
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      const actual = server.address().port;
      resolve({
        name,
        server,
        port: actual,
        url: `http://127.0.0.1:${actual}`,
        close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }),
      });
    });
  });
}

/** Llamada JSON con tiempo límite; lanza HttpError si el estado no es 2xx. */
export async function callJson(url, { method = 'GET', body, headers = {}, timeoutMs = 1500 } = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new HttpError(res.status, data);
  return data;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
