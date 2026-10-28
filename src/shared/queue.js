/**
 * Patrón Queue-Based Load Leveling / Competing Consumers: los trabajos se acumulan
 * en una cola y un número fijo de trabajadores los consume en paralelo.
 */
export class WorkQueue {
  constructor({ workers = 2, handler }) {
    this.handler = handler;
    this.workers = workers;
    this.pending = [];
    this.active = 0;
    this.processed = 0;
  }

  enqueue(job) {
    this.pending.push(job);
    this.#drain();
  }

  #drain() {
    while (this.active < this.workers && this.pending.length > 0) {
      const job = this.pending.shift();
      this.active += 1;
      Promise.resolve()
        .then(() => this.handler(job))
        .catch((err) => console.error('[queue] job failed:', err.message))
        .finally(() => {
          this.active -= 1;
          this.processed += 1;
          this.#drain();
        });
    }
  }

  stats() {
    return { depth: this.pending.length, active: this.active, processed: this.processed, workers: this.workers };
  }
}
