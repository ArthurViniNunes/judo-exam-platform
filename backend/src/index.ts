interface Env {
  DB: D1Database;
  FRONTEND_ORIGIN: string;
  SUPER_ADMIN_EMAIL?: string;
  SUPER_ADMIN_INITIAL_PASSWORD?: string;
}

type Role = "super_admin" | "evaluator";
type UserStatus = "invited" | "active" | "disabled";
type QuestionStatus = "Ativa" | "Rascunho";
type EvaluationType = "teórica" | "técnica" | "kata";
type KataType = "nage-no-kata-partial" | "nage-no-kata-complete" | "katame-no-kata";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
};

type QuestionInput = {
  belt: string;
  category: string;
  prompt: string;
  options: string[];
  answer: number;
  points: number;
  status: QuestionStatus;
};

type EvaluationInput = {
  id?: string;
  athlete: string;
  professor?: string;
  belt: string;
  type: EvaluationType;
  score: number;
  result?: string;
  matrixId?: string;
  detail?: string;
};

type MatrixCategoryInput = {
  name: string;
  techniques: string[];
};

type MatrixInput = {
  name: string;
  description?: string;
  hasKata: boolean;
  kataType?: KataType | null;
  minimumScore: number;
  maxCategoriesBelowFive: number;
  status?: "draft" | "active";
  categories: MatrixCategoryInput[];
};

type QuestionRow = Omit<QuestionInput, "options"> & {
  id: number;
  options: string;
  created_at: string;
};

type EvaluationRow = {
  id: string;
  athlete: string;
  student_id: string | null;
  evaluator_id: string | null;
  evaluator_name?: string | null;
  professor: string | null;
  belt: string;
  type: EvaluationType;
  score: number;
  result: string | null;
  matrix_id: string | null;
  detail: string | null;
  created_at: string;
};

const encoder = new TextEncoder();
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
};

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin");
  const configured = env.FRONTEND_ORIGIN || "*";
  const allowed = configured.split(",").map((item) => item.trim());
  const value = configured === "*" || !origin ? "*" : allowed.includes(origin) ? origin : "null";

  return {
    ...securityHeaders,
    "Access-Control-Allow-Origin": value,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(request: Request, env: Env, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders(request, env) });
}

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function normalizeName(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ");
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  return new Uint8Array(
    (hex.match(/.{1,2}/g) ?? []).map((pair) => Number.parseInt(pair, 16)),
  );
}

function randomHex(size = 32) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(size)));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function derivePassword(password: string, saltHex?: string) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 },
    key,
    256,
  );
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}

function secureEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function validPassword(password: string) {
  return password.length >= 10 && /[A-Za-zÀ-ÿ]/.test(password) && /\d/.test(password);
}

function publicUser(user: AuthUser) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

async function ensureSuperAdmin(env: Env) {
  const email = normalizeEmail(env.SUPER_ADMIN_EMAIL || "");
  const password = env.SUPER_ADMIN_INITIAL_PASSWORD;
  if (!email || !password) return;
  const existing = await env.DB.prepare("SELECT id, password_hash FROM users WHERE email = ?").bind(email).first<{ id: string; password_hash: string | null }>();
  if (existing?.password_hash) return;
  const credentials = await derivePassword(password);
  if (existing) {
    await env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ?, role = 'super_admin', status = 'active' WHERE id = ?")
      .bind(credentials.hash, credentials.salt, existing.id).run();
    return;
  }
  await env.DB.prepare("INSERT INTO users (id, email, name, password_hash, password_salt, role, status) VALUES (?, ?, ?, ?, ?, 'super_admin', 'active')")
    .bind(crypto.randomUUID(), email, "Super Admin", credentials.hash, credentials.salt).run();
}

async function createSession(env: Env, userId: string) {
  const token = randomHex();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(tokenHash, userId, expiresAt).run();
  return { token, expiresAt };
}

async function authenticate(request: Request, env: Env): Promise<AuthUser | null> {
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return null;
  return env.DB.prepare(`SELECT users.id, users.email, users.name, users.role, users.status FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.status = 'active'`)
    .bind(await sha256(token), new Date().toISOString()).first<AuthUser>();
}

function requireSuperAdmin(request: Request, env: Env, user: AuthUser) {
  return user.role === "super_admin" ? null : json(request, env, { error: "Esta ação exige acesso de Super Admin." }, 403);
}

function questionFromRow(row: QuestionRow) {
  return { ...row, options: JSON.parse(row.options) as string[] };
}

