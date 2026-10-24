"use client";

import {
  Archive,
  ArrowLeft,
  BookCopy,
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
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import {
  THEORY_BELTS,
  THEORY_CATEGORIES,
  type TheoryExamVersion,
  type TheoryExamVersionSummary,
  type TheoryMediaKind,
  type TheoryQuestion,
  type TheoryQuestionType,
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

function ImportTemplatesDialog({
  templates,
  versions,
  busy,
  onClose,
  onImport,
}: {
  templates: TheoryTemplateSummary[];
  versions: TheoryExamVersionSummary[];
  busy: boolean;
  onClose: () => void;
  onImport: (templateIds: string[]) => void;
}) {
  const availableTemplates = templates.filter(
    (template) => !versions.some((version) => version.beltId === template.beltId),
  );
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const effectiveSelectedIds = selectedIds ?? availableTemplates.map((template) => template.beltId);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [busy, onClose]);

  const toggleTemplate = (beltId: string) => {
    setSelectedIds((current) => {
      const currentIds = current ?? availableTemplates.map((template) => template.beltId);
      return currentIds.includes(beltId)
        ? currentIds.filter((item) => item !== beltId)
        : [...currentIds, beltId];
    });
  };

  return (
    <div className="theory-editor-layer" onMouseDown={() => !busy && onClose()}>
      <section
        className="theory-editor-dialog theory-create-dialog theory-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-templates-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="theory-dialog-close"
          onClick={onClose}
          disabled={busy}
          aria-label="Fechar"
        >
          <X size={19} />
        </button>
        <span className="theory-dialog-symbol"><BookCopy size={23} /></span>
        <h2 id="import-templates-title">Importar exame teórico padrão</h2>
        <p>
          Escolha uma ou mais faixas. Cada importação cria um rascunho para você
          revisar antes da publicação.
        </p>

        {templates.length === 0 ? (
          <div className="theory-import-empty">
            <FileQuestion size={21} />
            <strong>Nenhum template cadastrado</strong>
            <span>Cadastre o conteúdo de uma faixa para disponibilizá-lo aqui.</span>
          </div>
        ) : (
          <div className="theory-template-options">
            {templates.map((template) => {
              const existingVersion = versions.find(
                (version) => version.beltId === template.beltId,
              );
              const selected = effectiveSelectedIds.includes(template.beltId);

              return (
                <label
                  key={template.beltId}
                  className={`theory-template-option${existingVersion ? " unavailable" : ""}${selected ? " selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={busy || Boolean(existingVersion)}
                    onChange={() => toggleTemplate(template.beltId)}
                  />
                  <span className="theory-template-check" aria-hidden="true">
                    <Check size={16} />
                  </span>
                  <span className="theory-template-copy">
                    <strong>{template.beltName}</strong>
                    <small>
                      {existingVersion
                        ? `Já possui ${statusLabel[existingVersion.status].toLocaleLowerCase("pt-BR")}.`
                        : `${template.questionCount} questões · ${template.totalPoints} pontos`}
                    </small>
                  </span>
                  {existingVersion ? (
                    <span className={`theory-template-status ${existingVersion.status}`}>
                      {statusLabel[existingVersion.status]}
                    </span>
                  ) : (
                    <span className="theory-template-status ready">Disponível</span>
                  )}
                </label>
              );
            })}
          </div>
        )}

        {templates.length > 0 && versions.some((version) =>
          templates.some((template) => template.beltId === version.beltId),
        ) && (
          <p className="theory-import-note">
            Faixas que já possuem exame ficam bloqueadas para evitar duplicidade.
          </p>
        )}

        <div className="theory-dialog-actions">
          <button type="button" className="management-secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="management-primary"
            disabled={busy || effectiveSelectedIds.length === 0}
            onClick={() => onImport(effectiveSelectedIds)}
          >
            <BookCopy size={18} />
            {busy ? "Importando…" : `Importar ${effectiveSelectedIds.length || ""} exame${effectiveSelectedIds.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </section>
    </div>
  );
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
  type: TheoryQuestionType;
  category: string;
  prompt: string;
  points: string;
  explanation: string;
  options: { text: string; isCorrect: boolean }[];
  rows: { text: string; correctOptionIndexes: number[] }[];
  mediaEnabled: boolean;
  mediaKind: TheoryMediaKind;
  sourceUrl: string;
  altText: string;
  metadataSensitive: boolean;
};

type TheoryMediaUpload = {
  sourceUrl: string;
  kind: Exclude<TheoryMediaKind, "youtube">;
  size: number;
};

const THEORY_MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm,video/mp4,video/webm,video/ogg";
const MAX_THEORY_MEDIA_BYTES = 50 * 1024 * 1024;

type TheoryTemplateSummary = {
  beltId: (typeof THEORY_BELTS)[number]["id"];
  beltName: string;
  questionCount: number;
  totalPoints: number;
  gridQuestionCount: number;
  pendingMediaCount: number;
};

function questionDraft(question?: TheoryQuestion): QuestionDraft {
  return question
    ? {
        type: question.type,
        category: question.category,
        prompt: question.prompt,
        points: String(question.points),
        explanation: question.explanation,
        options: question.options.map((option) => ({
          text: option.text,
          isCorrect: option.isCorrect,
        })),
        rows: question.rows.map((row) => ({
          text: row.text,
          correctOptionIndexes: row.correctOptionIds
            .map((optionId) => question.options.findIndex((option) => option.id === optionId))
            .filter((index) => index >= 0),
        })),
        mediaEnabled: Boolean(question.media),
        mediaKind: question.media?.kind ?? "image",
        sourceUrl: question.media?.sourceUrl ?? "",
        altText: question.media?.altText ?? "",
        metadataSensitive: question.media?.metadataSensitive ?? false,
      }
    : {
        type: "single_choice",
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
        rows: [
          { text: "", correctOptionIndexes: [0] },
          { text: "", correctOptionIndexes: [0] },
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
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
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
        rows: current.rows.map((row) => ({
          ...row,
          correctOptionIndexes: row.correctOptionIndexes
            .filter((optionIndex) => optionIndex !== index)
            .map((optionIndex) => optionIndex > index ? optionIndex - 1 : optionIndex),
        })),
      };
    });
  };

  const updateGridRow = (index: number, patch: Partial<QuestionDraft["rows"][number]>) => {
    setDraft((current) => ({
      ...current,
      rows: current.rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row),
    }));
  };

  const toggleGridAnswer = (rowIndex: number, optionIndex: number) => {
    setDraft((current) => ({
      ...current,
      rows: current.rows.map((row, index) => {
        if (index !== rowIndex) return row;
        if (current.type === "grid_single") {
          return { ...row, correctOptionIndexes: [optionIndex] };
        }
        const selected = row.correctOptionIndexes.includes(optionIndex);
        return {
          ...row,
          correctOptionIndexes: selected
            ? row.correctOptionIndexes.filter((value) => value !== optionIndex)
            : [...row.correctOptionIndexes, optionIndex],
        };
      }),
    }));
  };

  const uploadMedia = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setError("");
    setUploadMessage("");
    if (file.size > MAX_THEORY_MEDIA_BYTES) {
      setError("O arquivo deve ter no máximo 50 MB.");
      input.value = "";
      return;
    }
    if (!file.type) {
      setError("Não foi possível identificar o formato do arquivo.");
      input.value = "";
      return;
    }
    setUploading(true);
    try {
      const uploaded = await apiRequest<TheoryMediaUpload>("/api/theory/admin/media", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      setDraft((current) => ({
        ...current,
        mediaEnabled: true,
        mediaKind: uploaded.kind,
        sourceUrl: uploaded.sourceUrl,
      }));
      setUploadMessage(`${file.name} está pronto para ser usado nesta questão.`);
    } catch (caught) {
      setError(actionError(caught, "Não foi possível enviar a mídia.").message);
    } finally {
      setUploading(false);
      input.value = "";
    }
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
          type: draft.type,
          category: draft.category,
          prompt: draft.prompt,
          points: Number(draft.points),
          explanation: draft.explanation,
          options: draft.options,
          rows: draft.type === "single_choice" ? [] : draft.rows,
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
          <label>
            Tipo de questão
            <select
              value={draft.type}
              onChange={(event) => setDraft((current) => ({
                ...current,
                type: event.target.value as TheoryQuestionType,
                rows: current.rows.length ? current.rows : [{ text: "", correctOptionIndexes: [0] }],
              }))}
            >
              <option value="single_choice">Escolha única</option>
              <option value="grid_single">Associação · uma resposta por item</option>
              <option value="grid_multiple">Associação · várias respostas por item</option>
            </select>
            <small>Em associação, cada item é exibido como um bloco vertical no celular.</small>
          </label>
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
              maxLength={3000}
              rows={4}
              value={draft.prompt}
              onChange={(event) => setDraft({ ...draft, prompt: event.target.value })}
              placeholder="Escreva a pergunta como ela será apresentada ao aluno"
            />
          </label>

          <fieldset className="theory-options-editor">
            <legend>
              {draft.type === "single_choice" ? "Alternativas" : "Respostas possíveis"}
              <span>{draft.type === "single_choice" ? "marque a resposta correta" : "serão usadas em cada item"}</span>
            </legend>
            {draft.options.map((option, index) => (
              <div key={index} className="theory-option-row">
                <button
                  type="button"
                  className={draft.type === "single_choice" && option.isCorrect ? "correct" : ""}
                  aria-label={draft.type === "single_choice"
                    ? `Marcar alternativa ${String.fromCharCode(65 + index)} como correta`
                    : `Resposta ${String.fromCharCode(65 + index)}`}
                  aria-pressed={draft.type === "single_choice" ? option.isCorrect : undefined}
                  onClick={() => draft.type === "single_choice" && markCorrect(index)}
                >
                  {draft.type === "single_choice" && option.isCorrect
                    ? <Check size={17} />
                    : String.fromCharCode(65 + index)}
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
            {draft.options.length < (draft.type === "single_choice" ? 6 : 12) && (
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

          {draft.type !== "single_choice" && (
            <fieldset className="theory-grid-editor">
              <legend>Itens para relacionar <span>defina o gabarito de cada um</span></legend>
              <div className="theory-grid-editor-list">
                {draft.rows.map((row, rowIndex) => (
                  <section key={rowIndex} className="theory-grid-editor-row">
                    <label>
                      Item {rowIndex + 1}
                      <input
                        required
                        maxLength={300}
                        value={row.text}
                        onChange={(event) => updateGridRow(rowIndex, { text: event.target.value })}
                        placeholder="Ex.: Nascimento de Jigoro Kano"
                      />
                    </label>
                    <fieldset>
                      <legend>{draft.type === "grid_single" ? "Resposta correta" : "Respostas corretas"}</legend>
                      {draft.options.map((option, optionIndex) => (
                        <label key={optionIndex}>
                          <input
                            type={draft.type === "grid_single" ? "radio" : "checkbox"}
                            name={`grid-row-${rowIndex}`}
                            checked={row.correctOptionIndexes.includes(optionIndex)}
                            onChange={() => toggleGridAnswer(rowIndex, optionIndex)}
                          />
                          <span>{option.text || `Resposta ${String.fromCharCode(65 + optionIndex)}`}</span>
                        </label>
                      ))}
                    </fieldset>
                    {draft.rows.length > 1 && (
                      <button
                        type="button"
                        className="theory-grid-remove-row"
                        onClick={() => setDraft((current) => ({
                          ...current,
                          rows: current.rows.filter((_, index) => index !== rowIndex),
                        }))}
                      >
                        <Trash2 size={16} /> Remover item
                      </button>
                    )}
                  </section>
                ))}
              </div>
              {draft.rows.length < 20 && (
                <button
                  type="button"
                  className="theory-add-option"
                  onClick={() => setDraft((current) => ({
                    ...current,
                    rows: [...current.rows, { text: "", correctOptionIndexes: [0] }],
                  }))}
                >
                  <Plus size={17} /> Adicionar item
                </button>
              )}
            </fieldset>
          )}

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
                    onChange={(event) => {
                      setUploadMessage("");
                      setDraft({ ...draft, mediaKind: event.target.value as TheoryMediaKind });
                    }}
                  >
                    <option value="image">Imagem</option>
                    <option value="audio">Áudio</option>
                    <option value="video">Vídeo próprio</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </label>
                {draft.mediaKind !== "youtube" && (
                  <div className="theory-media-upload">
                    <label className={uploading ? "theory-media-upload-control busy" : "theory-media-upload-control"}>
                      <input
                        type="file"
                        accept={THEORY_MEDIA_ACCEPT}
                        disabled={uploading || busy}
                        onChange={uploadMedia}
                      />
                      <Upload size={20} aria-hidden="true" />
                      <span>
                        <strong>{uploading ? "Enviando arquivo…" : "Escolher arquivo"}</strong>
                        <small>Imagem, áudio ou vídeo de até 50 MB</small>
                      </span>
                    </label>
                    {uploadMessage && (
                      <p className="theory-media-uploaded" role="status">
                        <CheckCircle2 size={16} aria-hidden="true" /> {uploadMessage}
                      </p>
                    )}
                  </div>
                )}
                <label className="theory-media-url">
                  URL HTTPS <small>preenchida após o upload ou informada manualmente</small>
                  <input
                    type="url"
                    required
                    value={draft.sourceUrl}
                    onChange={(event) => {
                      setUploadMessage("");
                      setDraft({ ...draft, sourceUrl: event.target.value });
                    }}
                    placeholder="https://…"
                  />
                </label>
                <label className="theory-media-description">
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
            <button className="management-primary" disabled={busy || uploading}>
              <Save size={18} /> {busy ? "Salvando…" : uploading ? "Aguarde o envio…" : "Salvar questão"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function TheoryExamsView() {
  const [versions, setVersions] = useState<TheoryExamVersionSummary[]>([]);
  const [templates, setTemplates] = useState<TheoryTemplateSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [version, setVersion] = useState<TheoryExamVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
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
      const [nextVersions, nextTemplates] = await Promise.all([
        apiRequest<TheoryExamVersionSummary[]>("/api/theory/admin/versions"),
        apiRequest<TheoryTemplateSummary[]>("/api/theory/admin/templates"),
      ]);
      setVersions(nextVersions);
      setTemplates(nextTemplates);
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

  const importTemplates = async (templateIds: string[]) => {
    const selectedTemplates = templates.filter((template) => templateIds.includes(template.beltId));
    setBusy(true);
    setError("");
    setErrorDetails([]);
    setMessage("");
    try {
      const importedVersions: TheoryExamVersion[] = [];
      const failures: string[] = [];
      for (const template of selectedTemplates) {
        try {
          const imported = await apiRequest<TheoryExamVersion>(
            `/api/theory/admin/templates/${template.beltId}/import`,
            { method: "POST" },
          );
          importedVersions.push(imported);
        } catch (caught) {
          const failure = actionError(caught, `Não foi possível importar ${template.beltName}.`);
          failures.push(`${template.beltName}: ${failure.message}`);
        }
      }
      if (importedVersions.length > 0) {
        setVersions((current) => [...importedVersions, ...current]);
        const lastImported = importedVersions[importedVersions.length - 1];
        setSelectedId(lastImported.id);
        mergeVersion(lastImported);
        setImportOpen(false);
      }
      if (failures.length > 0) {
        setError("Alguns exames não puderam ser importados.");
        setErrorDetails(failures);
      } else {
        setMessage(
          `${importedVersions.length} exame${importedVersions.length === 1 ? "" : "s"} importado${importedVersions.length === 1 ? "" : "s"} como rascunho. Revise o conteúdo antes de publicar.`,
        );
      }
    } catch (caught) {
      handleError(caught, "Não foi possível importar os exames selecionados.");
    } finally {
      setBusy(false);
    }
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
        <div className="theory-heading-actions">
          <button className="management-secondary" disabled={busy} onClick={() => setImportOpen(true)}>
            <BookCopy size={18} /> Importar exame teórico padrão
          </button>
          <button className="management-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={18} /> Novo rascunho
          </button>
        </div>
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
                        <div className="theory-question-copy">
                          <span className="theory-question-eyebrow">
                            {question.category} · {question.points} pontos
                            <em className={`theory-question-type ${question.type}`}>
                              {question.type === "single_choice"
                                ? "Questão simples"
                                : question.type === "grid_single"
                                  ? "Grade · uma resposta"
                                  : "Grade · múltiplas respostas"}
                            </em>
                          </span>
                          <strong>{question.prompt}</strong>
                          <small>
                            {question.type === "single_choice"
                              ? `${question.options.length} alternativas`
                              : `${question.rows.length} itens · ${question.options.length} respostas possíveis`}
                            {question.media ? ` · mídia: ${question.media.kind}` : " · sem mídia"}
                            {!question.explanation ? " · explicação pendente" : ""}
                          </small>
                          {question.type !== "single_choice" && (
                            <details className="theory-grid-preview">
                              <summary>
                                <span>Ver grade e gabarito</span>
                                <ChevronRight size={18} aria-hidden="true" />
                              </summary>
                              <div className="theory-grid-preview-body">
                                {question.rows.map((row, rowIndex) => {
                                  const correctAnswers = row.correctOptionIds
                                    .map((optionId) => question.options.find((option) => option.id === optionId)?.text)
                                    .filter((answer): answer is string => Boolean(answer));

                                  return (
                                    <div className="theory-grid-preview-row" key={row.id}>
                                      <span>{rowIndex + 1}</span>
                                      <div>
                                        <strong>{row.text}</strong>
                                        <small>
                                          {correctAnswers.length > 0
                                            ? correctAnswers.join(" · ")
                                            : "Gabarito pendente"}
                                        </small>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          )}
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
      {importOpen && (
        <ImportTemplatesDialog
          templates={templates}
          versions={versions}
          busy={busy}
          onClose={() => setImportOpen(false)}
          onImport={(templateIds) => void importTemplates(templateIds)}
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
