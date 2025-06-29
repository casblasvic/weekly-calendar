import { IRateLimiter } from './types';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

export class TokenBucketRateLimiter implements IRateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private defaultMaxTokens: number;
  private defaultRefillRate: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    defaultMaxTokens: number = 60, // 60 tokens (messages per minute)
    defaultRefillRate: number = 1 // 1 token per second
  ) {
    this.defaultMaxTokens = defaultMaxTokens;
    this.defaultRefillRate = defaultRefillRate;
    
    // Cleanup inactive buckets every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  isAllowed(connectionId: string): boolean {
    const bucket = this.getBucket(connectionId);
    this.refillBucket(bucket);
    return bucket.tokens > 0;
  }

  consume(connectionId: string, tokens: number = 1): boolean {
    const bucket = this.getBucket(connectionId);
    this.refillBucket(bucket);
    
    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  reset(connectionId: string): void {
    const bucket = this.getBucket(connectionId);
    bucket.tokens = bucket.maxTokens;
    bucket.lastRefill = Date.now();
  }

  private getBucket(connectionId: string): TokenBucket {
    let bucket = this.buckets.get(connectionId);
    
    if (!bucket) {
      bucket = {
        tokens: this.defaultMaxTokens,
        lastRefill: Date.now(),
        maxTokens: this.defaultMaxTokens,
        refillRate: this.defaultRefillRate
      };
      this.buckets.set(connectionId, bucket);
    }
    
    return bucket;
  }

  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = Math.floor(timePassed * bucket.refillRate);
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
    for (const [connectionId, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(connectionId);
      }
    }
  }

  // Configurar límites personalizados para una conexión específica
  setCustomLimits(
    connectionId: string, 
    maxTokens: number, 
    refillRate: number
  ): void {
    const bucket = this.getBucket(connectionId);
    bucket.maxTokens = maxTokens;
    bucket.refillRate = refillRate;
    bucket.tokens = Math.min(bucket.tokens, maxTokens);
  }

  // Obtener estadísticas del rate limiter
  getStats(): { totalBuckets: number; avgTokens: number } {
    const buckets = Array.from(this.buckets.values());
    const totalBuckets = buckets.length;
    const avgTokens = buckets.length > 0 
      ? buckets.reduce((sum, bucket) => sum + bucket.tokens, 0) / buckets.length 
      : 0;
    
    return { totalBuckets, avgTokens };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.buckets.clear();
  }
} 