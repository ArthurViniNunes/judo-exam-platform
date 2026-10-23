"use client";

import { FileStack, ListChecks, Printer, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDate, scoreLabel } from "@/components/admin-portal-shared";
import { EvaluationReport } from "@/components/evaluation-report";
import { Brand } from "@/components/exam-public";
import type { EvaluationRecord } from "@/lib/platform";

type BatchReportFormat = "summary" | "detailed";

function resultLabel(evaluation: EvaluationRecord) {
  if (evaluation.result) return evaluation.result;
  if (evaluation.type === "kata") return "Registro técnico";
  return evaluation.score >= 70 ? "Aprovado" : "Reexame necessário";
}

function modalityLabel(type: EvaluationRecord["type"]) {
  return type.charAt(0).toLocaleUpperCase("pt-BR") + type.slice(1);
}

export function EvaluationBatchReport({
  evaluations,
  onClose,
}: {
  evaluations: EvaluationRecord[];
  onClose: () => void;
}) {
  const [format, setFormat] = useState<BatchReportFormat>("summary");
  const dialogRef = useRef<HTMLElement>(null);
  const reportId = "evaluation-batch-report";

  const period = useMemo(() => {
    const dates = evaluations
      .map((evaluation) => new Date(evaluation.createdAt))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    if (!dates.length) return "Período não informado";
    const first = formatDate(dates[0].toISOString());
    const last = formatDate(dates.at(-1)!.toISOString());
    return first === last ? first : `${first} a ${last}`;
  }, [evaluations]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const printReport = () => {
    const report = document.getElementById(reportId);
    if (!report) return;
    const details = [...report.querySelectorAll("details")];
    const previousState = details.map((detail) => detail.open);
    details.forEach((detail) => { detail.open = true; });
    document.body.classList.add("printing-evaluation-batch");
    report.classList.add("print-target", `print-${format}`);
    try {
      window.print();
    } finally {
      report.classList.remove("print-target", `print-${format}`);
      document.body.classList.remove("printing-evaluation-batch");
      details.forEach((detail, index) => { detail.open = previousState[index]; });
    }
  };

  return (
    <div className="evaluation-dialog-layer batch-report-layer" role="presentation">
      <section
        ref={dialogRef}
        className="evaluation-dialog batch-report-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-report-title"
        tabIndex={-1}
      >
        <header>
          <span><Printer size={20} /></span>
          <div>
            <h2 id="batch-report-title">Preparar relatório coletivo</h2>
            <p>{evaluations.length} {evaluations.length === 1 ? "avaliação selecionada" : "avaliações selecionadas"}.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar relatório coletivo"><X size={19} /></button>
        </header>

        <fieldset className="batch-report-format">
          <legend>Escolha o conteúdo do PDF</legend>
          <label className={format === "summary" ? "selected" : ""}>
            <input type="radio" name="batch-report-format" value="summary" checked={format === "summary"} onChange={() => setFormat("summary")} />
            <ListChecks size={20} />
            <span><strong>Resumo das notas</strong><small>Uma relação compacta para conferência e impressão.</small></span>
          </label>
          <label className={format === "detailed" ? "selected" : ""}>
            <input type="radio" name="batch-report-format" value="detailed" checked={format === "detailed"} onChange={() => setFormat("detailed")} />
            <FileStack size={20} />
            <span><strong>Relatórios completos</strong><small>Inclui categorias, técnicas, execuções e observações.</small></span>
          </label>
        </fieldset>

        <div id={reportId} className="batch-report-document">
          <header className="batch-report-print-heading">
            <Brand compact />
            <div>
              <strong>Relatório coletivo de avaliações</strong>
              <span>Associação Judô Rogério Cruz</span>
            </div>
            <dl>
              <div><dt>Registros</dt><dd>{evaluations.length}</dd></div>
              <div><dt>Período</dt><dd>{period}</dd></div>
              <div><dt>Emitido em</dt><dd>{formatDate(new Date().toISOString(), true)}</dd></div>
            </dl>
          </header>

          <div className="batch-report-preview-heading">
            <strong>Prévia da relação</strong>
            <span>{period}</span>
          </div>
          <div className="batch-report-table-wrap">
            <table className="batch-report-table">
              <thead>
                <tr>
                  <th>Judoca</th>
                  <th>Prova</th>
                  <th>Avaliador</th>
                  <th>Data</th>
                  <th>Nota</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((evaluation) => (
                  <tr key={evaluation.id}>
                    <td><strong>{evaluation.athlete}</strong></td>
                    <td>{modalityLabel(evaluation.type)}<small>{evaluation.belt}</small></td>
                    <td>{evaluation.evaluatorName}<small>{evaluation.evaluatorRank || "Graduação não informada"}</small></td>
                    <td>{formatDate(evaluation.createdAt, true)}</td>
                    <td><strong>{scoreLabel(evaluation.score)}</strong></td>
                    <td>{resultLabel(evaluation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="batch-detailed-reports">
            {evaluations.map((evaluation) => (
              <EvaluationReport key={evaluation.id} evaluation={evaluation} />
            ))}
          </div>
        </div>

        <footer>
          <button className="management-secondary" onClick={onClose}>Cancelar</button>
          <button className="management-primary" onClick={printReport}><Printer size={18} /> Imprimir ou salvar PDF</button>
        </footer>
      </section>
    </div>
  );
}
