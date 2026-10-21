"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpenCheck,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  ClipboardCheck,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { EvaluationReport } from "@/components/evaluation-report";
import {
  EmptyState,
  formatDate,
  initials,
  LoadingBlock,
  Metric,
  scoreLabel,
} from "@/components/admin-portal-shared";
import type {
  AuthUser,
  DashboardData,
  ManagedUser,
  StudentRecord,
} from "@/lib/platform";

type OverviewProps = {
  data: DashboardData;
  loading: boolean;
  user: AuthUser;
  users: ManagedUser[];
  evaluatorId: string;
  setEvaluatorId: (value: string) => void;
};

export function Overview({
  data,
  loading,
  user,
  users,
  evaluatorId,
  setEvaluatorId,
}: OverviewProps) {
  const maxCount = Math.max(1, ...data.months.map((month) => month.count));
  if (loading) return <LoadingBlock />;
  return (
    <div className="management-page">
      <header className="management-page-heading">
        <div>
          <h1>
            {user.role === "super_admin"
              ? "Visão da associação"
              : "Sua turma em perspectiva"}
          </h1>
          <p>
            {user.role === "super_admin"
              ? "Compare avaliadores, alunos e resultados registrados."
              : "Acompanhe os alunos avaliados por você e identifique quem precisa de atenção."}
          </p>
        </div>
        {user.role === "super_admin" && (
          <label className="evaluator-filter">
            Exibir dados de
            <select
              value={evaluatorId}
              onChange={(event) => setEvaluatorId(event.target.value)}
            >
              <option value="">Todos os avaliadores</option>
              {users
                .filter(
                  (item) =>
                    item.role === "evaluator" && item.status !== "invited",
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
            <ChevronDown size={17} />
          </label>
        )}
      </header>
      <section className="management-metrics" aria-label="Resumo de desempenho">
        <Metric
          icon={<ClipboardCheck size={21} />}
          value={String(data.summary.evaluations)}
          label="Avaliações registradas"
          note="no histórico disponível"
        />
        <Metric
          icon={<Users size={21} />}
          value={String(data.summary.students)}
          label="Alunos acompanhados"
          note="com ao menos um exame"
        />
        <Metric
          icon={<BarChart3 size={21} />}
          value={scoreLabel(data.summary.average)}
          label="Média geral"
          note="entre técnica, teoria e kata"
        />
        <Metric
          icon={<Award size={21} />}
          value={`${data.summary.approvalRate}%`}
          label="Aprovação"
          note="não considera avaliações de kata"
        />
      </section>
      <div className="management-overview-grid">
        <article className="management-panel evolution-panel">
          <div className="management-panel-heading">
            <div>
              <h2>Ritmo de avaliações</h2>
              <p>Volume e média dos últimos seis meses</p>
            </div>
            <Activity size={21} />
          </div>
          {data.months.some((month) => month.count) ? (
            <div className="month-chart" aria-label="Avaliações por mês">
              {data.months.map((month) => (
                <div key={month.key} className="month-column">
                  <div className="month-score">
                    {month.average ? scoreLabel(month.average) : "—"}
                  </div>
                  <div className="month-bar-track">
                    <i
                      style={{
                        height: `${Math.max(8, (month.count / maxCount) * 100)}%`,
                      }}
                    />
                  </div>
                  <strong>{month.label}</strong>
                  <span>{month.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BarChart3 size={27} />}
              title="A evolução começa no primeiro exame"
              detail="As avaliações concluídas aparecerão aqui mês a mês."
            />
          )}
        </article>
        <article className="management-panel type-panel">
          <div className="management-panel-heading">
            <div>
              <h2>Por modalidade</h2>
              <p>Distribuição dos registros</p>
            </div>
          </div>
          <div className="type-breakdown">
            {data.byType.map((item) => (
              <div key={item.type}>
                <span className={`type-symbol ${item.type}`}>
                  <BookOpenCheck size={18} />
                </span>
                <div>
                  <strong>
                    {item.type[0].toUpperCase() + item.type.slice(1)}
                  </strong>
                  <small>
                    {item.count} {item.count === 1 ? "avaliação" : "avaliações"}
                  </small>
                </div>
                <b>{item.count ? scoreLabel(item.average) : "—"}</b>
              </div>
            ))}
          </div>
        </article>
      </div>
      <article className="management-panel recent-panel">
        <div className="management-panel-heading">
          <div>
            <h2>Registros recentes</h2>
            <p>Últimas avaliações salvas</p>
          </div>
        </div>
        {data.recent.length ? (
          <div className="recent-list">
            {data.recent.map((evaluation) => (
              <div key={evaluation.id}>
                <span className="student-avatar">
                  {initials(evaluation.athlete)}
                </span>
                <div className="recent-main">
                  <strong>{evaluation.athlete}</strong>
                  <small>
                    {evaluation.belt} · {evaluation.type} · {formatDate(evaluation.createdAt, true)}
                  </small>
                  {user.role === "super_admin" && (
                    <em>
                      Avaliador: {evaluation.evaluatorName} · {evaluation.evaluatorRank || "graduação não informada"}
                    </em>
                  )}
                </div>
                <b>{scoreLabel(evaluation.score)}</b>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ClipboardCheck size={27} />}
            title="Nenhuma avaliação registrada"
            detail="Conclua um exame técnico ou de kata para alimentar este painel."
          />
        )}
      </article>
    </div>
  );
}

type StudentsViewProps = {
  students: StudentRecord[];
  loading: boolean;
  user: AuthUser;
  users: ManagedUser[];
  evaluatorId: string;
  setEvaluatorId: (value: string) => void;
  reload: () => Promise<void>;
};

export function StudentsView({
  students,
  loading,
  user,
  users,
  evaluatorId,
  setEvaluatorId,
  reload,
}: StudentsViewProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportEvaluationId, setReportEvaluationId] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [savingStudent, setSavingStudent] = useState(false);
  const filtered = students.filter((student) =>
    student.name
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  const selected = students.find((student) => student.id === selectedId);

  const registerStudent = async () => {
    setSavingStudent(true);
    setRegisterError("");
    setRegisterSuccess("");
    try {
      await apiRequest("/api/students", {
        method: "POST",
        body: JSON.stringify({ name: studentName }),
      });
      setRegisterSuccess(
        `${studentName.trim()} foi cadastrado e já está disponível nos exames.`,
      );
      setStudentName("");
      await reload();
    } catch (caught) {
      setRegisterError(
        caught instanceof Error ? caught.message : "Não foi possível cadastrar o judoca.",
      );
    } finally {
      setSavingStudent(false);
    }
  };
  if (loading) return <LoadingBlock label="Reunindo históricos…" />;
  return (
    <div className="management-page">
      <header className="management-page-heading">
        <div>
          <h1>Alunos e evolução</h1>
          <p>
            Cada aluno aparece com o histórico das avaliações que você pode acessar.
          </p>
        </div>
        <button
          className="management-primary"
          onClick={() => {
            setRegistering((current) => !current);
            setRegisterError("");
            setRegisterSuccess("");
          }}
          aria-expanded={registering}
        >
          <Plus size={17} /> {registering ? "Fechar cadastro" : "Cadastrar judoca"}
        </button>
      </header>
      {registering && (
        <section className="student-registration" aria-label="Cadastrar judoca">
          <div>
            <h2>Cadastro prévio</h2>
            <p>O judoca ficará disponível para todos os avaliadores.</p>
          </div>
          <label>
            Nome completo
            <input
              value={studentName}
              onChange={(event) => setStudentName(event.target.value)}
              placeholder="Nome do judoca"
              autoComplete="off"
            />
          </label>
          {registerError && <p className="management-error">{registerError}</p>}
          {registerSuccess && <p className="management-success">{registerSuccess}</p>}
          <button
            className="management-primary"
            disabled={savingStudent || studentName.trim().length < 3}
            onClick={() => void registerStudent()}
          >
            {savingStudent ? "Cadastrando…" : "Cadastrar judoca"}
          </button>
        </section>
      )}
      <div className="student-tools">
        <label className="management-search">
          <Search size={18} />
          <input
            aria-label="Buscar aluno"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome"
          />
        </label>
        {user.role === "super_admin" && (
          <label className="evaluator-filter compact">
            Avaliador
            <select
              value={evaluatorId}
              onChange={(event) => setEvaluatorId(event.target.value)}
            >
              <option value="">Todos</option>
              {users
                .filter(
                  (item) =>
                    item.role === "evaluator" && item.status !== "invited",
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
            <ChevronDown size={17} />
          </label>
        )}
      </div>
      {!filtered.length ? (
        <EmptyState
          icon={<Users size={29} />}
          title={search ? "Nenhum aluno encontrado" : "Sua lista ainda está vazia"}
          detail={
            search
              ? "Tente buscar por outro nome."
              : user.role === "super_admin"
                ? "Cadastre um judoca previamente para iniciar a lista."
                : "Os judocas avaliados por você aparecerão aqui. Cadastros novos ficam disponíveis na tela do exame."
          }
        />
      ) : (
        <div className="students-layout">
          <div className="student-list">
            {filtered.map((student) => (
              <button
                key={student.id}
                className={selectedId === student.id ? "selected" : ""}
                onClick={() => {
                  setSelectedId(student.id);
                  setReportEvaluationId(null);
                }}
              >
                <span className="student-avatar">{initials(student.name)}</span>
                <div>
                  <strong>{student.name}</strong>
                  <small>
                    {student.evaluations.length
                      ? `${student.evaluations.length} ${student.evaluations.length === 1 ? "avaliação" : "avaliações"} · última em ${formatDate(student.lastEvaluationAt || "")}`
                      : "Cadastrado · aguardando primeira avaliação"}
                  </small>
                </div>
                {student.evaluations.length ? (
                  <span
                    className={`evolution-chip ${student.evolution > 0 ? "up" : student.evolution < 0 ? "down" : "stable"}`}
                    aria-label={
                      student.evaluations.length > 1
                        ? `Evolução de ${scoreLabel(student.evolution)}`
                        : `Nota ${scoreLabel(student.latestScore)}`
                    }
                  >
                    {student.evaluations.length > 1 && student.evolution > 0 ? (
                      <ArrowUpRight size={15} />
                    ) : student.evaluations.length > 1 && student.evolution < 0 ? (
                      <ArrowDownRight size={15} />
                    ) : null}
                    {student.evaluations.length > 1 && student.evolution > 0 ? "+" : ""}
                    {scoreLabel(
                      student.evaluations.length > 1
                        ? Math.abs(student.evolution)
                        : student.latestScore,
                    )}
                  </span>
                ) : <span className="student-unscored">Sem nota</span>}
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
          <aside
            className={`student-detail${selected ? " open" : ""}`}
            aria-live="polite"
          >
            {selected ? (
              <>
                <button
                  className="student-detail-close"
                  onClick={() => setSelectedId(null)}
                  aria-label="Fechar histórico"
                >
                  <X size={19} />
                </button>
                <div className="student-detail-head">
                  <span className="student-avatar large">
                    {initials(selected.name)}
                  </span>
                  <div>
                    <h2>{selected.name}</h2>
                    <p>
                      {selected.evaluations.length
                        ? `Média ${scoreLabel(selected.average)} · última nota ${scoreLabel(selected.latestScore)}`
                        : "Cadastro pronto para a primeira avaliação"}
                    </p>
                  </div>
                </div>
                {selected.evaluations.length ? <div
                  className="student-progress"
                  aria-label="Evolução das notas"
                >
                  {selected.evaluations.map((evaluation, index) => (
                    <div key={evaluation.id}>
                      <span style={{ height: `${Math.max(8, evaluation.score)}%` }} />
                      <b>{scoreLabel(evaluation.score)}</b>
                      <small>{index + 1}º</small>
                    </div>
                  ))}
                </div> : <EmptyState icon={<ClipboardCheck size={27} />} title="Ainda sem avaliações" detail="O histórico será iniciado quando este judoca concluir um exame." />}
                {selected.evaluations.length > 0 && <div className="student-history">
                  {[...selected.evaluations].reverse().map((evaluation) => {
                    const reportOpen = reportEvaluationId === evaluation.id;
                    return <article key={evaluation.id} className={reportOpen ? "report-open" : ""}>
                      <i />
                      <button
                        className="student-history-summary"
                        onClick={() => setReportEvaluationId(reportOpen ? null : evaluation.id)}
                        aria-expanded={reportOpen}
                      >
                        <span>
                          <strong>{evaluation.belt}</strong>
                          <span>{evaluation.type} · {formatDate(evaluation.createdAt)}</span>
                          <small>
                            {evaluation.evaluatorName} · {evaluation.evaluatorRank || "graduação não informada"}
                          </small>
                        </span>
                        <b>{scoreLabel(evaluation.score)}</b>
                        <ChevronDown size={17} />
                      </button>
                      {reportOpen && <EvaluationReport evaluation={evaluation} />}
                    </article>;
                  })}
                </div>}
              </>
            ) : (
              <EmptyState
                icon={<CircleUserRound size={29} />}
                title="Escolha um aluno"
                detail="O histórico completo e a curva de evolução aparecerão aqui."
              />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
