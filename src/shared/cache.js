/** Patrón Cache-Aside: se consulta la caché; si falla, se carga de la fuente y se almacena con TTL. */
export class CacheAside {
  constructor({ ttlMs = 5000, now = Date.now } = {}) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.entries = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  async get(key, loader) {
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt > this.now()) {
      this.hits += 1;
      return entry.value;
    }
    this.misses += 1;
    const value = await loader();
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    return value;
  }

  invalidate(key) {
    if (key === undefined) this.entries.clear();
    else this.entries.delete(key);
  }

  stats() {
    return { hits: this.hits, misses: this.misses, size: this.entries.size };
  }
}
