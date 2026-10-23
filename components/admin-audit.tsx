"use client";

import {
  ChevronDown,
  Filter,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, LoadingBlock } from "./admin-portal-shared";
import { apiRequest } from "@/lib/api";
import type { AuditEventPage, AuditEventRecord } from "@/lib/platform";

type AuditFilters = {
  query: string;
  actor: string;
  action: string;
  entity: string;
  dateFrom: string;
  dateTo: string;
};

const EMPTY_FILTERS: AuditFilters = {
  query: "",
  actor: "",
  action: "",
  entity: "",
  dateFrom: "",
  dateTo: "",
};

const ACTION_LABELS: Record<string, string> = {
  "evaluation.created": "Avaliação criada",
  "evaluation.synced": "Avaliação sincronizada",
  "evaluation.corrected": "Avaliação corrigida",
  "evaluation.deleted": "Avaliação arquivada",
  "evaluation.restored": "Avaliação restaurada",
  "evaluation.rejected_missing_eligibility": "Avaliação recusada por falta de elegibilidade",
  "exam_event.created": "Evento criado",
  "exam_event.updated": "Evento atualizado",
  "exam_event.status_changed": "Situação do evento alterada",
  "exam_event.evaluator_added": "Avaliador adicionado ao evento",
  "exam_event.evaluator_removed": "Avaliador removido do evento",
  "exam_event.student_added": "Judoca inscrito no evento",
  "exam_event.student_removed": "Judoca removido do evento",
  "exam_event.task_claimed": "Avaliação assumida",
  "exam_event.task_released": "Avaliação liberada",
  "student.created": "Judoca cadastrado",
  "student.registered": "Conta de aluno criada",
  "student.target_belt_updated": "Graduação pretendida alterada",
  "theory_attempt.started": "Prova teórica iniciada",
  "theory_attempt.submitted": "Prova teórica concluída",
  "theory_template.imported": "Modelo de prova importado",
  "theory_version.created": "Rascunho de prova criado",
  "theory_version.updated": "Rascunho de prova atualizado",
  "theory_version.deleted": "Rascunho de prova excluído",
  "theory_version.published": "Prova publicada",
  "theory_version.closed": "Prova encerrada",
  "theory_question.created": "Questão criada",
  "theory_question.updated": "Questão atualizada",
  "theory_question.deleted": "Questão excluída",
  "user.invited": "Avaliador convidado",
  "user.invitation_updated": "Convite de avaliador atualizado",
  "user.invitation_cancelled": "Convite de avaliador cancelado",
  "user.evaluator_access_added": "Acesso de avaliador concedido",
  "user.access_updated": "Acesso de avaliador atualizado",
  "user.profile_updated": "Perfil atualizado",
  "settings.theme_updated": "Cores da plataforma atualizadas",
};

const ENTITY_LABELS: Record<string, string> = {
  evaluation: "Avaliação",
  exam_event: "Evento",
  student: "Judoca",
  theory_attempt: "Tentativa teórica",
  theory_exam_version: "Prova teórica",
  theory_question: "Questão teórica",
  user: "Usuário",
  settings: "Configuração",
};

const METADATA_LABELS: Record<string, string> = {
  from: "Situação anterior",
  to: "Nova situação",
  source: "Origem",
  studentId: "Judoca",
  evaluatorId: "Avaliador",
  evaluatorRank: "Graduação do avaliador",
  previousEvaluatorRank: "Graduação anterior",
  previousStatus: "Acesso anterior",
  status: "Novo acesso",
  previousName: "Nome anterior",
  name: "Novo nome",
  type: "Modalidade",
  score: "Nota",
  passed: "Aprovado",
  taskId: "Tarefa",
  eventTaskId: "Tarefa do evento",
  eventId: "Evento",
  entryId: "Inscrição",
  versionId: "Versão",
  questionId: "Questão",
  categoryCount: "Categorias",
  itemCount: "Itens",
  revision: "Revisão",
  reason: "Motivo",
  lightAccent: "Destaque claro",
  darkAccent: "Destaque escuro",
  darkBackground: "Fundo escuro",
};

