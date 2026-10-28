import { HttpError, sleep } from './http.js';
import { CircuitOpenError } from './circuit-breaker.js';

/** Solo se reintentan fallos transitorios: errores 5xx, red o tiempo agotado. */
export function isTransient(err) {
  if (err instanceof CircuitOpenError) return false;
  if (err instanceof HttpError) return err.status >= 500;
  return true;
}

/** Patrón Retry con retroceso exponencial y jitter. */
export async function retry(fn, { retries = 3, baseMs = 100, factor = 2, jitter = true, shouldRetry = isTransient } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err)) throw err;
      const delay = baseMs * factor ** attempt;
      await sleep(jitter ? delay * (0.5 + Math.random() / 2) : delay);
      attempt += 1;
    }
  }
}
