import { createHmac, randomBytes } from 'node:crypto';

/** Per-process protection. Hosting-wide protection belongs at the edge. */
export class RequestLimiter {
  private readonly salt = randomBytes(32);
  private readonly counters = new Map<string, { count: number; expires: number }>();
  constructor(private readonly limit: number, private readonly windowMs: number, private readonly maxEntries = 5000) {}
  get size() { return this.counters.size; }
  take(headers: Pick<Headers, 'get'>, now = Date.now()) {
    for (const [key, item] of this.counters) if (item.expires <= now) this.counters.delete(key);
    const address = (headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown').split(',')[0].trim().slice(0, 128);
    const key = createHmac('sha256', this.salt).update(address).digest('hex');
    const previous = this.counters.get(key);
    const current = previous || { count: 0, expires: now + this.windowMs };
    if (!previous && this.counters.size >= this.maxEntries) this.counters.delete(this.counters.keys().next().value!);
    current.count += 1;
    this.counters.delete(key); this.counters.set(key, current);
    return { allowed: current.count <= this.limit, retryAfter: Math.max(1, Math.ceil((current.expires - now) / 1000)) };
  }
}
