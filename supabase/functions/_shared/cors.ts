const DEFAULT_SITE_URL = "https://mohcom-production.up.railway.app";

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    if (/^[a-z0-9.-]+$/i.test(value)) {
      return `https://${value}`;
    }

    return null;
  }
}

function getProductionOrigins(): string[] {
  const values = [
    DEFAULT_SITE_URL,
    Deno.env.get("SITE_URL"),
    Deno.env.get("PUBLIC_SITE_URL"),
    Deno.env.get("RAILWAY_PUBLIC_DOMAIN"),
  ]
    .map(normalizeOrigin)
    .filter((value): value is string => Boolean(value));

  return [...new Set(values)];
}

export function getAllowedOrigin(req: Request): string {
  const origin = req.headers.get("origin") || "";
  const productionOrigins = getProductionOrigins();
  const developmentOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
  ];

  if (productionOrigins.includes(origin) || developmentOrigins.includes(origin)) {
    return origin;
  }

  if (origin) {
    console.warn("[SECURITY] Rejected CORS origin:", origin);
  }

  return productionOrigins[0] || DEFAULT_SITE_URL;
}

export function createCorsHeaders(req: Request, methods = "POST, OPTIONS") {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": methods,
  };
}