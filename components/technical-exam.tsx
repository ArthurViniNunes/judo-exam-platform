"use client";

import { useState } from "react";
import {
  ArrowLeft, Check, ChevronDown, ChevronRight, CircleHelp, Dices,
} from "lucide-react";
import {
  PRACTICAL_BELTS, SCORE_OPTIONS, TECHNIQUE_VIDEOS, calculateSequenceScore,
  createPracticalExam,
  getTechniqueEvaluationParts, toYouTubeEmbedUrl, type PracticalBeltId,
} from "@/lib/practical-exams";
import { calculatePracticalResult } from "@/lib/practical-scoring";
import { Brand, TechniqueVideoDialog } from "./exam-public";
import type { PracticalResult } from "./exam-public";

export function TechnicalSetup({
  onBack,
  onStart,
  evaluatorName = "Avaliador",
}: {
  onBack: () => void;
  onStart: (athlete: string, belt: PracticalBeltId) => void;
  evaluatorName?: string;
}) {
  const [athlete, setAthlete] = useState("");
  const [belt, setBelt] = useState<PracticalBeltId | "">("");
  return (
    <section className="modal-screen">
      <div className="public-card form-card technical-start">
        <Brand />
        <span className="eyebrow">AVALIAÇÃO DE EXAME DE FAIXA</span>
        <h2>DADOS DA AVALIAÇÃO</h2>
        <p className="muted">Preencha os dados para iniciar a avaliação técnica.</p>
        <label>NOME DO AVALIADOR
          <input value={evaluatorName} disabled />
          <small>Definido automaticamente pelo perfil do avaliador.</small>
        </label>
        <label>NOME DO ATLETA
          <input value={athlete} onChange={(e) => setAthlete(e.target.value)} placeholder="Nome completo" />
        </label>
        <label>FAIXA PRETENDIDA
          <select value={belt} onChange={(e) => setBelt(e.target.value as PracticalBeltId | "")}>
            <option value="">Selecione a graduação</option>
            {PRACTICAL_BELTS.map((item) => <option key={item.id} value={item.id}>Faixa {item.name} — {item.kyu}</option>)}
          </select>
        </label>
        <div className="button-row">
          <button className="outline" onClick={onBack}>VOLTAR</button>
          <button className="primary" disabled={!athlete.trim() || !belt} onClick={() => belt && onStart(athlete, belt)}>
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
}: {
  athlete: string;
  beltId: PracticalBeltId;
  onFinish: (result: PracticalResult) => void;
  onExit: () => void;
}) {
  const belt = PRACTICAL_BELTS.find((item) => item.id === beltId) ?? PRACTICAL_BELTS[0];
  const [exam] = useState(() => createPracticalExam(beltId));
  const [groupIndex, setGroupIndex] = useState(0);
  const [standardScores, setStandardScores] = useState<Record<string, number>>({});
  const [sequenceScores, setSequenceScores] = useState<
    Record<string, Record<number, number>>
  >({});
  const [notes, setNotes] = useState("");
  const [openTechnique, setOpenTechnique] = useState<string | null>(null);
  const [videoTechnique, setVideoTechnique] = useState<string | null>(null);

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

  const updateSequenceScore = (
    techniqueId: string,
    partIndex: number,
    value: number,
  ) => {
    setSequenceScores((current) => {
      const techniqueScores = {
        ...(current[techniqueId] ?? {}),
        [partIndex]: value,
      };
      return { ...current, [techniqueId]: techniqueScores };
    });
  };

  const next = () => {
    if (!group) return;
    if (groupIndex < exam.length - 1) {
      setGroupIndex(groupIndex + 1);
      setOpenTechnique(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    onFinish(calculatePracticalResult(exam, scores));
  };

  return (
    <section className="technical-screen">
      <header className="quiz-header">
        <Brand compact />
        <div><strong>{athlete}</strong><span>Faixa {belt.name} · {belt.kyu}</span></div>
        <button className="text-button" onClick={onExit}>Sair</button>
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
                <article key={technique.id} className={`technique-card ${techniqueComplete ? "scored" : ""} ${isOpen ? "open" : ""}`}>
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
                              setStandardScores((current) => ({ ...current, [technique.id]: option.value }));
                              setOpenTechnique(null);
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
            <button className="primary" disabled={!complete || (groupIndex === exam.length - 1 && !allComplete)} onClick={next}>{groupIndex === exam.length - 1 ? "CONCLUIR AVALIAÇÃO" : "PRÓXIMA ETAPA"} <ChevronRight size={17} /></button>
          </div>
        </div>
      </div>
      <div className="mobile-score-dock">
        <div className="exam-progress" role="progressbar" aria-label="Progresso da avaliação" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><i style={{ width: `${progress}%` }} /></div>
        <strong>Nota parcial {liveAverage.toFixed(1)}</strong>
      </div>
      {videoTechnique && <TechniqueVideoDialog technique={videoTechnique} onClose={() => setVideoTechnique(null)} />}
    </section>
  );
}
