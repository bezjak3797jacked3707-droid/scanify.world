import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const scanRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "scanify-scan",
});

export async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const { success } = await scanRateLimit.limit(ip);
    return success;
  } catch (err) {
    // Fail open: if Redis is briefly unreachable, allow the request
    // rather than blocking every scan on an infrastructure hiccup
    console.error("Rate limit check failed, allowing request:", err);
    return true;
  }
}