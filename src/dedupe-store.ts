type DedupeStoreOptions = {
  ttlMs?: number;
  now?: () => number;
};

export class InboundDedupeStore {
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly seen = new Map<string, number>();

  constructor(options: DedupeStoreOptions = {}) {
    this.ttlMs = options.ttlMs ?? 600_000;
    this.now = options.now ?? (() => Date.now());
  }

  markSeen(accountId: string, msgId: string | null | undefined): boolean {
    const normalizedMsgId = msgId?.trim() ?? "";
    if (!normalizedMsgId) return true;

    const now = this.now();
    this.pruneExpired(now);
    const key = `${accountId}:${normalizedMsgId}`;
    const expiresAt = this.seen.get(key);
    if (expiresAt && expiresAt > now) return false;
    this.seen.set(key, now + this.ttlMs);
    return true;
  }

  clearAccount(accountId: string): void {
    const prefix = `${accountId}:`;
    for (const key of this.seen.keys()) {
      if (key.startsWith(prefix)) this.seen.delete(key);
    }
  }

  clear(): void {
    this.seen.clear();
  }

  private pruneExpired(now: number): void {
    for (const [key, expiresAt] of this.seen.entries()) {
      if (expiresAt <= now) this.seen.delete(key);
    }
  }
}
