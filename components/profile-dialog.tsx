"use client";

import { Check, Mail, Pencil, ShieldCheck, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { AuthUser } from "@/lib/platform";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

type ProfileDialogProps = {
  user: AuthUser;
  dark: boolean;
  onClose: () => void;
  onSaved: (user: AuthUser) => void;
};

export function ProfileDialog({ user, dark, onClose, onSaved }: ProfileDialogProps) {
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSaved(false);
    setBusy(true);
    try {
      const response = await apiRequest<{ user: AuthUser }>("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setName(response.user.name);
      onSaved(response.user);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar seu perfil.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`profile-layer${dark ? " dark" : ""}`} onMouseDown={onClose}>
      <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="profile-close" type="button" onClick={onClose} aria-label="Fechar perfil"><X size={19} /></button>
        <header>
          <span className="profile-avatar">{initials(user.name)}</span>
          <div><span>Conta pessoal</span><h2 id="profile-title">Seu perfil de avaliador</h2><p>Este nome identifica você nas avaliações e no histórico dos alunos.</p></div>
        </header>
        <form onSubmit={submit}>
          <label>Nome exibido<span className="profile-input"><UserRound size={18} /><input autoFocus required minLength={3} maxLength={80} value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} /></span></label>
          <label>E-mail<span className="profile-input readonly"><Mail size={18} /><input value={user.email} readOnly aria-readonly="true" /></span><small>O e-mail de acesso só pode ser alterado pelo responsável da plataforma.</small></label>
          <div className="profile-role"><ShieldCheck size={19} /><span><small>Nível de acesso</small><strong>{user.role === "super_admin" ? "Super Admin" : "Avaliador"}</strong></span></div>
          {error && <div className="profile-error" role="alert">{error}</div>}
          {saved && <div className="profile-success" role="status"><Check size={17} /> Nome atualizado em todo o sistema.</div>}
          <footer><button type="button" className="profile-cancel" onClick={onClose}>Cancelar</button><button className="profile-save" disabled={busy || name.trim() === user.name}><Pencil size={17} /> {busy ? "Salvando…" : "Salvar nome"}</button></footer>
        </form>
      </section>
    </div>
  );
}
