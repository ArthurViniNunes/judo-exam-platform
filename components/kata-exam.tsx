"use client";

import { useState } from "react";
import { Activity, Check, ChevronRight, CircleHelp } from "lucide-react";
import {
  EMPTY_KATA_MARK,
  KATAS,
  calculateKataResult,
  createKataExam,
  kataMarkDeductions,
  type KataErrors,
  type KataId,
  type KataMark,
  type KataMode,
  type KataResult,
} from "@/lib/kata-exams";
import { TECHNIQUE_VIDEOS, toYouTubeEmbedUrl } from "@/lib/practical-exams";
import type { ExamStudent } from "@/lib/platform";
import { Brand, TechniqueVideoDialog } from "./exam-public";
import { ExamStudentSelect } from "./exam-student-select";
import type { View } from "./exam-public";

export function KataSetup({
  onBack,
  onStart,
  students,
  studentsLoading,
  studentsError,
  onRetryStudents,
  onManageStudents,
}: {
  onBack: () => void;
  onStart: (student: ExamStudent, kataId: KataId, mode: KataMode) => void;
  students: ExamStudent[];
  studentsLoading: boolean;
  studentsError: string;
  onRetryStudents: () => void;
  onManageStudents: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [kataId, setKataId] = useState<KataId | "">("");
  const [mode, setMode] = useState<KataMode | "">("");
  const selectedStudent = students.find((student) => student.id === studentId);

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
        <p className="muted">Selecione um judoca do seu cadastro, o kata e a extensão da apresentação.</p>
        <ExamStudentSelect
          students={students}
          value={studentId}
          loading={studentsLoading}
          error={studentsError}
          onChange={setStudentId}
          onRetry={onRetryStudents}
          onManageStudents={onManageStudents}
        />
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
                <strong>Parcial</strong><small>Até Ashi-waza, incluindo as cerimônias</small>
              </button>
              <button type="button" className={mode === "complete" ? "selected" : ""} onClick={() => setMode("complete")} aria-pressed={mode === "complete"}>
                <strong>Completo</strong><small>Apresentação integral, incluindo as cerimônias</small>
              </button>
            </div>
          </fieldset>
        )}
        <div className="button-row">
          <button className="outline" onClick={onBack}>VOLTAR</button>
          <button className="primary" disabled={!selectedStudent || !kataId || !mode} onClick={() => selectedStudent && kataId && mode && onStart(selectedStudent, kataId, mode)}>
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
  const [marks, setMarks] = useState<Record<string, KataMark>>({});
  const [videoTechnique, setVideoTechnique] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const liveResult = calculateKataResult(exam, marks);
  const totalTechniques = exam.reduce((sum, item) => sum + item.techniques.length, 0);
  const progress = totalTechniques ? (liveResult.reviewedCount / totalTechniques) * 100 : 0;
  const allComplete = exam.every((group) =>
    group.techniques.every((technique) => marks[technique.id]?.reviewed),
  );

  const updateMark = (techniqueId: string, field: keyof KataErrors) => {
    setMarks((current) => {
      const mark = current[techniqueId] ?? EMPTY_KATA_MARK;
      return {
        ...current,
        [techniqueId]: { ...mark, [field]: !mark[field], reviewed: true },
      };
    });
  };

  const clearMark = (techniqueId: string) => {
    setMarks((current) => ({
      ...current,
      [techniqueId]: { ...EMPTY_KATA_MARK, reviewed: true },
    }));
  };

  const scrollToGroup = (groupId: string) => {
    document.getElementById(`kata-group-${groupId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const finish = () => {
    onFinish({ ...calculateKataResult(exam, marks), notes: notes.trim() });
  };

  return (
    <section className="technical-screen kata-screen">
      <header className="quiz-header">
        <Brand compact />
        <div><strong>{athleteName}</strong><span>{kata.name} · {kataId === "nage-no-kata" && mode === "partial" ? "Parcial" : "Completo"}</span></div>
        <button className="text-button" onClick={onExit}>Sair</button>
      </header>
      <div className="technical-layout kata-continuous-layout">
        <aside className="steps-panel kata-steps">
          <span className="eyebrow">ORDEM DO KATA</span>
          <h2>{kata.name}</h2>
          {exam.map((group, index) => {
            const complete = group.techniques.every((technique) => marks[technique.id]?.reviewed);
            return (
              <button key={group.id} className={complete ? "done" : ""} onClick={() => scrollToGroup(group.id)}>
                <i>{complete ? <Check size={15} /> : index + 1}</i>
                <span><strong>{group.name}</strong><small>{complete ? "Concluído" : "Pendente"}</small></span>
              </button>
            );
          })}
          <div className="exam-progress-block">
            <span>Progresso da avaliação</span>
            <div className="exam-progress" role="progressbar" aria-label="Progresso da avaliação de kata" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
        </aside>
        <main className="technical-content kata-continuous-content">
          <div className="section-title">
            <div><span>AVALIAÇÃO CONTÍNUA</span><h1>{kata.name}</h1></div>
            <div className="live-score kata-live-score"><span>NOTA ATUAL</span><strong>{liveResult.reviewedCount ? liveResult.score.toFixed(1) : "—"}</strong></div>
          </div>
          <div className="kata-error-guide" aria-label="Critérios de erro">
            <span><b>−1</b> Pequeno <small>Desvio discreto. Pode ser marcado duas vezes.</small></span>
            <span><b>−3</b> Médio <small>Erro claro que afeta parte da execução.</small></span>
            <span><b>−5</b> Grande <small>Compromete um elemento essencial da técnica.</small></span>
            <span><b>−10</b> Grave/esquecimento <small>Divide a nota geral por 2 uma única vez.</small></span>
          </div>
          <div className="kata-continuous">
            {exam.map((group) => (
              <section className="kata-group-section" id={`kata-group-${group.id}`} key={group.id}>
                <header><span>Grupo do kata</span><h2>{group.name}</h2></header>
                <div className="criteria-list kata-quick-list">
                  {group.techniques.map((technique, itemIndex) => {
                    const mark = marks[technique.id] ?? EMPTY_KATA_MARK;
                    const deduction = kataMarkDeductions(mark);
                    const hasVideo = Boolean(technique.videoTechnique && toYouTubeEmbedUrl(TECHNIQUE_VIDEOS[technique.videoTechnique] ?? ""));
                    return (
                      <article key={technique.id} className={`technique-card kata-quick-card ${mark.reviewed ? "scored" : ""}`}>
                        <div className={`kata-quick-head ${hasVideo ? "" : "without-video"}`}>
                          <span className="technique-number">{String(itemIndex + 1).padStart(2, "0")}</span>
                          <span className="technique-copy"><strong>{technique.name}</strong><small>{mark.reviewed ? (deduction ? `−${deduction} pontos registrados` : "Sem erros registrados") : "Selecione o resultado abaixo"}</small></span>
                          {hasVideo && technique.videoTechnique && (
                            <button className="video-help" onClick={() => setVideoTechnique(technique.videoTechnique ?? null)} aria-label={`Ver vídeo de ${technique.name}`} title="Ver vídeo da técnica">
                              <CircleHelp size={20} />
                            </button>
                          )}
                        </div>
                        <div className="kata-quick-controls" role="group" aria-label={`Erros em ${technique.name}`}>
                          <button className={`kata-clear ${mark.reviewed && deduction === 0 ? "selected" : ""}`} onClick={() => clearMark(technique.id)} aria-pressed={mark.reviewed && deduction === 0}>
                            <Check size={16} /><span>Sem erros</span>
                          </button>
                          {(["small1", "small2"] as const).map((field, index) => (
                            <button key={field} className={`kata-penalty-button small ${mark[field] ? "selected" : ""}`} onClick={() => updateMark(technique.id, field)} aria-pressed={mark[field]} aria-label={`Erro pequeno ${index + 1} em ${technique.name}`}>
                              <b>−1</b><span>Pequeno {index + 1}</span>
                            </button>
                          ))}
                          {([
                            ["medium", "−3", "Médio"],
                            ["large", "−5", "Grande"],
                            ["severe", "−10", "Grave"],
                          ] as const).map(([field, penalty, label]) => (
                            <button key={field} className={`kata-penalty-button ${field} ${mark[field] ? "selected" : ""}`} onClick={() => updateMark(technique.id, field)} aria-pressed={mark[field]}>
                              <b>{penalty}</b><span>{label}</span>
                            </button>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          <label className="notes-field">OBSERVAÇÕES DO AVALIADOR
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Registre aspectos técnicos, ritmo, postura e orientações..." />
          </label>
          <div className="quiz-actions kata-finish-action">
            <button className="primary" disabled={!allComplete} onClick={finish}>CONCLUIR AVALIAÇÃO <ChevronRight size={17} /></button>
          </div>
        </main>
      </div>
      <div className="mobile-score-dock">
        <div className="exam-progress" role="progressbar" aria-label="Progresso da avaliação de kata" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><i style={{ width: `${progress}%` }} /></div>
        <strong>Nota atual {liveResult.reviewedCount ? liveResult.score.toFixed(1) : "—"}</strong>
      </div>
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
