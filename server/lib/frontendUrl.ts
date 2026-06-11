export function resolveFrontendBaseUrl(): string {
  const configured = process.env.FRONTEND_URL?.split(",")[0]?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return process.env.NODE_ENV === "production" ? "http://localhost:3000" : "http://localhost:3000";
}
