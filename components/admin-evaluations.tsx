"use client";

import { ClipboardList, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  EmptyState,
  formatDate,
  LoadingBlock,
  scoreLabel,
} from "@/components/admin-portal-shared";
import type { EvaluationRecord } from "@/lib/platform";

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
}: {
  evaluations: EvaluationRecord[];
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = useMemo(
    () =>
      evaluations.filter((evaluation) =>
        [
          evaluation.athlete,
          evaluation.evaluatorName,
          evaluation.belt,
          evaluation.type,
          resultLabel(evaluation),
        ].some((value) =>
          value.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
        ),
      ),
    [evaluations, normalizedSearch],
  );

  if (loading) return <LoadingBlock label="Consolidando notas…" />;

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

      <label className="management-search evaluation-search">
        <Search size={18} />
        <input
          aria-label="Buscar avaliação"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar judoca, avaliador ou graduação"
        />
      </label>

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
          </header>
          {filtered.map((evaluation) => (
            <article key={evaluation.id}>
              <div className="evaluation-athlete">
                <small>Judoca</small>
                <strong>{evaluation.athlete}</strong>
                <span>{evaluation.type}</span>
              </div>
              <div className="evaluation-context">
                <small>Avaliador e graduação</small>
                <strong>{evaluation.evaluatorName}</strong>
                <span>{evaluation.belt}</span>
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
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