function isQuestion(value: unknown): value is QuestionInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<QuestionInput>;

  return Boolean(
    item.belt?.trim() &&
      item.category?.trim() &&
      item.prompt?.trim() &&
      Array.isArray(item.options) &&
      item.options.length >= 2 &&
      item.options.every(
        (option) => typeof option === "string" && option.trim(),
      ) &&
      Number.isInteger(item.answer) &&
      item.answer! >= 0 &&
      item.answer! < item.options.length &&
      Number.isFinite(item.points) &&
      item.points! > 0 &&
      (item.status === "Ativa" || item.status === "Rascunho"),
  );
}

function isEvaluation(value: unknown): value is EvaluationInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<EvaluationInput>;

  return Boolean(
    item.athlete?.trim() &&
      item.belt?.trim() &&
      (item.type === "teórica" || item.type === "técnica" || item.type === "kata") &&
      typeof item.score === "number" &&
      item.score >= 0 &&
      item.score <= 100,
  );
}

function isMatrix(value: unknown): value is MatrixInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MatrixInput>;

  return Boolean(
    item.name?.trim() &&
      typeof item.hasKata === "boolean" &&
      Number.isFinite(item.minimumScore) &&
      item.minimumScore! >= 0 &&
      item.minimumScore! <= 10 &&
      Number.isInteger(item.maxCategoriesBelowFive) &&
      item.maxCategoriesBelowFive! >= 0 &&
      Array.isArray(item.categories) &&
      item.categories.length > 0 &&
      item.categories.every(
        (category) =>
          category.name?.trim() &&
          Array.isArray(category.techniques) &&
          category.techniques.some((technique) => technique.trim()),
      ) &&
      (!item.hasKata ||
        ["nage-no-kata-partial", "nage-no-kata-complete", "katame-no-kata"].includes(
          item.kataType || "",
        )),
  );
}

async function login(request: Request, env: Env) {
  await ensureSuperAdmin(env);
  const body = await request.json<{ email?: string; password?: string }>();
  const user = await env.DB
    .prepare(
      "SELECT id, email, name, role, status, password_hash, password_salt FROM users WHERE email = ?",
    )
    .bind(normalizeEmail(body.email || ""))
    .first<AuthUser & { password_hash: string | null; password_salt: string | null }>();

  if (!user?.password_hash || !user.password_salt || user.status !== "active") {
    return json(request, env, { error: "E-mail ou senha inválidos." }, 401);
  }

  const candidate = await derivePassword(body.password || "", user.password_salt);
  if (!secureEqual(candidate.hash, user.password_hash)) {
    return json(request, env, { error: "E-mail ou senha inválidos." }, 401);
  }

  const session = await createSession(env, user.id);
  await env.DB
    .prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(user.id)
    .run();

  return json(request, env, { ...session, user: publicUser(user) });
}

