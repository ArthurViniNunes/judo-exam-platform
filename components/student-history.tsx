"use client";

import {
  CalendarClock,
  ChevronDown,
  ClipboardList,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EvaluationReport } from "@/components/evaluation-report";
import { formatDate, scoreLabel } from "@/components/admin-portal-shared";
import { apiRequest } from "@/lib/api";
import {
  buildStudentEvolution,
  filterStudentHistory,
  latestComparableTrend,
} from "@/lib/evaluation-evolution";
import type { EvaluationRecord } from "@/lib/platform";

const EMPTY_FILTERS = { type: "", belt: "", dateFrom: "", dateTo: "" };

function resultLabel(evaluation: EvaluationRecord) {
  if (evaluation.result) return evaluation.result;
  if (evaluation.type === "kata") return "Registro técnico";
  return evaluation.score >= 70 ? "Aprovado" : "Reexame necessário";
}

export function StudentHistory() {
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [seriesKey, setSeriesKey] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEvaluations(await apiRequest<EvaluationRecord[]>("/api/student/me/evaluations"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar seu histórico.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const trend = useMemo(() => latestComparableTrend(evaluations), [evaluations]);
  const evolution = useMemo(
    () => buildStudentEvolution(evaluations, seriesKey),
    [evaluations, seriesKey],
  );
  const filtered = useMemo(
    () => filterStudentHistory(evaluations, filters).reverse(),
    [evaluations, filters],
  );
  const belts = useMemo(
    () => [...new Set(evaluations.map((evaluation) => evaluation.belt))].sort(),
    [evaluations],
  );
  const types = useMemo(
    () => [...new Set(evaluations.map((evaluation) => evaluation.type))].sort(),
    [evaluations],
  );

  return (
    <section className="portal-history" aria-labelledby="student-history-title">
      <header>
        <div>
          <span>Histórico liberado</span>
          <h2 id="student-history-title">Sua evolução no judô</h2>
          <p>Relatórios aparecem aqui somente depois da conferência da associação.</p>
        </div>
        {!loading && <button type="button" onClick={() => void load()} aria-label="Atualizar histórico"><RefreshCw size={18} /></button>}
      </header>

      {loading ? (
        <div className="portal-history-state" role="status"><RefreshCw className="spin" size={22} /><span>Carregando seu histórico…</span></div>
      ) : error ? (
        <div className="portal-history-state error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Tentar novamente</button></div>
      ) : !evaluations.length ? (
        <div className="portal-history-state"><ClipboardList size={24} /><strong>Nenhum relatório liberado ainda</strong><span>Quando a equipe concluir a conferência, suas avaliações aparecerão aqui.</span></div>
      ) : (
        <>
          <dl className="portal-history-summary">
            <div><dt>Relatórios</dt><dd>{evaluations.length}</dd></div>
            <div><dt>Nota mais recente</dt><dd>{scoreLabel(trend.score)}</dd></div>
            <div>
              <dt>Última evolução comparável</dt>
              <dd className={trend.difference === null ? "neutral" : trend.difference >= 0 ? "positive" : "negative"}>
                {trend.difference === null ? "Primeiro registro" : <>{trend.difference >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}{trend.difference >= 0 ? "+" : ""}{scoreLabel(trend.difference)}</>}
              </dd>
            </div>
          </dl>

          {evolution.options.length > 0 && (
            <section className="portal-history-evolution" aria-labelledby="student-evolution-title">
              <div className="portal-history-evolution-heading">
                <div><h3 id="student-evolution-title">Linha de evolução</h3><p>Compara apenas provas equivalentes.</p></div>
                <label>Tipo de comparação<select value={evolution.activeKey} onChange={(event) => setSeriesKey(event.target.value)}>{evolution.options.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
              </div>
              <ol className="portal-history-score-timeline">
                {evolution.series.map((evaluation) => (
                  <li key={evaluation.id}>
                    <span><time dateTime={evaluation.createdAt}>{formatDate(evaluation.createdAt)}</time><strong>{scoreLabel(evaluation.score)}</strong></span>
                    <i
                      role="progressbar"
                      aria-label={`Nota em ${formatDate(evaluation.createdAt)}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={evaluation.score}
                    >
                      <em style={{ width: `${evaluation.score}%` }} />
                    </i>
                  </li>
                ))}
              </ol>
              {evolution.recurringTechniques.length > 0 && (
                <div className="portal-history-priority-techniques">
                  <h4>Técnicas para priorizar no treino</h4>
                  <ul>{evolution.recurringTechniques.map((technique) => <li key={`${technique.category}-${technique.name}`}><span><strong>{technique.name}</strong><small>{technique.category} · {technique.count} avaliações</small></span><b>{scoreLabel(technique.total / technique.count)}</b></li>)}</ul>
                </div>
              )}
            </section>
          )}

          <section className="portal-history-reports" aria-labelledby="student-report-history-title">
            <div className="portal-history-reports-heading">
              <div><h3 id="student-report-history-title">Relatórios</h3><p>Abra um registro para consultar cada nota ou salvar o PDF.</p></div>
              <CalendarClock size={21} />
            </div>
            <div className="portal-history-filters">
              <label>Modalidade<select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}><option value="">Todas</option>{types.map((type) => <option key={type}>{type}</option>)}</select></label>
              <label>Graduação<select value={filters.belt} onChange={(event) => setFilters((current) => ({ ...current, belt: event.target.value }))}><option value="">Todas</option>{belts.map((belt) => <option key={belt}>{belt}</option>)}</select></label>
              <label>De<input type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} /></label>
              <label>Até<input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} /></label>
            </div>
            <div className="portal-history-report-list">
              {filtered.map((evaluation) => (
                <article key={evaluation.id}>
                  <button type="button" onClick={() => setReportId(reportId === evaluation.id ? null : evaluation.id)} aria-expanded={reportId === evaluation.id}>
                    <span><strong>{evaluation.type} · {evaluation.belt}</strong><small>{formatDate(evaluation.createdAt)} · {evaluation.evaluatorName}</small></span>
                    <span><b>{scoreLabel(evaluation.score)}</b><small>{resultLabel(evaluation)}</small></span>
                    <ChevronDown size={18} />
                  </button>
                  {reportId === evaluation.id && <EvaluationReport evaluation={evaluation} />}
                </article>
              ))}
              {!filtered.length && <p className="portal-history-empty-filter">Nenhum relatório corresponde aos filtros escolhidos.</p>}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
