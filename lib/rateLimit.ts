/**
 * In-memory per-IP limits (resets on server restart).
 * Used by /api/chat and /api/summary.
 */

const HOUR_MS = 60 * 60 * 1000;
const MAX_SESSIONS_PER_IP_PER_HOUR = 5;
const MAX_API_CALLS_PER_IP_PER_HOUR = 100;

const RATE_LIMIT_MESSAGE =
  "You've reached the limit for now. Come back in a bit.";

type IpRecord = {
  sessionStarts: number[];
  calls: number[];
};

const store = new Map<string, IpRecord>();

function pruneTimestamps(ts: number[], now: number): number[] {
  return ts.filter((t) => now - t < HOUR_MS);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();
  return "unknown";
}

export type RateLimitResult = { ok: true } | { ok: false; message: string };

/**
 * Enforces hourly caps, then records this request if allowed.
 * @param isSessionStart — true for the first real user turn of a chat session (see chat route).
 */
export function checkAndRecordApiCall(
  request: Request,
  isSessionStart: boolean
): RateLimitResult {
  const ip = getClientIp(request);
  const now = Date.now();

  let rec = store.get(ip);
  if (!rec) {
    rec = { sessionStarts: [], calls: [] };
    store.set(ip, rec);
  }

  rec.calls = pruneTimestamps(rec.calls, now);
  rec.sessionStarts = pruneTimestamps(rec.sessionStarts, now);

  if (rec.calls.length >= MAX_API_CALLS_PER_IP_PER_HOUR) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  if (
    isSessionStart &&
    rec.sessionStarts.length >= MAX_SESSIONS_PER_IP_PER_HOUR
  ) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  rec.calls.push(now);
  if (isSessionStart) {
    rec.sessionStarts.push(now);
  }

  return { ok: true };
}