async function register(request: Request, env: Env) {
  await ensureSuperAdmin(env);
  const body = await request.json<{ name?: string; email?: string; password?: string }>();
  const name = body.name?.trim() || "";
  const email = normalizeEmail(body.email || "");
  const password = body.password || "";
  if (name.length < 3 || !email.includes("@")) {
    return json(request, env, { error: "Informe seu nome completo e um e-mail válido." }, 400);
  }
  if (!validPassword(password)) {
    return json(
      request,
      env,
      { error: "A senha deve ter pelo menos 10 caracteres, uma letra e um número." },
      400,
    );
  }

  const invited = await env.DB
    .prepare("SELECT id, email, role, status, password_hash FROM users WHERE email = ?")
    .bind(email)
    .first<{
      id: string;
      email: string;
      role: Role;
      status: AuthUser["status"];
      password_hash: string | null;
    }>();

  if (!invited) {
    return json(
      request,
      env,
      { error: "Este e-mail ainda não foi autorizado. Peça ao Super Admin para adicioná-lo." },
      403,
    );
  }
  if (invited.status === "disabled") {
    return json(request, env, { error: "Este acesso está desativado. Fale com o Super Admin." }, 403);
  }
  if (invited.password_hash) {
    return json(request, env, { error: "Esta conta já foi criada. Entre com sua senha." }, 409);
  }

  const credentials = await derivePassword(password);
  await env.DB
    .prepare(
      "UPDATE users SET name = ?, password_hash = ?, password_salt = ?, status = 'active', last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .bind(name, credentials.hash, credentials.salt, invited.id)
    .run();

  const session = await createSession(env, invited.id);
  return json(request, env, { ...session, user: { id: invited.id, email, name, role: invited.role } }, 201);
}

function formatEvaluation(row: EvaluationRow) {
  return {
    id: row.id,
    athlete: row.athlete,
    studentId: row.student_id,
    evaluatorId: row.evaluator_id,
    evaluatorName: row.evaluator_name || row.professor || "Não informado",
    belt: row.belt,
    type: row.type,
    score: row.score,
    result: row.result,
    matrixId: row.matrix_id,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

async function evaluationRows(env: Env, user: AuthUser, evaluatorId?: string | null) {
  const filterId = user.role === "super_admin" ? evaluatorId : user.id;
  const where = filterId ? "WHERE evaluations.evaluator_id = ?" : "";
  const statement = env.DB.prepare(
    `SELECT evaluations.*, users.name AS evaluator_name FROM evaluations LEFT JOIN users ON users.id = evaluations.evaluator_id ${where} ORDER BY evaluations.created_at DESC LIMIT 2000`,
  );
  const result = filterId ? await statement.bind(filterId).all<EvaluationRow>() : await statement.all<EvaluationRow>();
  return result.results;
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dashboardFromRows(rows: EvaluationRow[]) {
  const technicalRows = rows.filter((row) => row.type !== "kata");
  const approved = technicalRows.filter(
    (row) =>
      row.result?.toLocaleLowerCase("pt-BR").includes("aprov") ||
      (!row.result && row.score >= 70),
  ).length;
  const students = new Set(rows.map((row) => row.student_id || normalizeName(row.athlete)));
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - offset), 1),
    );

    return {
      key: monthKey(date),
      label: date
        .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
        .replace(".", ""),
      count: 0,
      average: 0,
      total: 0,
    };
  });

  for (const row of rows) {
    const date = new Date(
      row.created_at.endsWith("Z") ? row.created_at : `${row.created_at}Z`,
    );
    const month = months.find((item) => item.key === monthKey(date));
    if (month) {
      month.count += 1;
      month.total += row.score;
      month.average = Math.round(month.total / month.count);
    }
  }

  const byType = (["técnica", "kata", "teórica"] as EvaluationType[]).map((type) => {
    const matches = rows.filter((row) => row.type === type);
    const total = matches.reduce((sum, row) => sum + row.score, 0);

    return {
      type,
      count: matches.length,
      average: matches.length ? Math.round(total / matches.length) : 0,
    };
  });

  const totalScore = rows.reduce((sum, row) => sum + row.score, 0);
  return {
    summary: {
      evaluations: rows.length,
      students: students.size,
      average: rows.length ? Math.round(totalScore / rows.length) : 0,
      approvalRate: technicalRows.length
        ? Math.round((approved / technicalRows.length) * 100)
        : 0,
    },
    months,
    byType,
    recent: rows.slice(0, 8).map(formatEvaluation),
  };
}

async function listStudents(request: Request, env: Env, user: AuthUser, url: URL) {
  const rows = await evaluationRows(env, user, url.searchParams.get("evaluator"));
  const grouped = new Map<string, { id: string; name: string; evaluations: ReturnType<typeof formatEvaluation>[] }>();
  for (const row of rows) {
    const id = row.student_id || normalizeName(row.athlete);
    const current = grouped.get(id) ?? { id, name: row.athlete, evaluations: [] };
    current.evaluations.push(formatEvaluation(row)); grouped.set(id, current);
  }
  const students = Array.from(grouped.values()).map((student) => {
    const ordered = [...student.evaluations].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const first = ordered[0]?.score ?? 0; const last = ordered.at(-1)?.score ?? 0;
    return { ...student, average: Math.round(ordered.reduce((sum, item) => sum + item.score, 0) / ordered.length), latestScore: last, evolution: last - first, lastEvaluationAt: ordered.at(-1)?.createdAt, evaluations: ordered };
  }).sort((a, b) => new Date(b.lastEvaluationAt || 0).getTime() - new Date(a.lastEvaluationAt || 0).getTime());
  return json(request, env, students);
}

async function listMatrices(request: Request, env: Env, user: AuthUser) {
  const matrixResult = user.role === "super_admin"
    ? await env.DB.prepare("SELECT exam_matrices.*, users.name AS creator_name FROM exam_matrices JOIN users ON users.id = exam_matrices.created_by ORDER BY exam_matrices.created_at DESC").all<Record<string, unknown>>()
    : await env.DB.prepare("SELECT exam_matrices.*, users.name AS creator_name FROM exam_matrices JOIN users ON users.id = exam_matrices.created_by WHERE exam_matrices.status = 'active' ORDER BY exam_matrices.created_at DESC").all<Record<string, unknown>>();
  const categoryResult = await env.DB.prepare("SELECT * FROM matrix_categories ORDER BY position").all<{ id: string; matrix_id: string; name: string; position: number }>();
  const techniqueResult = await env.DB.prepare("SELECT * FROM matrix_techniques ORDER BY position").all<{ id: string; category_id: string; name: string; position: number }>();
  return json(request, env, matrixResult.results.map((matrix) => ({ id: matrix.id, name: matrix.name, description: matrix.description, hasKata: Boolean(matrix.has_kata), kataType: matrix.kata_type, minimumScore: matrix.minimum_score, maxCategoriesBelowFive: matrix.max_categories_below_five, status: matrix.status, creatorName: matrix.creator_name, createdAt: matrix.created_at, categories: categoryResult.results.filter((category) => category.matrix_id === matrix.id).map((category) => ({ id: category.id, name: category.name, techniques: techniqueResult.results.filter((technique) => technique.category_id === category.id).map((technique) => technique.name) })) })));
}

