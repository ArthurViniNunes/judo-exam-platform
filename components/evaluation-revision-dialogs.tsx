"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, History, PencilLine, Save, X } from "lucide-react";
import { apiRequest } from "@/lib/api";
import type {
  EvaluationCorrectionSubmission,
  EvaluationRecord,
} from "@/lib/platform";
import { EmptyState, formatDate, LoadingBlock, scoreLabel } from "@/components/admin-portal-shared";
import { EvaluationReport } from "@/components/evaluation-report";

type RevisionDialogsProps = {
  correctionTarget: EvaluationRecord | null;
  historyTarget: EvaluationRecord | null;
  onCloseCorrection: () => void;
  onCloseHistory: () => void;
  onSaved: () => Promise<void>;
};

function correctionFrom(evaluation: EvaluationRecord): EvaluationCorrectionSubmission {
  const categories = evaluation.categories.length
    ? evaluation.categories.map((category) => ({
        name: category.name,
        score: category.score,
      }))
    : Array.from(
        new Set(evaluation.items.map((item) => item.category)),
        (name) => {
          const items = evaluation.items.filter((item) => item.category === name);
          return {
            name,
            score: items.reduce((total, item) => total + item.score, 0) / items.length,
          };
        },
      );
  return {
    reason: "",
    score: evaluation.score,
    result: evaluation.result,
    detail: evaluation.detail,
    categories,
    items: evaluation.items.map((item) => ({
      category: item.category,
      name: item.name,
      score: item.score,
      detail: item.detail ?? undefined,
      parts: item.parts.map((part) => ({ name: part.name, score: part.score })),
    })),
  };
}

function displayedScore(value: number) {
  return Number((value / 10).toFixed(1));
}

function storedScore(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed * 10)) : 0;
}

