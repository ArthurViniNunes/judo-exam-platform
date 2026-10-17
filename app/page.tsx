"use client";

import {
  Activity,
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Dices,
  ExternalLink,
  FileQuestion,
  Filter,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  PlayCircle,
  RotateCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Target,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import Image from "next/image";
import {
  EMPTY_KATA_MARK,
  KATAS,
  calculateKataResult,
  createKataExam,
  kataMarkDeductions,
  type KataId,
  type KataErrors,
  type KataMark,
  type KataMode,
  type KataResult,
} from "@/lib/kata-exams";
import {
  PRACTICAL_BELTS,
  SCORE_OPTIONS,
  TECHNIQUE_VIDEOS,
  beltNeedsDraw,
  createPracticalExam,
  toYouTubeEmbedUrl,
  type ExamCategory,
  type PracticalBeltId,
} from "@/lib/practical-exams";

const LOGO =
  "https://media.base44.com/images/public/6a9b8ceb32f349c5600d2fdc/ecc432c62_41508.png/v1/fit/w_176,h_176,q_90,usm_0.66_1.00_0.01,enc_webp,quality_auto/ecc432c62_41508.webp";

type View =
  | "home"
  | "theory-links"
  | "technical-setup"
  | "technical-form"
  | "technical-result"
  | "kata-setup"
  | "kata-form"
  | "kata-result"
  | "admin";

type Section =
  | "dashboard"
  | "evaluations"
  | "athletes"
  | "questions"
  | "matrices"
  | "users"
  | "settings"
  | "audit";

type Question = {
  id: number;
  belt: string;
  category: string;
  prompt: string;
  options: string[];
  answer: number;
  points: number;
  status: "Ativa" | "Rascunho";
};

type PracticalResult = {
  score: number;
  approved: boolean;
  detail: string;
  categories: { name: string; score: number }[];
};

const belts = [
  { name: "Amarela / Ponta Laranja", short: "5º Kyu", color: "#eac54f" },
  { name: "Laranja", short: "4º Kyu", color: "#ef8d32" },
  { name: "Verde", short: "3º Kyu", color: "#5c9c61" },
  { name: "Roxa", short: "2º Kyu", color: "#8563a5" },
  { name: "Marrom", short: "1º Kyu", color: "#795548" },
];

const theoreticalExams = [
  {
    name: "Amarela, ponta laranja e laranja infantil",
    detail: "Exame unificado para as três graduações",
    color: "#eac54f",
    href: "https://forms.gle/x9DQbfGksXzXkRNh8",
  },
  {
    name: "Laranja - 4º Kyu",
    detail: "Exame teórico da faixa laranja",
    color: "#ef8d32",
    href: "https://forms.gle/p5Fkw1zz1XwSPAQ28",
  },
  {
    name: "Verde - 3º Kyu",
    detail: "Exame teórico da faixa verde",
    color: "#5c9c61",
    href: "https://forms.gle/51cCW7ZstVea6TDy9",
  },
  {
    name: "Roxa - 2º Kyu",
    detail: "Exame teórico da faixa roxa",
    color: "#8563a5",
    href: "https://forms.gle/HR3tLZPKPGgtJy4o6",
  },
  {
    name: "Marrom - 1º Kyu",
    detail: "Exame teórico da faixa marrom",
    color: "#795548",
    href: "https://forms.gle/N1RwZdpD6cEKZWKC6",
  },
] as const;

const seedQuestions: Question[] = [
  {
    id: 1,
    belt: "Amarela / Ponta Laranja",
    category: "História",
    prompt:
      "Qual é o termo que Jigoro Kano usava para descrever o Judô como um caminho de vida para o autoaperfeiçoamento?",
    options: ["Jutsu", "Waza", "Do", "Riai", "Budô"],
    answer: 2,
    points: 20,
    status: "Ativa",
  },
  {
    id: 2,
    belt: "Amarela / Ponta Laranja",
    category: "História",
    prompt: "Em qual tipo de local a Kodokan foi inicialmente estabelecida em 1882?",
    options: [
      "Uma casa de chá",
      "Um templo budista",
      "Um castelo",
      "Um ginásio moderno",
      "Uma escola militar",
    ],
    answer: 1,
    points: 20,
    status: "Ativa",
  },
  {
    id: 3,
    belt: "Amarela / Ponta Laranja",
    category: "Filosofia",
    prompt: "Qual é o significado da palavra Judô?",
    options: [
      "Caminho do Guerreiro",
      "Arte da Luta",
      "Caminho da Suavidade",
      "Caminho da Força",
      "Mente e Corpo",
    ],
    answer: 2,
    points: 20,
    status: "Ativa",
  },
  {
    id: 4,
    belt: "Amarela / Ponta Laranja",
    category: "Etiqueta",
    prompt: "Qual é o nome do cumprimento feito na posição em pé?",
    options: ["Zarei", "Jigotai", "Seiza", "Ritsu Rei", "Shizentai"],
    answer: 3,
    points: 20,
    status: "Ativa",
  },
  {
    id: 5,
    belt: "Amarela / Ponta Laranja",
    category: "Terminologia",
    prompt: "Qual é o termo para a prática livre de combate?",
    options: ["Kumite", "Shiai", "Budô", "Kata", "Randori"],
    answer: 4,
    points: 20,
    status: "Ativa",
  },
  {
    id: 6,
    belt: "Amarela / Ponta Laranja",
    category: "Arbitragem",
    prompt: "Qual é a pontuação máxima no Judô que encerra a luta imediatamente?",
    options: ["Shido", "Ippon", "Waza-ari", "Yuko", "Koka"],
    answer: 1,
    points: 20,
    status: "Ativa",
  },
  {
    id: 7,
    belt: "Amarela / Ponta Laranja",
    category: "Técnicas",
    prompt: "Qual das técnicas abaixo é uma técnica de mão, Te-waza?",
    options: ["Seoi-nage", "De-ashi-harai", "O-goshi", "O-soto-gari", "Uki-goshi"],
    answer: 0,
    points: 20,
    status: "Ativa",
  },
  {
    id: 8,
    belt: "Laranja",
    category: "Filosofia",
    prompt: "O que o princípio Jita Kyoei orienta o praticante a buscar?",
    options: [
      "A vitória em todas as lutas",
      "Benefício e bem-estar mútuos",
      "A força física",
      "Apenas a perfeição técnica",
    ],
    answer: 1,
    points: 20,
    status: "Ativa",
  },
  {
    id: 9,
    belt: "Verde",
    category: "Arbitragem",
    prompt: "Quantos Shidos resultam em Hansoku-make?",
    options: ["Um", "Dois", "Três", "Quatro"],
    answer: 2,
    points: 20,
    status: "Ativa",
  },
  {
    id: 10,
    belt: "Roxa",
    category: "Técnicas",
    prompt: "Qual dessas é uma técnica de chave de articulação?",
    options: ["Kesa-gatame", "Nami-juji-jime", "Ude-garami", "Kami-shiho-gatame"],
    answer: 2,
    points: 20,
    status: "Rascunho",
  },
  {
    id: 11,
    belt: "Marrom",
    category: "Técnicas",
    prompt: "Qual é a principal diferença entre Nage-waza e Katame-waza?",
    options: [
      "Ataque e defesa",
      "Projeção e controle no solo",
      "Quadril e perna",
      "Velocidade e força",
    ],
    answer: 1,
    points: 20,
    status: "Ativa",
  },
];

const recentEvaluations = [
  { athlete: "Lucas Fernandes", belt: "Laranja", type: "Técnica", score: 88, result: "Aprovado", date: "14 out, 14:32" },
  { athlete: "Marina Oliveira", belt: "Verde", type: "Teórica", score: 92, result: "Aprovada", date: "14 out, 11:08" },
  { athlete: "Rafael Souza", belt: "Amarela", type: "Técnica", score: 64, result: "Reavaliar", date: "13 out, 19:40" },
  { athlete: "Beatriz Lima", belt: "Roxa", type: "Teórica", score: 76, result: "Aprovada", date: "13 out, 18:15" },
  { athlete: "Gabriel Rocha", belt: "Marrom", type: "Técnica", score: 84, result: "Aprovado", date: "12 out, 10:22" },
];

const athletes = [
  { name: "Marina Oliveira", dojo: "Matriz", current: "Laranja", target: "Verde", progress: 92, status: "Apta" },
  { name: "Lucas Fernandes", dojo: "Aldeota", current: "Amarela", target: "Laranja", progress: 88, status: "Apto" },
  { name: "Rafael Souza", dojo: "Matriz", current: "Branca", target: "Amarela", progress: 64, status: "Reavaliar" },
  { name: "Beatriz Lima", dojo: "Parquelândia", current: "Verde", target: "Roxa", progress: 76, status: "Apta" },
  { name: "Gabriel Rocha", dojo: "Aldeota", current: "Roxa", target: "Marrom", progress: 84, status: "Apto" },
  { name: "Sofia Martins", dojo: "Matriz", current: "Branca", target: "Amarela", progress: 0, status: "Agendada" },
];

const auditRows = [
  { user: "Fábio Nunes", action: "Alterou nota mínima para aprovação", target: "Configurações", at: "14 out 2026, 15:12" },
  { user: "Paulo Victor", action: "Concluiu avaliação técnica", target: "Lucas Fernandes", at: "14 out 2026, 14:32" },
  { user: "Fábio Nunes", action: "Publicou questão 184", target: "Banco de questões", at: "14 out 2026, 10:04" },
  { user: "Sistema", action: "Resultado teórico calculado", target: "Marina Oliveira", at: "14 out 2026, 09:41" },
  { user: "Ana Costa", action: "Atualizou matriz de faixa verde", target: "Matrizes técnicas", at: "13 out 2026, 18:26" },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <Image src={LOGO} alt="Associação Judô Rogério Cruz" width={176} height={176} priority />
      {!compact && (
        <div>
          <strong>PROGRAMA DE AVALIAÇÃO</strong>
          <span>ASSOCIAÇÃO JUDÔ ROGÉRIO CRUZ</span>
        </div>
      )}
    </div>
  );
}

