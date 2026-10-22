import type { AuthUser, Role, UserStatus } from "./contracts";
import {
  activeRoleForContext,
  isValidEmail,
  normalizeEmail,
  normalizeName,
  publicUser,
  rolesFromCsv,
} from "./domain";
import { json } from "./http";
import {
  createSession,
  derivePassword,
  secureEqual,
  validPassword,
} from "./security";
import { theoryBelt } from "./theory-domain";

type CredentialUser = {
  id: string;
  email: string;
  name: string;
  evaluator_rank: string | null;
  status: UserStatus;
  password_hash: string | null;
  password_salt: string | null;
  student_id: string | null;
  active_roles: string | null;
  student_role_status: UserStatus | null;
  evaluator_role_status: UserStatus | null;
};

function credentialUserByEmail(env: Env, email: string) {
  return env.DB.prepare(
    `SELECT users.id, users.email, users.name, users.evaluator_rank,
            users.status, users.password_hash, users.password_salt,
            students.id AS student_id,
            (SELECT GROUP_CONCAT(user_roles.role)
               FROM user_roles
              WHERE user_roles.user_id = users.id
                AND user_roles.status = 'active') AS active_roles,
            (SELECT status FROM user_roles
              WHERE user_roles.user_id = users.id
                AND user_roles.role = 'student') AS student_role_status,
            (SELECT status FROM user_roles
              WHERE user_roles.user_id = users.id
                AND user_roles.role = 'evaluator') AS evaluator_role_status
       FROM users
       LEFT JOIN students ON students.user_id = users.id
      WHERE users.email = ?`,
  )
    .bind(email)
    .first<CredentialUser>();
}

function validateRegistration(
  request: Request,
  env: Env,
  body: { name?: string; email?: string; password?: string },
):
  | { valid: true; name: string; email: string; password: string; beltId: string; beltName: string }
  | { valid: false; response: Response } {
  const name = body.name?.trim().replace(/\s+/g, " ") || "";
  const email = normalizeEmail(body.email || "");
  const password = body.password || "";
  const belt = theoryBelt((body as { beltId?: string }).beltId);
  if (name.length < 3 || name.length > 80 || !isValidEmail(email)) {
    return {
      valid: false,
      response: json(
        request,
        env,
        { error: "Informe seu nome completo e um e-mail válido." },
        400,
      ),
    };
  }
  if (!validPassword(password)) {
    return {
      valid: false,
      response: json(
        request,
        env,
        {
          error:
            "A senha deve ter pelo menos 10 caracteres, uma letra e um número.",
        },
        400,
      ),
    };
  }
  if (!belt) {
    return {
      valid: false,
      response: json(
        request,
        env,
        { error: "Selecione a graduação que você pretende alcançar." },
        400,
      ),
    };
  }
  return {
    valid: true,
    name,
    email,
    password,
    beltId: belt.id,
    beltName: belt.name,
  };
}

