export function theoryExamsEnabled(env: Pick<Env, "THEORY_EXAMS_ENABLED">) {
  return env.THEORY_EXAMS_ENABLED.trim().toLowerCase() === "true";
}
