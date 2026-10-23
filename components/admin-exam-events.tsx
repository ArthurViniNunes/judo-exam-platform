"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CircleDot,
  ClipboardCheck,
  MapPin,
  Plus,
  Play,
  RotateCcw,
  Smartphone,
  ShieldCheck,
  Timer,
  Trash2,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, initials, LoadingBlock } from "@/components/admin-portal-shared";
import { apiRequest } from "@/lib/api";
import { eventOperationalSummary } from "@/lib/event-operations";
import type {
  AuthUser,
  EventKataType,
  EventTaskLaunch,
  ExamEventDetail,
  ExamEventStatus,
  ExamEventSummary,
  ExamEventTaskStatus,
  ManagedUser,
  PracticalCandidate,
} from "@/lib/platform";

const EVENT_STATUS: Record<ExamEventStatus, { label: string; action: string | null }> = {
  draft: { label: "Rascunho", action: "Abrir inscrições" },
  open: { label: "Inscrições abertas", action: "Iniciar evento" },
  in_progress: { label: "Em andamento", action: "Encerrar evento" },
  closed: { label: "Encerrado", action: "Arquivar" },
  archived: { label: "Arquivado", action: null },
};

const NEXT_STATUS: Partial<Record<ExamEventStatus, ExamEventStatus>> = {
  draft: "open",
  open: "in_progress",
  in_progress: "closed",
  closed: "archived",
};

const KATA_LABELS: Record<EventKataType, string> = {
  "nage-no-kata-partial": "Nage-no-Kata parcial",
  "nage-no-kata-complete": "Nage-no-Kata completo",
  "katame-no-kata": "Katame-no-Kata",
};

const TASK_STATUS_LABELS: Record<ExamEventTaskStatus, string> = {
  waiting: "Aguardando",
  called: "Chamado",
  in_progress: "Em avaliação",
  pending_sync: "Aguardando envio",
  completed: "Concluída",
};

function eventDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function CreateEventForm({ onCreated, onCancel }: {
  onCreated: (event: ExamEventDetail) => void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", eventDate: "", location: "", notes: "" });

  const submit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    setBusy(true);
    setError("");
    try {
      onCreated(await apiRequest<ExamEventDetail>("/api/exam-events", {
        method: "POST",
        body: JSON.stringify(form),
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível criar o evento.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="event-create-panel" onSubmit={submit}>
      <header><div><span>Novo dia de exame</span><h2>Organize a operação antes de abrir a fila</h2></div></header>
      <div className="event-form-grid">
        <label>Nome do evento<input required minLength={3} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Exame de graduação · Novembro" /></label>
        <label>Data<input required type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} /></label>
        <label>Local<input maxLength={120} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Dojo principal" /></label>
        <label className="event-notes-field">Observações<textarea maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Orientações para a equipe" /></label>
      </div>
      {error && <p className="management-error" role="alert">{error}</p>}
      <footer><button type="button" className="management-secondary" onClick={onCancel}>Cancelar</button><button className="management-primary" disabled={busy}>{busy ? "Criando…" : "Criar evento"}</button></footer>
    </form>
  );
}

function EventDetail({ event, user, users, candidates, onBack, onChanged, onStartTask }: {
  event: ExamEventDetail;
  user: AuthUser;
  users: ManagedUser[];
  candidates: PracticalCandidate[];
  onBack: () => void;
  onChanged: (event: ExamEventDetail) => void;
  onStartTask: (task: EventTaskLaunch) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [evaluatorId, setEvaluatorId] = useState("");
  const [station, setStation] = useState("");
  const [studentId, setStudentId] = useState("");
  const [technical, setTechnical] = useState(true);
  const [kataType, setKataType] = useState<"" | EventKataType>("");
  const [taskStatusFilter, setTaskStatusFilter] = useState<"all" | ExamEventTaskStatus>("all");
  const [taskModalityFilter, setTaskModalityFilter] = useState<"all" | "technical" | "kata">("all");
  const [taskEvaluatorFilter, setTaskEvaluatorFilter] = useState("all");
  const [closeReviewOpen, setCloseReviewOpen] = useState(false);
  const [reopenReviewOpen, setReopenReviewOpen] = useState(false);
  const editable = user.role === "super_admin" && (event.status === "draft" || event.status === "open");
  const assignedEvaluatorIds = new Set(event.evaluators.map((item) => item.id));
  const registeredStudentIds = new Set(event.entries.map((item) => item.studentId));
  const availableEvaluators = users.filter((item) => item.status === "active" && !assignedEvaluatorIds.has(item.id));
  const availableCandidates = candidates.filter((item) => item.eligibility && !registeredStudentIds.has(item.id));
  const operations = eventOperationalSummary(event.tasks);
  const filteredTasks = event.tasks.filter((task) => {
    const matchesStatus = taskStatusFilter === "all" || task.status === taskStatusFilter;
    const matchesModality = taskModalityFilter === "all" || task.modality === taskModalityFilter;
    const matchesEvaluator = taskEvaluatorFilter === "all"
      || (taskEvaluatorFilter === "unassigned" ? !task.evaluatorId : task.evaluatorId === taskEvaluatorFilter);
    return matchesStatus && matchesModality && matchesEvaluator;
  });

  useEffect(() => {
    if (!closeReviewOpen && !reopenReviewOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape" && !busy) {
        setCloseReviewOpen(false);
        setReopenReviewOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [busy, closeReviewOpen, reopenReviewOpen]);

  const mutate = async (path: string, init: RequestInit) => {
    setBusy(true);
    setError("");
    try {
      const next = await apiRequest<ExamEventDetail>(path, init);
      onChanged(next);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar o evento.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const refreshAfterDelete = async (path: string) => {
    setBusy(true);
    setError("");
    try {
      await apiRequest(path, { method: "DELETE" });
      onChanged(await apiRequest<ExamEventDetail>(`/api/exam-events/${event.id}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível remover o registro.");
    } finally {
      setBusy(false);
    }
  };

  const addEvaluator = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    const changed = await mutate(`/api/exam-events/${event.id}/evaluators`, {
      method: "POST",
      body: JSON.stringify({ evaluatorId, station }),
    });
    if (changed) { setEvaluatorId(""); setStation(""); }
  };

  const addStudent = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    const changed = await mutate(`/api/exam-events/${event.id}/entries`, {
      method: "POST",
      body: JSON.stringify({ studentId, technical, kataType: kataType || null }),
    });
    if (changed) { setStudentId(""); setTechnical(true); setKataType(""); }
  };

  const transition = async (requestedStatus?: ExamEventStatus) => {
    const next = requestedStatus ?? NEXT_STATUS[event.status];
    if (!next) return;
    const changed = await mutate(`/api/exam-events/${event.id}/status`, {
      method: "POST",
      body: JSON.stringify({ status: next }),
    });
    if (changed) {
      setCloseReviewOpen(false);
      setReopenReviewOpen(false);
    }
  };

  const taskLaunch = (taskId: string): EventTaskLaunch | null => {
    const task = event.tasks.find((item) => item.id === taskId);
    const entry = event.entries.find((item) => item.id === task?.entryId);
    if (!task || !entry) return null;
    return {
      eventId: event.id,
      eventName: event.name,
      taskId: task.id,
      modality: task.modality,
      kataType: task.kataType,
      studentId: entry.studentId,
      studentName: entry.studentName,
      beltId: entry.beltId,
      beltName: entry.beltName,
    };
  };

  const claimTask = (taskId: string) => mutate(
    `/api/exam-events/${event.id}/tasks/${taskId}/claim`,
    { method: "POST" },
  );

  const releaseTask = (taskId: string) => mutate(
    `/api/exam-events/${event.id}/tasks/${taskId}/release`,
    { method: "POST" },
  );

  return (
    <div className="management-page event-detail-page">
      <button className="event-back" onClick={onBack}><ArrowLeft size={18} /> Todos os eventos</button>
      <header className="event-detail-hero">
        <div>
          <span className={`event-status ${event.status}`}><CircleDot size={14} /> {EVENT_STATUS[event.status].label}</span>
          <h1>{event.name}</h1>
          <p><CalendarDays size={16} /> {eventDate(event.eventDate)} {event.location && <><MapPin size={16} /> {event.location}</>}</p>
        </div>
        {user.role === "super_admin" && (
          <div className="event-hero-actions">
            {event.status === "closed" && (
              <button className="management-secondary" disabled={busy} onClick={() => setReopenReviewOpen(true)}>
                <RotateCcw size={17} /> Reabrir evento
              </button>
            )}
            {EVENT_STATUS[event.status].action && (
              <button className="management-primary" disabled={busy} onClick={() => event.status === "in_progress" ? setCloseReviewOpen(true) : void transition()}>{EVENT_STATUS[event.status].action}<ChevronRight size={17} /></button>
            )}
          </div>
        )}
      </header>
      {error && <p className="management-error event-feedback" role="alert">{error}</p>}
      <div className="event-progress" aria-label={`${event.counts.completed} de ${event.counts.tasks} avaliações concluídas`}>
        <span><strong>{event.status === "in_progress" ? "Operação em progresso" : event.status === "closed" || event.status === "archived" ? "Evento encerrado" : "Preparação do evento"}</strong><small>{event.counts.students} judocas · {event.counts.evaluators} avaliadores</small></span>
        <div><i style={{ width: `${event.counts.tasks ? (event.counts.completed / event.counts.tasks) * 100 : 0}%` }} /></div>
      </div>
      {(event.status === "in_progress" || event.status === "closed" || event.status === "archived") && (
        <section className="event-live-summary" aria-labelledby="event-live-summary-title">
          <header><Timer size={18} /><div><h2 id="event-live-summary-title">Ritmo do evento</h2><p>Situação atual das avaliações e tempo observado.</p></div></header>
          <dl>
            <div><dt>Aguardando</dt><dd>{operations.counts.waiting + operations.counts.called}</dd></div>
            <div><dt>Em avaliação</dt><dd>{operations.counts.inProgress}</dd></div>
            <div><dt>Aguardando envio</dt><dd>{operations.counts.pendingSync}</dd></div>
            <div><dt>Tempo médio</dt><dd>{operations.averageDurationMinutes === null ? "—" : `${operations.averageDurationMinutes} min`}</dd></div>
          </dl>
          {operations.longestActiveMinutes !== null && (
            <p><Clock3 size={15} /> A avaliação em andamento há mais tempo começou há {operations.longestActiveMinutes} min.</p>
          )}
        </section>
      )}
      {event.notes && <p className="event-notes">{event.notes}</p>}
      {event.status === "in_progress" && (
        <section className="event-task-board" aria-labelledby="event-queue-title">
          <header><div><span>Fila operacional</span><h2 id="event-queue-title">Avaliações do evento</h2></div><strong><i /> Ao vivo</strong></header>
          <div className="event-queue-filters" aria-label="Filtros da fila operacional">
            <label>Situação<select value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value as "all" | ExamEventTaskStatus)}><option value="all">Todas</option><option value="waiting">Aguardando</option><option value="called">Chamadas</option><option value="in_progress">Em avaliação</option><option value="pending_sync">Aguardando envio</option><option value="completed">Concluídas</option></select></label>
            <label>Modalidade<select value={taskModalityFilter} onChange={(e) => setTaskModalityFilter(e.target.value as "all" | "technical" | "kata")}><option value="all">Todas</option><option value="technical">Técnica</option><option value="kata">Kata</option></select></label>
            <label>Responsável<select value={taskEvaluatorFilter} onChange={(e) => setTaskEvaluatorFilter(e.target.value)}><option value="all">Todos</option><option value={user.id}>Minhas avaliações</option><option value="unassigned">Sem responsável</option>{event.evaluators.filter((item) => item.id !== user.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          </div>
          <div className="event-task-list">
            {filteredTasks.map((task) => {
              const entry = event.entries.find((item) => item.id === task.entryId);
              const mine = task.evaluatorId === user.id;
              const canRelease = task.status === "in_progress" && (mine || user.role === "super_admin");
              const launch = taskLaunch(task.id);
              return (
                <article key={task.id} className={mine ? "mine" : ""}>
                  <span className={`event-task-state ${task.status}`}>{task.status === "completed" ? <CheckCircle2 size={15} /> : <CircleDot size={15} />}{TASK_STATUS_LABELS[task.status]}</span>
                  <div className="event-task-person"><strong>{entry?.studentName || "Judoca"}</strong><small>{entry?.beltName}</small></div>
                  <div className="event-task-kind"><ClipboardCheck size={17} /><span>{task.modality === "technical" ? "Técnica" : task.kataType ? KATA_LABELS[task.kataType] : "Kata"}</span></div>
                  {task.evaluatorName && <p>Responsável: <strong>{task.evaluatorName}</strong></p>}
                  {task.deviceLabel && task.status !== "completed" && (
                    <p className="event-task-device"><Smartphone size={14} /> Dados neste momento: <strong>{task.deviceLabel}</strong></p>
                  )}
                  <footer>
                    {(task.status === "waiting" || task.status === "called") && (
                      <button className="management-primary" disabled={busy} onClick={() => void claimTask(task.id)}><UserRoundCheck size={17} /> Assumir</button>
                    )}
                    {mine && task.status === "in_progress" && launch && (
                      <button className="management-primary" disabled={busy} onClick={() => onStartTask(launch)}><Play size={17} fill="currentColor" /> Iniciar avaliação</button>
                    )}
                    {canRelease && (
                      <button className="management-secondary" disabled={busy} onClick={() => void releaseTask(task.id)}><RotateCcw size={16} /> Liberar</button>
                    )}
                  </footer>
                </article>
              );
            })}
            {!filteredTasks.length && <p className="event-queue-empty">Nenhuma avaliação corresponde aos filtros escolhidos.</p>}
          </div>
        </section>
      )}
      <div className="event-operations">
        <section className="event-operation-panel">
          <header><span><ShieldCheck size={18} /></span><div><h2>Equipe do evento</h2><p>Quem pode acessar e assumir avaliações.</p></div></header>
          {editable && (
            <form className="event-inline-form" onSubmit={addEvaluator}>
              <label>Avaliador<select required value={evaluatorId} onChange={(e) => setEvaluatorId(e.target.value)}><option value="">Selecione</option>{availableEvaluators.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>Estação (opcional)<input maxLength={80} value={station} onChange={(e) => setStation(e.target.value)} placeholder="Tatame 1" /></label>
              <button className="management-secondary" disabled={busy || !evaluatorId}><Plus size={17} /> Adicionar</button>
            </form>
          )}
          <div className="event-person-list">
            {event.evaluators.length ? event.evaluators.map((evaluator) => (
              <article key={evaluator.id}><span>{initials(evaluator.name)}</span><div><strong>{evaluator.name}</strong><small>{evaluator.evaluatorRank || "Graduação não informada"}{evaluator.station ? ` · ${evaluator.station}` : ""}</small></div>{editable && <button disabled={busy} aria-label={`Remover ${evaluator.name}`} onClick={() => void refreshAfterDelete(`/api/exam-events/${event.id}/evaluators/${evaluator.id}`)}><Trash2 size={16} /></button>}</article>
            )) : <p className="event-list-empty">Adicione os avaliadores que trabalharão neste exame.</p>}
          </div>
        </section>
        <section className="event-operation-panel event-students-panel">
          <header><span><Users size={18} /></span><div><h2>Judocas e modalidades</h2><p>A faixa vem da aprovação teórica registrada.</p></div></header>
          {editable && (
            <form className="event-entry-form" onSubmit={addStudent}>
              <label>Judoca<select required value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">Selecione um aluno apto</option>{availableCandidates.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.eligibility?.beltName}</option>)}</select></label>
              <fieldset><legend>Modalidades</legend><label><input type="checkbox" checked={technical} onChange={(e) => setTechnical(e.target.checked)} /> Avaliação técnica</label><label>Kata<select value={kataType} onChange={(e) => setKataType(e.target.value as "" | EventKataType)}><option value="">Sem kata</option>{Object.entries(KATA_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></fieldset>
              <button className="management-secondary" disabled={busy || !studentId || (!technical && !kataType)}><Plus size={17} /> Inscrever judoca</button>
            </form>
          )}
          <div className="event-entry-list">
            {event.entries.length ? event.entries.map((entry) => {
              const tasks = event.tasks.filter((task) => task.entryId === entry.id);
              return <article key={entry.id}><span className="student-avatar">{initials(entry.studentName)}</span><div><strong>{entry.studentName}</strong><small>{entry.beltName}</small><ul>{tasks.map((task) => <li key={task.id} className={task.status}>{task.status === "completed" ? <CheckCircle2 size={14} /> : <CircleDot size={14} />} {task.modality === "technical" ? "Técnica" : task.kataType ? KATA_LABELS[task.kataType] : "Kata"} · {TASK_STATUS_LABELS[task.status].toLocaleLowerCase("pt-BR")}</li>)}</ul></div>{editable && <button disabled={busy} aria-label={`Remover ${entry.studentName}`} onClick={() => void refreshAfterDelete(`/api/exam-events/${event.id}/entries/${entry.id}`)}><Trash2 size={16} /></button>}</article>;
            }) : <p className="event-list-empty">Inscreva os judocas aprovados no teórico e escolha suas modalidades.</p>}
          </div>
        </section>
      </div>
      {closeReviewOpen && (
        <div className="event-close-layer" role="presentation" onMouseDown={() => !busy && setCloseReviewOpen(false)}>
          <section className="event-close-dialog" role="dialog" aria-modal="true" aria-labelledby="event-close-title" onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}>
            <button className="event-close-x" onClick={() => setCloseReviewOpen(false)} disabled={busy} aria-label="Fechar conferência"><X size={19} /></button>
            <header className={operations.readyToClose ? "ready" : "blocked"}>
              <span>{operations.readyToClose ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}</span>
              <div>
                <h2 id="event-close-title">{operations.readyToClose ? "Tudo pronto para encerrar" : "Ainda existem avaliações pendentes"}</h2>
                <p>{operations.readyToClose ? "Confira o resumo antes de tornar o evento somente leitura." : "Resolva a fila abaixo antes de tentar encerrar o evento."}</p>
              </div>
            </header>
            {error && <p className="management-error" role="alert">{error}</p>}
            {operations.readyToClose ? (
              <dl className="event-close-summary">
                <div><dt>Avaliações concluídas</dt><dd>{operations.counts.completed}</dd></div>
                <div><dt>Tempo médio observado</dt><dd>{operations.averageDurationMinutes === null ? "Sem duração calculada" : `${operations.averageDurationMinutes} min`}</dd></div>
                <div><dt>Judocas</dt><dd>{event.counts.students}</dd></div>
                <div><dt>Avaliadores</dt><dd>{event.counts.evaluators}</dd></div>
              </dl>
            ) : (
              <ul className="event-close-pending">
                {operations.counts.waiting > 0 && <li><span>Aguardando chamada</span><strong>{operations.counts.waiting}</strong></li>}
                {operations.counts.called > 0 && <li><span>Chamadas</span><strong>{operations.counts.called}</strong></li>}
                {operations.counts.inProgress > 0 && <li><span>Em avaliação</span><strong>{operations.counts.inProgress}</strong></li>}
                {operations.counts.pendingSync > 0 && <li><span>Aguardando envio ao servidor</span><strong>{operations.counts.pendingSync}</strong></li>}
              </ul>
            )}
            <footer>
              <button className="management-secondary" onClick={() => setCloseReviewOpen(false)} disabled={busy}>{operations.readyToClose ? "Cancelar" : "Voltar à fila"}</button>
              {operations.readyToClose && <button className="management-primary" autoFocus onClick={() => void transition("closed")} disabled={busy}>{busy ? "Encerrando…" : "Encerrar evento"}</button>}
            </footer>
          </section>
        </div>
      )}
      {reopenReviewOpen && (
        <div className="event-close-layer" role="presentation" onMouseDown={() => !busy && setReopenReviewOpen(false)}>
          <section className="event-close-dialog" role="dialog" aria-modal="true" aria-labelledby="event-reopen-title" onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}>
            <button className="event-close-x" onClick={() => setReopenReviewOpen(false)} disabled={busy} aria-label="Fechar confirmação"><X size={19} /></button>
            <header className="ready">
              <span><RotateCcw size={24} /></span>
              <div>
                <h2 id="event-reopen-title">Reabrir este evento?</h2>
                <p>O evento voltará para inscrições abertas. Você poderá ajustar participantes e, depois, iniciá-lo novamente. As avaliações concluídas não serão alteradas.</p>
              </div>
            </header>
            {error && <p className="management-error" role="alert">{error}</p>}
            <footer>
              <button className="management-secondary" onClick={() => setReopenReviewOpen(false)} disabled={busy}>Cancelar</button>
              <button className="management-primary" autoFocus onClick={() => void transition("open")} disabled={busy}>{busy ? "Reabrindo…" : "Confirmar reabertura"}</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export function ExamEventsView({ user, users, onStartTask }: { user: AuthUser; users: ManagedUser[]; onStartTask: (task: EventTaskLaunch) => void }) {
  const [events, setEvents] = useState<ExamEventSummary[]>([]);
  const [candidates, setCandidates] = useState<PracticalCandidate[]>([]);
  const [selected, setSelected] = useState<ExamEventDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedEventId = selected?.id;
  const selectedEventStatus = selected?.status;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextEvents, nextCandidates] = await Promise.all([
        apiRequest<ExamEventSummary[]>("/api/exam-events"),
        user.role === "super_admin" ? apiRequest<PracticalCandidate[]>("/api/practical-candidates") : Promise.resolve([]),
      ]);
      setEvents(nextEvents);
      setCandidates(nextCandidates);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar os eventos.");
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  useEffect(() => {
    if (!selectedEventId || selectedEventStatus !== "in_progress") return;
    const eventId = selectedEventId;
    const refresh = async () => {
      try {
        const next = await apiRequest<ExamEventDetail>(`/api/exam-events/${eventId}`);
        setSelected((current) => current?.id === eventId ? next : current);
        setEvents((current) => current.map((item) => item.id === eventId ? next : item));
      } catch {
        // A fila permanece utilizável com os últimos dados enquanto a conexão oscila.
      }
    };
    const interval = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(interval);
  }, [selectedEventId, selectedEventStatus]);

  const open = async (eventId: string) => {
    setLoading(true);
    setError("");
    try { setSelected(await apiRequest<ExamEventDetail>(`/api/exam-events/${eventId}`)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível abrir o evento."); }
    finally { setLoading(false); }
  };

  const sortedEvents = useMemo(() => [...events].sort((a, b) => b.eventDate.localeCompare(a.eventDate)), [events]);
  if (loading && !selected) return <LoadingBlock label="Organizando os eventos…" />;
  if (selected) return <EventDetail event={selected} user={user} users={users} candidates={candidates} onBack={() => { setSelected(null); void load(); }} onChanged={(next) => { setSelected(next); setEvents((current) => current.map((item) => item.id === next.id ? next : item)); }} onStartTask={onStartTask} />;
  return (
    <div className="management-page events-page">
      <header className="management-page-heading"><div><h1>Dia de exame</h1><p>Prepare equipe e judocas, acompanhe o andamento e encerre sem deixar avaliações pendentes.</p></div>{user.role === "super_admin" && <button className="management-primary" onClick={() => setCreating((value) => !value)}><Plus size={18} /> {creating ? "Fechar" : "Novo evento"}</button>}</header>
      {error && <p className="management-error" role="alert">{error}</p>}
      {creating && <CreateEventForm onCancel={() => setCreating(false)} onCreated={(event) => { setCreating(false); setSelected(event); setEvents((current) => [event, ...current]); }} />}
      {!sortedEvents.length && !creating ? <EmptyState icon={<CalendarDays size={29} />} title="Nenhum evento planejado" detail={user.role === "super_admin" ? "Crie o próximo dia de exame e organize a operação com antecedência." : "Você verá aqui os eventos para os quais foi escalado."} /> : (
        <div className="event-list">{sortedEvents.map((event) => <button key={event.id} onClick={() => void open(event.id)}><span className="event-date-block"><b>{new Date(`${event.eventDate}T12:00:00`).getDate()}</b><small>{new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(`${event.eventDate}T12:00:00`))}</small></span><span className="event-list-main"><i className={`event-status ${event.status}`}>{EVENT_STATUS[event.status].label}</i><strong>{event.name}</strong><small>{event.location || "Local a definir"}</small></span><span className="event-list-count"><UserRoundCheck size={16} /><b>{event.counts.students}</b><small>judocas</small></span><ChevronRight size={19} /></button>)}</div>
      )}
    </div>
  );
}
