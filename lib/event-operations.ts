import type { ExamEventTask } from "./platform";

function timestamp(value: string | null) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  const result = date.getTime();
  return Number.isNaN(result) ? null : result;
}

function minutesBetween(start: string | null, end: string | null, now: number) {
  const startedAt = timestamp(start);
  const endedAt = timestamp(end) ?? now;
  if (startedAt === null || endedAt < startedAt) return null;
  return Math.max(0, Math.round((endedAt - startedAt) / 60_000));
}

export function eventOperationalSummary(tasks: ExamEventTask[], now = Date.now()) {
  const counts = {
    waiting: 0,
    called: 0,
    inProgress: 0,
    pendingSync: 0,
    completed: 0,
  };
  const completedDurations: number[] = [];
  const activeDurations: number[] = [];

  for (const task of tasks) {
    if (task.status === "waiting") counts.waiting += 1;
    if (task.status === "called") counts.called += 1;
    if (task.status === "in_progress") counts.inProgress += 1;
    if (task.status === "pending_sync") counts.pendingSync += 1;
    if (task.status === "completed") counts.completed += 1;

    if (task.status === "completed") {
      const duration = minutesBetween(task.claimedAt, task.completedAt, now);
      if (duration !== null) completedDurations.push(duration);
    }
    if (task.status === "in_progress") {
      const duration = minutesBetween(task.claimedAt, null, now);
      if (duration !== null) activeDurations.push(duration);
    }
  }

  const blockers = counts.waiting + counts.called + counts.inProgress + counts.pendingSync;
  return {
    counts,
    blockers,
    readyToClose: tasks.length > 0 && blockers === 0,
    averageDurationMinutes: completedDurations.length
      ? Math.round(completedDurations.reduce((total, value) => total + value, 0) / completedDurations.length)
      : null,
    longestActiveMinutes: activeDurations.length ? Math.max(...activeDurations) : null,
  };
}
