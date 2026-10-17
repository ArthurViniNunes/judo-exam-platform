import { FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";
import type { AuthUser, ManagedUser } from "@/lib/platform";
import { apiRequest } from "@/lib/api";
import { initials, LoadingBlock } from "./admin-portal-shared";

type TeamViewProps = {
  users: ManagedUser[];
  loading: boolean;
  currentUser: AuthUser;
  reload: () => void;
};

export function TeamView({ users, loading, currentUser, reload }: TeamViewProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await apiRequest("/api/users/invite", {
        method: "POST",
        body: JSON.stringify({ email, name }),
      });
      setName("");
      setEmail("");
      setMessage("E-mail autorizado. O avaliador já pode criar a conta.");
      reload();
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

  const toggleStatus = async (person: ManagedUser) => {
    setError("");

    try {
      await apiRequest(`/api/users/${person.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: person.status === "disabled" ? "active" : "disabled",
        }),
      });
      reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível alterar o acesso.",
      );
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
            Não enviamos e-mail automaticamente. Avise o avaliador que o acesso
            está liberado.
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
          <button className="management-primary" disabled={busy}>
            <UserPlus size={18} /> {busy ? "Autorizando…" : "Autorizar e-mail"}
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
              <div>
                <strong>{person.name}</strong>
                <small>{person.email}</small>
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
              {person.id !== currentUser.id &&
                person.role !== "super_admin" &&
                person.status !== "invited" && (
                  <button onClick={() => toggleStatus(person)}>
                    {person.status === "disabled" ? "Reativar" : "Desativar"}
                  </button>
                )}
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}