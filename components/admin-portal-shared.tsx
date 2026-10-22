import type { ReactNode } from "react";
import type { DashboardData } from "@/lib/platform";

export type AdminSection =
  | "overview"
  | "events"
  | "evaluations"
  | "students"
  | "theory"
  | "team"
  | "appearance";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  detail: string;
  action?: ReactNode;
};

type MetricProps = {
  icon: ReactNode;
  value: string;
  label: string;
  note: string;
};

export const emptyDashboard: DashboardData = {
  summary: { evaluations: 0, students: 0, average: 0, approvalRate: 0 },
  months: [],
  byType: [],
  recent: [],
};

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatDate(value: string, withTime = false) {
  if (!value) return "—";
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  const options: Intl.DateTimeFormatOptions = withTime
    ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short", year: "numeric" };

  return new Intl.DateTimeFormat("pt-BR", options).format(date);
}

export function scoreLabel(score: number) {
  return (score / 10).toFixed(1);
}

export function LoadingBlock({ label = "Carregando dados…" }: { label?: string }) {
  return (
    <div className="management-loading" role="status">
      <span />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ icon, title, detail, action }: EmptyStateProps) {
  return (
    <div className="management-empty">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}

export function Metric({ icon, value, label, note }: MetricProps) {
  return (
    <article className="management-metric">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        <small>{note}</small>
      </div>
    </article>
  );
}
