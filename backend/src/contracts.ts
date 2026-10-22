export type Role = "super_admin" | "evaluator" | "student";
export type ProfessionalRole = Exclude<Role, "student">;
export type SessionContext = "professional" | "student";
export type UserStatus = "invited" | "active" | "disabled";
export type EvaluationType = "teórica" | "técnica" | "kata";
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  evaluator_rank: string | null;
  role: Role;
  roles: Role[];
  context: SessionContext;
  student_id: string | null;
  status: UserStatus;
};

export type EvaluationInput = {
  id?: string;
  studentId: string;
  beltId?: string;
  belt: string;
  type: EvaluationType;
  score: number;
  result?: string;
  matrixId?: string;
  detail?: string;
  categories?: EvaluationCategoryInput[];
  items?: EvaluationItemInput[];
};

export type EvaluationCategoryInput = {
  name: string;
  score: number;
};

export type EvaluationItemPartInput = {
  name: string;
  score: number;
};

export type EvaluationItemInput = {
  category: string;
  name: string;
  score: number;
  detail?: string;
  parts?: EvaluationItemPartInput[];
};

export type EvaluationCategoryRow = {
  id: string;
  evaluation_id: string;
  name: string;
  score: number;
  position: number;
};

export type EvaluationItemPartRow = {
  id: string;
  evaluation_item_id: string;
  name: string;
  score: number;
  position: number;
};

export type EvaluationItemRow = {
  id: string;
  evaluation_id: string;
  category: string;
  name: string;
  score: number;
  detail: string | null;
  position: number;
  parts?: EvaluationItemPartRow[];
};

export type EvaluationRow = {
  id: string;
  athlete: string;
  student_id: string | null;
  evaluator_id: string | null;
  evaluator_name?: string | null;
  evaluator_rank?: string | null;
  professor: string | null;
  belt: string;
  type: EvaluationType;
  score: number;
  result: string | null;
  matrix_id: string | null;
  eligibility_id: string | null;
  detail: string | null;
  created_at: string;
  categories?: EvaluationCategoryRow[];
  items?: EvaluationItemRow[];
};

export type StudentRow = {
  id: string;
  name: string;
  normalized_name: string;
  created_at: string;
};

export type ExamEventRow = {
  id: string;
  name: string;
  event_date: string;
  location: string | null;
  notes: string | null;
  status: "draft" | "open" | "in_progress" | "closed" | "archived";
  created_by: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  closed_at: string | null;
  archived_at: string | null;
};

export type PracticalCandidateRow = Pick<StudentRow, "id" | "name"> & {
  eligibility_id: string | null;
  belt_id: string | null;
  belt_name: string | null;
  valid_from: string | null;
  source_attempt_id: string | null;
};