function ProjectCredits({ compact = false }: { compact?: boolean }) {
  return (
    <footer
      className={`project-credits${compact ? " project-credits--compact" : ""}`}
      aria-label="Créditos do projeto"
    >
      <span className="credits-heading">Créditos do projeto</span>
      <time dateTime="2026">2026</time>
      <dl>
        <div>
          <dt>Idealização</dt>
          <dd>Paulo Victor R. Alexandre</dd>
        </div>
        <div>
          <dt>Desenvolvimento</dt>
          <dd>Arthur Vinicius C. Nunes</dd>
        </div>
      </dl>
    </footer>
  );
}

function PublicMenu({
  open,
  onClose,
  dark,
  setDark,
  navigate,
}: {
  open: boolean;
  onClose: () => void;
  dark: boolean;
  setDark: (value: boolean) => void;
  navigate: (view: View) => void;
}) {
  if (!open) return null;
  return (
    <div className="menu-layer" onMouseDown={onClose}>
      <aside className="public-menu" onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button close-menu" onClick={onClose} aria-label="Fechar menu">
          <X size={19} />
        </button>
        <div className="menu-heading">
          <h2>MENU</h2>
          <p>Você está no ambiente de demonstração</p>
        </div>
        <nav>
          <button onClick={() => navigate("home")}><Home size={19} /> Início do simulado</button>
          <button onClick={() => navigate("theory-links")}><BookOpen size={19} /> Avaliação teórica</button>
          <button onClick={() => navigate("technical-setup")}><ClipboardCheck size={19} /> Avaliação técnica</button>
          <button onClick={() => navigate("kata-setup")}><Activity size={19} /> Avaliação de kata</button>
          <button onClick={() => navigate("admin")}><LayoutDashboard size={19} /> Área administrativa</button>
          <button onClick={() => setDark(!dark)}>{dark ? <Sun size={19} /> : <Moon size={19} />} {dark ? "Tema claro" : "Tema escuro"}</button>
        </nav>
        <div className="menu-account">
          <span className="avatar">FN</span>
          <div><strong>Fábio Nunes</strong><small>Administrador</small></div>
          <LogOut size={18} />
        </div>
        <ProjectCredits compact />
      </aside>
    </div>
  );
}

