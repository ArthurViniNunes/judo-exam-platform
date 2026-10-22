"use client";

import {
  Archive,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileQuestion,
  Image as ImageIcon,
  LockKeyhole,
  Pencil,
  Plus,
  Save,
  Send,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import {
  THEORY_BELTS,
  THEORY_CATEGORIES,
  type TheoryExamVersion,
  type TheoryExamVersionSummary,
  type TheoryMediaKind,
  type TheoryQuestion,
} from "@/lib/theory-exams";
import { EmptyState, formatDate, LoadingBlock } from "./admin-portal-shared";

const statusLabel = {
  draft: "Rascunho",
  published: "Publicada",
  closed: "Encerrada",
} as const;

function actionError(caught: unknown, fallback: string) {
  if (caught instanceof ApiError) {
    return { message: caught.message, details: caught.details };
  }
  return { message: fallback, details: [] as string[] };
}

function CreateVersionDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (version: TheoryExamVersionSummary) => void;
}) {
  const [beltId, setBeltId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const version = await apiRequest<TheoryExamVersionSummary>(
        "/api/theory/admin/versions",
        {
          method: "POST",
          body: JSON.stringify({ beltId, minimumScore: null, questionOrder: "random" }),
        },
      );
      onCreated(version);
    } catch (caught) {
      setError(actionError(caught, "Não foi possível criar o rascunho.").message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="theory-editor-layer" onMouseDown={onClose}>
      <section
        className="theory-editor-dialog theory-create-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-version-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="theory-dialog-close" onClick={onClose} aria-label="Fechar">
          <X size={19} />
        </button>
        <span className="theory-dialog-symbol"><FileQuestion size={23} /></span>
        <h2 id="create-version-title">Novo caderno de prova</h2>
        <p>A versão começa vazia. Você define a nota mínima e cadastra as questões oficiais.</p>
        <form onSubmit={submit}>
          <label>
            Graduação
            <select required value={beltId} onChange={(event) => setBeltId(event.target.value)}>
              <option value="">Selecione a graduação</option>
              {THEORY_BELTS.map((belt) => (
                <option key={belt.id} value={belt.id}>{belt.name}</option>
              ))}
            </select>
          </label>
          {error && <div className="management-error" role="alert">{error}</div>}
          <div className="theory-dialog-actions">
            <button type="button" className="management-secondary" onClick={onClose}>Cancelar</button>
            <button className="management-primary" disabled={busy || !beltId}>
              <Plus size={18} /> {busy ? "Criando…" : "Criar rascunho"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

type QuestionDraft = {
  category: string;
  prompt: string;
  points: string;
  explanation: string;
  options: { text: string; isCorrect: boolean }[];
  mediaEnabled: boolean;
  mediaKind: TheoryMediaKind;
  sourceUrl: string;
  altText: string;
  metadataSensitive: boolean;
};

function questionDraft(question?: TheoryQuestion): QuestionDraft {
  return question
    ? {
        category: question.category,
        prompt: question.prompt,
        points: String(question.points),
        explanation: question.explanation,
        options: question.options.map((option) => ({
          text: option.text,
          isCorrect: option.isCorrect,
        })),
        mediaEnabled: Boolean(question.media),
        mediaKind: question.media?.kind ?? "image",
        sourceUrl: question.media?.sourceUrl ?? "",
        altText: question.media?.altText ?? "",
        metadataSensitive: question.media?.metadataSensitive ?? false,
      }
    : {
        category: THEORY_CATEGORIES[0],
        prompt: "",
        points: "10",
        explanation: "",
        options: [
          { text: "", isCorrect: true },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ],
        mediaEnabled: false,
        mediaKind: "image",
        sourceUrl: "",
        altText: "",
        metadataSensitive: false,
      };
}

function QuestionEditor({
  versionId,
  question,
  onClose,
  onSaved,
}: {
  versionId: string;
  question?: TheoryQuestion;
  onClose: () => void;
  onSaved: (version: TheoryExamVersion) => void;
}) {
  const [draft, setDraft] = useState(() => questionDraft(question));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);

  const updateOption = (index: number, patch: Partial<QuestionDraft["options"][number]>) => {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    }));
  };

  const markCorrect = (index: number) => {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => ({
        ...option,
        isCorrect: optionIndex === index,
      })),
    }));
  };

  const removeOption = (index: number) => {
    setDraft((current) => {
      const removedWasCorrect = current.options[index]?.isCorrect;
      const options = current.options.filter((_, optionIndex) => optionIndex !== index);
      return {
        ...current,
        options: removedWasCorrect
          ? options.map((option, optionIndex) => ({
              ...option,
              isCorrect: optionIndex === 0,
            }))
          : options,
      };
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (draft.mediaEnabled && draft.mediaKind === "youtube" && draft.metadataSensitive) {
      setError("Use uma mídia própria quando o título ou canal puder revelar a resposta.");
      return;
    }
    setBusy(true);
    try {
      const path = question
        ? `/api/theory/admin/questions/${question.id}`
        : `/api/theory/admin/versions/${versionId}/questions`;
      const version = await apiRequest<TheoryExamVersion>(path, {
        method: question ? "PATCH" : "POST",
        body: JSON.stringify({
          category: draft.category,
          prompt: draft.prompt,
          points: Number(draft.points),
          explanation: draft.explanation,
          options: draft.options,
          media: draft.mediaEnabled
            ? {
                kind: draft.mediaKind,
                sourceUrl: draft.sourceUrl,
                altText: draft.altText,
                metadataSensitive: draft.metadataSensitive,
              }
            : null,
        }),
      });
      onSaved(version);
    } catch (caught) {
      setError(actionError(caught, "Não foi possível salvar a questão.").message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="theory-editor-layer" onMouseDown={onClose}>
      <section
        className="theory-editor-dialog theory-question-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-editor-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>{question ? "Editar questão" : "Nova questão"}</span>
            <h2 id="question-editor-title">Conteúdo e gabarito</h2>
          </div>
          <button className="theory-dialog-close" onClick={onClose} aria-label="Fechar">
            <X size={19} />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="theory-form-row">
            <label>
              Categoria
              <input
                list="theory-categories"
                required
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              />
              <datalist id="theory-categories">
                {THEORY_CATEGORIES.map((category) => <option key={category} value={category} />)}
              </datalist>
            </label>
            <label>
              Pontos
              <input
                type="number"
                min="1"
                max="100"
                inputMode="numeric"
                required
                value={draft.points}
                onChange={(event) => setDraft({ ...draft, points: event.target.value })}
              />
            </label>
          </div>
          <label>
            Enunciado
            <textarea
              required
              minLength={5}
              maxLength={500}
              rows={4}
              value={draft.prompt}
              onChange={(event) => setDraft({ ...draft, prompt: event.target.value })}
              placeholder="Escreva a pergunta como ela será apresentada ao aluno"
            />
          </label>

          <fieldset className="theory-options-editor">
            <legend>Alternativas <span>marque a resposta correta</span></legend>
            {draft.options.map((option, index) => (
              <div key={index} className="theory-option-row">
                <button
                  type="button"
                  className={option.isCorrect ? "correct" : ""}
                  aria-label={`Marcar alternativa ${String.fromCharCode(65 + index)} como correta`}
                  aria-pressed={option.isCorrect}
                  onClick={() => markCorrect(index)}
                >
                  {option.isCorrect ? <Check size={17} /> : String.fromCharCode(65 + index)}
                </button>
                <input
                  required
                  maxLength={300}
                  value={option.text}
                  onChange={(event) => updateOption(index, { text: event.target.value })}
                  placeholder={`Alternativa ${String.fromCharCode(65 + index)}`}
                  aria-label={`Texto da alternativa ${String.fromCharCode(65 + index)}`}
                />
                {draft.options.length > 2 && (
                  <button
                    type="button"
                    className="remove-option"
                    onClick={() => removeOption(index)}
                    aria-label={`Remover alternativa ${String.fromCharCode(65 + index)}`}
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
            ))}
            {draft.options.length < 6 && (
              <button
                type="button"
                className="theory-add-option"
                onClick={() => setDraft((current) => ({
                  ...current,
                  options: [...current.options, { text: "", isCorrect: false }],
                }))}
              >
                <Plus size={17} /> Adicionar alternativa
              </button>
            )}
          </fieldset>

          <label>
            Explicação do gabarito
            <textarea
              maxLength={1000}
              rows={4}
              value={draft.explanation}
              onChange={(event) => setDraft({ ...draft, explanation: event.target.value })}
              placeholder="Explique por que a alternativa é correta; obrigatório para publicar"
            />
            <small>O aluno só verá esta explicação depois de entregar a prova.</small>
          </label>

          <fieldset className="theory-media-editor">
            <legend>Mídia da questão <span>opcional</span></legend>
            <label className="theory-check-row">
              <input
                type="checkbox"
                checked={draft.mediaEnabled}
                onChange={(event) => setDraft({ ...draft, mediaEnabled: event.target.checked })}
              />
              <span><ImageIcon size={18} /> Incluir mídia</span>
            </label>
            {draft.mediaEnabled && (
              <div className="theory-media-fields">
                <label>
                  Tipo
                  <select
                    value={draft.mediaKind}
                    onChange={(event) => setDraft({ ...draft, mediaKind: event.target.value as TheoryMediaKind })}
                  >
                    <option value="image">Imagem</option>
                    <option value="audio">Áudio</option>
                    <option value="video">Vídeo próprio</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </label>
                <label>
                  URL HTTPS
                  <input
                    type="url"
                    required
                    value={draft.sourceUrl}
                    onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })}
                    placeholder="https://…"
                  />
                </label>
                <label>
                  Descrição acessível neutra
                  <input
                    maxLength={200}
                    value={draft.altText}
                    onChange={(event) => setDraft({ ...draft, altText: event.target.value })}
                    placeholder="Mídia da questão"
                  />
                </label>
                <label className="theory-check-row theory-sensitive-row">
                  <input
                    type="checkbox"
                    checked={draft.metadataSensitive}
                    onChange={(event) => setDraft({ ...draft, metadataSensitive: event.target.checked })}
                  />
                  <span>O nome, título ou canal pode revelar a resposta</span>
                </label>
                {draft.metadataSensitive && (
                  <p className="theory-media-warning">
                    Use arquivo próprio sanitizado. O player do YouTube pode mostrar título e canal.
                  </p>
                )}
              </div>
            )}
          </fieldset>

          {error && <div className="management-error" role="alert">{error}</div>}
          <div className="theory-dialog-actions sticky">
            <button type="button" className="management-secondary" onClick={onClose}>Cancelar</button>
            <button className="management-primary" disabled={busy}>
              <Save size={18} /> {busy ? "Salvando…" : "Salvar questão"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function TheoryExamsView() {
  const [versions, setVersions] = useState<TheoryExamVersionSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [version, setVersion] = useState<TheoryExamVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<TheoryQuestion | "new" | null>(null);
  const [minimumScore, setMinimumScore] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const mergeVersion = useCallback((next: TheoryExamVersion) => {
    setVersion(next);
    setMinimumScore(next.minimumScore === null ? "" : String(next.minimumScore));
    setVersions((current) => current.map((item) => item.id === next.id ? next : item));
  }, []);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setVersions(await apiRequest<TheoryExamVersionSummary[]>("/api/theory/admin/versions"));
    } catch (caught) {
      setError(actionError(caught, "Não foi possível carregar as provas.").message);
    } finally {
      setLoading(false);
    }
  }, []);

  const openVersion = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setError("");
    setErrorDetails([]);
    try {
      mergeVersion(await apiRequest<TheoryExamVersion>(`/api/theory/admin/versions/${id}`));
    } catch (caught) {
      setError(actionError(caught, "Não foi possível abrir esta versão.").message);
    } finally {
      setDetailLoading(false);
    }
  }, [mergeVersion]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadVersions(), 0);
    return () => window.clearTimeout(timer);
  }, [loadVersions]);

  const handleError = (caught: unknown, fallback: string) => {
    const next = actionError(caught, fallback);
    setError(next.message);
    setErrorDetails(next.details);
  };

  const saveConfiguration = async (event: FormEvent) => {
    event.preventDefault();
    if (!version) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = await apiRequest<TheoryExamVersion>(
        `/api/theory/admin/versions/${version.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            minimumScore: minimumScore === "" ? null : Number(minimumScore),
            questionOrder: "random",
          }),
        },
      );
      mergeVersion(next);
      setMessage("Configuração do rascunho salva.");
    } catch (caught) {
      handleError(caught, "Não foi possível salvar a configuração.");
    } finally {
      setBusy(false);
    }
  };

  const removeQuestion = async (question: TheoryQuestion) => {
    if (!version || !window.confirm(`Excluir a questão “${question.prompt}”?`)) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest<void>(`/api/theory/admin/questions/${question.id}`, { method: "DELETE" });
      await openVersion(version.id);
      setMessage("Questão excluída do rascunho.");
    } catch (caught) {
      handleError(caught, "Não foi possível excluir a questão.");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!version || !window.confirm("Publicar esta versão? Depois disso, conteúdo e regras não poderão ser editados.")) return;
    setBusy(true);
    setError("");
    setErrorDetails([]);
    try {
      mergeVersion(await apiRequest<TheoryExamVersion>(
        `/api/theory/admin/versions/${version.id}/publish`,
        { method: "POST" },
      ));
      setMessage("Versão publicada e congelada.");
    } catch (caught) {
      handleError(caught, "Não foi possível publicar a versão.");
    } finally {
      setBusy(false);
    }
  };

  const closeVersion = async () => {
    if (!version || !window.confirm("Encerrar esta versão? Novos alunos deixarão de recebê-la.")) return;
    setBusy(true);
    setError("");
    try {
      mergeVersion(await apiRequest<TheoryExamVersion>(
        `/api/theory/admin/versions/${version.id}/close`,
        { method: "POST" },
      ));
      setMessage("Versão encerrada.");
    } catch (caught) {
      handleError(caught, "Não foi possível encerrar a versão.");
    } finally {
      setBusy(false);
    }
  };

  const deleteVersion = async () => {
    if (!version || !window.confirm(`Excluir o rascunho da ${version.beltName}? Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    try {
      await apiRequest<void>(`/api/theory/admin/versions/${version.id}`, { method: "DELETE" });
      setVersion(null);
      setSelectedId("");
      await loadVersions();
    } catch (caught) {
      handleError(caught, "Não foi possível excluir o rascunho.");
    } finally {
      setBusy(false);
    }
  };

  const readiness = useMemo(() => {
    if (!version) return [];
    return [
      { label: "Nota mínima definida", ready: version.minimumScore !== null },
      { label: "Questões em ordem aleatória", ready: true },
      { label: "Pelo menos uma questão", ready: version.questions.length > 0 },
      {
        label: "Todas as questões possuem explicação",
        ready: version.questions.length > 0 && version.questions.every((question) => question.explanation.trim()),
      },
    ];
  }, [version]);
  const readyToPublish = readiness.length > 0 && readiness.every((item) => item.ready);

  if (loading) return <LoadingBlock label="Carregando provas teóricas…" />;

  return (
    <div className="management-page theory-management-page">
      <header className="management-page-heading">
        <div>
          <h1>Provas teóricas</h1>
          <p>Prepare o conteúdo em rascunho e publique uma versão imutável por graduação.</p>
        </div>
        <button className="management-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={18} /> Novo rascunho
        </button>
      </header>

      {error && !version && <div className="management-error" role="alert">{error}</div>}

      <div className={`theory-admin-layout${selectedId ? " detail-open" : ""}`}>
        <aside className="theory-version-rail" aria-label="Versões de prova">
          <header>
            <strong>Cadernos</strong>
            <span>{versions.length}</span>
          </header>
          {versions.length === 0 ? (
            <EmptyState
              icon={<FileQuestion size={26} />}
              title="Nenhuma versão criada"
              detail="Crie um rascunho quando começar a organizar as questões oficiais."
              action={<button className="management-primary" onClick={() => setCreateOpen(true)}>Criar rascunho</button>}
            />
          ) : (
            <div className="theory-version-list">
              {versions.map((item) => (
                <button
                  key={item.id}
                  className={selectedId === item.id ? "active" : ""}
                  onClick={() => void openVersion(item.id)}
                >
                  <i aria-hidden="true" />
                  <span>
                    <strong>{item.beltName}</strong>
                    <small>Versão {item.versionNumber} · {item.questionCount} questões</small>
                  </span>
                  <em className={`theory-version-status ${item.status}`}>{statusLabel[item.status]}</em>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="theory-version-workspace">
          {!selectedId ? (
            <EmptyState
              icon={<FileQuestion size={28} />}
              title="Abra um caderno"
              detail="Selecione uma versão para configurar regras, cadastrar questões e conferir a prontidão."
            />
          ) : detailLoading || !version ? (
            <LoadingBlock label="Abrindo caderno…" />
          ) : (
            <>
              <button className="theory-mobile-back" onClick={() => { setSelectedId(""); setVersion(null); }}>
                <ArrowLeft size={18} /> Todos os cadernos
              </button>
              <header className="theory-workspace-heading">
                <div>
                  <span className={`theory-version-status ${version.status}`}>{statusLabel[version.status]}</span>
                  <h2>{version.beltName}</h2>
                  <p>Versão {version.versionNumber} · atualizada em {formatDate(version.updatedAt, true)}</p>
                </div>
                {version.status !== "draft" && <LockKeyhole size={22} aria-label="Conteúdo bloqueado" />}
              </header>

              {error && (
                <div className="management-error theory-action-error" role="alert">
                  <strong>{error}</strong>
                  {errorDetails.length > 0 && <ul>{errorDetails.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
                </div>
              )}
              {message && <div className="management-success" role="status"><CheckCircle2 size={17} /> {message}</div>}

              <form className="theory-version-settings" onSubmit={saveConfiguration}>
                <header>
                  <div><strong>Regras da versão</strong><span>Aprovação e apresentação</span></div>
                  {version.status === "draft" && (
                    <button className="management-secondary" disabled={busy}>
                      <Save size={17} /> Salvar
                    </button>
                  )}
                </header>
                <div>
                  <label>
                    Nota mínima (%)
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="100"
                      placeholder="A definir"
                      disabled={version.status !== "draft"}
                      value={minimumScore}
                      onChange={(event) => setMinimumScore(event.target.value)}
                    />
                  </label>
                  <div className="theory-random-rule">
                    <Shuffle size={20} aria-hidden="true" />
                    <span>
                      <strong>Ordem aleatória</strong>
                      <small>Todas as questões aparecem, embaralhadas a cada tentativa.</small>
                    </span>
                  </div>
                </div>
              </form>

              <section className="theory-questions-section">
                <header>
                  <div>
                    <strong>Questões</strong>
                    <span>{version.questions.length} questões · {version.totalPoints} pontos</span>
                  </div>
                  {version.status === "draft" && (
                    <button className="management-primary" onClick={() => setEditingQuestion("new")}>
                      <Plus size={17} /> Adicionar
                    </button>
                  )}
                </header>
                {version.questions.length === 0 ? (
                  <div className="theory-questions-empty">
                    <FileQuestion size={27} />
                    <strong>O caderno ainda está vazio</strong>
                    <p>Cadastre somente as questões oficiais. Nada será preenchido automaticamente.</p>
                  </div>
                ) : (
                  <ol className="theory-question-list">
                    {version.questions.map((question, index) => (
                      <li key={question.id}>
                        <span className="theory-question-number">{index + 1}</span>
                        <div>
                          <span>{question.category} · {question.points} pontos</span>
                          <strong>{question.prompt}</strong>
                          <small>
                            {question.options.length} alternativas
                            {question.media ? ` · mídia: ${question.media.kind}` : " · sem mídia"}
                            {!question.explanation ? " · explicação pendente" : ""}
                          </small>
                        </div>
                        {version.status === "draft" && (
                          <div className="theory-question-actions">
                            <button onClick={() => setEditingQuestion(question)} aria-label={`Editar questão ${index + 1}`}><Pencil size={17} /></button>
                            <button className="danger" onClick={() => void removeQuestion(question)} aria-label={`Excluir questão ${index + 1}`}><Trash2 size={17} /></button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="theory-publication-panel">
                <div>
                  <strong>{version.status === "draft" ? "Prontidão para publicar" : "Situação da versão"}</strong>
                  {version.status === "draft" ? (
                    <ul>
                      {readiness.map((item) => (
                        <li key={item.label} className={item.ready ? "ready" : "pending"}>
                          {item.ready ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                          {item.label}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      {version.status === "published"
                        ? "Conteúdo congelado e disponível para o fluxo do aluno quando a elegibilidade for ativada."
                        : "Versão preservada no histórico e indisponível para novas tentativas."}
                    </p>
                  )}
                </div>
                <div className="theory-publication-actions">
                  {version.status === "draft" && (
                    <>
                      <button className="management-secondary danger" onClick={() => void deleteVersion()} disabled={busy}>
                        <Trash2 size={17} /> Excluir rascunho
                      </button>
                      <button className="management-primary" onClick={() => void publish()} disabled={busy || !readyToPublish}>
                        <Send size={17} /> Publicar versão
                      </button>
                    </>
                  )}
                  {version.status === "published" && (
                    <button className="management-secondary" onClick={() => void closeVersion()} disabled={busy}>
                      <Archive size={17} /> Encerrar versão
                    </button>
                  )}
                </div>
              </section>
            </>
          )}
        </section>
      </div>

      {createOpen && (
        <CreateVersionDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(created) => {
            setCreateOpen(false);
            setVersions((current) => [created, ...current]);
            void openVersion(created.id);
          }}
        />
      )}
      {version && editingQuestion && (
        <QuestionEditor
          versionId={version.id}
          question={editingQuestion === "new" ? undefined : editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaved={(next) => {
            setEditingQuestion(null);
            mergeVersion(next);
            setMessage("Questão salva no rascunho.");
          }}
        />
      )}
    </div>
  );
}
