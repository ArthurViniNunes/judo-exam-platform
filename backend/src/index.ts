interface Env {
  DB: D1Database;
  FRONTEND_ORIGIN: string;
}

type QuestionInput = {
  belt: string;
  category: string;
  prompt: string;
  options: string[];
  answer: number;
  points: number;
  status: "Ativa" | "Rascunho";
};

type EvaluationInput = {
  athlete: string;
  professor?: string;
  belt: string;
  type: "teórica" | "técnica";
  score: number;
  detail?: string;
};

type QuestionRow = Omit<QuestionInput, "options"> & {
  id: number;
  options: string;
  created_at: string;
};

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin");
  const configured = env.FRONTEND_ORIGIN || "*";
  const allowed = configured.split(",").map((item) => item.trim());
  const value = configured === "*" || !origin ? "*" : allowed.includes(origin) ? origin : "null";

  return {
    ...securityHeaders,
    "Access-Control-Allow-Origin": value,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(request: Request, env: Env, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders(request, env) });
}

function questionFromRow(row: QuestionRow) {
  return { ...row, options: JSON.parse(row.options) as string[] };
}

function isQuestion(value: unknown): value is QuestionInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<QuestionInput>;
  return (
    typeof item.belt === "string" && item.belt.trim().length > 0 &&
    typeof item.category === "string" && item.category.trim().length > 0 &&
    typeof item.prompt === "string" && item.prompt.trim().length > 0 &&
    Array.isArray(item.options) && item.options.length >= 2 &&
    item.options.every((option) => typeof option === "string" && option.trim().length > 0) &&
    Number.isInteger(item.answer) && item.answer! >= 0 && item.answer! < item.options.length &&
    Number.isFinite(item.points) && item.points! > 0 &&
    (item.status === "Ativa" || item.status === "Rascunho")
  );
}

function isEvaluation(value: unknown): value is EvaluationInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<EvaluationInput>;
  return (
    typeof item.athlete === "string" && item.athlete.trim().length > 0 &&
    typeof item.belt === "string" && item.belt.trim().length > 0 &&
    (item.type === "teórica" || item.type === "técnica") &&
    typeof item.score === "number" && item.score >= 0 && item.score <= 100 &&
    (item.professor === undefined || typeof item.professor === "string") &&
    (item.detail === undefined || typeof item.detail === "string")
  );
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });

  if (url.pathname === "/" && request.method === "GET") {
    return json(request, env, { name: "Judo Exam API", status: "ok", health: "/health" });
  }

  if (url.pathname === "/health" && request.method === "GET") {
    await env.DB.prepare("SELECT 1").first();
    return json(request, env, { status: "ok", database: "ok" });
  }

  if (url.pathname === "/api/questions" && request.method === "GET") {
    const belt = url.searchParams.get("belt");
    const statement = belt
      ? env.DB.prepare("SELECT * FROM questions WHERE belt = ? ORDER BY id").bind(belt)
      : env.DB.prepare("SELECT * FROM questions ORDER BY id");
    const result = await statement.all<QuestionRow>();
    return json(request, env, result.results.map(questionFromRow));
  }

  if (url.pathname === "/api/questions" && request.method === "POST") {
    const body: unknown = await request.json();
    if (!isQuestion(body)) return json(request, env, { error: "Dados da questão são inválidos." }, 400);

    const row = await env.DB.prepare(
      `INSERT INTO questions (belt, category, prompt, options, answer, points, status)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    ).bind(body.belt.trim(), body.category.trim(), body.prompt.trim(), JSON.stringify(body.options), body.answer, body.points, body.status)
      .first<QuestionRow>();
    return json(request, env, questionFromRow(row!), 201);
  }

  const questionMatch = url.pathname.match(/^\/api\/questions\/(\d+)$/);
  if (questionMatch && request.method === "DELETE") {
    const result = await env.DB.prepare("DELETE FROM questions WHERE id = ?").bind(Number(questionMatch[1])).run();
    if (!result.meta.changes) return json(request, env, { error: "Questão não encontrada." }, 404);
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  if (url.pathname === "/api/evaluations" && request.method === "GET") {
    const result = await env.DB.prepare("SELECT * FROM evaluations ORDER BY created_at DESC LIMIT 100").all();
    return json(request, env, result.results);
  }

  if (url.pathname === "/api/evaluations" && request.method === "POST") {
    const body: unknown = await request.json();
    if (!isEvaluation(body)) return json(request, env, { error: "Dados da avaliação são inválidos." }, 400);
    const id = crypto.randomUUID();
    const row = await env.DB.prepare(
      `INSERT INTO evaluations (id, athlete, professor, belt, type, score, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    ).bind(id, body.athlete.trim(), body.professor?.trim() || null, body.belt.trim(), body.type, Math.round(body.score), body.detail?.trim() || null)
      .first();
    return json(request, env, row, 201);
  }

  return json(request, env, { error: "Rota não encontrada." }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch (error) {
      console.error(error);
      return json(request, env, { error: "Erro interno da API." }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
