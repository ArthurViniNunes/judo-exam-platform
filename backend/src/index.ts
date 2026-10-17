import { login, logout, register, updateProfile } from "./auth";
import { publicUser } from "./domain";
import {
  createEvaluation,
  getDashboard,
  listEvaluations,
  listStudents,
} from "./evaluations";
import { corsHeaders, json, requireSuperAdmin } from "./http";
import { createMatrix, listMatrices } from "./matrices";
import { authenticate } from "./security";
import { inviteUser, listUsers, updateUserStatus } from "./users";

async function handlePublicRoute(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request, env),
    });
  }
  if (url.pathname === "/" && request.method === "GET") {
    return json(request, env, {
      name: "Judo Exam API",
      status: "ok",
      health: "/health",
    });
  }
  if (url.pathname === "/health" && request.method === "GET") {
    await env.DB.prepare("SELECT 1").first();
    return json(request, env, {
      status: "ok",
      database: "ok",
      authentication: env.SUPER_ADMIN_INITIAL_PASSWORD
        ? "configured"
        : "missing_super_admin_secret",
    });
  }
  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    return login(request, env);
  }
  if (url.pathname === "/api/auth/register" && request.method === "POST") {
    return register(request, env);
  }
  return null;
}

async function handleAuthenticatedRoute(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const user = await authenticate(request, env);
  if (!user) {
    return json(
      request,
      env,
      { error: "Sua sessão expirou. Entre novamente." },
      401,
    );
  }

  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    return json(request, env, { user: publicUser(user) });
  }
  if (url.pathname === "/api/auth/profile" && request.method === "PATCH") {
    return updateProfile(request, env, user);
  }
  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    return logout(request, env);
  }
  if (url.pathname === "/api/dashboard" && request.method === "GET") {
    return getDashboard(request, env, user, url);
  }
  if (url.pathname === "/api/students" && request.method === "GET") {
    return listStudents(request, env, user, url);
  }
  if (url.pathname === "/api/evaluations" && request.method === "GET") {
    return listEvaluations(request, env, user, url);
  }
  if (url.pathname === "/api/evaluations" && request.method === "POST") {
    return createEvaluation(request, env, user);
  }
  if (url.pathname === "/api/matrices" && request.method === "GET") {
    return listMatrices(request, env, user);
  }
  if (url.pathname === "/api/matrices" && request.method === "POST") {
    const denied = requireSuperAdmin(request, env, user);
    return denied || createMatrix(request, env, user);
  }
  if (url.pathname === "/api/users" && request.method === "GET") {
    const denied = requireSuperAdmin(request, env, user);
    return denied || listUsers(request, env);
  }
  if (url.pathname === "/api/users/invite" && request.method === "POST") {
    const denied = requireSuperAdmin(request, env, user);
    return denied || inviteUser(request, env);
  }

  const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && request.method === "PATCH") {
    const denied = requireSuperAdmin(request, env, user);
    return denied || updateUserStatus(request, env, user, userMatch[1]);
  }

  return json(request, env, { error: "Rota não encontrada." }, 404);
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const publicResponse = await handlePublicRoute(request, env, url);
  return publicResponse || handleAuthenticatedRoute(request, env, url);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "request failed",
          method: request.method,
          path: new URL(request.url).pathname,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return json(
        request,
        env,
        { error: "O servidor não conseguiu concluir a operação." },
        500,
      );
    }
  },
} satisfies ExportedHandler<Env>;
