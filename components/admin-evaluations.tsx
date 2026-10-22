"use client";

import { BarChart3, ChevronDown, ClipboardList, FileText, FilterX, Search, Trash2, TrendingDown } from "lucide-react";
import { useMemo, useState } from "react";
import {
  EmptyState,
  formatDate,
  LoadingBlock,
  scoreLabel,
} from "@/components/admin-portal-shared";
import type { AuthUser, EvaluationRecord, ManagedUser } from "@/lib/platform";
import { apiRequest } from "@/lib/api";
import { EvaluationReport } from "@/components/evaluation-report";

function resultLabel(evaluation: EvaluationRecord) {
  if (evaluation.result) return evaluation.result;
  if (evaluation.type === "kata") return "Registro técnico";
  return evaluation.score >= 70 ? "Aprovado" : "Reexame necessário";
}

function resultTone(evaluation: EvaluationRecord) {
  const result = resultLabel(evaluation).toLocaleLowerCase("pt-BR");
  if (evaluation.type === "kata") return "neutral";
  return result.includes("aprov") ? "pass" : "review";
}

export function EvaluationsView({
  evaluations,
  loading,
  reload,
  user,
  users,
  evaluatorId,
  setEvaluatorId,
}: {
  evaluations: EvaluationRecord[];
  loading: boolean;
  reload: () => Promise<void>;
  user: AuthUser;
  users: ManagedUser[];
  evaluatorId: string;
  setEvaluatorId: (value: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [beltFilter, setBeltFilter] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [techniqueFilter, setTechniqueFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const belts = useMemo(() => [...new Set(evaluations.map((item) => item.belt))].sort(), [evaluations]);
  const categories = useMemo(() => [...new Set(evaluations.flatMap((item) => item.items.map((entry) => entry.category)))].sort(), [evaluations]);
  const techniques = useMemo(() => [...new Set(evaluations.flatMap((item) => item.items.map((entry) => entry.name)))].sort(), [evaluations]);
  const filtered = useMemo(
    () =>
      evaluations.filter((evaluation) => {
        const matchesSearch = [
          evaluation.athlete,
          evaluation.evaluatorName,
          evaluation.evaluatorRank || "",
          evaluation.belt,
          evaluation.type,
          resultLabel(evaluation),
        ].some((value) =>
          value.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
        );
        const createdDate = evaluation.createdAt.slice(0, 10);
        return matchesSearch
          && (!typeFilter || evaluation.type === typeFilter)
          && (!beltFilter || evaluation.belt === beltFilter)
          && (!resultFilter || resultTone(evaluation) === resultFilter)
          && (!categoryFilter || evaluation.items.some((item) => item.category === categoryFilter))
          && (!techniqueFilter || evaluation.items.some((item) => item.name === techniqueFilter))
          && (!dateFrom || createdDate >= dateFrom)
          && (!dateTo || createdDate <= dateTo);
      }),
    [beltFilter, categoryFilter, dateFrom, dateTo, evaluations, normalizedSearch, resultFilter, techniqueFilter, typeFilter],
  );

  const difficulty = useMemo(() => {
    const technical = filtered.filter((evaluation) => evaluation.type === "técnica");
    const items = technical
      .flatMap((evaluation) => evaluation.items)
      .filter((item) => (!categoryFilter || item.category === categoryFilter)
        && (!techniqueFilter || item.name === techniqueFilter));
    const aggregate = (keyFor: (item: (typeof items)[number]) => string) => {
      const values = new Map<string, { total: number; count: number }>();
      for (const item of items) {
        const key = keyFor(item);
        const current = values.get(key) ?? { total: 0, count: 0 };
        values.set(key, { total: current.total + item.score / 10, count: current.count + 1 });
      }
      return [...values.entries()].map(([name, value]) => ({ name, count: value.count, average: value.total / value.count }));
    };
    const distribution = { excellent: 0, good: 0, poor: 0, insufficient: 0 };
    for (const item of items) {
      if (item.score >= 90) distribution.excellent += 1;
      else if (item.score >= 70) distribution.good += 1;
      else if (item.score >= 50) distribution.poor += 1;
      else distribution.insufficient += 1;
    }
    return {
      evaluations: technical.length,
      items: items.length,
      categories: aggregate((item) => item.category).sort((a, b) => a.average - b.average),
      techniques: aggregate((item) => item.name).sort((a, b) => a.average - b.average).slice(0, 5),
      distribution,
    };
  }, [categoryFilter, filtered, techniqueFilter]);

  const hasFilters = Boolean(search || typeFilter || beltFilter || resultFilter || categoryFilter || techniqueFilter || dateFrom || dateTo || evaluatorId);
  const clearFilters = () => {
    setSearch(""); setTypeFilter(""); setBeltFilter(""); setResultFilter("");
    setCategoryFilter(""); setTechniqueFilter(""); setDateFrom(""); setDateTo("");
    setEvaluatorId("");
  };

  if (loading) return <LoadingBlock label="Consolidando notas…" />;

  const deleteEvaluation = async (evaluation: EvaluationRecord) => {
    const confirmed = window.confirm(
      `Excluir a avaliação de ${evaluation.athlete}, realizada em ${formatDate(evaluation.createdAt)}? Esta ação não poderá ser desfeita.`,
    );
    if (!confirmed) return;

    setDeletingId(evaluation.id);
    setDeleteError("");
    try {
      await apiRequest<void>(`/api/evaluations/${encodeURIComponent(evaluation.id)}`, {
        method: "DELETE",
      });
      await reload();
    } catch (caught) {
      setDeleteError(
        caught instanceof Error ? caught.message : "Não foi possível excluir a avaliação.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="management-page">
      <header className="management-page-heading">
        <div>
          <h1>Notas consolidadas</h1>
          <p>
            Consulte cada resultado com identificação do judoca, avaliador,
            graduação e data da avaliação.
          </p>
        </div>
      </header>

      <section className="evaluation-filter-panel" aria-label="Filtros das avaliações">
        <label className="management-search evaluation-search"><Search size={18} /><input aria-label="Buscar avaliação" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar judoca, avaliador ou graduação" /></label>
        <div className="evaluation-filter-grid">
          {user.role === "super_admin" && <label>Avaliador<select value={evaluatorId} onChange={(event) => setEvaluatorId(event.target.value)}><option value="">Todos</option>{users.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          <label>Modalidade<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">Todas</option><option value="técnica">Técnica</option><option value="kata">Kata</option><option value="teórica">Teórica</option></select></label>
          <label>Graduação<select value={beltFilter} onChange={(event) => setBeltFilter(event.target.value)}><option value="">Todas</option>{belts.map((belt) => <option key={belt}>{belt}</option>)}</select></label>
          <label>Resultado<select value={resultFilter} onChange={(event) => setResultFilter(event.target.value)}><option value="">Todos</option><option value="pass">Aprovado</option><option value="review">Reexame</option><option value="neutral">Registro técnico</option></select></label>
          <label>Categoria<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">Todas</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Técnica<select value={techniqueFilter} onChange={(event) => setTechniqueFilter(event.target.value)}><option value="">Todas</option>{techniques.map((technique) => <option key={technique}>{technique}</option>)}</select></label>
          <label>De<input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} /></label>
          <label>Até<input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} /></label>
        </div>
        <button className="evaluation-filter-clear" disabled={!hasFilters} onClick={clearFilters}><FilterX size={17} /> Limpar filtros</button>
      </section>
      {deleteError && <p className="management-error evaluation-delete-error">{deleteError}</p>}

      {difficulty.items > 0 && (
        <section className="difficulty-panel" aria-labelledby="difficulty-title">
          <header><span><BarChart3 size={20} /></span><div><h2 id="difficulty-title">Dificuldades técnicas</h2><p>{difficulty.evaluations} {difficulty.evaluations === 1 ? "avaliação técnica" : "avaliações técnicas"} · {difficulty.items} {difficulty.items === 1 ? "item" : "itens"} na amostra</p></div></header>
          {difficulty.evaluations < 5 && <p className="difficulty-warning">Amostra pequena: use estes dados como orientação, não como ranking de avaliadores ou judocas.</p>}
          <div className="difficulty-grid">
            <article><h3>Média por categoria</h3><div className="difficulty-category-list">{difficulty.categories.map((category) => <span key={category.name}><b>{category.name}</b><small>{category.count} {category.count === 1 ? "nota" : "notas"}</small><strong>{category.average.toFixed(1)}</strong></span>)}</div></article>
            <article><h3>Distribuição das notas</h3><div className="difficulty-distribution">{([['excellent', 'Ótimo'], ['good', 'Bom'], ['poor', 'Ruim'], ['insufficient', 'Insuficiente']] as const).map(([key, label]) => <span key={key}><b>{label}</b><i><em style={{ width: `${difficulty.items ? difficulty.distribution[key] / difficulty.items * 100 : 0}%` }} /></i><strong>{difficulty.distribution[key]}</strong></span>)}</div></article>
            <article><h3><TrendingDown size={17} /> Técnicas para revisar</h3><ol>{difficulty.techniques.map((technique) => <li key={technique.name}><span><b>{technique.name}</b><small>{technique.count} {technique.count === 1 ? "nota" : "notas"}</small></span><strong>{technique.average.toFixed(1)}</strong></li>)}</ol></article>
          </div>
        </section>
      )}

      {!filtered.length ? (
        <EmptyState
          icon={<ClipboardList size={29} />}
          title={search ? "Nenhuma avaliação encontrada" : "Nenhuma nota registrada"}
          detail={
            search
              ? "Revise o termo usado na busca."
              : "As avaliações concluídas aparecerão aqui em ordem de data."
          }
        />
      ) : (
        <section className="evaluation-ledger" aria-label="Notas consolidadas">
          <header aria-hidden="true">
            <span>Judoca</span>
            <span>Avaliador e graduação</span>
            <span>Data</span>
            <span>Nota</span>
            <span>Resultado</span>
            <span>Ações</span>
          </header>
          {filtered.map((evaluation) => (
            <article key={evaluation.id}>
              <div className="evaluation-athlete">
                <small>Judoca</small>
                <strong>{evaluation.athlete}</strong>
                <span>{evaluation.type} · {evaluation.belt}</span>
              </div>
              <div className="evaluation-context">
                <small>Avaliador e graduação</small>
                <strong>{evaluation.evaluatorName}</strong>
                <span>{evaluation.evaluatorRank || "Graduação não informada"}</span>
              </div>
              <div className="evaluation-date">
                <small>Data da avaliação</small>
                <time dateTime={evaluation.createdAt}>
                  {formatDate(evaluation.createdAt, true)}
                </time>
              </div>
              <div className="evaluation-score">
                <small>Nota</small>
                <strong>{scoreLabel(evaluation.score)}</strong>
              </div>
              <div className="evaluation-result">
                <small>Resultado</small>
                <span className={`status ${resultTone(evaluation)}`}>
                  {resultLabel(evaluation)}
                </span>
              </div>
              <div className="evaluation-actions">
                <button
                  className="evaluation-report-toggle"
                  onClick={() => setReportId(reportId === evaluation.id ? null : evaluation.id)}
                  aria-expanded={reportId === evaluation.id}
                  aria-label={`Ver relatório detalhado de ${evaluation.athlete}`}
                >
                  <FileText size={18} />
                  <span>Detalhes</span>
                  <ChevronDown size={16} />
                </button>
                <button
                  className="evaluation-delete"
                  onClick={() => void deleteEvaluation(evaluation)}
                  disabled={deletingId === evaluation.id}
                  aria-label={`Excluir avaliação de ${evaluation.athlete}`}
                  title="Excluir avaliação"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              {reportId === evaluation.id && <EvaluationReport evaluation={evaluation} />}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