export async function registerStudent(request: Request, env: Env) {
  const body = await request.json<{
    name?: string;
    email?: string;
    password?: string;
    beltId?: string;
  }>();
  const input = validateRegistration(request, env, body);
  if (!input.valid) return input.response;

  const { name, email, password, beltId, beltName } = input;
  const normalizedName = normalizeName(name);
  const [existingUser, existingStudent] = await Promise.all([
    credentialUserByEmail(env, email),
    env.DB.prepare(
      "SELECT id, name, user_id FROM students WHERE normalized_name = ?",
    )
      .bind(normalizedName)
      .first<{ id: string; name: string; user_id: string | null }>(),
  ]);

  if (existingUser?.status === "disabled") {
    return json(
      request,
      env,
      { error: "Esta conta está desativada. Fale com o responsável pela associação." },
      403,
    );
  }
  if (existingUser?.student_role_status === "disabled") {
    return json(
      request,
      env,
      { error: "O acesso de aluno desta conta está desativado." },
      403,
    );
  }
  if (existingUser?.student_role_status === "active" || existingUser?.student_id) {
    return json(
      request,
      env,
      { error: "Sua conta de aluno já existe. Entre com sua senha." },
      409,
    );
  }
  if (existingStudent && existingStudent.user_id !== existingUser?.id) {
    return json(
      request,
      env,
      {
        error:
          "Já existe um judoca com este nome. Peça ao responsável para vincular o cadastro correto.",
      },
      409,
    );
  }

  if (existingUser?.password_hash && existingUser.password_salt) {
    const candidate = await derivePassword(password, existingUser.password_salt);
    if (!secureEqual(candidate.hash, existingUser.password_hash)) {
      return json(
        request,
        env,
        { error: "Este e-mail já possui uma conta. Use a mesma senha cadastrada." },
        401,
      );
    }
  }

  const userId = existingUser?.id ?? crypto.randomUUID();
  const studentId = existingStudent?.id ?? crypto.randomUUID();
  const credentials = existingUser?.password_hash
    ? null
    : await derivePassword(password);
  const statements: D1PreparedStatement[] = [];

  if (existingUser) {
    statements.push(
      credentials
        ? env.DB.prepare(
            "UPDATE users SET name = ?, password_hash = ?, password_salt = ?, status = 'active', last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
          ).bind(name, credentials.hash, credentials.salt, userId)
        : env.DB.prepare(
            "UPDATE users SET name = ?, status = 'active', last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
          ).bind(name, userId),
    );
  } else {
    statements.push(
      env.DB.prepare(
        "INSERT INTO users (id, email, name, password_hash, password_salt, role, status, last_login_at) VALUES (?, ?, ?, ?, ?, 'evaluator', 'active', CURRENT_TIMESTAMP)",
      ).bind(userId, email, name, credentials!.hash, credentials!.salt),
    );
  }

  statements.push(
    env.DB.prepare(
      "INSERT INTO user_roles (user_id, role, status, updated_at) VALUES (?, 'student', 'active', CURRENT_TIMESTAMP) ON CONFLICT(user_id, role) DO UPDATE SET status = 'active', updated_at = CURRENT_TIMESTAMP",
    ).bind(userId),
  );
  if (existingUser?.evaluator_role_status === "invited") {
    statements.push(
      env.DB.prepare(
        "UPDATE user_roles SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND role = 'evaluator'",
      ).bind(userId),
    );
  }
  if (existingStudent) {
    statements.push(
      env.DB.prepare("UPDATE students SET name = ?, user_id = ?, target_belt_id = ?, target_belt_name = ?, target_belt_set_at = CURRENT_TIMESTAMP WHERE id = ?").bind(
        name,
        userId,
        beltId,
        beltName,
        studentId,
      ),
    );
  } else {
    statements.push(
      env.DB.prepare(
        "INSERT INTO students (id, name, normalized_name, user_id, target_belt_id, target_belt_name, target_belt_set_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
      ).bind(studentId, name, normalizedName, userId, beltId, beltName),
    );
  }
  statements.push(
    env.DB.prepare(
      "INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, request_id, metadata_json) VALUES (?, ?, 'student.registered', 'student', ?, ?, ?)",
    ).bind(
      crypto.randomUUID(),
      userId,
      studentId,
      request.headers.get("X-Request-Id") || "unidentified",
      JSON.stringify({ selfRegistration: true, targetBeltId: beltId }),
    ),
  );
  await env.DB.batch(statements);

  const rolesResult = await env.DB.prepare(
    "SELECT role FROM user_roles WHERE user_id = ? AND status = 'active' ORDER BY role",
  )
    .bind(userId)
    .all<{ role: Role }>();
  const roles = rolesResult.results.map((entry) => entry.role);
  const user: AuthUser = {
    id: userId,
    email,
    name,
    evaluator_rank: existingUser?.evaluator_rank ?? null,
    role: "student",
    roles,
    context: "student",
    student_id: studentId,
    status: "active",
  };
  const session = await createSession(env, userId, "student");
  return json(request, env, { ...session, user: publicUser(user) }, 201);
}

export async function loginStudent(request: Request, env: Env) {
  const body = await request.json<{ email?: string; password?: string }>();
  const user = await credentialUserByEmail(env, normalizeEmail(body.email || ""));
  const roles = rolesFromCsv(user?.active_roles);
  const role = activeRoleForContext(roles, "student");
  if (
    !user?.password_hash ||
    !user.password_salt ||
    user.status !== "active" ||
    !user.student_id ||
    !role
  ) {
    return json(request, env, { error: "E-mail ou senha inválidos." }, 401);
  }

  const candidate = await derivePassword(body.password || "", user.password_salt);
  if (!secureEqual(candidate.hash, user.password_hash)) {
    return json(request, env, { error: "E-mail ou senha inválidos." }, 401);
  }

  const authenticatedUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    evaluator_rank: user.evaluator_rank,
    role,
    roles,
    context: "student",
    student_id: user.student_id,
    status: user.status,
  };
  const session = await createSession(env, user.id, "student");
  await env.DB.prepare(
    "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
  )
    .bind(user.id)
    .run();
  return json(request, env, { ...session, user: publicUser(authenticatedUser) });
}
