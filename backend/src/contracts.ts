export type Role = "super_admin" | "evaluator";
export type UserStatus = "invited" | "active" | "disabled";
export type EvaluationType = "teórica" | "técnica" | "kata";
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
};

export type EvaluationInput = {
  id?: string;
  studentId: string;
  belt: string;
  type: EvaluationType;
  score: number;
  result?: string;
  matrixId?: string;
  detail?: string;
  items?: EvaluationItemInput[];
};

export type EvaluationItemInput = {
  category: string;
  name: string;
  score: number;
  detail?: string;
};

export type EvaluationItemRow = {
  id: string;
  evaluation_id: string;
  category: string;
  name: string;
  score: number;
  detail: string | null;
  position: number;
};

export type EvaluationRow = {
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
  items?: EvaluationItemRow[];
};

export type StudentRow = {
  id: string;
  name: string;
  normalized_name: string;
  created_at: string;
};
