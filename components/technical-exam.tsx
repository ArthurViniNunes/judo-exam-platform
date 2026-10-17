"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleHelp, Dices, RotateCw,
} from "lucide-react";
import {
  PRACTICAL_BELTS, SCORE_OPTIONS, TECHNIQUE_VIDEOS, beltNeedsDraw, createPracticalExam,
  toYouTubeEmbedUrl, type ExamCategory, type PracticalBeltId,
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
  const requiresDraw = beltNeedsDraw(beltId);
  const [exam, setExam] = useState<ExamCategory[] | null>(() => requiresDraw ? null : createPracticalExam(beltId));
  const [drawing, setDrawing] = useState(false);
  const [groupIndex, setGroupIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [openTechnique, setOpenTechnique] = useState<string | null>(null);
  const [videoTechnique, setVideoTechnique] = useState<string | null>(null);
  const drawTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (drawTimer.current) window.clearTimeout(drawTimer.current);
  }, []);

  const group = exam?.[groupIndex];
  const complete = Boolean(group?.techniques.every((technique) => scores[technique.id] !== undefined));
  const allComplete = Boolean(exam?.every((category) => category.techniques.every((technique) => scores[technique.id] !== undefined)));
  const scoredCount = Object.keys(scores).length;
  const totalTechniques = exam?.reduce((sum, category) => sum + category.techniques.length, 0) ?? 0;
  const liveAverage = scoredCount ? Object.values(scores).reduce((sum, value) => sum + value, 0) / scoredCount : 0;

  const runDraw = () => {
    if (drawing) return;
    setDrawing(true);
    const generatedExam = createPracticalExam(beltId);
    drawTimer.current = window.setTimeout(() => {
      setExam(generatedExam);
      setDrawing(false);
      setGroupIndex(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1800);
  };

  const next = () => {
    if (!exam || !group) return;
    if (groupIndex < exam.length - 1) {
      setGroupIndex(groupIndex + 1);
      setOpenTechnique(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    onFinish(calculatePracticalResult(exam, scores));
  };

  if (!exam) {
    const drawRules = Object.entries(belt.categories).flatMap(([category, definition]) =>
      definition?.draws?.map((rule) => {
        const source = PRACTICAL_BELTS.find((item) => item.id === rule.from);
        return `${rule.count} de ${category} da faixa ${source?.name}`;
      }) ?? [],
    );

    return (
      <section className="technical-screen draw-screen">
        <header className="quiz-header">
          <Brand compact />
          <div><strong>{athlete}</strong><span>Faixa {belt.name} · {belt.kyu}</span></div>
          <button className="text-button" onClick={onExit}>Sair</button>
        </header>
        <div className={`draw-stage ${drawing ? "is-drawing" : ""}`}>
          <div className="draw-symbol"><Dices size={46} /></div>
          <span className="eyebrow">SORTEIO DA AVALIAÇÃO</span>
          <h1>{drawing ? "Sorteando técnicas…" : "Prepare a lista do exame"}</h1>
          <p>{drawing ? "As técnicas estão sendo selecionadas de forma aleatória." : "O sorteio combina técnicas de faixas anteriores com a lista fixa desta graduação."}</p>
          <div className="draw-rules">
            {drawRules.map((rule) => <span key={rule}><Check size={15} /> {rule}</span>)}
          </div>
          <button className="primary draw-button" disabled={drawing} onClick={runDraw}>
            {drawing ? <RotateCw className="spin" size={20} /> : <Dices size={20} />}
            {drawing ? "SORTEANDO…" : "SORTEAR TÉCNICAS"}
          </button>
          <small>O sorteio não poderá ser refeito depois que a avaliação começar.</small>
        </div>
      </section>
    );
  }

  return (
    <section className="technical-screen">
      <header className="quiz-header">
        <Brand compact />
        <div><strong>{athlete}</strong><span>Faixa {belt.name} · {belt.kyu}</span></div>
        <button className="text-button" onClick={onExit}>Sair</button>
      </header>
      <div className="technical-layout">
        <aside className="steps-panel">
          <span className="eyebrow">MATRIZ TÉCNICA</span>
          <h2>Avaliação prática</h2>
          {exam.map((item, index) => {
            const itemComplete = item.techniques.every((technique) => scores[technique.id] !== undefined);
            return <button key={item.name} className={index === groupIndex ? "active" : itemComplete ? "done" : ""} onClick={() => { setGroupIndex(index); setOpenTechnique(null); }}>
              <i>{itemComplete ? <Check size={15} /> : index + 1}</i>
              <span><strong>{item.name}</strong><small>{item.techniques.length} técnicas</small></span>
            </button>;
          })}
          <div className="autosave"><CheckCircle2 size={16} /> {scoredCount} de {totalTechniques} técnicas avaliadas</div>
        </aside>
        <div className="technical-content">
          <div className="section-title">
            <div><span>ETAPA {groupIndex + 1} DE {exam.length}</span><h1>{group?.name}</h1></div>
            <div className="live-score"><span>NOTA PARCIAL</span><strong>{liveAverage.toFixed(1)}</strong></div>
          </div>
          <div className="criteria-list practical-criteria">
            {group?.techniques.map((technique, itemIndex) => {
              const selectedScore = SCORE_OPTIONS.find((option) => option.value === scores[technique.id]);
              const isOpen = openTechnique === technique.id;
              const hasVideo = Boolean(toYouTubeEmbedUrl(TECHNIQUE_VIDEOS[technique.name] ?? ""));
              return (
                <article key={technique.id} className={`technique-card ${selectedScore ? "scored" : ""} ${isOpen ? "open" : ""}`}>
                  <div className="technique-card-head">
                    <button className="technique-card-trigger" onClick={() => setOpenTechnique(isOpen ? null : technique.id)} aria-expanded={isOpen} aria-controls={`score-menu-${technique.id}`}>
                      <span className="technique-number">{String(itemIndex + 1).padStart(2, "0")}</span>
                      <span className="technique-copy">
                        <strong>{technique.name}</strong>
                        {technique.drawnFrom && <small><Dices size={12} /> Sorteada da {technique.drawnFrom}</small>}
                      </span>
                      {selectedScore ? <span className={`selected-rating score-${selectedScore.value}`}><b>{selectedScore.value}</b> {selectedScore.label}</span> : <span className="rate-prompt">Avaliar</span>}
                      <ChevronDown className="card-chevron" size={19} />
                    </button>
                    {hasVideo && <button className="video-help" onClick={() => setVideoTechnique(technique.name)} aria-label={`Ver vídeo de ${technique.name}`} title="Ver vídeo da técnica">
                      <CircleHelp size={20} />
                    </button>}
                  </div>
                  {isOpen && (
                    <div className="rating-menu" id={`score-menu-${technique.id}`} role="group" aria-label={`Nota para ${technique.name}`}>
                      {SCORE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          className={`rating-option score-${option.value} ${scores[technique.id] === option.value ? "selected" : ""}`}
                          onClick={() => {
                            setScores((current) => ({ ...current, [technique.id]: option.value }));
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
      <div className="mobile-score-dock"><span>{scoredCount}/{totalTechniques} avaliadas</span><strong>Nota parcial {liveAverage.toFixed(1)}</strong></div>
      {videoTechnique && <TechniqueVideoDialog technique={videoTechnique} onClose={() => setVideoTechnique(null)} />}
    </section>
  );
}
