export type UserRole = "super_admin" | "evaluator" | "student";
export type ProfessionalRole = Exclude<UserRole, "student">;
export type SessionContext = "professional" | "student";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  evaluatorRank: string | null;
  role: UserRole;
  roles: UserRole[];
  context: SessionContext;
  studentId: string | null;
};

export type EvaluationRecord = {
  id: string;
  athlete: string;
  studentId: string | null;
  evaluatorId: string | null;
  evaluatorName: string;
  evaluatorRank: string | null;
  eligibilityId: string | null;
  eventTaskId: string | null;
  eventName: string | null;
  belt: string;
  type: "teórica" | "técnica" | "kata";
  score: number;
  result: string | null;
  matrixId: string | null;
  detail: string | null;
  createdAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
  deleteReason: string | null;
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

export type PracticalCandidate = ExamStudent & {
  eligibility: {
    id: string;
    beltId: "gray" | "blue" | "yellow" | "orange" | "green" | "purple" | "brown";
    beltName: string;
    validFrom: string;
    source: "theory_attempt";
    sourceAttemptId: string;
  } | null;
};

export type StudentEligibility = {
  id: string;
  beltId: string;
  beltName: string;
  validFrom: string;
  validUntil: string | null;
  revokedAt: string | null;
  status: "active" | "expired" | "revoked";
};

export type StudentProfile = {
  student: {
    id: string;
    name: string;
    createdAt: string;
    targetBeltId: string | null;
    targetBeltName: string | null;
    targetBeltSetAt: string | null;
  };
  currentEligibility: StudentEligibility | null;
  eligibilityHistory: StudentEligibility[];
};

export type EvaluationSubmission = {
  id: string;
  eventTaskId?: string;
  studentId: string;
  beltId?: string;
  belt: string;
  type: "teórica" | "técnica" | "kata";
  score: number;
  result?: string;
  matrixId?: string;
  detail?: string;
  categories?: { name: string; score: number }[];
  items?: {
    category: string;
    name: string;
    score: number;
    detail?: string;
    parts?: { name: string; score: number }[];
  }[];
};

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
  role: ProfessionalRole;
  status: "invited" | "active" | "disabled";
  created_at: string;
  last_login_at: string | null;
  evaluation_count: number;
  student_count: number;
  average_score: number;
};

export type ExamEventStatus = "draft" | "open" | "in_progress" | "closed" | "archived";
export type ExamEventTaskStatus = "waiting" | "called" | "in_progress" | "pending_sync" | "completed";
export type EventKataType = "nage-no-kata-partial" | "nage-no-kata-complete" | "katame-no-kata";

export type ExamEventSummary = {
  id: string;
  name: string;
  eventDate: string;
  location: string | null;
  notes: string | null;
  status: ExamEventStatus;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  closedAt: string | null;
  archivedAt: string | null;
  counts: { evaluators: number; students: number; tasks: number; completed: number };
};

export type ExamEventEvaluator = {
  id: string;
  name: string;
  email: string;
  evaluatorRank: string | null;
  station: string | null;
};

export type ExamEventEntry = {
  id: string;
  studentId: string;
  studentName: string;
  beltId: string;
  beltName: string;
  eligibilityId: string;
  createdAt: string;
};

export type ExamEventTask = {
  id: string;
  entryId: string;
  modality: "technical" | "kata";
  kataType: EventKataType | null;
  status: ExamEventTaskStatus;
  evaluatorId: string | null;
  evaluatorName: string | null;
  station: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  evaluationId: string | null;
  lockVersion: number;
};

export type ExamEventDetail = ExamEventSummary & {
  evaluators: ExamEventEvaluator[];
  entries: ExamEventEntry[];
  tasks: ExamEventTask[];
};

export type EventTaskLaunch = {
  eventId: string;
  eventName: string;
  taskId: string;
  modality: "technical" | "kata";
  kataType: EventKataType | null;
  studentId: string;
  studentName: string;
  beltId: string;
  beltName: string;
};
