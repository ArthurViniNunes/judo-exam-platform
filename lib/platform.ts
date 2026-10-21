export type UserRole = "super_admin" | "evaluator";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  evaluatorRank: string | null;
  role: UserRole;
};

export type EvaluationRecord = {
  id: string;
  athlete: string;
  studentId: string | null;
  evaluatorId: string | null;
  evaluatorName: string;
  evaluatorRank: string | null;
  belt: string;
  type: "teórica" | "técnica" | "kata";
  score: number;
  result: string | null;
  matrixId: string | null;
  detail: string | null;
  createdAt: string;
  categories: EvaluationCategoryRecord[];
  items: EvaluationItemRecord[];
};

export type EvaluationCategoryRecord = {
  id: string;
  name: string;
  score: number;
};

export type EvaluationItemPartRecord = {
  id: string;
  name: string;
  score: number;
};

export type EvaluationItemRecord = {
  id: string;
  category: string;
  name: string;
  score: number;
  detail: string | null;
  parts: EvaluationItemPartRecord[];
};

export type DashboardData = {
  summary: { evaluations: number; students: number; average: number; approvalRate: number };
  months: { key: string; label: string; count: number; average: number }[];
  byType: { type: string; count: number; average: number }[];
  recent: EvaluationRecord[];
};

export type StudentRecord = {
  id: string;
  name: string;
  average: number;
  latestScore: number;
  evolution: number;
  lastEvaluationAt: string | null;
  evaluations: EvaluationRecord[];
};

export type ExamStudent = Pick<StudentRecord, "id" | "name">;

export type ThemeSettings = {
  lightAccent: string;
  darkAccent: string;
  darkBackground: string;
};

export type ManagedUser = {
  id: string;
  email: string;
  name: string;
  evaluator_rank: string | null;
  role: UserRole;
  status: "invited" | "active" | "disabled";
  created_at: string;
  last_login_at: string | null;
  evaluation_count: number;
  student_count: number;
  average_score: number;
};
