import { login, logout, register, updateProfile } from "./auth";
import { publicUser } from "./domain";
import {
  createEvaluation,
  createStudent,
  deleteEvaluation,
  getDashboard,
  listAvailableStudents,
  listEvaluations,
  listPracticalCandidates,
  listStudents,
} from "./evaluations";
import {
  corsHeaders,
  json,
  requireProfessionalContext,
  requireStudentContext,
  requireSuperAdmin,
} from "./http";
import { authenticate } from "./security";
import { getThemeSettings, updateThemeSettings } from "./settings";
import { loginStudent, registerStudent } from "./student-auth";
import { getStudentProfile, updateStudentTargetBelt } from "./student-profile";
import {
  closeTheoryVersion,
  createTheoryQuestion,
  createTheoryVersion,
  deleteTheoryQuestion,
  deleteTheoryVersion,
  getTheoryVersion,
  listTheoryVersions,
  publishTheoryVersion,
  updateTheoryQuestion,
  updateTheoryVersion,
} from "./theory-admin";
import {
  getAvailableTheoryExam,
  getCurrentTheoryAttempt,
  getTheoryResult,
  saveTheoryAnswer,
  startTheoryAttempt,
  submitTheoryAttempt,
} from "./theory-attempts";
import {
  cancelInvitation,
  inviteUser,
  listUsers,
  updateUserStatus,
} from "./users";

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
  if (url.pathname === "/api/student-auth/login" && request.method === "POST") {
    return loginStudent(request, env);
  }
  if (url.pathname === "/api/student-auth/register" && request.method === "POST") {
    return registerStudent(request, env);
  }
  if (url.pathname === "/api/settings/theme" && request.method === "GET") {
    return getThemeSettings(request, env);
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
  if (url.pathname === "/api/student/me" && request.method === "GET") {
    const denied = requireStudentContext(request, env, user);
    return denied || getStudentProfile(request, env, user);
  }
  if (url.pathname === "/api/student/me/target-belt" && request.method === "PATCH") {
    const denied = requireStudentContext(request, env, user);
    return denied || updateStudentTargetBelt(request, env, user);
  }
  if (url.pathname === "/api/theory-exams/available" && request.method === "GET") {
    const denied = requireStudentContext(request, env, user);
    return denied || getAvailableTheoryExam(request, env, user);
  }
  if (url.pathname === "/api/theory-attempts/current" && request.method === "GET") {
    const denied = requireStudentContext(request, env, user);
    return denied || getCurrentTheoryAttempt(request, env, user);
  }
  if (url.pathname === "/api/theory-attempts" && request.method === "POST") {
    const denied = requireStudentContext(request, env, user);
    return denied || startTheoryAttempt(request, env, user);
  }
  const theoryAttemptAnswerMatch = url.pathname.match(
    /^\/api\/theory-attempts\/([^/]+)\/answers$/,
  );
  if (theoryAttemptAnswerMatch && request.method === "PATCH") {
    const denied = requireStudentContext(request, env, user);
    return denied || saveTheoryAnswer(request, env, user, theoryAttemptAnswerMatch[1]);
  }
  const theoryAttemptSubmitMatch = url.pathname.match(
    /^\/api\/theory-attempts\/([^/]+)\/submit$/,
  );
  if (theoryAttemptSubmitMatch && request.method === "POST") {
    const denied = requireStudentContext(request, env, user);
    return denied || submitTheoryAttempt(request, env, user, theoryAttemptSubmitMatch[1]);
  }
  const theoryAttemptResultMatch = url.pathname.match(
    /^\/api\/theory-attempts\/([^/]+)\/result$/,
  );
  if (theoryAttemptResultMatch && request.method === "GET") {
    const denied = requireStudentContext(request, env, user);
    return denied || getTheoryResult(request, env, user, theoryAttemptResultMatch[1]);
  }
  const professionalOnly = requireProfessionalContext(request, env, user);
  if (professionalOnly) return professionalOnly;
  if (url.pathname === "/api/settings/theme" && request.method === "PATCH") {
    const denied = requireSuperAdmin(request, env, user);
    return denied || updateThemeSettings(request, env);
  }
  if (url.pathname === "/api/theory/admin/versions") {
    const denied = requireSuperAdmin(request, env, user);
    if (denied) return denied;
    if (request.method === "GET") return listTheoryVersions(request, env);
    if (request.method === "POST") return createTheoryVersion(request, env, user);
  }
  const theoryPublishMatch = url.pathname.match(
    /^\/api\/theory\/admin\/versions\/([^/]+)\/publish$/,
  );
  if (theoryPublishMatch && request.method === "POST") {
    const denied = requireSuperAdmin(request, env, user);
    return denied || publishTheoryVersion(request, env, user, theoryPublishMatch[1]);
  }
  const theoryCloseMatch = url.pathname.match(
    /^\/api\/theory\/admin\/versions\/([^/]+)\/close$/,
  );
  if (theoryCloseMatch && request.method === "POST") {
    const denied = requireSuperAdmin(request, env, user);
    return denied || closeTheoryVersion(request, env, user, theoryCloseMatch[1]);
  }
  const theoryQuestionsMatch = url.pathname.match(
    /^\/api\/theory\/admin\/versions\/([^/]+)\/questions$/,
  );
  if (theoryQuestionsMatch && request.method === "POST") {
    const denied = requireSuperAdmin(request, env, user);
    return denied || createTheoryQuestion(request, env, user, theoryQuestionsMatch[1]);
  }
  const theoryVersionMatch = url.pathname.match(
    /^\/api\/theory\/admin\/versions\/([^/]+)$/,
  );
  if (theoryVersionMatch) {
    const denied = requireSuperAdmin(request, env, user);
    if (denied) return denied;
    if (request.method === "GET") return getTheoryVersion(request, env, theoryVersionMatch[1]);
    if (request.method === "PATCH") return updateTheoryVersion(request, env, user, theoryVersionMatch[1]);
    if (request.method === "DELETE") return deleteTheoryVersion(request, env, user, theoryVersionMatch[1]);
  }
  const theoryQuestionMatch = url.pathname.match(
    /^\/api\/theory\/admin\/questions\/([^/]+)$/,
  );
  if (theoryQuestionMatch) {
    const denied = requireSuperAdmin(request, env, user);
    if (denied) return denied;
    if (request.method === "PATCH") return updateTheoryQuestion(request, env, user, theoryQuestionMatch[1]);
    if (request.method === "DELETE") return deleteTheoryQuestion(request, env, user, theoryQuestionMatch[1]);
  }
  if (url.pathname === "/api/dashboard" && request.method === "GET") {
    return getDashboard(request, env, user, url);
  }
  if (url.pathname === "/api/students/available" && request.method === "GET") {
    return listAvailableStudents(request, env);
  }
  if (url.pathname === "/api/practical-candidates" && request.method === "GET") {
    return listPracticalCandidates(request, env);
  }
  if (url.pathname === "/api/students" && request.method === "GET") {
    return listStudents(request, env, user, url);
  }
  if (url.pathname === "/api/students" && request.method === "POST") {
    return createStudent(request, env);
  }
  if (url.pathname === "/api/evaluations" && request.method === "GET") {
    return listEvaluations(request, env, user, url);
  }
  if (url.pathname === "/api/evaluations" && request.method === "POST") {
    return createEvaluation(request, env, user);
  }
  if (url.pathname === "/api/evaluations/sync" && request.method === "POST") {
    return createEvaluation(request, env, user, "sync");
  }
  const evaluationMatch = url.pathname.match(/^\/api\/evaluations\/([^/]+)$/);
  if (evaluationMatch && request.method === "DELETE") {
    return deleteEvaluation(request, env, user, evaluationMatch[1]);
  }
  if (url.pathname === "/api/users" && request.method === "GET") {
    const denied = requireSuperAdmin(request, env, user);
    return denied || listUsers(request, env);
  }
  if (url.pathname === "/api/users/invite" && request.method === "POST") {
    const denied = requireSuperAdmin(request, env, user);
    return denied || inviteUser(request, env);
  }

  const invitationMatch = url.pathname.match(
    /^\/api\/users\/([^/]+)\/invitation$/,
  );
  if (invitationMatch && request.method === "DELETE") {
    const denied = requireSuperAdmin(request, env, user);
    return denied || cancelInvitation(request, env, invitationMatch[1]);
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
    const headers = new Headers(request.headers);
    if (!headers.has("X-Request-Id")) {
      headers.set("X-Request-Id", crypto.randomUUID());
    }
    const identifiedRequest = new Request(request, { headers });
    try {
      return await handle(identifiedRequest, env);
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "request failed",
          requestId: headers.get("X-Request-Id"),
          method: identifiedRequest.method,
          path: new URL(identifiedRequest.url).pathname,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return json(
        identifiedRequest,
        env,
        { error: "O servidor não conseguiu concluir a operação." },
        500,
      );
    }
  },
} satisfies ExportedHandler<Env>;
