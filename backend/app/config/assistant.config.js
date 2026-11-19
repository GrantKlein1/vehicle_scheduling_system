export function getAssistantConfig() {
  const rawUrl = process.env.ASSISTANT_URL;
  const url = typeof rawUrl === "string" ? rawUrl.replace(/\/+$/, "") : "";
  const sharedSecret = process.env.ASSISTANT_SHARED_SECRET;
  return {
    enabled: process.env.ASSISTANT_ENABLED === "true",
    url,
    sharedSecret: typeof sharedSecret === "string" ? sharedSecret : "",
    timeoutMs: 45000,
  };
}

export function isAssistantConfigured(cfg) {
  return Boolean(cfg?.enabled && cfg.url && cfg.sharedSecret);
}
