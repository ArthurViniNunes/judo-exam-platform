import type { AuthUser } from "./contracts";
import { json } from "./http";
import { theoryBelt } from "./theory-domain";

type EligibilityRow = {
  id: string;
  belt_id: string;
  belt_name: string;
  valid_from: string;
  valid_until: string | null;
  revoked_at: string | null;
};

export type EligibilityStatus = "active" | "expired" | "revoked";

function databaseDate(value: string) {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(" ", "T")}Z`);
}

export function eligibilityStatus(
  eligibility: Pick<EligibilityRow, "valid_until" | "revoked_at">,
  now = new Date(),
): EligibilityStatus {
  if (eligibility.revoked_at) return "revoked";
  if (
    eligibility.valid_until &&
    databaseDate(eligibility.valid_until).getTime() <= now.getTime()
  ) {
    return "expired";
  }
  return "active";
}

function formatEligibility(row: EligibilityRow, now: Date) {
  return {
    id: row.id,
    beltId: row.belt_id,
    beltName: row.belt_name,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    revokedAt: row.revoked_at,
    status: eligibilityStatus(row, now),
  };
}

export async function getStudentProfile(
  request: Request,
  env: Env,
  user: AuthUser,
) {
  if (!user.student_id) {
    return json(
      request,
      env,
      { error: "Sua conta ainda não está vinculada a um cadastro de aluno." },
      409,
    );
  }

  const student = await env.DB.prepare(
    "SELECT id, name, created_at, target_belt_id, target_belt_name, target_belt_set_at FROM students WHERE id = ? AND user_id = ?",
  )
    .bind(user.student_id, user.id)
    .first<{
      id: string;
      name: string;
      created_at: string;
      target_belt_id: string | null;
      target_belt_name: string | null;
      target_belt_set_at: string | null;
    }>();

  if (!student) {
    return json(
      request,
      env,
      { error: "Não foi possível localizar seu cadastro de aluno." },
      404,
    );
  }

  const result = await env.DB.prepare(
    `SELECT id, belt_id, belt_name, valid_from, valid_until, revoked_at
       FROM student_eligibilities
      WHERE student_id = ?
      ORDER BY valid_from DESC`,
  )
    .bind(student.id)
    .all<EligibilityRow>();
  const now = new Date();
  const eligibilityHistory = result.results.map((row) =>
    formatEligibility(row, now),
  );

  return json(request, env, {
    student: {
      id: student.id,
      name: student.name,
      createdAt: student.created_at,
      targetBeltId: student.target_belt_id,
      targetBeltName: student.target_belt_name,
      targetBeltSetAt: student.target_belt_set_at,
    },
    currentEligibility:
      eligibilityHistory.find((eligibility) => eligibility.status === "active") ??
      null,
    eligibilityHistory,
  });
}

export async function updateStudentTargetBelt(
  request: Request,
  env: Env,
  user: AuthUser,
) {
  if (!user.student_id) {
    return json(
      request,
      env,
      { error: "Sua conta ainda não está vinculada a um cadastro de aluno." },
      409,
    );
  }
  const body = await request.json<{ beltId?: string }>();
  const belt = theoryBelt(body.beltId);
  if (!belt) {
    return json(request, env, { error: "Selecione uma graduação válida." }, 400);
  }

  const attempt = await env.DB.prepare(
    "SELECT id FROM theory_attempts WHERE student_id = ? LIMIT 1",
  )
    .bind(user.student_id)
    .first<{ id: string }>();
  if (attempt) {
    return json(
      request,
      env,
      { error: "A graduação não pode ser alterada depois que uma prova foi iniciada." },
      409,
    );
  }

  const result = await env.DB.prepare(
    "UPDATE students SET target_belt_id = ?, target_belt_name = ?, target_belt_set_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
  )
    .bind(belt.id, belt.name, user.student_id, user.id)
    .run();
  if (!result.meta.changes) {
    return json(request, env, { error: "Cadastro de aluno não encontrado." }, 404);
  }

  await env.DB.prepare(
    "INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, request_id, metadata_json) VALUES (?, ?, 'student.target_belt_updated', 'student', ?, ?, ?)",
  )
    .bind(
      crypto.randomUUID(),
      user.id,
      user.student_id,
      request.headers.get("X-Request-Id") || "unidentified",
      JSON.stringify({ targetBeltId: belt.id }),
    )
    .run();

  return getStudentProfile(request, env, user);
}
