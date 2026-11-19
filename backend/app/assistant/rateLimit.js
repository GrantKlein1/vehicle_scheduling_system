const WINDOW_MS = 60 * 1000;
const LIMIT = 20;
const hits = new Map();

export function resetAssistantRateLimit() {
  hits.clear();
}

export function assistantRateLimit(req, res, next) {
  const userId = req.user?.id;
  if (userId == null) {
    return next();
  }

  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(userId, recent);
    return res.status(429).json({ message: "Too many assistant requests. Please wait a moment." });
  }

  recent.push(now);
  hits.set(userId, recent);
  return next();
}
