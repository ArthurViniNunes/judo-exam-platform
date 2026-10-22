"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  LoaderCircle,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import {
  toTheoryYouTubeEmbedUrl,
  type StudentTheoryAttempt,
  type StudentTheoryAttemptQuestion,
  type StudentTheoryAvailability,
  type StudentTheoryMedia,
  type StudentTheoryResult,
} from "@/lib/theory-exams";

function TheoryMedia({ media }: { media: StudentTheoryMedia }) {
  const label = media.altText.trim() || "Mídia da questão";
  if (media.kind === "image") {
    // URLs are provided by the trusted exam editor and validated as HTTPS by the API.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="student-theory-image" src={media.sourceUrl} alt={label} />;
  }
  if (media.kind === "audio") {
    return <audio className="student-theory-audio" controls preload="metadata" src={media.sourceUrl} aria-label={label} />;
  }
  if (media.kind === "video") {
    return <video className="student-theory-video" controls playsInline preload="metadata" src={media.sourceUrl} aria-label={label} />;
  }
  const embedUrl = toTheoryYouTubeEmbedUrl(media.sourceUrl);
  return embedUrl ? (
    <div className="student-theory-youtube">
      <iframe
        src={embedUrl}
        title="Mídia da questão"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  ) : (
    <div className="student-theory-media-error">Mídia indisponível.</div>
  );
}

function AnswerOptions({
  question,
  disabled,
  onSelect,
}: {
  question: StudentTheoryAttemptQuestion;
  disabled: boolean;
  onSelect: (optionId: string) => void;
}) {
  return (
    <fieldset className="student-theory-options" disabled={disabled}>
      <legend>Escolha uma resposta</legend>
      {question.options.map((option, index) => {
        const selected = question.selectedOptionId === option.id;
        return (
          <label key={option.id} className={selected ? "selected" : ""}>
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option.id}
              checked={selected}
              onChange={() => onSelect(option.id)}
            />
            <span className="student-theory-option-letter">{String.fromCharCode(65 + index)}</span>
            <span>{option.text}</span>
            {selected && <Check size={18} aria-hidden="true" />}
          </label>
        );
      })}
    </fieldset>
  );
}

