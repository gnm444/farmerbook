function originFor(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function contentSecurityPolicy(
  supabaseUrl?: string,
  upgradeInsecureRequests = true,
) {
  const supabaseOrigin = originFor(supabaseUrl);
  const connectSources = [
    "'self'",
    "https://challenges.cloudflare.com",
    ...(supabaseOrigin ? [supabaseOrigin, supabaseOrigin.replace("https://", "wss://")] : []),
  ];
  const imageSources = [
    "'self'",
    "data:",
    "blob:",
    "https://i.ytimg.com",
    ...(supabaseOrigin ? [supabaseOrigin] : []),
  ];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imageSources.join(" ")}`,
    `connect-src ${connectSources.join(" ")}`,
    "frame-src https://challenges.cloudflare.com",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(upgradeInsecureRequests ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function withSecurityHeaders(
  request: Request,
  response: Response,
  supabaseUrl?: string,
) {
  const secured = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  const secureRequest = new URL(request.url).protocol === "https:";
  secured.headers.set(
    "Content-Security-Policy",
    contentSecurityPolicy(supabaseUrl, secureRequest),
  );
  secured.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  secured.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "DENY");

  if (secureRequest) {
    secured.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  return secured;
}
