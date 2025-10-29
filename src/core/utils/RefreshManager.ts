type TaskKey = string;

export class RefreshManager {
  private readonly lastRun = new Map<TaskKey, number>();
  private readonly inFlight = new Set<TaskKey>();

  async run(options: {
    key: TaskKey;
    ttl: number;
    action: () => Promise<void>;
    force?: boolean;
  }): Promise<void> {
    const { key, ttl, action, force = false } = options;

    if (this.inFlight.has(key)) {
      return;
    }

    const now = Date.now();
    const last = this.lastRun.get(key);
    const isFresh = typeof last === "number" && now - last < ttl;

    if (!force && isFresh) {
      return;
    }

    this.inFlight.add(key);
    try {
      await action();
      this.lastRun.set(key, Date.now());
    } finally {
      this.inFlight.delete(key);
    }
  }

  invalidate(key: TaskKey) {
    this.lastRun.delete(key);
  }

  invalidatePrefix(prefix: string) {
    for (const key of Array.from(this.lastRun.keys())) {
      if (key.startsWith(prefix)) {
        this.lastRun.delete(key);
      }
    }
  }
}
