export class TargetCache<T> {
  private readonly entries = new Map<string, Promise<T>>();

  resolve(key: string, compute: () => Promise<T>): Promise<T> {
    let pending = this.entries.get(key);
    if (!pending) {
      pending = compute();
      this.entries.set(key, pending);
      void pending.catch(() => {
        if (this.entries.get(key) === pending) this.entries.delete(key);
      });
    }
    return pending;
  }

  invalidate(key: string): void {
    this.entries.delete(key);
  }
}