function readableCode(value: string) {
  return value
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actionLabel(action: string) {
  return ACTION_LABELS[action] || readableCode(action);
}

function entityLabel(entity: string) {
  return ENTITY_LABELS[entity] || readableCode(entity);
}

function metadataValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Não informado";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.map(metadataValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function dayLabel(value: string) {
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function timeLabel(value: string) {
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isoDateTime(value: string) {
  return value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
}

function auditPath(filters: AuditFilters, cursor?: string | null) {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.actor) params.set("actor", filters.actor);
  if (filters.action) params.set("action", filters.action);
  if (filters.entity) params.set("entity", filters.entity);
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  if (filters.dateTo) params.set("to", filters.dateTo);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return `/api/audit-events${query ? `?${query}` : ""}`;
}

function AuditItem({ event }: { event: AuditEventRecord }) {
  const metadata = Object.entries(event.metadata);
  return (
    <article className="audit-event">
      <span className="audit-event-marker" aria-hidden="true" />
      <div className="audit-event-body">
        <header>
          <div>
            <strong>{event.actorName}</strong>
            <span>{event.actorEmail || "Ação do sistema"}</span>
          </div>
          <time dateTime={isoDateTime(event.createdAt)}>{timeLabel(event.createdAt)}</time>
        </header>
        <h2>{actionLabel(event.action)}</h2>
        <p>{entityLabel(event.entityType)} <code>{event.entityId}</code></p>
        <details>
          <summary>Ver detalhes <ChevronDown size={16} /></summary>
          <dl>
            {metadata.map(([key, value]) => (
              <div key={key}>
                <dt>{METADATA_LABELS[key] || readableCode(key)}</dt>
                <dd>{metadataValue(value)}</dd>
              </div>
            ))}
            <div>
              <dt>Identificador da requisição</dt>
              <dd><code>{event.requestId}</code></dd>
            </div>
          </dl>
        </details>
      </div>
    </article>
  );
}

export function AuditTrailView() {
  const [draft, setDraft] = useState<AuditFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState<AuditEventPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (cursor?: string | null) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const result = await apiRequest<AuditEventPage>(auditPath(filters, cursor));
      setPage((current) => cursor && current
        ? { ...result, items: [...current.items, ...result.items] }
        : result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar a auditoria.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const grouped = useMemo(() => {
    const rows: Array<{ day?: string; event: AuditEventRecord }> = [];
    let previousDay = "";
    for (const event of page?.items ?? []) {
      const day = dayLabel(event.createdAt);
      rows.push({ day: day === previousDay ? undefined : day, event });
      previousDay = day;
    }
    return rows;
  }, [page?.items]);

  const hasFilters = Object.values(filters).some(Boolean);

  function submit(event: FormEvent) {
    event.preventDefault();
    setFilters({ ...draft });
  }

  function clearFilters() {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
  }

  return (
    <div className="management-page audit-page">
      <div className="management-page-heading audit-page-heading">
        <div>
          <h1>Auditoria</h1>
          <p>Acompanhe alterações administrativas, correções e ações realizadas durante os exames.</p>
        </div>
        <button className="management-secondary audit-refresh" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={17} /> Atualizar
        </button>
      </div>

      <div className="audit-assurance" role="status">
        <ShieldCheck size={24} />
        <div>
          <strong>{page?.total ?? 0} registro{page?.total === 1 ? "" : "s"} encontrado{page?.total === 1 ? "" : "s"}</strong>
          <span>O histórico é somente leitura e mantém o identificador de cada requisição.</span>
        </div>
      </div>

      <details className="audit-filter-panel" open>
        <summary><Filter size={18} /> Filtrar histórico <ChevronDown size={17} /></summary>
        <form onSubmit={submit}>
          <label className="audit-search-field">
            Buscar por pessoa ou identificador
            <span><Search size={17} /><input value={draft.query} onChange={(event) => setDraft({ ...draft, query: event.target.value })} placeholder="Nome, registro ou requisição" /></span>
          </label>
          <label>
            Responsável
            <select value={draft.actor} onChange={(event) => setDraft({ ...draft, actor: event.target.value })}>
              <option value="">Todos</option>
              {page?.filters.actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
            </select>
          </label>
          <label>
            Ação
            <select value={draft.action} onChange={(event) => setDraft({ ...draft, action: event.target.value })}>
              <option value="">Todas</option>
              {page?.filters.actions.map((action) => <option key={action} value={action}>{actionLabel(action)}</option>)}
            </select>
          </label>
          <label>
            Tipo de registro
            <select value={draft.entity} onChange={(event) => setDraft({ ...draft, entity: event.target.value })}>
              <option value="">Todos</option>
              {page?.filters.entityTypes.map((entity) => <option key={entity} value={entity}>{entityLabel(entity)}</option>)}
            </select>
          </label>
          <label>De<input type="date" value={draft.dateFrom} onChange={(event) => setDraft({ ...draft, dateFrom: event.target.value })} /></label>
          <label>Até<input type="date" value={draft.dateTo} onChange={(event) => setDraft({ ...draft, dateTo: event.target.value })} /></label>
          <div className="audit-filter-actions">
            <button type="button" className="management-secondary" onClick={clearFilters} disabled={!Object.values(draft).some(Boolean)}>Limpar</button>
            <button className="management-primary">Aplicar filtros</button>
          </div>
        </form>
      </details>

      {error && <div className="management-error" role="alert">{error}</div>}
      {loading ? <LoadingBlock label="Carregando histórico de auditoria…" /> : page && page.items.length ? (
        <section className="audit-timeline" aria-label="Histórico de auditoria">
          {grouped.map(({ day, event }) => (
            <div className="audit-timeline-row" key={event.id}>
              {day && <h2>{day}</h2>}
              <AuditItem event={event} />
            </div>
          ))}
          {page.nextCursor && (
            <button className="management-secondary audit-load-more" onClick={() => void load(page.nextCursor)} disabled={loadingMore}>
              {loadingMore ? "Carregando…" : "Carregar registros anteriores"}
            </button>
          )}
        </section>
      ) : (
        <EmptyState
          icon={<History size={28} />}
          title={hasFilters ? "Nenhum registro encontrado" : "O histórico ainda está vazio"}
          detail={hasFilters ? "Altere ou limpe os filtros para ampliar a consulta." : "As próximas ações administrativas aparecerão aqui automaticamente."}
          action={hasFilters ? <button className="management-secondary" onClick={clearFilters}>Limpar filtros</button> : undefined}
        />
      )}
      {page?.items.length ? <p className="audit-visible-count">Mostrando {page.items.length} de {page.total} registros</p> : null}
    </div>
  );
}
