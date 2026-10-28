export class CircuitOpenError extends Error {
  constructor(name) {
    super(`circuit-open:${name}`);
    this.status = 503;
  }
}

/**
 * Patrón Circuit Breaker: CLOSED -> OPEN tras N fallos consecutivos;
 * OPEN rechaza de inmediato; tras resetTimeoutMs pasa a HALF_OPEN y deja
 * pasar una sola llamada de prueba que decide si vuelve a CLOSED u OPEN.
 */
export class CircuitBreaker {
  constructor({ name, failureThreshold = 3, resetTimeoutMs = 5000, now = Date.now }) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.now = now;
    this.state = 'CLOSED';
    this.failures = 0;
    this.openedAt = 0;
    this.trialInFlight = false;
  }

  async exec(fn) {
    if (this.state === 'OPEN') {
      if (this.now() - this.openedAt < this.resetTimeoutMs) throw new CircuitOpenError(this.name);
      this.state = 'HALF_OPEN';
    }
    if (this.state === 'HALF_OPEN') {
      if (this.trialInFlight) throw new CircuitOpenError(this.name);
      this.trialInFlight = true;
    }
    try {
      const result = await fn();
      this.#onSuccess();
      return result;
    } catch (err) {
      this.#onFailure();
      throw err;
    } finally {
      this.trialInFlight = false;
    }
  }

  #onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  #onFailure() {
    this.failures += 1;
    if (this.state === 'HALF_OPEN' || this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = this.now();
    }
  }

  snapshot() {
    return { name: this.name, state: this.state, failures: this.failures };
  }
}
