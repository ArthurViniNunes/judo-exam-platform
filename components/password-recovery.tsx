"use client";

import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { apiRequest } from "@/lib/api";

type PasswordRecoveryProps = {
  initialToken?: string;
  onClose: () => void;
};

export function PasswordRecovery({ initialToken = "", onClose }: PasswordRecoveryProps) {
  const [token] = useState(initialToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const resetting = Boolean(token);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (resetting && password !== confirmPassword) {
      setError("As duas senhas precisam ser iguais.");
      return;
    }
    if (
      resetting
      && (password.length < 10 || !/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password))
    ) {
      setError("Crie uma senha com pelo menos 10 caracteres, uma letra e um número.");
      return;
    }

    setBusy(true);
    try {
      const response = await apiRequest<{ message: string }>(
        resetting
          ? "/api/auth/password-reset/confirm"
          : "/api/auth/password-reset/request",
        {
          method: "POST",
          body: JSON.stringify(resetting ? { token, password } : { email }),
        },
      );
      setMessage(response.message);
      setPassword("");
      setConfirmPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível concluir a solicitação.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    onClose();
  };

  return (
    <div className="password-recovery">
      <button type="button" className="password-recovery-back" onClick={close}>
        <ArrowLeft size={17} /> Voltar para o acesso
      </button>
      <div className="auth-heading">
        <span className="auth-heading-icon">{resetting ? <KeyRound size={22} /> : <Mail size={22} />}</span>
        <div>
          <h2 id="password-recovery-title">
            {resetting ? "Crie uma nova senha" : "Recupere sua senha"}
          </h2>
          <p>
            {resetting
              ? "O link é de uso único. Ao concluir, as sessões antigas serão encerradas."
              : "Informe o e-mail da sua conta. Se ela estiver ativa, você receberá um link válido por 20 minutos."}
          </p>
        </div>
      </div>

      {message ? (
        <div className="password-recovery-success" role="status">
          <CheckCircle2 size={22} />
          <div><strong>Solicitação concluída</strong><p>{message}</p></div>
          <button type="button" onClick={close}>Voltar para entrar</button>
        </div>
      ) : (
        <form onSubmit={submit} aria-labelledby="password-recovery-title">
          {!resetting ? (
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
          ) : (
            <>
              <label>
                Nova senha
                <span className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={10}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Mínimo de 10 caracteres"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>
              <p className="password-requirements">Use pelo menos 10 caracteres, incluindo uma letra e um número.</p>
              <label>
                Confirme a nova senha
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
            {busy ? "Aguarde…" : resetting ? "Salvar nova senha" : "Enviar instruções"}
            <KeyRound size={19} />
          </button>
        </form>
      )}
    </div>
  );
}
