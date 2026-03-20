export function normalizeYZJWebhookPath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "/yzj/webhook";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) return withSlash.slice(0, -1);
  return withSlash;
}
