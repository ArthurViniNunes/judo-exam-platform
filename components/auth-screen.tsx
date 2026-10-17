"use client";

import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Sun,
  UserRoundPlus,
} from "lucide-react";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { apiRequest, setAuthToken } from "@/lib/api";
import type { AuthUser } from "@/lib/platform";

const LOGO = "https://media.base44.com/images/public/6a9b8ceb32f349c5600d2fdc/ecc432c62_41508.png/v1/fit/w_176,h_176,q_90,usm_0.66_1.00_0.01,enc_webp,quality_auto/ecc432c62_41508.webp";

type AuthResponse = { token: string; expiresAt: string; user: AuthUser };

type AuthScreenProps = {
  dark: boolean;
  setDark: (value: boolean) => void;
  onAuthenticated: (user: AuthUser) => void;
};

export function AuthScreen({ dark, setDark, onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (mode === "register" && password !== confirmPassword) {
      setError("As duas senhas precisam ser iguais.");
      return;
    }
    setBusy(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email, password }
        : { name, email, password };
      const response = await apiRequest<AuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setAuthToken(response.token);
      onAuthenticated(response.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível acessar sua conta.");
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
    <main className={`auth-screen${dark ? " dark" : ""}`}>
      <button className="auth-theme" onClick={() => setDark(!dark)} aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}>
        {dark ? <Sun size={19} /> : <Moon size={19} />}
      </button>
      <section className="auth-intro">
        <Image src={LOGO} alt="Associação Judô Rogério Cruz" width={112} height={112} priority />
        <div>
          <span>Programa de avaliação</span>
          <h1>O histórico de cada aluno começa com uma avaliação bem registrada.</h1>
          <p>Entre para aplicar exames, acompanhar sua turma e consultar a evolução técnica ao longo das graduações.</p>
        </div>
        <ul aria-label="Recursos protegidos">
          <li><CheckCircle2 size={18} /> Avaliações vinculadas ao professor</li>
          <li><CheckCircle2 size={18} /> Histórico e evolução dos alunos</li>
          <li><CheckCircle2 size={18} /> Dados protegidos por acesso individual</li>
        </ul>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-mode" role="tablist" aria-label="Acesso à plataforma">
          <button role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")}>Entrar</button>
          <button role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => changeMode("register")}>Criar conta</button>
        </div>
        <div className="auth-heading">
          <span className="auth-heading-icon">{mode === "login" ? <LockKeyhole size={22} /> : <UserRoundPlus size={22} />}</span>
          <div>
            <h2 id="auth-title">{mode === "login" ? "Bem-vindo de volta" : "Ative seu acesso"}</h2>
            <p>{mode === "login" ? "Use o e-mail cadastrado na associação." : "Seu e-mail precisa ter sido liberado pelo Super Admin."}</p>
          </div>
        </div>
        <form onSubmit={submit}>
          {mode === "register" && <label>Nome completo<input autoComplete="name" required minLength={3} value={name} onChange={(event) => setName(event.target.value)} placeholder="Como você será identificado" /></label>}
          <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" /></label>
          <label>Senha
            <span className="password-field">
              <input type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 10 caracteres" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </span>
          </label>
          {mode === "register" && <label>Confirme a senha<input type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={10} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-submit" disabled={busy}>{busy ? "Aguarde…" : mode === "login" ? "Entrar na plataforma" : "Criar minha conta"}<ArrowRight size={19} /></button>
        </form>
        <p className="auth-help"><ShieldCheck size={17} /> {mode === "login" ? "Ainda não tem conta? Escolha “Criar conta” acima." : "E-mail não autorizado? Solicite a inclusão ao responsável pela associação."}</p>
      </section>
    </main>
  );
}