async function createMatrix(request: Request, env: Env, user: AuthUser) {
  const body: unknown = await request.json();
  if (!isMatrix(body)) return json(request, env, { error: "Revise o nome, as regras e informe ao menos uma técnica por categoria." }, 400);
  const id = crypto.randomUUID();
  const statements = [env.DB.prepare(`INSERT INTO exam_matrices (id, name, description, has_kata, kata_type, minimum_score, max_categories_below_five, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.name.trim(), body.description?.trim() || null, Number(body.hasKata), body.hasKata ? body.kataType : null, body.minimumScore, body.maxCategoriesBelowFive, body.status || "active", user.id)];
  body.categories.forEach((category, categoryIndex) => {
    const categoryId = crypto.randomUUID();
    statements.push(env.DB.prepare("INSERT INTO matrix_categories (id, matrix_id, name, position) VALUES (?, ?, ?, ?)").bind(categoryId, id, category.name.trim(), categoryIndex));
    category.techniques.map((technique) => technique.trim()).filter(Boolean).forEach((technique, techniqueIndex) => statements.push(env.DB.prepare("INSERT INTO matrix_techniques (id, category_id, name, position) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), categoryId, technique, techniqueIndex)));
  });
  await env.DB.batch(statements);
  return json(request, env, { id }, 201);
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request, env),
    });
  }
  if (url.pathname === "/" && request.method === "GET") {
    return json(request, env, { name: "Judo Exam API", status: "ok", health: "/health" });
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

  const user = await authenticate(request, env);
  if (!user) {
    return json(request, env, { error: "Sua sessão expirou. Entre novamente." }, 401);
  }
  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    return json(request, env, { user: publicUser(user) });
  }
  if (url.pathname === "/api/auth/profile" && request.method === "PATCH") {
    const body = await request.json<{ name?: string }>();
    const name = body.name?.trim().replace(/\s+/g, " ") || "";
    if (name.length < 3 || name.length > 80) {
      return json(request, env, { error: "Informe um nome entre 3 e 80 caracteres." }, 400);
    }
    await env.DB
      .prepare("UPDATE users SET name = ? WHERE id = ?")
      .bind(name, user.id)
      .run();
    return json(request, env, { user: publicUser({ ...user, name }) });
  }
  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    const token = request.headers.get("Authorization")?.slice(7).trim();
    if (token) {
      await env.DB
        .prepare("DELETE FROM sessions WHERE token_hash = ?")
        .bind(await sha256(token))
        .run();
    }
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request, env),
    });
  }
  if (url.pathname === "/api/dashboard" && request.method === "GET") {
    const rows = await evaluationRows(env, user, url.searchParams.get("evaluator"));
    return json(request, env, dashboardFromRows(rows));
  }
  if (url.pathname === "/api/students" && request.method === "GET") {
    return listStudents(request, env, user, url);
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
    if (denied) return denied;
    const result = await env.DB
      .prepare(
        `SELECT users.id, users.email, users.name, users.role, users.status, users.created_at, users.last_login_at, COUNT(evaluations.id) AS evaluation_count, COUNT(DISTINCT evaluations.student_id) AS student_count, COALESCE(ROUND(AVG(evaluations.score)), 0) AS average_score FROM users LEFT JOIN evaluations ON evaluations.evaluator_id = users.id GROUP BY users.id ORDER BY users.role, users.name`,
      )
      .all();
    return json(request, env, result.results);
  }
  if (url.pathname === "/api/users/invite" && request.method === "POST") {
    const denied = requireSuperAdmin(request, env, user);
    if (denied) return denied;
    const body = await request.json<{ email?: string; name?: string }>();
    const email = normalizeEmail(body.email || "");
    if (!email.includes("@")) {
      return json(request, env, { error: "Informe um e-mail válido." }, 400);
    }
    const existing = await env.DB
      .prepare("SELECT id FROM users WHERE email = ?")
      .bind(email)
      .first();
    if (existing) {
      return json(request, env, { error: "Este e-mail já está cadastrado ou convidado." }, 409);
    }
    const invited = {
      id: crypto.randomUUID(),
      email,
      name: body.name?.trim() || "Avaliador convidado",
    };
    await env.DB
      .prepare("INSERT INTO users (id, email, name, role, status) VALUES (?, ?, ?, 'evaluator', 'invited')")
      .bind(invited.id, invited.email, invited.name)
      .run();
    return json(request, env, { ...invited, role: "evaluator", status: "invited" }, 201);
  }
  const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && request.method === "PATCH") {
    const denied = requireSuperAdmin(request, env, user);
    if (denied) return denied;
    if (userMatch[1] === user.id) {
      return json(request, env, { error: "O Super Admin não pode desativar a própria conta." }, 400);
    }
    const body = await request.json<{ status?: "active" | "disabled" }>();
    if (!body.status || !["active", "disabled"].includes(body.status)) {
      return json(request, env, { error: "Status inválido." }, 400);
    }
    await env.DB
      .prepare("UPDATE users SET status = ? WHERE id = ? AND role = 'evaluator'")
      .bind(body.status, userMatch[1])
      .run();
    return json(request, env, { ok: true });
  }

  if (url.pathname === "/api/evaluations" && request.method === "GET") {
    const rows = await evaluationRows(env, user, url.searchParams.get("evaluator"));
    return json(request, env, rows.map(formatEvaluation));
  }
  if (url.pathname === "/api/evaluations" && request.method === "POST") {
    const body: unknown = await request.json();
    if (!isEvaluation(body)) {
      return json(request, env, { error: "Os dados da avaliação são inválidos." }, 400);
    }
    const id = body.id || crypto.randomUUID();
    const duplicate = await env.DB
      .prepare("SELECT * FROM evaluations WHERE id = ? AND evaluator_id = ?")
      .bind(id, user.id)
      .first<EvaluationRow>();
    if (duplicate) return json(request, env, formatEvaluation(duplicate));

    const normalized = normalizeName(body.athlete);
    let student = await env.DB
      .prepare("SELECT id FROM students WHERE normalized_name = ?")
      .bind(normalized)
      .first<{ id: string }>();
    if (!student) {
      student = { id: crypto.randomUUID() };
      await env.DB
        .prepare("INSERT INTO students (id, name, normalized_name) VALUES (?, ?, ?)")
        .bind(student.id, body.athlete.trim(), normalized)
        .run();
    }

    const row = await env.DB
      .prepare(
        `INSERT INTO evaluations (id, athlete, student_id, evaluator_id, professor, belt, type, score, result, matrix_id, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      )
      .bind(
        id,
        body.athlete.trim(),
        student.id,
        user.id,
        user.name,
        body.belt.trim(),
        body.type,
        Math.round(body.score),
        body.result?.trim() || null,
        body.matrixId || null,
        body.detail?.trim() || null,
      )
      .first<EvaluationRow>();
    return json(request, env, formatEvaluation({ ...row!, evaluator_name: user.name }), 201);
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
    const denied = requireSuperAdmin(request, env, user);
    if (denied) return denied;
    const body: unknown = await request.json();
    if (!isQuestion(body)) {
      return json(request, env, { error: "Os dados da questão são inválidos." }, 400);
    }
    const row = await env.DB
      .prepare(
        "INSERT INTO questions (belt, category, prompt, options, answer, points, status) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *",
      )
      .bind(
        body.belt.trim(),
        body.category.trim(),
        body.prompt.trim(),
        JSON.stringify(body.options),
        body.answer,
        body.points,
        body.status,
      )
      .first<QuestionRow>();
    return json(request, env, questionFromRow(row!), 201);
  }
  const questionMatch = url.pathname.match(/^\/api\/questions\/(\d+)$/);
  if (questionMatch && request.method === "DELETE") {
    const denied = requireSuperAdmin(request, env, user);
    if (denied) return denied;
    const result = await env.DB
      .prepare("DELETE FROM questions WHERE id = ?")
      .bind(Number(questionMatch[1]))
      .run();
    if (!result.meta.changes) {
      return json(request, env, { error: "Questão não encontrada." }, 404);
    }
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request, env),
    });
  }
  return json(request, env, { error: "Rota não encontrada." }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch (error) {
      console.error(error);
      return json(
        request,
        env,
        { error: "O servidor não conseguiu concluir a operação." },
        500,
      );
    }
  },
} satisfies ExportedHandler<Env>;
