"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpenCheck,
  Check,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  ClipboardCheck,
  FilePlus2,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { AuthUser, DashboardData, ExamMatrix, ManagedUser, StudentRecord } from "@/lib/platform";

const LOGO =
  "https://media.base44.com/images/public/6a9b8ceb32f349c5600d2fdc/ecc432c62_41508.png/v1/fit/w_176,h_176,q_90,usm_0.66_1.00_0.01,enc_webp,quality_auto/ecc432c62_41508.webp";
type AdminSection = "overview" | "students" | "matrices" | "team";
type MatrixCategoryDraft = {
  id: string;
  name: string;
  techniques: string;
};

const categoryNames = [
  "Nage Waza",
  "Renraku-Henka Waza",
  "Kaeshi Waza",
  "Osaekomi Waza",
  "Shime Waza",
  "Kansetsu Waza",
];
const emptyDashboard: DashboardData = {
  summary: { evaluations: 0, students: 0, average: 0, approvalRate: 0 },
  months: [],
  byType: [],
  recent: [],
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value: string, withTime = false) {
  if (!value) return "—";
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  const options: Intl.DateTimeFormatOptions = withTime
    ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short", year: "numeric" };

  return new Intl.DateTimeFormat("pt-BR", options).format(date);
}

function scoreLabel(score: number) {
  return (score / 10).toFixed(1);
}

function LoadingBlock({ label = "Carregando dados…" }: { label?: string }) {
  return <div className="management-loading" role="status"><span /><p>{label}</p></div>;
}

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  detail: string;
  action?: ReactNode;
};

function EmptyState({ icon, title, detail, action }: EmptyStateProps) {
  return <div className="management-empty"><span>{icon}</span><h3>{title}</h3><p>{detail}</p>{action}</div>;
}

type MetricProps = {
  icon: ReactNode;
  value: string;
  label: string;
  note: string;
};

function Metric({ icon, value, label, note }: MetricProps) {
  return <article className="management-metric"><span>{icon}</span><div><strong>{value}</strong><p>{label}</p><small>{note}</small></div></article>;
}

