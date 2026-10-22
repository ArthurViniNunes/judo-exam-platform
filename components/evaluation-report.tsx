"use client";

import { ChevronDown, ClipboardCheck, Printer } from "lucide-react";
import { formatDate, scoreLabel } from "@/components/admin-portal-shared";
import { Brand } from "@/components/exam-public";
import type {
  EvaluationCategoryRecord,
  EvaluationItemRecord,
  EvaluationRecord,
} from "@/lib/platform";

function resultLabel(evaluation: EvaluationRecord) {
  if (evaluation.result) return evaluation.result;
  if (evaluation.type === "kata") return "Registro técnico";
  return evaluation.score >= 70 ? "Aprovado" : "Reexame necessário";
}

function groupItems(items: EvaluationItemRecord[]) {
  const groups = new Map<string, EvaluationItemRecord[]>();
  for (const item of items) {
    const entries = groups.get(item.category) ?? [];
    entries.push(item);
    groups.set(item.category, entries);
  }
  return groups;
}

function reportCategories(evaluation: EvaluationRecord) {
  if (evaluation.categories?.length) return evaluation.categories;

  return Array.from(groupItems(evaluation.items), ([name, items], index) => ({
    id: `derived-${index}`,
    name,
    score:
      items.reduce((total, item) => total + item.score, 0) / items.length,
  })) satisfies EvaluationCategoryRecord[];
}

export function EvaluationReport({ evaluation }: { evaluation: EvaluationRecord }) {
  const itemsByCategory = groupItems(evaluation.items);
  const categories = reportCategories(evaluation);
  const reportId = `evaluation-report-${evaluation.id}`;

  const printReport = () => {
    const report = document.getElementById(reportId);
    if (!report) return;
    const details = [...report.querySelectorAll("details")];
    const previousState = details.map((detail) => detail.open);
    details.forEach((detail) => { detail.open = true; });
    document.body.classList.add("printing-evaluation");
    report.classList.add("print-target");
    try {
      window.print();
    } finally {
      report.classList.remove("print-target");
      document.body.classList.remove("printing-evaluation");
      details.forEach((detail, index) => { detail.open = previousState[index]; });
    }
  };

  return (
    <section
      id={reportId}
      className="individual-report"
      aria-label={`Relatório da avaliação de ${evaluation.athlete}`}
    >
      <div className="report-print-heading">
        <Brand compact />
        <div><strong>Relatório de avaliação</strong><span>Associação Judô Rogério Cruz</span></div>
      </div>
      <div className="report-toolbar">
        <span>Relatório completo disponível sob demanda.</span>
        <button onClick={printReport}><Printer size={17} /> Imprimir ou salvar PDF</button>
      </div>
      <header className="report-summary">
        <div>
          <span>Resultado geral</span>
          <strong>{resultLabel(evaluation)}</strong>
        </div>
        <div className="report-final-score">
          <span>Nota final</span>
          <b>{scoreLabel(evaluation.score)}</b>
        </div>
      </header>

      <dl className="report-metadata">
        <div>
          <dt>Judoca</dt>
          <dd>{evaluation.athlete}</dd>
        </div>
        <div>
          <dt>Graduação</dt>
          <dd>{evaluation.belt}</dd>
        </div>
        <div>
          <dt>Avaliador</dt>
          <dd>
            {evaluation.evaluatorName}
            <small>{evaluation.evaluatorRank || "Graduação não informada"}</small>
          </dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>
            <time dateTime={evaluation.createdAt}>
              {formatDate(evaluation.createdAt, true)}
            </time>
          </dd>
        </div>
        <div>
          <dt>Evento</dt>
          <dd>{evaluation.eventName || "Avaliação avulsa"}</dd>
        </div>
        <div>
          <dt>Versão do exame</dt>
          <dd>{evaluation.matrixId || "Catálogo oficial fixo"}</dd>
        </div>
        <div className="report-reference">
          <dt>Referência do registro</dt>
          <dd>{evaluation.id}</dd>
        </div>
        <div>
          <dt>Versão do registro</dt>
          <dd>Revisão {evaluation.revisionNumber}</dd>
        </div>
      </dl>

      {evaluation.revisionNumber > 1 && (
        <div className="report-revision-note">
          <strong>Registro corrigido</strong>
          <p>{evaluation.correctionReason}</p>
          <small>
            {evaluation.correctedByName || "Responsável não informado"}
            {evaluation.correctedAt ? ` · ${formatDate(evaluation.correctedAt, true)}` : ""}
          </small>
        </div>
      )}

      {evaluation.detail && (
        <div className="report-observation">
          <strong>Resumo da avaliação</strong>
          <p>{evaluation.detail}</p>
        </div>
      )}

      {evaluation.items.length ? (
        <div className="report-groups">
          {categories.map((category, index) => {
            const items = itemsByCategory.get(category.name) ?? [];
            return (
              <details key={category.id} open={index === 0}>
                <summary>
                  <span>
                    <strong>{category.name}</strong>
                    <small>{items.length} {items.length === 1 ? "técnica" : "técnicas"}</small>
                  </span>
                  <span className="report-category-score">
                    <small>Média da parte</small>
                    <b>{scoreLabel(category.score)}</b>
                  </span>
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <div className="report-techniques">
                  {items.map((item) => (
                    <article key={item.id}>
                      <div className="report-technique-heading">
                        <span>
                          <strong>{item.name}</strong>
                          {item.detail && <small>{item.detail}</small>}
                        </span>
                        <b>{scoreLabel(item.score)}</b>
                      </div>
                      {(item.parts?.length ?? 0) > 0 && (
                        <ol className="report-parts" aria-label={`Notas das execuções de ${item.name}`}>
                          {item.parts.map((part, partIndex) => (
                            <li key={part.id}>
                              <span>Execução {partIndex + 1} · {part.name}</span>
                              <b>{scoreLabel(part.score)}</b>
                            </li>
                          ))}
                        </ol>
                      )}
                    </article>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <div className="legacy-report">
          <ClipboardCheck size={21} />
          <span>
            <strong>Detalhamento indisponível</strong>
            <small>Esta avaliação foi registrada antes do relatório por técnica.</small>
          </span>
        </div>
      )}
    </section>
  );
}
