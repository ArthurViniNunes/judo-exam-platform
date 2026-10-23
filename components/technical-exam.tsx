"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Check, ChevronDown, ChevronRight, CircleHelp, Dices, Smartphone, Undo2,
} from "lucide-react";
import {
  PRACTICAL_BELTS, SCORE_OPTIONS, TECHNIQUE_VIDEOS, calculateSequenceScore,
  createPracticalExam,
  getTechniqueEvaluationParts, toYouTubeEmbedUrl, type PracticalBeltId,
} from "@/lib/practical-exams";
import { calculatePracticalResult } from "@/lib/practical-scoring";
import type { PracticalCandidate } from "@/lib/platform";
import {
  readHapticsPreference,
  triggerHapticFeedback,
  writeHapticsPreference,
} from "@/lib/haptics";
import type {
  DraftSaveState,
  TechnicalDraft,
  TechnicalDraftState,
} from "@/lib/offline-evaluations";
import { Brand, TechniqueVideoDialog } from "./exam-public";
import { PracticalCandidateSelect } from "./exam-student-select";
import { DraftResumeList, DraftSaveIndicator } from "./exam-persistence";
import type { PracticalResult } from "./exam-public";

type ScoreAction =
  | { kind: "standard"; techniqueId: string; previous?: number; groupIndex: number }
  | { kind: "sequence"; techniqueId: string; partIndex: number; previous?: number; groupIndex: number };