function ExamRunner({
  initialAttempt,
  onResult,
}: {
  initialAttempt: StudentTheoryAttempt;
  onResult: (result: StudentTheoryResult) => void;
}) {
  const [attempt, setAttempt] = useState(initialAttempt);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [savingQuestionId, setSavingQuestionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const question = attempt.questions[activeIndex];
  const answeredCount = attempt.questions.filter((item) => item.selectedOptionId).length;
  const progress = attempt.questions.length
    ? Math.round((answeredCount / attempt.questions.length) * 100)
    : 0;
  const complete = answeredCount === attempt.questions.length;

  const selectAnswer = async (optionId: string) => {
    if (!question || savingQuestionId) return;
    const previous = question.selectedOptionId;
    setError("");
    setSavingQuestionId(question.id);
    setAttempt((current) => ({
      ...current,
      questions: current.questions.map((item) =>
        item.id === question.id ? { ...item, selectedOptionId: optionId } : item,
      ),
    }));
    try {
      await apiRequest(`/api/theory-attempts/${attempt.id}/answers`, {
        method: "PATCH",
        body: JSON.stringify({
          attemptQuestionId: question.id,
          selectedOptionId: optionId,
        }),
      });
    } catch (caught) {
      setAttempt((current) => ({
        ...current,
        questions: current.questions.map((item) =>
          item.id === question.id ? { ...item, selectedOptionId: previous } : item,
        ),
      }));
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a resposta.");
    } finally {
      setSavingQuestionId("");
    }
  };

  const submit = async () => {
    if (!complete || !window.confirm("Entregar a prova agora? Depois disso, as respostas não poderão ser alteradas.")) return;
    setSubmitting(true);
    setError("");
    setErrorDetails([]);
    try {
      onResult(await apiRequest<StudentTheoryResult>(
        `/api/theory-attempts/${attempt.id}/submit`,
        { method: "POST" },
      ));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível entregar a prova.");
      setErrorDetails(caught instanceof ApiError ? caught.details : []);
    } finally {
      setSubmitting(false);
    }
  };

  if (reviewing) {
    return (
      <section className="student-theory-workspace student-theory-review" aria-labelledby="theory-review-title">
        <header>
          <button onClick={() => setReviewing(false)}><ArrowLeft size={18} /> Voltar à prova</button>
          <div>
            <span>Antes de entregar</span>
            <h2 id="theory-review-title">Revise suas respostas</h2>
            <p>Abra qualquer questão para conferir ou alterar a alternativa escolhida.</p>
          </div>
        </header>
        <div className="student-theory-review-list">
          {attempt.questions.map((item, index) => {
            const answer = item.options.find((option) => option.id === item.selectedOptionId);
            return (
              <button
                key={item.id}
                className={answer ? "answered" : "pending"}
                onClick={() => { setActiveIndex(index); setReviewing(false); }}
              >
                <span>{answer ? <CheckCircle2 size={19} /> : <CircleAlert size={19} />}</span>
                <div>
                  <strong>Questão {index + 1}</strong>
                  <small>{answer?.text ?? "Ainda não respondida"}</small>
                </div>
                <ArrowRight size={18} />
              </button>
            );
          })}
        </div>
        {error && (
          <div className="student-theory-error" role="alert">
            <strong>{error}</strong>
            {errorDetails.length > 0 && <ul>{errorDetails.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
          </div>
        )}
        <footer className="student-theory-submit-bar">
          <div>
            <strong>{complete ? "Tudo respondido" : "Ainda há questões pendentes"}</strong>
            <span>{complete ? "Sua prova está pronta para entrega." : "Volte às questões marcadas antes de entregar."}</span>
          </div>
          <button disabled={!complete || submitting} onClick={() => void submit()}>
            <Send size={18} /> {submitting ? "Corrigindo…" : "Entregar prova"}
          </button>
        </footer>
      </section>
    );
  }

  if (!question) return null;
  return (
    <section className="student-theory-workspace" aria-labelledby="student-question-title">
      <header className="student-theory-runner-header">
        <div>
          <span>{attempt.beltName}</span>
          <strong>Progresso da prova</strong>
        </div>
        <button disabled={Boolean(savingQuestionId)} onClick={() => setReviewing(true)}><FileCheck2 size={18} /> Revisar</button>
        <div className="student-theory-progress" aria-label={`Progresso: ${progress}%`}>
          <i style={{ width: `${progress}%` }} />
        </div>
      </header>

      <article className="student-theory-question-card">
        <header>
          <span>Questão {activeIndex + 1}</span>
          <small>{question.category} · {question.points} pontos</small>
        </header>
        <h2 id="student-question-title">{question.prompt}</h2>
        {question.media && <TheoryMedia media={question.media} />}
        <AnswerOptions
          question={question}
          disabled={savingQuestionId === question.id}
          onSelect={(optionId) => void selectAnswer(optionId)}
        />
        <div className="student-theory-save-state" aria-live="polite">
          {savingQuestionId === question.id
            ? <><LoaderCircle size={16} className="spin" /> Salvando resposta…</>
            : question.selectedOptionId
              ? <><Save size={16} /> Resposta salva</>
              : "Escolha uma alternativa para continuar."}
        </div>
        {error && <div className="student-theory-error" role="alert">{error}</div>}
      </article>

      <footer className="student-theory-navigation">
        <button
          className="secondary"
          disabled={activeIndex === 0}
          onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
        >
          <ArrowLeft size={18} /> Anterior
        </button>
        {activeIndex < attempt.questions.length - 1 ? (
          <button
            disabled={!question.selectedOptionId || Boolean(savingQuestionId)}
            onClick={() => setActiveIndex((index) => Math.min(attempt.questions.length - 1, index + 1))}
          >
            Próxima <ArrowRight size={18} />
          </button>
        ) : (
          <button disabled={!question.selectedOptionId || Boolean(savingQuestionId)} onClick={() => setReviewing(true)}>
            Revisar prova <FileCheck2 size={18} />
          </button>
        )}
      </footer>
    </section>
  );
}

function TheoryResult({
  result,
  retrying,
  onRetry,
}: {
  result: StudentTheoryResult;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <section className={`student-theory-result${result.passed ? " passed" : " failed"}`}>
      <header>
        <span className="student-theory-result-icon">
          {result.passed ? <CheckCircle2 size={34} /> : <RotateCcw size={34} />}
        </span>
        <div>
          <span>{result.passed ? "Prova concluída" : "Nova tentativa disponível"}</span>
          <h2>{result.passed ? "Você está apto para a avaliação prática" : "Revise e tente novamente"}</h2>
          <p>{result.beltName}</p>
        </div>
        <strong className="student-theory-score">{result.score}<small>%</small></strong>
      </header>
      <div className="student-theory-result-summary">
        <span>Nota mínima: {result.minimumScore}%</span>
        <span>{result.passed ? "Aprovação registrada sem prazo de expiração." : "Você pode iniciar outra prova quando estiver pronto."}</span>
      </div>
      <div className="student-theory-correction">
        <h3>Correção comentada</h3>
        {result.questions.map((question, index) => {
          const selected = question.options.find((option) => option.id === question.selectedOptionId);
          const correct = question.options.find((option) => option.id === question.correctOptionId);
          return (
            <article key={question.id} className={question.correct ? "correct" : "incorrect"}>
              <header>
                <span>{question.correct ? <CheckCircle2 size={19} /> : <XCircle size={19} />}</span>
                <div>
                  <small>Questão {index + 1} · {question.category}</small>
                  <strong>{question.prompt}</strong>
                </div>
                <b>{question.awardedPoints}/{question.points}</b>
              </header>
              {question.media && <TheoryMedia media={question.media} />}
              <dl>
                <div><dt>Sua resposta</dt><dd>{selected?.text ?? "Não respondida"}</dd></div>
                {!question.correct && <div><dt>Resposta correta</dt><dd>{correct?.text}</dd></div>}
                <div><dt>Entenda</dt><dd>{question.explanation}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>
      {!result.passed && (
        <button className="student-theory-retry" disabled={retrying} onClick={onRetry}>
          <RefreshCw size={18} /> {retrying ? "Preparando…" : "Fazer nova tentativa"}
        </button>
      )}
    </section>
  );
}

export function StudentTheoryExam() {
  const [availability, setAvailability] = useState<StudentTheoryAvailability | null>(null);
  const [attempt, setAttempt] = useState<StudentTheoryAttempt | null>(null);
  const [result, setResult] = useState<StudentTheoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [resultLoading, setResultLoading] = useState(false);
  const [error, setError] = useState("");

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await apiRequest<StudentTheoryAvailability>("/api/theory-exams/available");
      setAvailability(next);
      if (next.status === "in_progress" && next.attempt) setAttempt(next.attempt);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível consultar sua prova.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAvailability(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAvailability]);

  const start = async () => {
    setStarting(true);
    setError("");
    try {
      setAttempt(await apiRequest<StudentTheoryAttempt>("/api/theory-attempts", { method: "POST" }));
      setResult(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível iniciar a prova.");
    } finally {
      setStarting(false);
    }
  };

  const openResult = async (attemptId: string) => {
    setResultLoading(true);
    setError("");
    try {
      setResult(await apiRequest<StudentTheoryResult>(`/api/theory-attempts/${attemptId}/result`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível abrir a correção.");
    } finally {
      setResultLoading(false);
    }
  };

  const examDescription = useMemo(() => {
    if (availability?.status !== "available") return null;
    return availability.exam;
  }, [availability]);

  if (loading) {
    return (
      <article className="theory-admission" aria-live="polite">
        <div className="theory-admission-icon theory-admission-loading"><RefreshCw size={25} /></div>
        <div className="theory-admission-copy"><span className="theory-status">Consultando</span><h2>Buscando sua prova</h2><p>Estamos conferindo a versão publicada para sua graduação.</p></div>
      </article>
    );
  }
  if (attempt) {
    return <ExamRunner initialAttempt={attempt} onResult={(next) => { setResult(next); setAttempt(null); }} />;
  }
  if (result) {
    return <TheoryResult result={result} retrying={starting} onRetry={() => void start()} />;
  }
  if (error) {
    return (
      <article className="theory-admission theory-admission-error" role="alert">
        <div className="theory-admission-icon"><CircleAlert size={27} /></div>
        <div className="theory-admission-copy"><span className="theory-status">Atenção</span><h2>Não foi possível abrir a prova</h2><p>{error}</p></div>
        <button className="student-profile-retry" onClick={() => void loadAvailability()}><RefreshCw size={17} /> Tentar novamente</button>
      </article>
    );
  }
  if (availability?.status === "eligible") {
    return (
      <article className="theory-admission theory-admission-approved" aria-labelledby="theory-status-title">
        <div className="theory-admission-icon"><CheckCircle2 size={28} /></div>
        <div className="theory-admission-copy">
          <span className="theory-status"><CheckCircle2 size={15} /> Apto à prática</span>
          <h2 id="theory-status-title">Teórico concluído: {availability.beltName}</h2>
          <p>Sua aprovação está registrada sem prazo de expiração.</p>
        </div>
        <ul>
          <li><CheckCircle2 size={17} /> Cadastro de aluno confirmado</li>
          <li><CheckCircle2 size={17} /> Elegibilidade teórica ativa</li>
        </ul>
        {availability.latestAttemptId && (
          <button
            className="student-profile-retry"
            disabled={resultLoading}
            onClick={() => void openResult(availability.latestAttemptId!)}
          >
            <FileCheck2 size={17} /> {resultLoading ? "Abrindo correção…" : "Ver última correção"}
          </button>
        )}
      </article>
    );
  }
  if (availability?.status === "unavailable") {
    return (
      <article className="theory-admission" aria-labelledby="theory-status-title">
        <div className="theory-admission-icon"><BookOpenCheck size={28} /></div>
        <div className="theory-admission-copy"><span className="theory-status">Em preparação</span><h2 id="theory-status-title">Prova ainda não liberada</h2><p>A associação avisará quando o caderno oficial da {availability.beltName} for publicado.</p></div>
        <ul><li><CheckCircle2 size={17} /> Cadastro de aluno confirmado</li><li><CircleAlert size={17} /> Aguardando caderno oficial</li></ul>
      </article>
    );
  }
  if (!examDescription) return null;
  return (
    <article className="student-theory-ready" aria-labelledby="theory-ready-title">
      <span className="student-theory-ready-icon"><BookOpenCheck size={30} /></span>
      <div>
        <span>Prova liberada</span>
        <h2 id="theory-ready-title">{examDescription.beltName}</h2>
        <p>Todas as questões serão apresentadas em ordem aleatória. Não há limite de tempo e suas respostas ficam salvas.</p>
      </div>
      <dl>
        <div><dt>Formato</dt><dd>Prova completa</dd></div>
        <div><dt>Nota mínima</dt><dd>{examDescription.minimumScore}%</dd></div>
        <div><dt>Tempo</dt><dd>Livre</dd></div>
      </dl>
      <button disabled={starting} onClick={() => void start()}>
        <Play size={19} fill="currentColor" /> {starting ? "Preparando prova…" : "Iniciar prova"}
      </button>
    </article>
  );
}
