import { FormEvent, useState } from "react";
import { Check, Copy, Link2, Trash2, UserPlus } from "lucide-react";
import type { AuthUser, ManagedUser } from "@/lib/platform";
import { apiRequest } from "@/lib/api";
import { buildInvitationPath } from "@/lib/invitations";
import { EVALUATOR_RANKS } from "@/lib/judo-ranks";
import { initials, LoadingBlock } from "./admin-portal-shared";

type TeamViewProps = {
  users: ManagedUser[];
  loading: boolean;
  currentUser: AuthUser;
  reload: () => Promise<void>;
};

type Invitation = Pick<ManagedUser, "id" | "email" | "name" | "evaluator_rank">;

export function TeamView({ users, loading, currentUser, reload }: TeamViewProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [evaluatorRank, setEvaluatorRank] = useState("");
  const [rankDrafts, setRankDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [actionId, setActionId] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const invitationUrl = (person: Invitation) =>
    `${window.location.origin}${buildInvitationPath(person)}`;

  const copyInvitation = async (person: Invitation) => {
    setError("");
    setActionId(person.id);
    try {
      await navigator.clipboard.writeText(invitationUrl(person));
      setCopiedId(person.id);
      setMessage(`Link de ativação de ${person.name} copiado.`);
    } catch {
      setError("Não foi possível copiar o link. Tente novamente neste dispositivo.");
    } finally {
      setActionId("");
    }
  };

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const invited = await apiRequest<Invitation>("/api/users/invite", {
        method: "POST",
        body: JSON.stringify({ email, name, evaluatorRank }),
      });
      setInvitation(invited);
      setCopiedId("");
      setName("");
      setEmail("");
      setEvaluatorRank("");
      setMessage("Acesso autorizado. Agora compartilhe o link de ativação.");
      await reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível autorizar o e-mail.",
      );
    } finally {
      setBusy(false);
    }
  };

  const updateRank = async (person: ManagedUser, nextRank: string) => {
    setRankDrafts((current) => ({ ...current, [person.id]: nextRank }));
    setError("");
    setMessage("");
    setActionId(person.id);
    try {
      await apiRequest(`/api/users/${person.id}`, {
        method: "PATCH",
        body: JSON.stringify({ evaluatorRank: nextRank }),
      });
      await reload();
      setMessage(`Graduação de ${person.name} atualizada.`);
    } catch (caught) {
      setRankDrafts((current) => {
        const next = { ...current };
        delete next[person.id];
        return next;
      });
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível atualizar a graduação.",
      );
    } finally {
      setActionId("");
    }
  };

  const toggleStatus = async (person: ManagedUser) => {
    setError("");
    setActionId(person.id);

    try {
      await apiRequest(`/api/users/${person.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: person.status === "disabled" ? "active" : "disabled",
        }),
      });
      await reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível alterar o acesso.",
      );
    } finally {
      setActionId("");
    }
  };

  const cancelInvitation = async (person: ManagedUser) => {
    if (!window.confirm(`Cancelar o convite de ${person.name}?`)) return;

    setError("");
    setActionId(person.id);
    try {
      await apiRequest(`/api/users/${person.id}/invitation`, {
        method: "DELETE",
      });
      if (invitation?.id === person.id) setInvitation(null);
      setMessage(`Convite de ${person.name} cancelado.`);
      await reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível cancelar o convite.",
      );
    } finally {
      setActionId("");
    }
  };

  if (loading) return <LoadingBlock label="Carregando equipe…" />;

  return (
    <div className="management-page">
      <header className="management-page-heading">
        <div>
          <h1>Equipe e acessos</h1>
          <p>Somente os e-mails autorizados aqui conseguem criar uma conta.</p>
        </div>
      </header>

      <div className="team-grid">
        <form className="invite-panel" onSubmit={invite}>
          <span>
            <UserPlus size={21} />
          </span>
          <h2>Autorizar avaliador</h2>
          <p>
            Autorize o e-mail e envie o link gerado ao avaliador. Ele abrirá o
            cadastro já preparado para ativar a conta.
          </p>
          <label>
            Nome
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do avaliador"
            />
          </label>
          <label>
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="avaliador@exemplo.com"
            />
          </label>
          <label>
            Graduação do avaliador
            <select
              required
              value={evaluatorRank}
              onChange={(event) => setEvaluatorRank(event.target.value)}
            >
              <option value="">Selecione a graduação</option>
              {EVALUATOR_RANKS.map((rank) => (
                <option key={rank} value={rank}>{rank}</option>
              ))}
            </select>
          </label>
          {error && (
            <div className="management-error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="management-success" role="status">
              {message}
            </div>
          )}
          {invitation && (
            <div className="invitation-receipt">
              <span>
                <Link2 size={18} />
              </span>
              <div>
                <strong>Link pronto para compartilhar</strong>
                <small>{invitation.email} · {invitation.evaluator_rank}</small>
              </div>
              <button
                type="button"
                onClick={() => void copyInvitation(invitation)}
                disabled={actionId === invitation.id}
              >
                {copiedId === invitation.id ? <Check size={17} /> : <Copy size={17} />}
                {copiedId === invitation.id ? "Copiado" : "Copiar link"}
              </button>
            </div>
          )}
          <button className="management-primary" disabled={busy}>
            <UserPlus size={18} /> {busy ? "Gerando convite…" : "Gerar convite"}
          </button>
        </form>

        <section className="team-list">
          <div className="team-list-heading">
            <h2>Pessoas com acesso</h2>
            <span>{users.length}</span>
          </div>
          {users.map((person) => (
            <article key={person.id}>
              <span className="student-avatar">{initials(person.name)}</span>
              <div className="team-member-info">
                <strong>{person.name}</strong>
                <small>{person.email}</small>
                <small className="team-member-rank">
                  {person.role === "evaluator"
                    ? person.evaluator_rank || "Graduação não informada"
                    : "Administração geral"}
                </small>
                <p>
                  {person.role === "super_admin"
                    ? "Super Admin"
                    : person.status === "invited"
                      ? "Convite pendente"
                      : person.status === "disabled"
                        ? "Acesso desativado"
                        : `${person.student_count} alunos · ${person.evaluation_count} avaliações`}
                </p>
              </div>
              <span className={`access-status ${person.status}`}>
                {person.status === "active"
                  ? "Ativo"
                  : person.status === "invited"
                    ? "Pendente"
                    : "Desativado"}
              </span>
              {person.role === "evaluator" && (
                <label className="team-rank-select">
                  <span>Graduação</span>
                  <select
                    aria-label={`Graduação de ${person.name}`}
                    value={rankDrafts[person.id] ?? person.evaluator_rank ?? ""}
                    disabled={actionId === person.id}
                    onChange={(event) => void updateRank(person, event.target.value)}
                  >
                    <option value="" disabled>Selecione</option>
                    {EVALUATOR_RANKS.map((rank) => (
                      <option key={rank} value={rank}>{rank}</option>
                    ))}
                  </select>
                </label>
              )}
              {person.id !== currentUser.id && person.role !== "super_admin" && (
                <div className="team-member-actions">
                  {person.status === "invited" ? (
                    <>
                      <button
                        onClick={() => void copyInvitation(person)}
                        disabled={actionId === person.id}
                      >
                        {copiedId === person.id ? <Check size={16} /> : <Copy size={16} />}
                        {copiedId === person.id ? "Copiado" : "Copiar link"}
                      </button>
                      <button
                        className="danger"
                        onClick={() => void cancelInvitation(person)}
                        disabled={actionId === person.id}
                      >
                        <Trash2 size={16} /> Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => void toggleStatus(person)}
                      disabled={actionId === person.id}
                    >
                      {person.status === "disabled" ? "Reativar" : "Desativar"}
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