function PublicShell({
  children,
  menuOpen,
  setMenuOpen,
  dark,
  setDark,
  navigate,
}: {
  children: React.ReactNode;
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
  dark: boolean;
  setDark: (value: boolean) => void;
  navigate: (view: View) => void;
}) {
  return (
    <main className={`public-shell ${dark ? "dark" : ""}`}>
      <button className="floating-menu" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}>
        <Menu size={19} />
      </button>
      {children}
      <PublicMenu open={menuOpen} onClose={() => setMenuOpen(false)} dark={dark} setDark={setDark} navigate={navigate} />
    </main>
  );
}

function HomeView({ navigate }: { navigate: (view: View) => void }) {
  return (
    <section className="hero-screen">
      <div className="hero-content">
        <Brand />
        <h1>O QUE DESEJA ACESSAR?</h1>
        <div className="choice-grid">
          <button onClick={() => navigate("theory-links")}>
            <BookOpen size={32} />
            <span>AVALIAÇÃO TEÓRICA</span>
            <small>História, filosofia e regras</small>
          </button>
          <button onClick={() => navigate("technical-setup")}>
            <Award size={34} />
            <span>AVALIAÇÃO TÉCNICA</span>
            <small>Fundamentos, técnicas e suas aplicações</small>
          </button>
          <button onClick={() => navigate("kata-setup")}>
            <Activity size={34} />
            <span>AVALIAÇÃO DE KATA</span>
            <small>Nage-no-Kata e Katame-no-Kata</small>
          </button>
          <button onClick={() => navigate("admin")}>
            <LayoutDashboard size={32} />
            <span>ADMINISTRAÇÃO</span>
            <small>Gestão de avaliações e usuários</small>
          </button>
        </div>
        <ProjectCredits />
      </div>
    </section>
  );
}

function TheoryLinksView({ onBack }: { onBack: () => void }) {
  return (
    <section className="modal-screen">
      <div className="public-card belt-card theory-link-card">
        <span className="eyebrow">EXAME TEÓRICO</span>
        <h2>Escolha sua graduação</h2>
        <p className="theory-intro">O exame será aberto no formulário oficial da associação, em uma nova aba.</p>
        <div className="belt-list">
          {theoreticalExams.map((exam) => (
            <a key={exam.href} href={exam.href} target="_blank" rel="noopener noreferrer">
              <i style={{ background: exam.color }} />
              <span><strong>{exam.name}</strong><small>{exam.detail}</small></span>
              <ExternalLink size={18} />
            </a>
          ))}
        </div>
        <button className="outline-wide" onClick={onBack}>VOLTAR</button>
      </div>
    </section>
  );
}

