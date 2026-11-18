import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Lowercase hex HMAC-SHA256 of `${timestamp}.${rawBody}`.
 * `timestamp` is the exact header string the caller signed.
 */
export function signBody({ rawBody, timestamp, secret }) {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

/**
 * Timing-safe check of the assistant request signature.
 * Rejects a missing value, a length mismatch, or a clock skew past `maxSkewMs`
 * in either direction. A skew equal to `maxSkewMs` is still accepted.
 */
export function verifySignature({
  rawBody,
  timestamp,
  signature,
  secret,
  nowMs,
  maxSkewMs = 300000,
} = {}) {
  if (typeof secret !== "string" || secret.length === 0) return false;
  if (typeof rawBody !== "string") return false;
  if (typeof timestamp !== "string" || timestamp.length === 0) return false;
  if (typeof signature !== "string" || signature.length === 0) return false;
  if (typeof nowMs !== "number" || !Number.isFinite(nowMs)) return false;
  if (typeof maxSkewMs !== "number" || !Number.isFinite(maxSkewMs)) return false;

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;
  if (Math.abs(nowMs - sentAt) > maxSkewMs) return false;

  const expected = signBody({ rawBody, timestamp, secret });
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}