function Overview({ data, loading, user, users, evaluatorId, setEvaluatorId }: { data: DashboardData; loading: boolean; user: AuthUser; users: ManagedUser[]; evaluatorId: string; setEvaluatorId: (value: string) => void }) {
  const maxCount = Math.max(1, ...data.months.map((month) => month.count));
  if (loading) return <LoadingBlock />;
  return <div className="management-page">
    <header className="management-page-heading">
      <div><h1>{user.role === "super_admin" ? "Visão da associação" : "Sua turma em perspectiva"}</h1><p>{user.role === "super_admin" ? "Compare avaliadores, alunos e resultados registrados." : "Acompanhe os alunos avaliados por você e identifique quem precisa de atenção."}</p></div>
      {user.role === "super_admin" && <label className="evaluator-filter">Exibir dados de<select value={evaluatorId} onChange={(event) => setEvaluatorId(event.target.value)}><option value="">Todos os avaliadores</option>{users.filter((item) => item.role === "evaluator" && item.status !== "invited").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={17} /></label>}
    </header>
    <section className="management-metrics" aria-label="Resumo de desempenho">
      <Metric icon={<ClipboardCheck size={21} />} value={String(data.summary.evaluations)} label="Avaliações registradas" note="no histórico disponível" />
      <Metric icon={<Users size={21} />} value={String(data.summary.students)} label="Alunos acompanhados" note="com ao menos um exame" />
      <Metric icon={<BarChart3 size={21} />} value={scoreLabel(data.summary.average)} label="Média geral" note="entre técnica, teoria e kata" />
      <Metric icon={<Award size={21} />} value={`${data.summary.approvalRate}%`} label="Aprovação" note="não considera avaliações de kata" />
    </section>
    <div className="management-overview-grid">
      <article className="management-panel evolution-panel">
        <div className="management-panel-heading"><div><h2>Ritmo de avaliações</h2><p>Volume e média dos últimos seis meses</p></div><Activity size={21} /></div>
        {data.months.some((month) => month.count) ? <div className="month-chart" aria-label="Avaliações por mês">
          {data.months.map((month) => <div key={month.key} className="month-column"><div className="month-score">{month.average ? scoreLabel(month.average) : "—"}</div><div className="month-bar-track"><i style={{ height: `${Math.max(8, (month.count / maxCount) * 100)}%` }} /></div><strong>{month.label}</strong><span>{month.count}</span></div>)}
        </div> : <EmptyState icon={<BarChart3 size={27} />} title="A evolução começa no primeiro exame" detail="As avaliações concluídas aparecerão aqui mês a mês." />}
      </article>
      <article className="management-panel type-panel">
        <div className="management-panel-heading"><div><h2>Por modalidade</h2><p>Distribuição dos registros</p></div></div>
        <div className="type-breakdown">{data.byType.map((item) => <div key={item.type}><span className={`type-symbol ${item.type}`}><BookOpenCheck size={18} /></span><div><strong>{item.type[0].toUpperCase() + item.type.slice(1)}</strong><small>{item.count} {item.count === 1 ? "avaliação" : "avaliações"}</small></div><b>{item.count ? scoreLabel(item.average) : "—"}</b></div>)}</div>
      </article>
    </div>
    <article className="management-panel recent-panel">
      <div className="management-panel-heading"><div><h2>Registros recentes</h2><p>Últimas avaliações salvas</p></div></div>
      {data.recent.length ? <div className="recent-list">{data.recent.map((evaluation) => <div key={evaluation.id}><span className="student-avatar">{initials(evaluation.athlete)}</span><div className="recent-main"><strong>{evaluation.athlete}</strong><small>{evaluation.belt} · {evaluation.type} · {formatDate(evaluation.createdAt, true)}</small>{user.role === "super_admin" && <em>Avaliador: {evaluation.evaluatorName}</em>}</div><b>{scoreLabel(evaluation.score)}</b></div>)}</div> : <EmptyState icon={<ClipboardCheck size={27} />} title="Nenhuma avaliação registrada" detail="Conclua um exame técnico ou de kata para alimentar este painel." />}
    </article>
  </div>;
}

function StudentsView({ students, loading, user, users, evaluatorId, setEvaluatorId }: { students: StudentRecord[]; loading: boolean; user: AuthUser; users: ManagedUser[]; evaluatorId: string; setEvaluatorId: (value: string) => void }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = students.filter((student) => student.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const selected = students.find((student) => student.id === selectedId);
  if (loading) return <LoadingBlock label="Reunindo históricos…" />;
  return <div className="management-page">
    <header className="management-page-heading"><div><h1>Alunos e evolução</h1><p>Cada aluno aparece com o histórico das avaliações que você pode acessar.</p></div></header>
    <div className="student-tools"><label className="management-search"><Search size={18} /><input aria-label="Buscar aluno" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome" /></label>{user.role === "super_admin" && <label className="evaluator-filter compact">Avaliador<select value={evaluatorId} onChange={(event) => setEvaluatorId(event.target.value)}><option value="">Todos</option>{users.filter((item) => item.role === "evaluator" && item.status !== "invited").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={17} /></label>}</div>
    {!filtered.length ? <EmptyState icon={<Users size={29} />} title={search ? "Nenhum aluno encontrado" : "Sua lista ainda está vazia"} detail={search ? "Tente buscar por outro nome." : "O aluno entra automaticamente na lista quando uma avaliação é concluída."} /> : <div className="students-layout">
      <div className="student-list">{filtered.map((student) => <button key={student.id} className={selectedId === student.id ? "selected" : ""} onClick={() => setSelectedId(student.id)}><span className="student-avatar">{initials(student.name)}</span><div><strong>{student.name}</strong><small>{student.evaluations.length} {student.evaluations.length === 1 ? "avaliação" : "avaliações"} · última em {formatDate(student.lastEvaluationAt)}</small></div><span className={`evolution-chip ${student.evolution > 0 ? "up" : student.evolution < 0 ? "down" : "stable"}`}>{student.evolution > 0 ? <ArrowUpRight size={15} /> : student.evolution < 0 ? <ArrowDownRight size={15} /> : null}{student.evolution > 0 ? "+" : ""}{scoreLabel(Math.abs(student.evolution))}</span><ChevronRight size={18} /></button>)}</div>
      <aside className={`student-detail${selected ? " open" : ""}`} aria-live="polite">
        {selected ? <><button className="student-detail-close" onClick={() => setSelectedId(null)} aria-label="Fechar histórico"><X size={19} /></button><div className="student-detail-head"><span className="student-avatar large">{initials(selected.name)}</span><div><h2>{selected.name}</h2><p>Média {scoreLabel(selected.average)} · última nota {scoreLabel(selected.latestScore)}</p></div></div>
          <div className="student-progress" aria-label="Evolução das notas">{selected.evaluations.map((evaluation, index) => <div key={evaluation.id}><span style={{ height: `${Math.max(8, evaluation.score)}%` }} /><b>{scoreLabel(evaluation.score)}</b><small>{index + 1}º</small></div>)}</div>
          <div className="student-history">{[...selected.evaluations].reverse().map((evaluation) => <article key={evaluation.id}><i /><div><strong>{evaluation.belt}</strong><span>{evaluation.type} · {formatDate(evaluation.createdAt)}</span><small>{evaluation.evaluatorName}</small></div><b>{scoreLabel(evaluation.score)}</b></article>)}</div>
        </> : <EmptyState icon={<CircleUserRound size={29} />} title="Escolha um aluno" detail="O histórico completo e a curva de evolução aparecerão aqui." />}
      </aside>
    </div>}
  </div>;
}

function MatrixForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hasKata, setHasKata] = useState(false);
  const [kataType, setKataType] = useState("nage-no-kata-partial");
  const [minimumScore, setMinimumScore] = useState(7);
  const [maxBelowFive, setMaxBelowFive] = useState(1);
  const [categories, setCategories] = useState<MatrixCategoryDraft[]>(categoryNames.map((category) => ({ id: crypto.randomUUID(), name: category, techniques: "" })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const updateCategory = (id: string, field: "name" | "techniques", value: string) => setCategories((current) => current.map((category) => category.id === id ? { ...category, [field]: value } : category));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      await apiRequest("/api/matrices", { method: "POST", body: JSON.stringify({ name, description, hasKata, kataType: hasKata ? kataType : null, minimumScore, maxCategoriesBelowFive: maxBelowFive, status: "active", categories: categories.map((category) => ({ name: category.name, techniques: category.techniques.split("\n").map((item) => item.trim()).filter(Boolean) })) }) });
      onCreated();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível criar a matriz."); }
    finally { setBusy(false); }
  };
  return <form className="matrix-editor" onSubmit={submit}>
    <header><button type="button" onClick={onCancel}><ArrowLeft size={18} /> Voltar</button><div><h2>Nova matriz de avaliação</h2><p>Defina o conteúdo cobrado e as regras de aprovação.</p></div></header>
    <section className="matrix-editor-section"><h3>Identificação</h3><div className="matrix-fields"><label>Nome da matriz<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Exame faixa verde 2027" /></label><label>Descrição<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Contexto ou orientações para os avaliadores" /></label></div></section>
    <section className="matrix-editor-section"><h3>Regras do exame</h3><div className="rule-grid"><label className="toggle-rule"><input type="checkbox" checked={hasKata} onChange={(event) => setHasKata(event.target.checked)} /><span><b><Activity size={18} /> Incluir kata</b><small>Adiciona a apresentação do kata à matriz.</small></span></label>{hasKata && <label>Qual kata?<select value={kataType} onChange={(event) => setKataType(event.target.value)}><option value="nage-no-kata-partial">Nage-no-Kata parcial</option><option value="nage-no-kata-complete">Nage-no-Kata completo</option><option value="katame-no-kata">Katame-no-Kata</option></select></label>}<label>Nota mínima para aprovação<input type="number" min="0" max="10" step="0.1" required value={minimumScore} onChange={(event) => setMinimumScore(Number(event.target.value))} /><small>Escala de 0 a 10.</small></label><label>Máximo de categorias abaixo de 5<input type="number" min="0" max="10" required value={maxBelowFive} onChange={(event) => setMaxBelowFive(Number(event.target.value))} /><small>Acima desse total, o aluno é reprovado.</small></label></div></section>
    <section className="matrix-editor-section"><div className="matrix-section-title"><div><h3>Categorias e técnicas</h3><p>Escreva uma técnica ou sequência por linha.</p></div><button type="button" onClick={() => setCategories((current) => [...current, { id: crypto.randomUUID(), name: "Nova categoria", techniques: "" }])}><Plus size={17} /> Categoria</button></div><div className="category-editor-list">{categories.map((category, index) => <article key={category.id}><span>{index + 1}</span><div><label>Categoria<input required value={category.name} onChange={(event) => updateCategory(category.id, "name", event.target.value)} /></label><label>Técnicas<textarea required value={category.techniques} onChange={(event) => updateCategory(category.id, "techniques", event.target.value)} placeholder={"O-soto-gari\nIppon-seoi-nage\nDe-ashi-harai → O-soto-gari"} /></label></div><button type="button" onClick={() => setCategories((current) => current.filter((item) => item.id !== category.id))} disabled={categories.length === 1} aria-label={`Remover ${category.name}`}><X size={18} /></button></article>)}</div></section>
    {error && <div className="management-error" role="alert">{error}</div>}
    <footer><button type="button" className="management-secondary" onClick={onCancel}>Cancelar</button><button className="management-primary" disabled={busy}><Check size={18} /> {busy ? "Salvando…" : "Criar matriz"}</button></footer>
  </form>;
}

function MatricesView({ matrices, loading, canManage, reload }: { matrices: ExamMatrix[]; loading: boolean; canManage: boolean; reload: () => void }) {
  const [creating, setCreating] = useState(false);
  if (creating) return <MatrixForm onCancel={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />;
  if (loading) return <LoadingBlock label="Carregando matrizes…" />;
  return <div className="management-page"><header className="management-page-heading"><div><h1>Matrizes de avaliação</h1><p>Conteúdo técnico, kata e regras de aprovação reunidos em uma única definição.</p></div>{canManage && <button className="management-primary" onClick={() => setCreating(true)}><FilePlus2 size={18} /> Nova matriz</button>}</header>
    {!matrices.length ? <EmptyState icon={<BookOpenCheck size={29} />} title="Nenhuma matriz personalizada" detail={canManage ? "Crie a primeira matriz para organizar um novo exame." : "O Super Admin ainda não publicou uma matriz."} action={canManage ? <button className="management-primary" onClick={() => setCreating(true)}>Criar matriz</button> : undefined} /> : <div className="matrix-list">{matrices.map((matrix) => <article key={matrix.id}><header><div><span className={`matrix-status ${matrix.status}`}>{matrix.status === "active" ? "Ativa" : matrix.status === "draft" ? "Rascunho" : "Arquivada"}</span><h2>{matrix.name}</h2><p>{matrix.description || "Sem descrição adicional."}</p></div><BookOpenCheck size={25} /></header><div className="matrix-rules"><span><b>{matrix.minimumScore.toFixed(1)}</b> nota mínima</span><span><b>{matrix.maxCategoriesBelowFive}</b> categorias abaixo de 5</span><span><b>{matrix.hasKata ? "Sim" : "Não"}</b> kata</span></div>{matrix.hasKata && <div className="matrix-kata"><Activity size={17} /> {matrix.kataType === "nage-no-kata-partial" ? "Nage-no-Kata parcial" : matrix.kataType === "nage-no-kata-complete" ? "Nage-no-Kata completo" : "Katame-no-Kata"}</div>}<details><summary>{matrix.categories.length} categorias · {matrix.categories.reduce((sum, category) => sum + category.techniques.length, 0)} técnicas <ChevronDown size={17} /></summary><div>{matrix.categories.map((category) => <section key={category.id}><strong>{category.name}</strong><p>{category.techniques.join(" · ")}</p></section>)}</div></details><footer>Criada por {matrix.creatorName} em {formatDate(matrix.createdAt)}</footer></article>)}</div>}
  </div>;
}

function TeamView({ users, loading, currentUser, reload }: { users: ManagedUser[]; loading: boolean; currentUser: AuthUser; reload: () => void }) {
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const invite = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(""); setMessage(""); try { await apiRequest("/api/users/invite", { method: "POST", body: JSON.stringify({ email, name }) }); setName(""); setEmail(""); setMessage("E-mail autorizado. O avaliador já pode criar a conta."); reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível autorizar o e-mail."); } finally { setBusy(false); } };
  const toggleStatus = async (person: ManagedUser) => { setError(""); try { await apiRequest(`/api/users/${person.id}`, { method: "PATCH", body: JSON.stringify({ status: person.status === "disabled" ? "active" : "disabled" }) }); reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível alterar o acesso."); } };
  if (loading) return <LoadingBlock label="Carregando equipe…" />;
  return <div className="management-page"><header className="management-page-heading"><div><h1>Equipe e acessos</h1><p>Somente os e-mails autorizados aqui conseguem criar uma conta.</p></div></header>
    <div className="team-grid"><form className="invite-panel" onSubmit={invite}><span><UserPlus size={21} /></span><h2>Autorizar avaliador</h2><p>Não enviamos e-mail automaticamente. Avise o avaliador que o acesso está liberado.</p><label>Nome<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do avaliador" /></label><label>E-mail<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="avaliador@exemplo.com" /></label>{error && <div className="management-error" role="alert">{error}</div>}{message && <div className="management-success" role="status">{message}</div>}<button className="management-primary" disabled={busy}><UserPlus size={18} /> {busy ? "Autorizando…" : "Autorizar e-mail"}</button></form>
      <section className="team-list"><div className="team-list-heading"><h2>Pessoas com acesso</h2><span>{users.length}</span></div>{users.map((person) => <article key={person.id}><span className="student-avatar">{initials(person.name)}</span><div><strong>{person.name}</strong><small>{person.email}</small><p>{person.role === "super_admin" ? "Super Admin" : person.status === "invited" ? "Convite pendente" : person.status === "disabled" ? "Acesso desativado" : `${person.student_count} alunos · ${person.evaluation_count} avaliações`}</p></div><span className={`access-status ${person.status}`}>{person.status === "active" ? "Ativo" : person.status === "invited" ? "Pendente" : "Desativado"}</span>{person.id !== currentUser.id && person.role !== "super_admin" && person.status !== "invited" && <button onClick={() => toggleStatus(person)}>{person.status === "disabled" ? "Reativar" : "Desativar"}</button>}</article>)}</section>
    </div>
  </div>;
}

export function AdminPortal({ user, dark, setDark, onExit, onLogout, onOpenProfile }: { user: AuthUser; dark: boolean; setDark: (value: boolean) => void; onExit: () => void; onLogout: () => void; onOpenProfile: () => void }) {
  const [section, setSection] = useState<AdminSection>("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [matrices, setMatrices] = useState<ExamMatrix[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [evaluatorId, setEvaluatorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true); setLoadError("");
    const suffix = evaluatorId ? `?evaluator=${encodeURIComponent(evaluatorId)}` : "";
    try {
      const requests: [Promise<DashboardData>, Promise<StudentRecord[]>, Promise<ExamMatrix[]>, Promise<ManagedUser[]> | Promise<never[]>] = [apiRequest(`/api/dashboard${suffix}`), apiRequest(`/api/students${suffix}`), apiRequest("/api/matrices"), user.role === "super_admin" ? apiRequest("/api/users") : Promise.resolve([])];
      const [nextDashboard, nextStudents, nextMatrices, nextUsers] = await Promise.all(requests);
      setDashboard(nextDashboard); setStudents(nextStudents); setMatrices(nextMatrices); setUsers(nextUsers);
    } catch (caught) { setLoadError(caught instanceof Error ? caught.message : "Não foi possível carregar a administração."); }
    finally { setLoading(false); }
  }, [evaluatorId, user.role]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);
  const navigation = useMemo(() => [
    { id: "overview" as const, label: "Resumo", icon: <LayoutDashboard size={19} /> },
    { id: "students" as const, label: "Alunos", icon: <Users size={19} /> },
    { id: "matrices" as const, label: "Matrizes", icon: <BookOpenCheck size={19} /> },
    ...(user.role === "super_admin" ? [{ id: "team" as const, label: "Equipe", icon: <ShieldCheck size={19} /> }] : []),
  ], [user.role]);
  const chooseSection = (next: AdminSection) => { setSection(next); setMobileMenu(false); window.scrollTo({ top: 0, behavior: "auto" }); };

  return <main className={`management-shell${dark ? " dark" : ""}`}>
    <aside className={`management-sidebar${mobileMenu ? " open" : ""}`}>
      <div className="management-brand"><Image src={LOGO} alt="Associação Judô Rogério Cruz" width={58} height={58} /><div><strong>Gestão de exames</strong><span>Judô Rogério Cruz</span></div><button onClick={() => setMobileMenu(false)} aria-label="Fechar menu"><X size={19} /></button></div>
      <nav>{navigation.map((item) => <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => chooseSection(item.id)}>{item.icon}<span>{item.label}</span></button>)}</nav>
      <div className="management-sidebar-actions"><button onClick={onExit}><Home size={18} /> Aplicar avaliação</button><button onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />} {dark ? "Tema claro" : "Tema escuro"}</button></div>
      <div className="management-account"><span>{initials(user.name)}</span><button className="management-profile-button" onClick={onOpenProfile}><strong>{user.name}</strong><small>Editar perfil</small></button><button onClick={onLogout} aria-label="Sair da conta"><LogOut size={18} /></button></div>
    </aside>
    {mobileMenu && <button className="management-backdrop" onClick={() => setMobileMenu(false)} aria-label="Fechar menu" />}
    <section className="management-content">
      <header className="management-topbar"><button className="management-menu-button" onClick={() => setMobileMenu(true)} aria-label="Abrir menu"><Menu size={20} /></button><div><span>{user.role === "super_admin" ? "Super Admin" : "Área do avaliador"}</span><strong>{navigation.find((item) => item.id === section)?.label}</strong></div><button className="management-user-button" onClick={onOpenProfile} aria-label="Abrir perfil"><span>{initials(user.name)}</span><div><strong>{user.name}</strong><small>Editar perfil</small></div><Pencil size={16} /></button></header>
      {loadError ? <div className="management-page"><div className="management-error-page"><ShieldCheck size={30} /><h2>Os dados não foram carregados</h2><p>{loadError}</p><button className="management-primary" onClick={() => void loadData()}>Tentar novamente</button></div></div> : <>
        {section === "overview" && <Overview data={dashboard} loading={loading} user={user} users={users} evaluatorId={evaluatorId} setEvaluatorId={setEvaluatorId} />}
        {section === "students" && <StudentsView students={students} loading={loading} user={user} users={users} evaluatorId={evaluatorId} setEvaluatorId={setEvaluatorId} />}
        {section === "matrices" && <MatricesView matrices={matrices} loading={loading} canManage={user.role === "super_admin"} reload={() => void loadData()} />}
        {section === "team" && user.role === "super_admin" && <TeamView users={users} loading={loading} currentUser={user} reload={() => void loadData()} />}
      </>}
    </section>
    <nav className="management-bottom-nav" aria-label="Administração">{navigation.map((item) => <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => chooseSection(item.id)}>{item.icon}<span>{item.label}</span></button>)}</nav>
  </main>;
}
