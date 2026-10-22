import type { AuthUser } from "./contracts";
import { json } from "./http";

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
    "SELECT id, name, created_at FROM students WHERE id = ? AND user_id = ?",
  )
    .bind(user.student_id, user.id)
    .first<{ id: string; name: string; created_at: string }>();

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
    },
    currentEligibility:
      eligibilityHistory.find((eligibility) => eligibility.status === "active") ??
      null,
    eligibilityHistory,
  });
}
