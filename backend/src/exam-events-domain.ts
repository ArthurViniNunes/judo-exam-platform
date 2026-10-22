export const EVENT_STATUSES = [
  "draft",
  "open",
  "in_progress",
  "closed",
  "archived",
] as const;

export type ExamEventStatus = (typeof EVENT_STATUSES)[number];

export type ExamEventInput = {
  name?: unknown;
  eventDate?: unknown;
  location?: unknown;
  notes?: unknown;
};

export type ValidExamEventInput = {
  name: string;
  eventDate: string;
  location: string | null;
  notes: string | null;
};

const nextEventStatus: Record<ExamEventStatus, ExamEventStatus | null> = {
  draft: "open",
  open: "in_progress",
  in_progress: "closed",
  closed: "archived",
  archived: null,
};

function compactText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function validCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateExamEventInput(
  value: ExamEventInput,
): ValidExamEventInput | string {
  const name = compactText(value.name);
  const eventDate = compactText(value.eventDate);
  const location = compactText(value.location);
  const notes = typeof value.notes === "string" ? value.notes.trim() : "";

  if (name.length < 3 || name.length > 100) {
    return "Informe um nome entre 3 e 100 caracteres.";
  }
  if (!validCalendarDate(eventDate)) {
    return "Informe uma data válida para o evento.";
  }
  if (location.length > 120) {
    return "O local deve ter no máximo 120 caracteres.";
  }
  if (notes.length > 1000) {
    return "As observações devem ter no máximo 1.000 caracteres.";
  }
  return { name, eventDate, location: location || null, notes: notes || null };
}

export function canTransitionExamEvent(
  current: ExamEventStatus,
  next: ExamEventStatus,
) {
  return nextEventStatus[current] === next;
}

export function nextExamEventStatus(current: ExamEventStatus) {
  return nextEventStatus[current];
}

export const EVENT_KATA_TYPES = [
  "nage-no-kata-partial",
  "nage-no-kata-complete",
  "katame-no-kata",
] as const;

export type EventKataType = (typeof EVENT_KATA_TYPES)[number];

export function validateEventEntryInput(value: {
  studentId?: unknown;
  technical?: unknown;
  kataType?: unknown;
}) {
  const studentId = compactText(value.studentId);
  const technical = value.technical === true;
  const kataType = EVENT_KATA_TYPES.includes(value.kataType as EventKataType)
    ? (value.kataType as EventKataType)
    : null;
  if (!studentId || studentId.length > 100) return "Selecione um judoca.";
  if (!technical && !kataType) return "Selecione ao menos uma modalidade.";
  return { studentId, technical, kataType };
}
