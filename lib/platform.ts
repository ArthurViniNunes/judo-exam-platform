export type UserRole = "super_admin" | "evaluator";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type EvaluationRecord = {
  id: string;
  athlete: string;
  studentId: string | null;
  evaluatorId: string | null;
  evaluatorName: string;
  belt: string;
  type: "teórica" | "técnica" | "kata";
  score: number;
  result: string | null;
  matrixId: string | null;
  detail: string | null;
  createdAt: string;
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
  lastEvaluationAt: string;
  evaluations: EvaluationRecord[];
};

export type ExamMatrix = {
  id: string;
  name: string;
  description: string | null;
  hasKata: boolean;
  kataType: "nage-no-kata-partial" | "nage-no-kata-complete" | "katame-no-kata" | null;
  minimumScore: number;
  maxCategoriesBelowFive: number;
  status: "draft" | "active" | "archived";
  creatorName: string;
  createdAt: string;
  categories: { id: string; name: string; techniques: string[] }[];
};

export type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: "invited" | "active" | "disabled";
  created_at: string;
  last_login_at: string | null;
  evaluation_count: number;
  student_count: number;
  average_score: number;
};
