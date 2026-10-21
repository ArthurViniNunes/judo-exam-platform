import type { AuthUser } from "./contracts";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
};

export function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin");
  const configured: string = env.FRONTEND_ORIGIN || "*";
  const allowed = configured.split(",").map((item) => item.trim());
  const allowedOrigin =
    configured === "*" || !origin
      ? "*"
      : allowed.includes(origin)
        ? origin
        : null;
  const headers = new Headers({
    ...securityHeaders,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-Id",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Expose-Headers": "X-Request-Id",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });

  if (allowedOrigin) headers.set("Access-Control-Allow-Origin", allowedOrigin);
  const requestId = request.headers.get("X-Request-Id");
  if (requestId) headers.set("X-Request-Id", requestId);
  return headers;
}

export function json(
  request: Request,
  env: Env,
  body: unknown,
  status = 200,
): Response {
  return Response.json(body, { status, headers: corsHeaders(request, env) });
}

export function empty(request: Request, env: Env, status = 204): Response {
  return new Response(null, { status, headers: corsHeaders(request, env) });
}

export function requireSuperAdmin(
  request: Request,
  env: Env,
  user: AuthUser,
): Response | null {
  return user.role === "super_admin"
    ? null
    : json(
        request,
        env,
        { error: "Esta ação exige acesso de Super Admin." },
        403,
      );
}
