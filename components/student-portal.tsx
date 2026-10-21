"use client";

import {
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import Image from "next/image";
import type { AuthUser } from "@/lib/platform";

const LOGO = "https://media.base44.com/images/public/6a9b8ceb32f349c5600d2fdc/ecc432c62_41508.png/v1/fit/w_176,h_176,q_90,usm_0.66_1.00_0.01,enc_webp,quality_auto/ecc432c62_41508.webp";

type StudentPortalProps = {
  user: AuthUser;
  dark: boolean;
  setDark: (value: boolean) => void;
  onLogout: () => void;
  onUseProfessional: () => void;
};

export function StudentPortal({
  user,
  dark,
  setDark,
  onLogout,
  onUseProfessional,
}: StudentPortalProps) {
  const hasProfessionalAccess = user.roles.some(
    (role) => role === "evaluator" || role === "super_admin",
  );

  return (
    <main className={`student-portal${dark ? " dark" : ""}`}>
      <header className="student-portal-header">
        <div className="student-portal-brand">
          <Image src={LOGO} alt="Associação Judô Rogério Cruz" width={54} height={54} priority />
          <div>
            <strong>Área do aluno</strong>
            <span>Associação Judô Rogério Cruz</span>
          </div>
        </div>
        <div className="student-portal-actions">
          <button onClick={() => setDark(!dark)} aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}>
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button onClick={onLogout} aria-label="Sair da conta"><LogOut size={19} /></button>
        </div>
      </header>

      <section className="student-portal-content">
        <div className="student-welcome">
          <span>OLÁ, {user.name.split(/\s+/)[0].toLocaleUpperCase("pt-BR")}</span>
          <h1>Sua avaliação teórica</h1>
          <p>
            Este é o espaço onde você fará a prova da sua graduação e consultará
            a correção quando ela estiver concluída.
          </p>
        </div>

        <article className="theory-admission" aria-labelledby="theory-status-title">
          <div className="theory-admission-icon"><BookOpenCheck size={28} /></div>
          <div className="theory-admission-copy">
            <span className="theory-status"><Clock3 size={15} /> Em preparação</span>
            <h2 id="theory-status-title">Prova ainda não liberada</h2>
            <p>
              Seu cadastro já está ativo. As questões serão publicadas aqui pela
              associação assim que a próxima etapa estiver pronta.
            </p>
          </div>
          <ul>
            <li><CheckCircle2 size={17} /> Cadastro de aluno confirmado</li>
            <li><Clock3 size={17} /> Aguardando publicação da prova</li>
          </ul>
        </article>

        {hasProfessionalAccess && (
          <aside className="student-professional-switch">
            <ShieldCheck size={21} />
            <div>
              <strong>Você também faz parte da equipe</strong>
              <span>Saia deste contexto para entrar como avaliador.</span>
            </div>
            <button onClick={onUseProfessional}>Entrar como avaliador</button>
          </aside>
        )}
      </section>
    </main>
  );
}
