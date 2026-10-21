"use client";

import Image from "next/image";
import {
  Activity, Award, BookOpen, CheckCircle2, ClipboardCheck, ExternalLink, Home, LayoutDashboard, LogOut, Menu,
  Moon, PlayCircle, Sun, Target, X,
} from "lucide-react";
import type { AuthUser } from "@/lib/platform";
import type { PracticalResult } from "@/lib/practical-scoring";
import { TECHNIQUE_VIDEOS, toYouTubeEmbedUrl } from "@/lib/practical-exams";

export type { PracticalResult } from "@/lib/practical-scoring";

const LOGO =
  "https://media.base44.com/images/public/6a9b8ceb32f349c5600d2fdc/ecc432c62_41508.png/v1/fit/w_176,h_176,q_90,usm_0.66_1.00_0.01,enc_webp,quality_auto/ecc432c62_41508.webp";

export type View =
  | "home" | "theory-links" | "technical-setup" | "technical-form" | "technical-result"
  | "kata-setup" | "kata-form" | "kata-result" | "admin";

const theoreticalExams = [
  { name: "Amarela, ponta laranja e laranja infantil", detail: "Exame unificado para as três graduações", color: "#eac54f", href: "https://forms.gle/x9DQbfGksXzXkRNh8" },
  { name: "Laranja - 4º Kyu", detail: "Exame teórico da faixa laranja", color: "#ef8d32", href: "https://forms.gle/p5Fkw1zz1XwSPAQ28" },
  { name: "Verde - 3º Kyu", detail: "Exame teórico da faixa verde", color: "#5c9c61", href: "https://forms.gle/51cCW7ZstVea6TDy9" },
  { name: "Roxa - 2º Kyu", detail: "Exame teórico da faixa roxa", color: "#8563a5", href: "https://forms.gle/HR3tLZPKPGgtJy4o6" },
  { name: "Marrom - 1º Kyu", detail: "Exame teórico da faixa marrom", color: "#795548", href: "https://forms.gle/N1RwZdpD6cEKZWKC6" },
] as const;

export function Brand({ compact = false }: { compact?: boolean }) {
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
  user,
  onLogout,
  onOpenProfile,
}: {
  open: boolean;
  onClose: () => void;
  dark: boolean;
  setDark: (value: boolean) => void;
  navigate: (view: View) => void;
  user?: AuthUser;
  onLogout?: () => void;
  onOpenProfile?: () => void;
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
          <p>{user ? `Acesso de ${user.role === "super_admin" ? "Super Admin" : "avaliador"}` : "Ambiente de avaliação"}</p>
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
          <span className="avatar">{user?.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AJ"}</span>
          <button className="menu-profile-button" onClick={() => { onClose(); onOpenProfile?.(); }}><strong>{user?.name || "Associação"}</strong><small>{user?.evaluatorRank || "Ver e editar perfil"}</small></button>
          {onLogout ? <button onClick={onLogout} aria-label="Sair da conta"><LogOut size={18} /></button> : <LogOut size={18} />}
        </div>
        <ProjectCredits compact />
      </aside>
    </div>
  );
}

export function PublicShell({
  children,
  menuOpen,
  setMenuOpen,
  dark,
  setDark,
  navigate,
  user,
  onLogout,
  onOpenProfile,
}: {
  children: React.ReactNode;
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
  dark: boolean;
  setDark: (value: boolean) => void;
  navigate: (view: View) => void;
  user?: AuthUser;
  onLogout?: () => void;
  onOpenProfile?: () => void;
}) {
  return (
    <main className={`public-shell ${dark ? "dark" : ""}`}>
      <button className="floating-menu" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}>
        <Menu size={19} />
      </button>
      {children}
      <PublicMenu open={menuOpen} onClose={() => setMenuOpen(false)} dark={dark} setDark={setDark} navigate={navigate} user={user} onLogout={onLogout} onOpenProfile={onOpenProfile} />
    </main>
  );
}

export function HomeView({ navigate }: { navigate: (view: View) => void }) {
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

export function TheoryLinksView({ onBack }: { onBack: () => void }) {
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

export function TechniqueVideoDialog({ technique, onClose }: { technique: string; onClose: () => void }) {
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

export function TechnicalResultView({
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