export function TechnicalSetup({
  onBack,
  onStart,
  students,
  studentsLoading,
  studentsError,
  onRetryStudents,
  onManageStudents,
  drafts,
  onResumeDraft,
  onDiscardDraft,
}: {
  onBack: () => void;
  onStart: (student: PracticalCandidate & { eligibility: NonNullable<PracticalCandidate["eligibility"]> }) => void;
  students: PracticalCandidate[];
  studentsLoading: boolean;
  studentsError: string;
  onRetryStudents: () => void;
  onManageStudents: () => void;
  drafts: TechnicalDraft[];
  onResumeDraft: (draft: TechnicalDraft) => void;
  onDiscardDraft: (draft: TechnicalDraft) => void;
}) {
  const [studentId, setStudentId] = useState("");
  const selectedStudent = students.find(
    (student): student is PracticalCandidate & {
      eligibility: NonNullable<PracticalCandidate["eligibility"]>;
    } => student.id === studentId && student.eligibility !== null,
  );
  return (
    <section className="modal-screen">
      <div className="public-card form-card technical-start">
        <Brand />
        <span className="eyebrow">AVALIAÇÃO DE EXAME DE FAIXA</span>
        <h2>DADOS DA AVALIAÇÃO</h2>
        <p className="muted">Selecione um judoca aprovado no teórico. A graduação correta será preenchida automaticamente.</p>
        <DraftResumeList drafts={drafts} onResume={(draft) => onResumeDraft(draft as TechnicalDraft)} onDiscard={(draft) => onDiscardDraft(draft as TechnicalDraft)} />
        <PracticalCandidateSelect
          students={students}
          value={studentId}
          loading={studentsLoading}
          error={studentsError}
          onChange={setStudentId}
          onRetry={onRetryStudents}
          onManageStudents={onManageStudents}
        />
        <div className="button-row">
          <button className="outline" onClick={onBack}>VOLTAR</button>
          <button className="primary" disabled={!selectedStudent} onClick={() => selectedStudent && onStart(selectedStudent)}>
            INICIAR AVALIAÇÃO <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}

export function TechnicalForm({
  athlete,
  beltId,
  onFinish,
  onExit,
  draft,
  onSaveDraft,
}: {
  athlete: string;
  beltId: PracticalBeltId;
  onFinish: (result: PracticalResult) => void | Promise<void>;
  onExit: () => void;
  draft: TechnicalDraft;
  onSaveDraft: (draft: TechnicalDraft) => Promise<void>;
}) {
  const belt = PRACTICAL_BELTS.find((item) => item.id === beltId) ?? PRACTICAL_BELTS[0];
  const [exam] = useState(() => draft.data.exam.length ? draft.data.exam : createPracticalExam(beltId));
  const [groupIndex, setGroupIndex] = useState(draft.data.groupIndex);
  const [standardScores, setStandardScores] = useState<Record<string, number>>(draft.data.standardScores);
  const [sequenceScores, setSequenceScores] = useState<
    Record<string, Record<number, number>>
  >(draft.data.sequenceScores);
  const [notes, setNotes] = useState(draft.data.notes);
  const [openTechnique, setOpenTechnique] = useState<string | null>(null);
  const [videoTechnique, setVideoTechnique] = useState<string | null>(null);
  const [lastScoreAction, setLastScoreAction] = useState<ScoreAction | null>(null);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>("saved");
  const [hapticsEnabled, setHapticsEnabled] = useState(readHapticsPreference);
  const saveDraftRef = useRef(onSaveDraft);
  const saveRevisionRef = useRef(0);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    saveDraftRef.current = onSaveDraft;
  }, [onSaveDraft]);

  useEffect(() => {
    const revision = ++saveRevisionRef.current;
    const data: TechnicalDraftState = {
      exam,
      groupIndex,
      standardScores,
      sequenceScores,
      notes,
    };
    queueMicrotask(() => {
      if (revision === saveRevisionRef.current) setDraftSaveState("saving");
    });
    saveChainRef.current = saveChainRef.current
      .catch(() => undefined)
      .then(() => saveDraftRef.current({ ...draft, data }));
    void saveChainRef.current.then(
      () => {
        if (revision === saveRevisionRef.current) setDraftSaveState("saved");
      },
      () => {
        if (revision === saveRevisionRef.current) setDraftSaveState("error");
      },
    );
  }, [draft, exam, groupIndex, notes, sequenceScores, standardScores]);

  const scores = { ...standardScores };
  for (const category of exam) {
    for (const technique of category.techniques) {
      const partCount = getTechniqueEvaluationParts(technique.name).length;
      if (partCount < 2) continue;
      const average = calculateSequenceScore(
        sequenceScores[technique.id],
        partCount,
      );
      if (average !== undefined) scores[technique.id] = average;
    }
  }

  const group = exam[groupIndex];
  const complete = Boolean(group?.techniques.every((technique) => scores[technique.id] !== undefined));
  const allComplete = exam.every((category) => category.techniques.every((technique) => scores[technique.id] !== undefined));
  const scoredCount = Object.keys(scores).length;
  const totalTechniques = exam.reduce((sum, category) => sum + category.techniques.length, 0);
  const progress = totalTechniques ? (scoredCount / totalTechniques) * 100 : 0;
  const liveAverage = scoredCount ? Object.values(scores).reduce((sum, value) => sum + value, 0) / scoredCount : 0;

  const focusTechnique = (techniqueId: string | null) => {
    setOpenTechnique(techniqueId);
    if (!techniqueId) return;
    window.requestAnimationFrame(() => {
      document.getElementById(`technique-${techniqueId}`)?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
  };

  const advanceFrom = (techniqueId: string, resolvedScores: Record<string, number>) => {
    const currentIndex = group?.techniques.findIndex((technique) => technique.id === techniqueId) ?? -1;
    const nextTechnique = group?.techniques
      .slice(currentIndex + 1)
      .find((technique) => resolvedScores[technique.id] === undefined);
    focusTechnique(nextTechnique?.id ?? null);
  };

  const updateStandardScore = (techniqueId: string, value: number) => {
    triggerHapticFeedback(hapticsEnabled);
    setLastScoreAction({
      kind: "standard",
      techniqueId,
      previous: standardScores[techniqueId],
      groupIndex,
    });
    setStandardScores((current) => ({ ...current, [techniqueId]: value }));
    advanceFrom(techniqueId, { ...scores, [techniqueId]: value });
  };

  const updateSequenceScore = (
    techniqueId: string,
    partIndex: number,
    value: number,
  ) => {
    triggerHapticFeedback(hapticsEnabled);
    const techniqueScores = {
      ...(sequenceScores[techniqueId] ?? {}),
      [partIndex]: value,
    };
    setLastScoreAction({
      kind: "sequence",
      techniqueId,
      partIndex,
      previous: sequenceScores[techniqueId]?.[partIndex],
      groupIndex,
    });
    setSequenceScores((current) => ({ ...current, [techniqueId]: techniqueScores }));
    const average = calculateSequenceScore(
      techniqueScores,
      getTechniqueEvaluationParts(
        group?.techniques.find((technique) => technique.id === techniqueId)?.name ?? "",
      ).length,
    );
    if (average !== undefined) advanceFrom(techniqueId, { ...scores, [techniqueId]: average });
  };

  const undoLastScore = () => {
    if (!lastScoreAction) return;
    triggerHapticFeedback(hapticsEnabled, [12, 35, 12]);
    const action = lastScoreAction;
    if (action.kind === "standard") {
      setStandardScores((current) => {
        const nextScores = { ...current };
        if (action.previous === undefined) delete nextScores[action.techniqueId];
        else nextScores[action.techniqueId] = action.previous;
        return nextScores;
      });
    } else {
      setSequenceScores((current) => {
        const nextScores = { ...current };
        const techniqueScores = { ...(nextScores[action.techniqueId] ?? {}) };
        if (action.previous === undefined) delete techniqueScores[action.partIndex];
        else techniqueScores[action.partIndex] = action.previous;
        nextScores[action.techniqueId] = techniqueScores;
        return nextScores;
      });
    }
    setGroupIndex(action.groupIndex);
    focusTechnique(action.techniqueId);
    setLastScoreAction(null);
  };

  const next = async () => {
    if (!group) return;
    if (groupIndex < exam.length - 1) {
      setGroupIndex(groupIndex + 1);
      setOpenTechnique(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const result = calculatePracticalResult(exam, scores);
    const items = exam.flatMap((category) =>
      category.techniques.map((technique) => {
        const parts = getTechniqueEvaluationParts(technique.name);
        return {
          category: category.name,
          name: technique.name,
          score: scores[technique.id],
          parts:
            parts.length > 1
              ? parts.map((part, index) => ({
                  name: part,
                  score: sequenceScores[technique.id]?.[index],
                }))
              : undefined,
        };
      }),
    );

    await saveChainRef.current.catch(() => undefined);
    await onFinish({ ...result, items });
  };

  const exit = () => {
    void saveChainRef.current.finally(onExit);
  };

  const toggleHaptics = () => {
    const enabled = !hapticsEnabled;
    setHapticsEnabled(enabled);
    writeHapticsPreference(enabled);
    triggerHapticFeedback(enabled, 24);
  };

  return (
    <section className="technical-screen">
      <header className="quiz-header">
        <Brand compact />
        <div><strong>{athlete}</strong><span>Faixa {belt.name} · {belt.kyu}</span><DraftSaveIndicator state={draftSaveState} /></div>
        <div className="quiz-header-actions">
          <button
            className={`haptics-toggle ${hapticsEnabled ? "active" : ""}`}
            onClick={toggleHaptics}
            aria-pressed={hapticsEnabled}
            title={hapticsEnabled ? "Desativar vibração ao lançar notas" : "Ativar vibração ao lançar notas"}
          >
            <Smartphone size={17} aria-hidden="true" />
            <span>Vibração</span>
          </button>
          <button className="text-button" onClick={exit}>Sair</button>
        </div>
      </header>
      <div className="technical-layout">
        <aside className="steps-panel">
          <span className="eyebrow">CATEGORIAS</span>
          <h2>Avaliação prática</h2>
          {exam.map((item, index) => {
            const itemComplete = item.techniques.every((technique) => scores[technique.id] !== undefined);
            return <button key={item.name} className={index === groupIndex ? "active" : itemComplete ? "done" : ""} onClick={() => { setGroupIndex(index); setOpenTechnique(null); }}>
              <i>{itemComplete ? <Check size={15} /> : index + 1}</i>
              <span><strong>{item.name}</strong><small>{itemComplete ? "Concluída" : index === groupIndex ? "Em avaliação" : "Pendente"}</small></span>
            </button>;
          })}
          <div className="exam-progress-block">
            <span>Progresso da avaliação</span>
            <div className="exam-progress" role="progressbar" aria-label="Progresso da avaliação" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
        </aside>
        <div className="technical-content">
          <div className="section-title">
            <div><span>CATEGORIA ATUAL</span><h1>{group?.name}</h1></div>
            <div className="live-score"><span>NOTA PARCIAL</span><strong>{liveAverage.toFixed(1)}</strong></div>
          </div>
          <div className="criteria-list practical-criteria">
            {group?.techniques.map((technique, itemIndex) => {
              const evaluationParts = getTechniqueEvaluationParts(technique.name);
              const hasMultipleEvaluations = evaluationParts.length > 1;
              const techniqueScore = scores[technique.id];
              const selectedScore = hasMultipleEvaluations
                ? undefined
                : SCORE_OPTIONS.find((option) => option.value === techniqueScore);
              const techniqueComplete = techniqueScore !== undefined;
              const isOpen = openTechnique === technique.id;
              const hasVideo = Boolean(toYouTubeEmbedUrl(TECHNIQUE_VIDEOS[technique.name] ?? ""));
              return (
                <article id={`technique-${technique.id}`} key={technique.id} className={`technique-card ${techniqueComplete ? "scored" : ""} ${isOpen ? "open" : ""}`}>
                  <div className="technique-card-head">
                    <button className="technique-card-trigger" onClick={() => setOpenTechnique(isOpen ? null : technique.id)} aria-expanded={isOpen} aria-controls={`score-menu-${technique.id}`}>
                      <span className="technique-number">{String(itemIndex + 1).padStart(2, "0")}</span>
                      <span className="technique-copy">
                        <strong>{technique.name}</strong>
                        {technique.drawnFrom && <small className="drawn-origin"><Dices size={12} /> Veio de sorteio da {technique.drawnFrom}</small>}
                        {hasMultipleEvaluations && <small>{evaluationParts.length} avaliações no mesmo bloco</small>}
                      </span>
                      {hasMultipleEvaluations && techniqueComplete ? (
                        <span className="selected-rating"><b>{techniqueScore.toFixed(1)}</b> média</span>
                      ) : selectedScore ? (
                        <span className={`selected-rating score-${selectedScore.value}`}><b>{selectedScore.value}</b> {selectedScore.label}</span>
                      ) : (
                        <span className="rate-prompt">Avaliar</span>
                      )}
                      <ChevronDown className="card-chevron" size={19} />
                    </button>
                    {hasVideo && <button className="video-help" onClick={() => setVideoTechnique(technique.name)} aria-label={`Ver vídeo de ${technique.name}`} title="Ver vídeo da técnica">
                      <CircleHelp size={20} />
                    </button>}
                  </div>
                  {isOpen && (
                    hasMultipleEvaluations ? (
                      <div className="sequence-rating" id={`score-menu-${technique.id}`} aria-label={`Avaliações de ${technique.name}`}>
                        <div className="sequence-score-guide">
                          {SCORE_OPTIONS.map((option) => (
                            <span key={option.value}><b>{option.value} · {option.label}</b><small>{option.description}</small></span>
                          ))}
                        </div>
                        {evaluationParts.map((part, partIndex) => (
                          <section className="sequence-part" key={`${technique.id}-${part}`}>
                            <header><span>Execução {partIndex + 1}</span><strong>{part}</strong></header>
                            <div className="sequence-score-buttons" role="group" aria-label={`Nota da ${part.toLocaleLowerCase("pt-BR")} em ${technique.name}`}>
                              {SCORE_OPTIONS.map((option) => {
                                const selected = sequenceScores[technique.id]?.[partIndex] === option.value;
                                return (
                                  <button key={option.value} className={`score-${option.value} ${selected ? "selected" : ""}`} onClick={() => updateSequenceScore(technique.id, partIndex, option.value)} aria-pressed={selected}>
                                    <b>{option.value}</b><span>{option.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                        {techniqueComplete && (
                          <button className="sequence-done" onClick={() => setOpenTechnique(null)}>
                            <Check size={17} /> Concluir técnica · média {techniqueScore.toFixed(1)}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="rating-menu" id={`score-menu-${technique.id}`} role="group" aria-label={`Nota para ${technique.name}`}>
                        {SCORE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            className={`rating-option score-${option.value} ${scores[technique.id] === option.value ? "selected" : ""}`}
                            onClick={() => {
                              updateStandardScore(technique.id, option.value);
                            }}
                            aria-pressed={scores[technique.id] === option.value}
                          >
                            <span className="rating-points">{option.value}</span>
                            <span className="rating-copy"><strong>{option.label}</strong><small>{option.description}</small></span>
                            {scores[technique.id] === option.value && <Check size={18} />}
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </article>
              );
            })}
          </div>
          <label className="notes-field">OBSERVAÇÕES DO AVALIADOR
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Registre pontos fortes, orientações e aspectos a desenvolver..." />
          </label>
          <div className="quiz-actions">
            <button className="outline" disabled={groupIndex === 0} onClick={() => { setGroupIndex(groupIndex - 1); setOpenTechnique(null); }}><ArrowLeft size={17} /> ETAPA ANTERIOR</button>
            <button className="primary" disabled={!complete || (groupIndex === exam.length - 1 && !allComplete)} onClick={() => void next()}>{groupIndex === exam.length - 1 ? "CONCLUIR AVALIAÇÃO" : "PRÓXIMA ETAPA"} <ChevronRight size={17} /></button>
          </div>
        </div>
      </div>
      <div className="mobile-score-dock">
        <div className="exam-progress" role="progressbar" aria-label="Progresso da avaliação" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><i style={{ width: `${progress}%` }} /></div>
        <button className="quick-undo" disabled={!lastScoreAction} onClick={undoLastScore}><Undo2 size={16} /> Desfazer</button>
        <strong>Nota parcial {liveAverage.toFixed(1)}</strong>
      </div>
      {videoTechnique && <TechniqueVideoDialog technique={videoTechnique} onClose={() => setVideoTechnique(null)} />}
    </section>
  );
}
