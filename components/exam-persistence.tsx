"use client";

import {
  Check,
  Cloud,
  CloudOff,
  HardDrive,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useState } from "react";
import type {
  DraftSaveState,
  EvaluationDraft,
  OutboxRecord,
  SyncSummary,
} from "@/lib/offline-evaluations";

function draftLabel(state: DraftSaveState) {
  if (state === "saving") return "Salvando no aparelho";
  if (state === "error") return "Rascunho requer atenção";
  return "Salvo neste aparelho";
}

export function DraftSaveIndicator({ state }: { state: DraftSaveState }) {
  const Icon = state === "saving" ? LoaderCircle : state === "error" ? TriangleAlert : HardDrive;
  return (
    <span className={`draft-save-state ${state}`} role="status" aria-live="polite">
      <Icon size={14} className={state === "saving" ? "spin" : ""} />
      {draftLabel(state)}
    </span>
  );
}

function recordPresentation(record: OutboxRecord | undefined) {
  if (!record) {
    return {
      status: "saving",
      label: "Salvando no aparelho",
      detail: "Aguarde a confirmação local antes de fechar esta tela.",
      Icon: LoaderCircle,
    } as const;
  }
  if (record.status === "queued") {
    return {
      status: "queued",
      label: "Salvo neste aparelho",
      detail: "A avaliação será enviada automaticamente quando houver conexão.",
      Icon: HardDrive,
    } as const;
  }
  if (record.status === "syncing") {
    return {
      status: "syncing",
      label: "Sincronizando",
      detail: "Enviando a avaliação completa para o servidor.",
      Icon: LoaderCircle,
    } as const;
  }
  if (record.status === "synced") {
    return {
      status: "synced",
      label: "Salvo no servidor",
      detail: "O servidor confirmou o recebimento de todas as notas.",
      Icon: Check,
    } as const;
  }
  return {
    status: "attention_required",
    label: "Requer atenção",
    detail: record.lastError || "Não foi possível concluir a sincronização.",
    Icon: TriangleAlert,
  } as const;
}

export function EvaluationSaveStatus({
  record,
  localError,
  onRetry,
}: {
  record: OutboxRecord | undefined;
  localError?: string;
  onRetry: () => void;
}) {
  const presentation = localError
    ? {
        status: "attention_required",
        label: "Requer atenção",
        detail: localError,
        Icon: TriangleAlert,
      }
    : recordPresentation(record);
  const { Icon } = presentation;
  return (
    <div className={`evaluation-save-status ${presentation.status}`} role="status" aria-live="polite">
      <Icon size={20} className={presentation.status === "syncing" || presentation.status === "saving" ? "spin" : ""} />
      <span><strong>{presentation.label}</strong><small>{presentation.detail}</small></span>
      {presentation.status === "attention_required" && (
        <button type="button" onClick={onRetry}><RefreshCw size={16} /> Tentar novamente</button>
      )}
    </div>
  );
}

export function SyncStatusBar({
  summary,
  storageError,
  onRetry,
}: {
  summary: SyncSummary;
  storageError: string;
  onRetry: () => void;
}) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!storageError && summary.status !== "queued" && summary.status !== "syncing" && summary.status !== "attention_required") {
    return null;
  }

  const status = storageError ? "attention_required" : summary.status;
  const Icon = status === "syncing" ? LoaderCircle : status === "attention_required" ? TriangleAlert : online ? Cloud : CloudOff;
  const label = storageError
    ? "Armazenamento local requer atenção"
    : status === "syncing"
      ? "Sincronizando avaliações"
      : status === "attention_required"
        ? "Sincronização requer atenção"
        : online
          ? "Avaliações aguardando envio"
          : "Sem internet · dados seguros neste aparelho";

  return (
    <aside className={`sync-status-bar ${status}`} aria-live="polite">
      <Icon size={18} className={status === "syncing" ? "spin" : ""} />
      <span><strong>{label}</strong><small>{storageError || `${summary.pendingCount} pendência${summary.pendingCount === 1 ? "" : "s"}`}</small></span>
      <button type="button" onClick={onRetry} disabled={!online && !storageError} aria-label="Tentar sincronizar novamente">
        <RefreshCw size={17} />
      </button>
    </aside>
  );
}

function formatDraftTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DraftResumeList({
  drafts,
  onResume,
  onDiscard,
}: {
  drafts: EvaluationDraft[];
  onResume: (draft: EvaluationDraft) => void;
  onDiscard: (draft: EvaluationDraft) => void;
}) {
  if (!drafts.length) return null;
  return (
    <section className="draft-resume" aria-labelledby="draft-resume-title">
      <header>
        <HardDrive size={19} />
        <span><strong id="draft-resume-title">Avaliação em andamento</strong><small>O rascunho está salvo neste aparelho.</small></span>
      </header>
      {drafts.map((draft) => (
        <article key={draft.id}>
          <span>
            <strong>{draft.athlete}</strong>
            <small>
              {draft.kind === "technical" ? "Avaliação técnica" : "Avaliação de kata"} · {formatDraftTime(draft.updatedAt)}
            </small>
          </span>
          <div>
            <button type="button" className="draft-resume-button" onClick={() => onResume(draft)}><RotateCcw size={16} /> Continuar</button>
            <button type="button" className="draft-discard-button" onClick={() => onDiscard(draft)} aria-label={`Descartar rascunho de ${draft.athlete}`}><Trash2 size={16} /></button>
          </div>
        </article>
      ))}
    </section>
  );
}
