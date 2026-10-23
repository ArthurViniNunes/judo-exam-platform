"use client";

import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Moon,
  ShieldCheck,
  Sun,
  UserRoundPlus,
} from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { apiRequest, setAuthToken } from "@/lib/api";
import type { AuthUser } from "@/lib/platform";
import { THEORY_BELTS } from "@/lib/theory-exams";
import { PasswordRecovery } from "@/components/password-recovery";

const LOGO = "https://media.base44.com/images/public/6a9b8ceb32f349c5600d2fdc/ecc432c62_41508.png/v1/fit/w_176,h_176,q_90,usm_0.66_1.00_0.01,enc_webp,quality_auto/ecc432c62_41508.webp";

type AuthResponse = { token: string; expiresAt: string; user: AuthUser };

type StudentAuthScreenProps = {
  dark: boolean;
  setDark: (value: boolean) => void;
  onAuthenticated: (user: AuthUser) => void;
  onUseProfessional: () => void;
};

export function StudentAuthScreen({
  dark,
  setDark,
  onAuthenticated,
  onUseProfessional,
}: StudentAuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [beltId, setBeltId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const resetToken = new URLSearchParams(window.location.search).get("recuperar") || "";
    if (!resetToken) return;
    const timer = window.setTimeout(() => {
      setRecoveryToken(resetToken);
      setRecovering(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (mode === "register" && password !== confirmPassword) {
      setError("As duas senhas precisam ser iguais.");
      return;
    }
    if (
      mode === "register" &&
      (password.length < 10 || !/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password))
    ) {
      setError("Crie uma senha com pelo menos 10 caracteres, uma letra e um número.");
      return;
    }

    setBusy(true);
    try {
      const endpoint = mode === "login"
        ? "/api/student-auth/login"
        : "/api/student-auth/register";
      const response = await apiRequest<AuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(
          mode === "login"
            ? { email, password }
            : { name, email, password, beltId },
        ),
      });
      setAuthToken(response.token);
      onAuthenticated(response.user);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível acessar sua conta de aluno.",
      );
    } finally {
      setBusy(false);
    }
  };

  const changeMode = (nextMode: "login" | "register") => {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <main className={`auth-screen student-auth-screen${dark ? " dark" : ""}`}>
      <button
        className="auth-theme"
        onClick={() => setDark(!dark)}
        aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
      >
        {dark ? <Sun size={19} /> : <Moon size={19} />}
      </button>

      <section className="auth-intro">
        <Image src={LOGO} alt="Associação Judô Rogério Cruz" width={112} height={112} priority />
        <div>
          <span>ÁREA DO ALUNO</span>
          <h1>Sua próxima graduação começa aqui.</h1>
          <p>
            Crie seu cadastro para fazer a avaliação teórica e acompanhar o seu
            caminho até o exame prático.
          </p>
        </div>
        <ul aria-label="Etapas do exame">
          <li><CheckCircle2 size={18} /> Cadastro individual do judoca</li>
          <li><CheckCircle2 size={18} /> Prova da graduação correta</li>
          <li><CheckCircle2 size={18} /> Correção com respostas explicadas</li>
        </ul>
      </section>

      <section className="auth-panel" aria-labelledby={recovering ? "password-recovery-title" : "student-auth-title"}>
        <div className="auth-audience"><GraduationCap size={17} /> Acesso de aluno</div>
        {recovering ? (
          <PasswordRecovery
            initialToken={recoveryToken}
            onClose={() => {
              setRecovering(false);
              setRecoveryToken("");
            }}
          />
        ) : (
          <>
        <div className="auth-mode" role="tablist" aria-label="Acesso do aluno">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "active" : ""}
            onClick={() => changeMode("login")}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={mode === "register" ? "active" : ""}
            onClick={() => changeMode("register")}
          >
            Primeiro acesso
          </button>
        </div>

        <div className="auth-heading">
          <span className="auth-heading-icon">
            {mode === "login" ? <BookOpenCheck size={22} /> : <UserRoundPlus size={22} />}
          </span>
          <div>
            <h2 id="student-auth-title">
              {mode === "login" ? "Continuar meu exame" : "Criar cadastro de aluno"}
            </h2>
            <p>
              {mode === "login"
                ? "Use o e-mail e a senha do seu cadastro."
                : "Se você também avalia, use o mesmo e-mail e a mesma senha da sua conta."}
            </p>
          </div>
        </div>

        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <label>
                Nome completo
                <input
                  autoComplete="name"
                  required
                  minLength={3}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nome do judoca"
                />
              </label>
              <label>
                Próxima graduação
                <select
                  required
                  value={beltId}
                  onChange={(event) => setBeltId(event.target.value)}
                >
                  <option value="">Selecione a faixa do exame</option>
                  {THEORY_BELTS.map((belt) => (
                    <option key={belt.id} value={belt.id}>{belt.name}</option>
                  ))}
                </select>
                <small>Você fará a prova teórica correspondente a esta graduação.</small>
              </label>
            </>
          )}
          <label>
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
            />
          </label>
          <label>
            Senha
            <span className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo de 10 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {mode === "register" && (
            <>
              <p className="password-requirements">
                Use pelo menos 10 caracteres, incluindo uma letra e um número.
              </p>
              <label>
                Confirme a senha
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={10}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            </>
          )}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-submit" disabled={busy}>
            {busy
              ? "Aguarde…"
              : mode === "login"
                ? "Entrar como aluno"
                : "Criar meu cadastro"}
            <ArrowRight size={19} />
          </button>
          {mode === "login" && <button className="auth-forgot" type="button" onClick={() => setRecovering(true)}>Esqueci minha senha</button>}
        </form>

        <div className="auth-switch">
          <ShieldCheck size={19} />
          <div>
            <strong>Você é avaliador?</strong>
            <span>Use a entrada reservada à equipe da associação.</span>
          </div>
          <button type="button" onClick={onUseProfessional}>Acesso de avaliador</button>
        </div>
          </>
        )}
      </section>
    </main>
  );
}