function TechniqueVideoDialog({ technique, onClose }: { technique: string; onClose: () => void }) {
  const videoUrl = TECHNIQUE_VIDEOS[technique] ?? "";
  const embedUrl = toYouTubeEmbedUrl(videoUrl);

  return (
    <div className="dialog-layer video-layer" onMouseDown={onClose}>
      <div className="dialog video-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="video-title">
        <button className="dialog-close" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        <span className="eyebrow">REFERÊNCIA DA TÉCNICA</span>
        <h2 id="video-title">{technique}</h2>
        {embedUrl ? (
          <div className="video-frame"><iframe src={embedUrl} title={`Vídeo de ${technique}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
        ) : (
          <div className="video-empty"><PlayCircle size={38} /><strong>Vídeo ainda não cadastrado</strong><p>Adicione o link desta técnica em <code>lib/practical-exams.ts</code>, no objeto <code>TECHNIQUE_VIDEOS</code>.</p></div>
        )}
      </div>
    </div>
  );
}

function TechnicalResultView({
  result,
  athlete,
  navigate,
}: {
  result: PracticalResult;
  athlete: string;
  navigate: (view: View) => void;
}) {
  return (
    <section className="modal-screen">
      <div className="public-card result-card">
        <div className={`result-icon ${result.approved ? "pass" : "review"}`}>
          {result.approved ? <CheckCircle2 size={42} /> : <Target size={42} />}
        </div>
        <span className="eyebrow">AVALIAÇÃO TÉCNICA CONCLUÍDA</span>
        <h2>{result.approved ? "RESULTADO APROVADO" : "REEXAME NECESSÁRIO"}</h2>
        <p className="muted">{athlete}</p>
        <div className="score-ring" style={{ "--score": `${result.score * 36}deg` } as React.CSSProperties}>
          <div><strong>{result.score.toFixed(1)}</strong><span>NOTA GERAL</span></div>
        </div>
        <p className="result-detail">{result.detail}</p>
        <div className="category-results">
          {result.categories.map((category) => (
            <div key={category.name}>
              <span>{category.name}</span>
              <strong className={category.score < 5 ? "critical" : category.score < 7 ? "review" : "pass"}>
                {category.score.toFixed(1)}
              </strong>
            </div>
          ))}
        </div>
        <div className="result-grid">
          <div><span>Nota mínima</span><strong>7,0</strong></div>
          <div><span>Situação</span><strong>{result.approved ? "Aprovado" : "Reexame"}</strong></div>
        </div>
        <button className="primary wide" onClick={() => navigate("home")}>VOLTAR AO INÍCIO</button>
      </div>
    </section>
  );
}

function TechnicalSetup({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: (athlete: string, belt: PracticalBeltId) => void;
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
          <input value="Fábio Nunes" disabled />
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

function TechnicalForm({
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

    const categories = exam.map((category) => {
      const values = category.techniques.map((technique) => scores[technique.id]);
      return { name: category.name, score: values.reduce((sum, value) => sum + value, 0) / values.length };
    });
    const values = Object.values(scores);
    const rawScore = values.reduce((sum, value) => sum + value, 0) / values.length;
    const belowSeven = categories.filter((category) => category.score < 7);
    const belowFive = categories.filter((category) => category.score < 5);
    const approved = rawScore >= 7 && belowSeven.length < 3 && belowFive.length < 2;
    const reasons: string[] = [];
    if (rawScore < 7) reasons.push("A nota geral ficou abaixo de 7,0.");
    if (belowSeven.length >= 3) reasons.push(`${belowSeven.length} categorias ficaram abaixo de 7,0.`);
    if (belowFive.length >= 2) reasons.push(`${belowFive.length} categorias ficaram abaixo de 5,0.`);

    onFinish({
      score: Math.round(rawScore * 10) / 10,
      approved,
      categories,
      detail: approved ? "O atleta atingiu os critérios de aprovação da avaliação prática." : reasons.join(" "),
    });
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
            </button>
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
                    <button className="video-help" onClick={() => setVideoTechnique(technique.name)} aria-label={`Ver vídeo de ${technique.name}`} title="Ver vídeo da técnica">
                      <CircleHelp size={20} />
                    </button>
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

function KataSetup({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: (athlete: string, kataId: KataId, mode: KataMode) => void;
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
          <input value="Fábio Nunes" disabled />
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

function KataForm({
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
              return (
                <article key={technique.id} className={`technique-card ${mark.reviewed ? "scored" : ""} ${isOpen ? "open" : ""}`}>
                  <div className={`technique-card-head ${technique.videoTechnique ? "" : "without-video"}`}>
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
                    {technique.videoTechnique && (
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

function KataResultView({ result, athlete: athleteName, kataId, mode, navigate }: { result: KataResult; athlete: string; kataId: KataId; mode: KataMode; navigate: (view: View) => void }) {
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

const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Visão geral", icon: <LayoutDashboard size={19} /> },
  { id: "evaluations", label: "Avaliações", icon: <ClipboardCheck size={19} /> },
  { id: "athletes", label: "Atletas", icon: <Users size={19} /> },
  { id: "questions", label: "Banco de questões", icon: <FileQuestion size={19} /> },
  { id: "matrices", label: "Matrizes técnicas", icon: <SlidersHorizontal size={19} /> },
  { id: "users", label: "Usuários e perfis", icon: <UserCheck size={19} /> },
];

function AdminSidebar({ section, setSection, exit }: { section: Section; setSection: (s: Section) => void; exit: () => void }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand"><Image src={LOGO} alt="Associação Judô Rogério Cruz" width={176} height={176} /><div><strong>EXAMES DE FAIXA</strong><span>GESTÃO DO PROGRAMA</span></div></div>
      <nav>
        <span>OPERAÇÃO</span>
        {navItems.map((item) => <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => setSection(item.id)}>{item.icon}{item.label}</button>)}
        <span>ADMINISTRAÇÃO</span>
        <button className={section === "settings" ? "active" : ""} onClick={() => setSection("settings")}><Settings size={19} />Configurações</button>
        <button className={section === "audit" ? "active" : ""} onClick={() => setSection("audit")}><ShieldCheck size={19} />Trilha de auditoria</button>
      </nav>
      <button className="back-public" onClick={exit}><Home size={18} />Voltar ao site</button>
      <div className="sidebar-account"><span className="avatar">FN</span><div><strong>Fábio Nunes</strong><small>Administrador</small></div><MoreHorizontal size={18} /></div>
    </aside>
  );
}

function MetricCard({ label, value, change, icon, accent }: { label: string; value: string; change: string; icon: React.ReactNode; accent: string }) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span style={{ background: accent }}>{icon}</span><b>{change}</b></div>
      <strong>{value}</strong><p>{label}</p>
    </article>
  );
}

function Dashboard() {
  return (
    <>
      <div className="metrics-grid">
        <MetricCard label="Avaliações no mês" value="48" change="+18%" icon={<ClipboardCheck size={21} />} accent="#e8f1e3" />
        <MetricCard label="Taxa de aprovação" value="81%" change="+6,2%" icon={<Award size={21} />} accent="#fff2cb" />
        <MetricCard label="Atletas ativos" value="126" change="+12" icon={<Users size={21} />} accent="#e8edf7" />
        <MetricCard label="Pendências" value="7" change="2 críticas" icon={<Clock3 size={21} />} accent="#f8e5df" />
      </div>
      <div className="dashboard-grid">
        <article className="panel performance-panel">
          <div className="panel-heading"><div><span>DESEMPENHO</span><h2>Aprovação por graduação</h2></div><button>Últimos 6 meses <ChevronRight size={15} /></button></div>
          <div className="belt-performance">
            {[78, 86, 74, 82, 69].map((value, index) => (
              <div key={belts[index].name}><span>{belts[index].name.split(" /")[0]}</span><div><i style={{ width: `${value}%`, background: belts[index].color }} /></div><strong>{value}%</strong></div>
            ))}
          </div>
        </article>
        <article className="panel agenda-panel">
          <div className="panel-heading"><div><span>AGENDA</span><h2>Próximas avaliações</h2></div><button><Plus size={16} /> Nova</button></div>
          <div className="agenda-item"><b>18</b><div><strong>Exame coletivo</strong><span>Sábado | 09:00</span></div><em>12 atletas</em></div>
          <div className="agenda-item"><b>22</b><div><strong>Turma infantil</strong><span>Quarta | 18:30</span></div><em>8 atletas</em></div>
          <div className="agenda-item"><b>26</b><div><strong>Faixas avançadas</strong><span>Domingo | 08:00</span></div><em>5 atletas</em></div>
        </article>
      </div>
      <article className="panel table-panel">
        <div className="panel-heading"><div><span>ATIVIDADE RECENTE</span><h2>Últimas avaliações</h2></div><button>Ver todas <ChevronRight size={15} /></button></div>
        <EvaluationTable rows={recentEvaluations} />
      </article>
    </>
  );
}

function EvaluationTable({ rows }: { rows: typeof recentEvaluations }) {
  return (
    <div className="responsive-table"><table><thead><tr><th>ATLETA</th><th>GRADUAÇÃO</th><th>TIPO</th><th>NOTA</th><th>RESULTADO</th><th>DATA</th><th /></tr></thead>
      <tbody>{rows.map((row) => <tr key={`${row.athlete}-${row.date}`}><td><span className="person-dot">{row.athlete.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span><strong>{row.athlete}</strong></td><td>{row.belt}</td><td><span className="soft-tag">{row.type}</span></td><td><b>{row.score}%</b></td><td><span className={row.score >= 70 ? "status pass" : "status review"}>{row.result}</span></td><td>{row.date}</td><td><MoreHorizontal size={18} /></td></tr>)}</tbody>
    </table></div>
  );
}

function PageToolbar({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-toolbar"><div><span>GESTÃO</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

function EvaluationsSection() {
  const [filter, setFilter] = useState("Todas");
  const rows = filter === "Todas" ? recentEvaluations : recentEvaluations.filter((r) => r.type === filter);
  return <><PageToolbar title="Avaliações" subtitle="Acompanhe exames, resultados e pendências." action={<button className="primary"><Plus size={17} /> NOVA AVALIAÇÃO</button>} />
    <div className="filter-bar"><div className="search-box"><Search size={18} /><input placeholder="Buscar atleta ou graduação" /></div><div className="segmented">{["Todas", "Teórica", "Técnica"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><button className="filter-button"><Filter size={17} /> Mais filtros</button></div>
    <article className="panel table-panel"><EvaluationTable rows={rows} /></article></>;
}

function AthletesSection() {
  const [query, setQuery] = useState("");
  const rows = athletes.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  return <><PageToolbar title="Atletas" subtitle="Cadastro, elegibilidade e histórico de graduação." action={<button className="primary"><Plus size={17} /> CADASTRAR ATLETA</button>} />
    <div className="filter-bar"><div className="search-box"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome" /></div><button className="filter-button"><Filter size={17} /> Faixa, dojo e situação</button></div>
    <article className="panel table-panel"><div className="responsive-table"><table><thead><tr><th>ATLETA</th><th>DOJO</th><th>FAIXA ATUAL</th><th>PRETENDIDA</th><th>ÚLTIMO RESULTADO</th><th>SITUAÇÃO</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.name}><td><span className="person-dot">{row.name.split(" ").map(n => n[0]).slice(0,2).join("")}</span><strong>{row.name}</strong></td><td>{row.dojo}</td><td>{row.current}</td><td>{row.target}</td><td><div className="mini-progress"><i style={{ width: `${row.progress}%` }} /></div>{row.progress ? `${row.progress}%` : "Sem avaliação"}</td><td><span className={row.progress >= 70 ? "status pass" : row.progress ? "status review" : "status neutral"}>{row.status}</span></td><td><MoreHorizontal size={18} /></td></tr>)}</tbody></table></div></article></>;
}

function QuestionModal({ close, save }: { close: () => void; save: (question: Question) => void }) {
  const [prompt, setPrompt] = useState("");
  const [belt, setBelt] = useState(belts[0].name);
  const [category, setCategory] = useState("História");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [answer, setAnswer] = useState(0);
  return <div className="dialog-layer" onMouseDown={close}><div className="dialog" onMouseDown={(e) => e.stopPropagation()}><button className="dialog-close" onClick={close}><X size={18} /></button><span className="eyebrow">BANCO DE QUESTÕES</span><h2>Nova questão</h2><p className="muted">Crie a pergunta, defina a graduação e indique a resposta correta.</p>
    <div className="two-columns"><label>GRADUAÇÃO<select value={belt} onChange={(e) => setBelt(e.target.value)}>{belts.map((b) => <option key={b.name}>{b.name}</option>)}</select></label><label>CATEGORIA<select value={category} onChange={(e) => setCategory(e.target.value)}>{["História","Filosofia","Etiqueta","Terminologia","Arbitragem","Técnicas"].map(c => <option key={c}>{c}</option>)}</select></label></div>
    <label>ENUNCIADO<textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Digite a pergunta" /></label>
    <div className="answer-builder"><span>ALTERNATIVAS | MARQUE A CORRETA</span>{options.map((option, index) => <div key={index}><button className={answer === index ? "correct" : ""} onClick={() => setAnswer(index)}>{answer === index ? <Check size={15} /> : String.fromCharCode(65 + index)}</button><input value={option} onChange={(e) => { const next = [...options]; next[index] = e.target.value; setOptions(next); }} placeholder={`Alternativa ${String.fromCharCode(65 + index)}`} /></div>)}</div>
    <div className="dialog-actions"><button className="outline" onClick={close}>CANCELAR</button><button className="primary" disabled={!prompt.trim() || options.some(o => !o.trim())} onClick={() => save({id:Date.now(),belt,category,prompt,options,answer,points:20,status:"Ativa"})}>SALVAR QUESTÃO</button></div>
  </div></div>;
}

function QuestionsSection({ questions, onAdd, onDelete }: { questions: Question[]; onAdd: (question: Question) => void; onDelete: (id: number) => void }) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [beltFilter, setBeltFilter] = useState("Todas");
  const filtered = questions.filter((q) => (beltFilter === "Todas" || q.belt === beltFilter) && q.prompt.toLowerCase().includes(query.toLowerCase()));
  return <><PageToolbar title="Banco de questões" subtitle="Gerencie conteúdos, respostas e publicação por graduação." action={<button className="primary" onClick={() => setModal(true)}><Plus size={17} /> NOVA QUESTÃO</button>} />
    <div className="question-summary"><div><strong>{questions.length}</strong><span>Questões cadastradas</span></div><div><strong>{questions.filter(q=>q.status === "Ativa").length}</strong><span>Questões ativas</span></div><div><strong>6</strong><span>Categorias</span></div><div><strong>20</strong><span>Pontos por questão</span></div></div>
    <div className="filter-bar"><div className="search-box"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar pelo enunciado" /></div><select value={beltFilter} onChange={(e) => setBeltFilter(e.target.value)}><option>Todas</option>{belts.map(b => <option key={b.name}>{b.name}</option>)}</select></div>
    <article className="panel table-panel"><div className="responsive-table"><table><thead><tr><th>ID</th><th>QUESTÃO</th><th>CATEGORIA</th><th>GRADUAÇÃO</th><th>STATUS</th><th>AÇÕES</th></tr></thead><tbody>{filtered.map((q) => <tr key={q.id}><td>#{q.id}</td><td className="question-cell"><strong>{q.prompt}</strong><small>{q.options.length} alternativas | {q.points} pontos</small></td><td><span className="soft-tag">{q.category}</span></td><td>{q.belt}</td><td><span className={q.status === "Ativa" ? "status pass" : "status neutral"}>{q.status}</span></td><td className="row-actions"><button title="Editar"><Pencil size={16} /></button><button title="Excluir" onClick={() => onDelete(q.id)}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div></article>
    {modal && <QuestionModal close={() => setModal(false)} save={(question) => { onAdd(question); setModal(false); }} />}
  </>;
}

function MatricesSection() {
  return <><PageToolbar title="Matrizes técnicas" subtitle="Estruture critérios, pesos e regras para cada faixa." action={<button className="primary"><Plus size={17} /> NOVA MATRIZ</button>} />
    <div className="matrix-grid">{belts.map((belt, index) => <article className="matrix-card" key={belt.name}><header><i style={{ background: belt.color }} /><div><span>{belt.short}</span><h2>{belt.name}</h2></div><MoreHorizontal size={19} /></header><div className="matrix-stats"><div><strong>{14 + index * 2}</strong><span>critérios</span></div><div><strong>{index + 3}</strong><span>grupos</span></div><div><strong>70%</strong><span>mínimo</span></div></div><div className="matrix-progress"><span>Última revisão</span><strong>{index < 2 ? "12 out 2026" : "28 set 2026"}</strong></div><button>ABRIR MATRIZ <ChevronRight size={16} /></button></article>)}</div>
  </>;
}

function UsersSection() {
  const users = [
    ["Fábio Nunes", "diretoria@nucleo.com", "Administrador", "Ativo"],
    ["Paulo Victor", "paulo@ajrc.org", "Avaliador chefe", "Ativo"],
    ["Ana Costa", "ana@ajrc.org", "Avaliadora", "Ativo"],
    ["Carlos Mendes", "carlos@ajrc.org", "Avaliador", "Convite pendente"],
  ];
  return <><PageToolbar title="Usuários e perfis" subtitle="Controle acessos com segregação de funções." action={<button className="primary"><Plus size={17} /> CONVIDAR USUÁRIO</button>} />
    <div className="role-grid"><article><ShieldCheck size={22} /><div><strong>Administrador</strong><span>Acesso total, usuários e configurações</span></div><b>1</b></article><article><Award size={22} /><div><strong>Avaliador chefe</strong><span>Matrizes, questões e resultados</span></div><b>1</b></article><article><ClipboardCheck size={22} /><div><strong>Avaliador</strong><span>Aplicação de exames técnicos</span></div><b>2</b></article></div>
    <article className="panel table-panel"><div className="responsive-table"><table><thead><tr><th>USUÁRIO</th><th>E-MAIL</th><th>PERFIL</th><th>SITUAÇÃO</th><th>ÚLTIMO ACESSO</th><th /></tr></thead><tbody>{users.map((u,index) => <tr key={u[0]}><td><span className="person-dot">{u[0].split(" ").map(n=>n[0]).slice(0,2).join("")}</span><strong>{u[0]}</strong></td><td>{u[1]}</td><td><span className="soft-tag">{u[2]}</span></td><td><span className={index === 3 ? "status neutral" : "status pass"}>{u[3]}</span></td><td>{index === 3 ? "Nunca" : `${index + 1}h atrás`}</td><td><MoreHorizontal size={18} /></td></tr>)}</tbody></table></div></article></>;
}

function SettingsSection() {
  const [minimum, setMinimum] = useState(70);
  const [autosave, setAutosave] = useState(true);
  const [random, setRandom] = useState(true);
  const [certificate, setCertificate] = useState(false);
  return <><PageToolbar title="Configurações" subtitle="Defina regras gerais do programa de avaliação." />
    <div className="settings-grid"><article className="panel settings-card"><span className="eyebrow">CRITÉRIOS DE APROVAÇÃO</span><h2>Regras de resultado</h2><label>NOTA MÍNIMA PARA APROVAÇÃO<div className="number-control"><button onClick={() => setMinimum(Math.max(0, minimum - 5))}>−</button><strong>{minimum}%</strong><button onClick={() => setMinimum(Math.min(100, minimum + 5))}>+</button></div></label><label>TENTATIVAS PERMITIDAS<select><option>2 tentativas</option><option>3 tentativas</option><option>Sem limite</option></select></label><label>INTERVALO ENTRE TENTATIVAS<select><option>7 dias</option><option>15 dias</option><option>30 dias</option></select></label></article>
    <article className="panel settings-card"><span className="eyebrow">COMPORTAMENTO</span><h2>Automação e segurança</h2>{[["Salvamento automático","Evita perda de notas durante a avaliação",autosave,setAutosave],["Ordem aleatória","Embaralha questões e alternativas",random,setRandom],["Certificado automático","Emite certificado após aprovação",certificate,setCertificate]].map(([title,desc,value,setter]) => <div className="switch-row" key={title as string}><div><strong>{title as string}</strong><span>{desc as string}</span></div><button className={value ? "on" : ""} onClick={() => (setter as (v:boolean)=>void)(!value)}><i /></button></div>)}</article></div>
    <div className="save-settings"><span><CheckCircle2 size={17} />Alterações são registradas na trilha de auditoria</span><button className="primary">SALVAR CONFIGURAÇÕES</button></div></>;
}

function AuditSection() {
  return <><PageToolbar title="Trilha de auditoria" subtitle="Histórico íntegro de ações e alterações no sistema." action={<button className="filter-button"><Filter size={17} /> EXPORTAR REGISTROS</button>} />
    <div className="filter-bar"><div className="search-box"><Search size={18} /><input placeholder="Buscar usuário, ação ou objeto" /></div><select><option>Todos os usuários</option><option>Fábio Nunes</option><option>Paulo Victor</option></select><select><option>Últimos 30 dias</option><option>Últimos 90 dias</option></select></div>
    <article className="panel audit-list">{auditRows.map((row,index) => <div key={row.at}><span className="audit-icon">{index % 2 ? <ClipboardCheck size={18} /> : <Activity size={18} />}</span><div><strong>{row.action}</strong><p><b>{row.user}</b> | {row.target}</p></div><time>{row.at}</time></div>)}</article></>;
}

function AdminApp({ exit, questions, onAddQuestion, onDeleteQuestion, backendOnline }: { exit: () => void; questions: Question[]; onAddQuestion: (q: Question) => void; onDeleteQuestion: (id: number) => void; backendOnline: boolean | null }) {
  const [section, setSection] = useState<Section>("dashboard");
  const titles: Record<Section, string> = { dashboard:"Visão geral", evaluations:"Avaliações", athletes:"Atletas", questions:"Banco de questões", matrices:"Matrizes técnicas", users:"Usuários e perfis", settings:"Configurações", audit:"Trilha de auditoria" };
  return <main className="admin-app"><AdminSidebar section={section} setSection={setSection} exit={exit} /><section className="admin-main"><header className="admin-topbar"><div><span>PAINEL ADMINISTRATIVO</span><strong>{titles[section]}</strong></div><div className="topbar-actions"><span className={`backend-status ${backendOnline ? "online" : "offline"}`} title={backendOnline ? "Dados sincronizados com a API" : "A API não está acessível; alterações permanecem neste navegador"}>{backendOnline === null ? "Conectando…" : backendOnline ? "API conectada" : "Modo local"}</span><button aria-label="Pesquisar"><Search size={19} /></button><button aria-label="Notificações" className="notification"><Clock3 size={19} /><i /></button><span className="avatar">FN</span></div></header><div className="admin-content">
    {section === "dashboard" && <><PageToolbar title="Boa tarde, Fábio" subtitle="Aqui está o panorama do programa de avaliação hoje." action={<button className="primary"><Plus size={17} /> NOVA AVALIAÇÃO</button>} /><Dashboard /></>}
    {section === "evaluations" && <EvaluationsSection />}{section === "athletes" && <AthletesSection />}{section === "questions" && <QuestionsSection questions={questions} onAdd={onAddQuestion} onDelete={onDeleteQuestion} />}{section === "matrices" && <MatricesSection />}{section === "users" && <UsersSection />}{section === "settings" && <SettingsSection />}{section === "audit" && <AuditSection />}
  </div></section></main>;
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [belt, setBelt] = useState<PracticalBeltId>("gray");
  const [athlete, setAthlete] = useState("");
  const [result, setResult] = useState<PracticalResult>({ score: 0, approved: false, detail: "", categories: [] });
  const [kataId, setKataId] = useState<KataId>("nage-no-kata");
  const [kataMode, setKataMode] = useState<KataMode>("partial");
  const [kataResult, setKataResult] = useState<KataResult>({
    score: 10,
    rawScore: 10,
    severeApplied: false,
    totalDeductions: 0,
    reviewedCount: 0,
    groups: [],
    errorCounts: { small: 0, medium: 0, large: 0, severe: 0 },
  });
  const [questions, setQuestions] = useState<Question[]>(seedQuestions);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("ajrc-questions");
    const storedTheme = window.localStorage.getItem("ajrc-theme");
    const savedTheme = storedTheme
      ? storedTheme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const localTimer = window.setTimeout(() => {
      if (saved) {
        try { setQuestions(JSON.parse(saved)); } catch { /* keep seed data */ }
      }
      setDark(savedTheme);
    }, 0);
    apiRequest<Question[]>("/api/questions")
      .then((remoteQuestions) => {
        setQuestions(remoteQuestions);
        setBackendOnline(true);
      })
      .catch(() => setBackendOnline(false));
    return () => window.clearTimeout(localTimer);
  }, []);

  useEffect(() => { window.localStorage.setItem("ajrc-questions", JSON.stringify(questions)); }, [questions]);
  useEffect(() => { window.localStorage.setItem("ajrc-theme", dark ? "dark" : "light"); }, [dark]);

  const navigate = (next: View) => { setMenuOpen(false); setView(next); window.scrollTo({ top: 0, behavior: "auto" }); };

  const addQuestion = (question: Question) => {
    setQuestions((current) => [question, ...current]);
    if (!backendOnline) return;
    void apiRequest<Question>("/api/questions", { method: "POST", body: JSON.stringify(question) })
      .then((saved) => setQuestions((current) => current.map((item) => item.id === question.id ? saved : item)))
      .catch(() => setBackendOnline(false));
  };

  const deleteQuestion = (id: number) => {
    setQuestions((current) => current.filter((item) => item.id !== id));
    if (!backendOnline) return;
    void apiRequest<void>(`/api/questions/${id}`, { method: "DELETE" })
      .catch(() => setBackendOnline(false));
  };

  const saveTechnicalEvaluation = (practicalResult: PracticalResult) => {
    if (!backendOnline) return;
    const beltName = PRACTICAL_BELTS.find((item) => item.id === belt)?.name ?? belt;
    void apiRequest("/api/evaluations", {
      method: "POST",
      body: JSON.stringify({ athlete, belt: beltName, type: "técnica", score: practicalResult.score * 10, detail: practicalResult.detail }),
    }).catch(() => setBackendOnline(false));
  };

  const saveKataEvaluation = (evaluationResult: KataResult) => {
    if (!backendOnline) return;
    const kataName = KATAS.find((item) => item.id === kataId)?.name ?? kataId;
    const detail = `Descontos: ${evaluationResult.totalDeductions}. ${evaluationResult.severeApplied ? "Fator de erro grave aplicado." : "Sem fator de erro grave."}${evaluationResult.notes ? ` Observações: ${evaluationResult.notes}` : ""}`;
    void apiRequest("/api/evaluations", {
      method: "POST",
      body: JSON.stringify({ athlete, belt: kataName, type: "kata", score: evaluationResult.score * 10, detail }),
    }).catch(() => setBackendOnline(false));
  };

  if (view === "admin") return <AdminApp exit={() => navigate("home")} questions={questions} onAddQuestion={addQuestion} onDeleteQuestion={deleteQuestion} backendOnline={backendOnline} />;

  return <PublicShell menuOpen={menuOpen} setMenuOpen={setMenuOpen} dark={dark} setDark={setDark} navigate={navigate}>
    {view === "home" && <HomeView navigate={navigate} />}
    {view === "theory-links" && <TheoryLinksView onBack={() => navigate("home")} />}
    {view === "technical-setup" && <TechnicalSetup onBack={() => navigate("home")} onStart={(name, selectedBelt) => { setAthlete(name); setBelt(selectedBelt); navigate("technical-form"); }} />}
    {view === "technical-form" && <TechnicalForm athlete={athlete} beltId={belt} onExit={() => navigate("home")} onFinish={(practicalResult) => { setResult(practicalResult); saveTechnicalEvaluation(practicalResult); navigate("technical-result"); }} />}
    {view === "technical-result" && <TechnicalResultView result={result} athlete={athlete} navigate={navigate} />}
    {view === "kata-setup" && <KataSetup onBack={() => navigate("home")} onStart={(name, selectedKata, selectedMode) => { setAthlete(name); setKataId(selectedKata); setKataMode(selectedMode); navigate("kata-form"); }} />}
    {view === "kata-form" && <KataForm athlete={athlete} kataId={kataId} mode={kataMode} onExit={() => navigate("home")} onFinish={(evaluationResult) => { setKataResult(evaluationResult); saveKataEvaluation(evaluationResult); navigate("kata-result"); }} />}
    {view === "kata-result" && <KataResultView result={kataResult} athlete={athlete} kataId={kataId} mode={kataMode} navigate={navigate} />}
  </PublicShell>;
}
