"use client";

import { useState } from "react";
import {
  Activity, ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp,
} from "lucide-react";
import {
  EMPTY_KATA_MARK, KATAS, calculateKataResult, createKataExam, kataMarkDeductions,
  type KataErrors, type KataId, type KataMark, type KataMode, type KataResult,
} from "@/lib/kata-exams";
import { TECHNIQUE_VIDEOS, toYouTubeEmbedUrl } from "@/lib/practical-exams";
import { Brand, TechniqueVideoDialog } from "./exam-public";
import type { View } from "./exam-public";

export function KataSetup({
  onBack,
  onStart,
  evaluatorName = "Avaliador",
}: {
  onBack: () => void;
  onStart: (athlete: string, kataId: KataId, mode: KataMode) => void;
  evaluatorName?: string;
}) {
  const [athleteName, setAthleteName] = useState("");
  const [kataId, setKataId] = useState<KataId | "">("");
  const [mode, setMode] = useState<KataMode | "">("");

  const chooseKata = (nextKata: KataId) => {
    setKataId(nextKata);
    setMode(nextKata === "katame-no-kata" ? "complete" : "");
  };

  return (
    <section className="modal-screen kata-setup-screen">
      <div className="public-card form-card technical-start kata-start">
        <Brand />
        <span className="eyebrow">AVALIAÇÃO DE KATA</span>
        <h2>DADOS DA AVALIAÇÃO</h2>
        <p className="muted">Escolha o kata e, para o Nage-no-Kata, defina a extensão da apresentação.</p>
        <label>NOME DO AVALIADOR
          <input value={evaluatorName} disabled />
          <small>Definido automaticamente pelo perfil do avaliador.</small>
        </label>
        <label>NOME DO ATLETA
          <input value={athleteName} onChange={(event) => setAthleteName(event.target.value)} placeholder="Nome completo" />
        </label>
        <fieldset className="kata-choice-field">
          <legend>KATA</legend>
          <div className="kata-choice-list">
            {KATAS.map((kata) => (
              <button key={kata.id} type="button" className={kataId === kata.id ? "selected" : ""} onClick={() => chooseKata(kata.id)} aria-pressed={kataId === kata.id}>
                <span><Activity size={19} /></span>
                <strong>{kata.name}</strong>
                <small>{kata.description}</small>
                {kataId === kata.id && <Check size={18} />}
              </button>
            ))}
          </div>
        </fieldset>
        {kataId === "nage-no-kata" && (
          <fieldset className="kata-choice-field kata-mode-field">
            <legend>EXTENSÃO DO NAGE-NO-KATA</legend>
            <div className="kata-mode-options">
              <button type="button" className={mode === "partial" ? "selected" : ""} onClick={() => setMode("partial")} aria-pressed={mode === "partial"}>
                <strong>Parcial</strong><small>11 itens · 3 grupos e cerimônias</small>
              </button>
              <button type="button" className={mode === "complete" ? "selected" : ""} onClick={() => setMode("complete")} aria-pressed={mode === "complete"}>
                <strong>Completo</strong><small>17 itens · 5 grupos e cerimônias</small>
              </button>
            </div>
          </fieldset>
        )}
        <div className="button-row">
          <button className="outline" onClick={onBack}>VOLTAR</button>
          <button className="primary" disabled={!athleteName.trim() || !kataId || !mode} onClick={() => kataId && mode && onStart(athleteName, kataId, mode)}>
            INICIAR AVALIAÇÃO <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}

export function KataForm({
  athlete: athleteName,
  kataId,
  mode,
  onFinish,
  onExit,
}: {
  athlete: string;
  kataId: KataId;
  mode: KataMode;
  onFinish: (result: KataResult) => void;
  onExit: () => void;
}) {
  const kata = KATAS.find((item) => item.id === kataId) ?? KATAS[0];
  const exam = createKataExam(kataId, mode);
  const [groupIndex, setGroupIndex] = useState(0);
  const [marks, setMarks] = useState<Record<string, KataMark>>({});
  const [openTechnique, setOpenTechnique] = useState<string | null>(null);
  const [videoTechnique, setVideoTechnique] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const group = exam[groupIndex];
  const liveResult = calculateKataResult(exam, marks);
  const totalTechniques = exam.reduce((sum, item) => sum + item.techniques.length, 0);
  const groupComplete = group.techniques.every((technique) => marks[technique.id]?.reviewed);
  const allComplete = exam.every((item) => item.techniques.every((technique) => marks[technique.id]?.reviewed));

  const updateMark = (techniqueId: string, field: keyof KataErrors, value: boolean) => {
    setMarks((current) => ({
      ...current,
      [techniqueId]: { ...(current[techniqueId] ?? EMPTY_KATA_MARK), [field]: value },
    }));
  };

  const confirmMark = (techniqueId: string) => {
    setMarks((current) => ({
      ...current,
      [techniqueId]: { ...(current[techniqueId] ?? EMPTY_KATA_MARK), reviewed: true },
    }));
    setOpenTechnique(null);
  };

  const next = () => {
    if (groupIndex < exam.length - 1) {
      setGroupIndex((current) => current + 1);
      setOpenTechnique(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    onFinish({ ...calculateKataResult(exam, marks), notes: notes.trim() });
  };

  return (
    <section className="technical-screen kata-screen">
      <header className="quiz-header">
        <Brand compact />
        <div><strong>{athleteName}</strong><span>{kata.name} · {kataId === "nage-no-kata" && mode === "partial" ? "Parcial" : "Completo"}</span></div>
        <button className="text-button" onClick={onExit}>Sair</button>
      </header>
      <div className="technical-layout">
        <aside className="steps-panel kata-steps">
          <span className="eyebrow">ORDEM DO KATA</span>
          <h2>{kata.name}</h2>
          {exam.map((item, index) => {
            const complete = item.techniques.every((technique) => marks[technique.id]?.reviewed);
            return (
              <button key={item.id} className={index === groupIndex ? "active" : complete ? "done" : ""} onClick={() => { setGroupIndex(index); setOpenTechnique(null); }}>
                <i>{complete ? <Check size={15} /> : index + 1}</i>
                <span><strong>{item.name}</strong><small>{item.techniques.length} {item.techniques.length === 1 ? "item" : "técnicas"}</small></span>
              </button>
            );
          })}
          <div className="autosave"><CheckCircle2 size={16} /> {liveResult.reviewedCount} de {totalTechniques} itens avaliados</div>
        </aside>
        <div className="technical-content">
          <div className="section-title">
            <div><span>ETAPA {groupIndex + 1} DE {exam.length}</span><h1>{group.name}</h1></div>
            <div className="live-score kata-live-score"><span>NOTA ATUAL</span><strong>{liveResult.reviewedCount ? liveResult.score.toFixed(1) : "—"}</strong></div>
          </div>
          <div className="kata-error-guide" aria-label="Critérios de erro">
            <span><b>−1</b> Pequeno <small>até 2 por técnica</small></span>
            <span><b>−3</b> Médio</span>
            <span><b>−5</b> Grande</span>
            <span><b>−10</b> Grave/esquecimento <small>nota geral ÷ 2 uma vez</small></span>
          </div>
          <div className="criteria-list kata-criteria">
            {group.techniques.map((technique, itemIndex) => {
              const mark = marks[technique.id] ?? EMPTY_KATA_MARK;
              const deduction = kataMarkDeductions(mark);
              const isOpen = openTechnique === technique.id;
              const hasVideo = Boolean(technique.videoTechnique && toYouTubeEmbedUrl(TECHNIQUE_VIDEOS[technique.videoTechnique] ?? ""));
              return (
                <article key={technique.id} className={`technique-card ${mark.reviewed ? "scored" : ""} ${isOpen ? "open" : ""}`}>
                  <div className={`technique-card-head ${hasVideo ? "" : "without-video"}`}>
                    <button className="technique-card-trigger" onClick={() => setOpenTechnique(isOpen ? null : technique.id)} aria-expanded={isOpen} aria-controls={`kata-errors-${technique.id}`}>
                      <span className="technique-number">{String(itemIndex + 1).padStart(2, "0")}</span>
                      <span className="technique-copy"><strong>{technique.name}</strong><small>{mark.reviewed ? "Avaliação registrada" : "Toque para registrar erros"}</small></span>
                      {mark.reviewed ? (
                        <span className={`selected-rating kata-mark-summary ${deduction ? "has-errors" : "clear"}`}>
                          {deduction ? `−${deduction} pts${mark.severe ? " · ÷2" : ""}` : "Sem erros"}
                        </span>
                      ) : <span className="rate-prompt">Avaliar</span>}
                      <ChevronDown className="card-chevron" size={19} />
                    </button>
                    {hasVideo && technique.videoTechnique && (
                      <button className="video-help" onClick={() => setVideoTechnique(technique.videoTechnique ?? null)} aria-label={`Ver vídeo de ${technique.name}`} title="Ver vídeo da técnica">
                        <CircleHelp size={20} />
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="kata-error-menu" id={`kata-errors-${technique.id}`}>
                      <div className={`kata-error-option small ${mark.small1 || mark.small2 ? "selected" : ""}`}>
                        <span className="kata-penalty">−1</span>
                        <span className="kata-error-copy"><strong>Erro pequeno</strong><small>Desvio discreto que não compromete a execução.</small></span>
                        <span className="kata-small-checks" aria-label="Erros pequenos">
                          <label><input type="checkbox" checked={mark.small1} onChange={(event) => updateMark(technique.id, "small1", event.target.checked)} /><span>1</span></label>
                          <label><input type="checkbox" checked={mark.small2} onChange={(event) => updateMark(technique.id, "small2", event.target.checked)} /><span>2</span></label>
                        </span>
                      </div>
                      {([
                        ["medium", "Erro médio", "Erro claro que afeta uma parte da execução.", "−3"],
                        ["large", "Erro grande", "Falha que compromete um elemento essencial da técnica.", "−5"],
                        ["severe", "Erro grave ou esquecimento", "Desconta 10 pontos e divide a nota geral por 2 uma única vez.", "−10"],
                      ] as const).map(([field, label, description, penalty]) => (
                        <label key={field} className={`kata-error-option ${field} ${mark[field] ? "selected" : ""}`}>
                          <span className="kata-penalty">{penalty}</span>
                          <span className="kata-error-copy"><strong>{label}</strong><small>{description}</small></span>
                          <input type="checkbox" checked={mark[field]} onChange={(event) => updateMark(technique.id, field, event.target.checked)} />
                        </label>
                      ))}
                      <button className="primary kata-confirm" onClick={() => confirmMark(technique.id)}><Check size={17} /> {deduction ? "SALVAR ERROS" : "CONFIRMAR SEM ERROS"}</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <label className="notes-field">OBSERVAÇÕES DO AVALIADOR
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Registre aspectos técnicos, ritmo, postura e orientações..." />
          </label>
          <div className="quiz-actions">
            <button className="outline" disabled={groupIndex === 0} onClick={() => { setGroupIndex((current) => current - 1); setOpenTechnique(null); }}><ArrowLeft size={17} /> ETAPA ANTERIOR</button>
            <button className="primary" disabled={!groupComplete || (groupIndex === exam.length - 1 && !allComplete)} onClick={next}>{groupIndex === exam.length - 1 ? "CONCLUIR AVALIAÇÃO" : "PRÓXIMA ETAPA"} <ChevronRight size={17} /></button>
          </div>
        </div>
      </div>
      <div className="mobile-score-dock"><span>{liveResult.reviewedCount}/{totalTechniques} avaliados</span><strong>Nota atual {liveResult.reviewedCount ? liveResult.score.toFixed(1) : "—"}</strong></div>
      {videoTechnique && <TechniqueVideoDialog technique={videoTechnique} onClose={() => setVideoTechnique(null)} />}
    </section>
  );
}

export function KataResultView({ result, athlete: athleteName, kataId, mode, navigate }: { result: KataResult; athlete: string; kataId: KataId; mode: KataMode; navigate: (view: View) => void }) {
  const kata = KATAS.find((item) => item.id === kataId) ?? KATAS[0];
  return (
    <section className="modal-screen">
      <div className="public-card result-card kata-result-card">
        <div className="result-icon kata-complete"><Activity size={42} /></div>
        <span className="eyebrow">AVALIAÇÃO DE KATA CONCLUÍDA</span>
        <h2>AVALIAÇÃO REGISTRADA</h2>
        <p className="muted">{athleteName} · {kata.name} {kataId === "nage-no-kata" ? `(${mode === "partial" ? "parcial" : "completo"})` : ""}</p>
        <div className="score-ring" style={{ "--score": `${result.score * 36}deg` } as React.CSSProperties}>
          <div><strong>{result.score.toFixed(1)}</strong><span>NOTA GERAL</span></div>
        </div>
        <p className="result-detail">Resultado técnico informativo. Esta avaliação não atribui aprovação nem reprovação.</p>
        <div className="kata-result-summary">
          <div><span>Descontos marcados</span><strong>−{result.totalDeductions}</strong></div>
          <div><span>Antes do fator</span><strong>{result.rawScore.toFixed(1)}</strong></div>
          <div><span>Erro grave</span><strong>{result.severeApplied ? "Fator ÷ 2 aplicado" : "Não registrado"}</strong></div>
        </div>
        <div className="category-results kata-group-results">
          {result.groups.map((group) => (
            <div key={group.name}><span>{group.name}<small>−{group.deductions} pontos</small></span><strong>{group.score.toFixed(1)}</strong></div>
          ))}
        </div>
        {result.notes && <div className="kata-result-notes"><span>Observações</span><p>{result.notes}</p></div>}
        <button className="primary wide" onClick={() => navigate("home")}>VOLTAR AO INÍCIO</button>
      </div>
    </section>
  );
}