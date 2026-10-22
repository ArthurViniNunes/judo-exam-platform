"use client";

import {
  BookOpenCheck,
  Clock3,
  LogOut,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
} from "lucide-react";
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { AuthUser, StudentProfile } from "@/lib/platform";
import { THEORY_BELTS } from "@/lib/theory-exams";
import { StudentTheoryExam } from "./student-theory-exam";

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
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [targetBeltId, setTargetBeltId] = useState("");
  const [targetBusy, setTargetBusy] = useState(false);
  const [targetError, setTargetError] = useState("");
  const hasProfessionalAccess = user.roles.some(
    (role) => role === "evaluator" || role === "super_admin",
  );
  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError("");
    try {
      setProfile(await apiRequest<StudentProfile>("/api/student/me"));
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : "Não foi possível consultar seu cadastro.",
      );
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProfile(), 0);
    return () => window.clearTimeout(timer);
  }, [loadProfile]);

  const saveTargetBelt = async (event: FormEvent) => {
    event.preventDefault();
    setTargetBusy(true);
    setTargetError("");
    try {
      setProfile(await apiRequest<StudentProfile>("/api/student/me/target-belt", {
        method: "PATCH",
        body: JSON.stringify({ beltId: targetBeltId }),
      }));
    } catch (error) {
      setTargetError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a graduação.",
      );
    } finally {
      setTargetBusy(false);
    }
  };

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
          <span>OLÁ, {(profile?.student.name ?? user.name).split(/\s+/)[0].toLocaleUpperCase("pt-BR")}</span>
          <h1>Sua avaliação teórica</h1>
          <p>
            Este é o espaço onde você fará a prova da sua graduação e consultará
            a correção quando ela estiver concluída.
          </p>
        </div>

        {profileLoading ? (
          <article className="theory-admission" aria-live="polite">
            <div className="theory-admission-icon theory-admission-loading"><RefreshCw size={25} /></div>
            <div className="theory-admission-copy">
              <span className="theory-status"><Clock3 size={15} /> Consultando</span>
              <h2>Conferindo seu cadastro</h2>
              <p>Estamos buscando sua situação diretamente na associação.</p>
            </div>
          </article>
        ) : profileError ? (
          <article className="theory-admission theory-admission-error" role="alert">
            <div className="theory-admission-icon"><ShieldCheck size={27} /></div>
            <div className="theory-admission-copy">
              <span className="theory-status">Atenção</span>
              <h2>Não foi possível confirmar sua situação</h2>
              <p>{profileError}</p>
            </div>
            <button className="student-profile-retry" onClick={() => void loadProfile()}>
              <RefreshCw size={17} /> Tentar novamente
            </button>
          </article>
        ) : profile && !profile.student.targetBeltId ? (
          <article className="theory-admission theory-target-choice" aria-labelledby="target-belt-title">
            <div className="theory-admission-icon"><BookOpenCheck size={28} /></div>
            <div className="theory-admission-copy">
              <span className="theory-status">Seu exame</span>
              <h2 id="target-belt-title">Qual é sua próxima graduação?</h2>
              <p>Escolha a faixa que você pretende alcançar. Depois que a prova começar, essa escolha não poderá ser alterada.</p>
            </div>
            <form onSubmit={saveTargetBelt}>
              <label>
                Graduação pretendida
                <select required value={targetBeltId} onChange={(event) => setTargetBeltId(event.target.value)}>
                  <option value="">Selecione a faixa do exame</option>
                  {THEORY_BELTS.map((belt) => (
                    <option key={belt.id} value={belt.id}>{belt.name}</option>
                  ))}
                </select>
              </label>
              {targetError && <div className="auth-error" role="alert">{targetError}</div>}
              <button disabled={targetBusy || !targetBeltId}>
                {targetBusy ? "Salvando…" : "Confirmar graduação"}
              </button>
            </form>
          </article>
        ) : (
          <StudentTheoryExam />
        )}

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