export function EvaluationRevisionDialogs({
  correctionTarget,
  historyTarget,
  onCloseCorrection,
  onCloseHistory,
  onSaved,
}: RevisionDialogsProps) {
  const [draft, setDraft] = useState<EvaluationCorrectionSubmission | null>(
    () => correctionTarget ? correctionFrom(correctionTarget) : null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<EvaluationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(Boolean(historyTarget));

  useEffect(() => {
    if (!historyTarget) return;
    let active = true;
    apiRequest<EvaluationRecord[]>(
      `/api/evaluations/${encodeURIComponent(historyTarget.id)}/revisions`,
    )
      .then((records) => { if (active) setHistory(records); })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível abrir o histórico.");
      })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [historyTarget]);

  useEffect(() => {
    if (!correctionTarget && !historyTarget) return;
    const previousOverflow = document.body.style.overflow;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || saving) return;
      onCloseCorrection();
      onCloseHistory();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [correctionTarget, historyTarget, onCloseCorrection, onCloseHistory, saving]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, { item: EvaluationCorrectionSubmission["items"][number]; index: number }[]>();
    draft?.items.forEach((item, index) => {
      const group = groups.get(item.category) ?? [];
      group.push({ item, index });
      groups.set(item.category, group);
    });
    return groups;
  }, [draft]);

  const submitCorrection = async () => {
    if (!correctionTarget || !draft) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest<EvaluationRecord>(
        `/api/evaluations/${encodeURIComponent(correctionTarget.id)}/revisions`,
        { method: "POST", body: JSON.stringify(draft) },
      );
      await onSaved();
      onCloseCorrection();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a correção.");
    } finally {
      setSaving(false);
    }
  };

  const setCategoryScore = (index: number, value: string) => {
    setDraft((current) => current && ({
      ...current,
      categories: current.categories.map((category, categoryIndex) =>
        categoryIndex === index ? { ...category, score: storedScore(value) } : category),
    }));
  };

  const setItemScore = (index: number, value: string) => {
    setDraft((current) => current && ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, score: storedScore(value) } : item),
    }));
  };

  const setPartScore = (itemIndex: number, partIndex: number, value: string) => {
    setDraft((current) => current && ({
      ...current,
      items: current.items.map((item, currentItemIndex) => currentItemIndex === itemIndex
        ? {
            ...item,
            parts: item.parts?.map((part, currentPartIndex) =>
              currentPartIndex === partIndex ? { ...part, score: storedScore(value) } : part),
          }
        : item),
    }));
  };

  return (
    <>
      {correctionTarget && draft && <div className="evaluation-dialog-layer" role="presentation">
        <section className="evaluation-dialog evaluation-correction-dialog" role="dialog" aria-modal="true" aria-labelledby="correction-title">
          <header>
            <span><PencilLine size={20} /></span>
            <div>
              <h2 id="correction-title">Corrigir avaliação</h2>
              <p>A versão anterior continuará preservada no histórico.</p>
            </div>
            <button onClick={onCloseCorrection} aria-label="Fechar correção" disabled={saving}><X size={19} /></button>
          </header>

          <div className="evaluation-correction-notice">
            <History size={18} />
            <p><strong>Revisão {correctionTarget.revisionNumber + 1}</strong><span>{correctionTarget.athlete} · {correctionTarget.type} · {correctionTarget.belt}</span></p>
          </div>

          <div className="evaluation-correction-main">
            <label>Nota final<input type="number" inputMode="decimal" min="0" max="10" step="0.1" value={displayedScore(draft.score)} onChange={(event) => setDraft({ ...draft, score: storedScore(event.target.value) })} /></label>
            <label>Resultado<input maxLength={120} value={draft.result ?? ""} onChange={(event) => setDraft({ ...draft, result: event.target.value })} /></label>
          </div>

          <label className="evaluation-delete-reason">
            Motivo da correção
            <textarea autoFocus maxLength={500} value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} placeholder="Ex.: nota lançada incorretamente durante a prova" />
            <small>{draft.reason.trim().length}/500 · mínimo de 5 caracteres</small>
          </label>

          <label className="evaluation-delete-reason">
            Resumo da avaliação
            <textarea maxLength={2000} value={draft.detail ?? ""} onChange={(event) => setDraft({ ...draft, detail: event.target.value })} />
          </label>

          <div className="evaluation-correction-groups">
            {[...groupedItems.entries()].map(([categoryName, entries], groupIndex) => {
              const categoryIndex = draft.categories.findIndex((category) => category.name === categoryName);
              return <details key={categoryName} open={groupIndex === 0}>
                <summary>
                  <span><strong>{categoryName}</strong><small>{entries.length} itens</small></span>
                </summary>
                <div>
                  {categoryIndex >= 0 && <label className="evaluation-category-score-editor"><span>Média da categoria</span><input aria-label={`Média de ${categoryName}`} type="number" inputMode="decimal" min="0" max="10" step="0.1" value={displayedScore(draft.categories[categoryIndex].score)} onChange={(event) => setCategoryScore(categoryIndex, event.target.value)} /></label>}
                  {entries.map(({ item, index }) => <article key={`${item.category}-${item.name}-${index}`}>
                    <label><span>{item.name}</span><input aria-label={`Nota de ${item.name}`} type="number" inputMode="decimal" min="0" max="10" step="0.1" value={displayedScore(item.score)} onChange={(event) => setItemScore(index, event.target.value)} /></label>
                    {!!item.parts?.length && <div className="evaluation-correction-parts">
                      {item.parts.map((part, partIndex) => <label key={`${part.name}-${partIndex}`}><span>{part.name}</span><input aria-label={`Nota de ${part.name}`} type="number" inputMode="decimal" min="0" max="10" step="0.1" value={displayedScore(part.score)} onChange={(event) => setPartScore(index, partIndex, event.target.value)} /></label>)}
                    </div>}
                  </article>)}
                </div>
              </details>;
            })}
          </div>

          {error && <p className="management-error">{error}</p>}
          <footer>
            <button className="management-secondary" onClick={onCloseCorrection} disabled={saving}>Cancelar</button>
            <button className="management-primary" onClick={() => void submitCorrection()} disabled={saving || draft.reason.trim().length < 5}>
              <Save size={17} /> {saving ? "Salvando…" : "Salvar nova revisão"}
            </button>
          </footer>
        </section>
      </div>}

      {historyTarget && <div className="evaluation-dialog-layer" role="presentation">
        <section className="evaluation-dialog evaluation-history-dialog" role="dialog" aria-modal="true" aria-labelledby="revision-history-title">
          <header>
            <span><History size={20} /></span>
            <div><h2 id="revision-history-title">Histórico de correções</h2><p>{historyTarget.athlete} · todas as versões preservadas</p></div>
            <button onClick={onCloseHistory} aria-label="Fechar histórico"><X size={19} /></button>
          </header>
          {error && <p className="management-error">{error}</p>}
          {historyLoading ? <LoadingBlock label="Carregando correções…" /> : history.length ? <div className="evaluation-revision-list">
            {history.map((revision, index) => <details key={revision.id} open={index === 0}>
              <summary>
                <span><strong>Revisão {revision.revisionNumber}</strong><small>{revision.revisionNumber === 1 ? "Registro original" : revision.correctionReason}</small></span>
                <span><b>{scoreLabel(revision.score)}</b><small>{revision.deletedAt ? "Excluída" : index === 0 ? "Vigente" : "Substituída"}</small></span>
              </summary>
              {revision.revisionNumber > 1 && <dl className="evaluation-revision-meta">
                <div><dt>Corrigida por</dt><dd>{revision.correctedByName || "Não informado"}</dd></div>
                <div><dt>Data da correção</dt><dd><Clock3 size={15} /> {formatDate(revision.correctedAt || revision.createdAt, true)}</dd></div>
                <div><dt>Motivo</dt><dd>{revision.correctionReason}</dd></div>
              </dl>}
              <EvaluationReport evaluation={revision} />
            </details>)}
          </div> : <EmptyState icon={<History size={28} />} title="Histórico indisponível" detail="Nenhuma versão foi encontrada para esta avaliação." />}
        </section>
      </div>}
    </>
  );
}
