import {
  Activity,
  ArrowLeft,
  BookOpenCheck,
  Check,
  ChevronDown,
  FilePlus2,
  Plus,
  X,
} from "lucide-react";
import { FormEvent, useState } from "react";
import type { ExamMatrix } from "@/lib/platform";
import { apiRequest } from "@/lib/api";
import {
  categoryNames,
  EmptyState,
  formatDate,
  LoadingBlock,
  type MatrixCategoryDraft,
} from "./admin-portal-shared";

type MatrixFormProps = {
  onCancel: () => void;
  onCreated: () => void;
};

type MatrixCategoryField = "name" | "techniques";

type MatricesViewProps = {
  matrices: ExamMatrix[];
  loading: boolean;
  canManage: boolean;
  reload: () => void;
};

function MatrixForm({
  onCancel,
  onCreated,
}: MatrixFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hasKata, setHasKata] = useState(false);
  const [kataType, setKataType] = useState("nage-no-kata-partial");
  const [minimumScore, setMinimumScore] = useState(7);
  const [maxBelowFive, setMaxBelowFive] = useState(1);
  const [categories, setCategories] = useState<MatrixCategoryDraft[]>(
    categoryNames.map((category) => ({
      id: crypto.randomUUID(),
      name: category,
      techniques: "",
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const updateCategory = (
    id: string,
    field: MatrixCategoryField,
    value: string,
  ) =>
    setCategories((current) =>
      current.map((category) =>
        category.id === id ? { ...category, [field]: value } : category,
      ),
    );
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await apiRequest("/api/matrices", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          hasKata,
          kataType: hasKata ? kataType : null,
          minimumScore,
          maxCategoriesBelowFive: maxBelowFive,
          status: "active",
          categories: categories.map((category) => ({
            name: category.name,
            techniques: category.techniques
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
          })),
        }),
      });
      onCreated();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível criar a matriz.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="matrix-editor" onSubmit={submit}>
      <header>
        <button type="button" onClick={onCancel}>
          <ArrowLeft size={18} /> Voltar
        </button>
        <div>
          <h2>Nova matriz de avaliação</h2>
          <p>Defina o conteúdo cobrado e as regras de aprovação.</p>
        </div>
      </header>
      <section className="matrix-editor-section">
        <h3>Identificação</h3>
        <div className="matrix-fields">
          <label>
            Nome da matriz
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Exame faixa verde 2027"
            />
          </label>
          <label>
            Descrição
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Contexto ou orientações para os avaliadores"
            />
          </label>
        </div>
      </section>
      <section className="matrix-editor-section">
        <h3>Regras do exame</h3>
        <div className="rule-grid">
          <label className="toggle-rule">
            <input
              type="checkbox"
              checked={hasKata}
              onChange={(event) => setHasKata(event.target.checked)}
            />
            <span>
              <b>
                <Activity size={18} /> Incluir kata
              </b>
              <small>Adiciona a apresentação do kata à matriz.</small>
            </span>
          </label>
          {hasKata && (
            <label>
              Qual kata?
              <select
                value={kataType}
                onChange={(event) => setKataType(event.target.value)}
              >
                <option value="nage-no-kata-partial">
                  Nage-no-Kata parcial
                </option>
                <option value="nage-no-kata-complete">
                  Nage-no-Kata completo
                </option>
                <option value="katame-no-kata">Katame-no-Kata</option>
              </select>
            </label>
          )}
          <label>
            Nota mínima para aprovação
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              required
              value={minimumScore}
              onChange={(event) => setMinimumScore(Number(event.target.value))}
            />
            <small>Escala de 0 a 10.</small>
          </label>
          <label>
            Máximo de categorias abaixo de 5
            <input
              type="number"
              min="0"
              max="10"
              required
              value={maxBelowFive}
              onChange={(event) => setMaxBelowFive(Number(event.target.value))}
            />
            <small>Acima desse total, o aluno é reprovado.</small>
          </label>
        </div>
      </section>
      <section className="matrix-editor-section">
        <div className="matrix-section-title">
          <div>
            <h3>Categorias e técnicas</h3>
            <p>Escreva uma técnica ou sequência por linha.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setCategories((current) => [
                ...current,
                {
                  id: crypto.randomUUID(),
                  name: "Nova categoria",
                  techniques: "",
                },
              ])
            }
          >
            <Plus size={17} /> Categoria
          </button>
        </div>
        <div className="category-editor-list">
          {categories.map((category, index) => (
            <article key={category.id}>
              <span>{index + 1}</span>
              <div>
                <label>
                  Categoria
                  <input
                    required
                    value={category.name}
                    onChange={(event) =>
                      updateCategory(category.id, "name", event.target.value)
                    }
                  />
                </label>
                <label>
                  Técnicas
                  <textarea
                    required
                    value={category.techniques}
                    onChange={(event) =>
                      updateCategory(
                        category.id,
                        "techniques",
                        event.target.value,
                      )
                    }
                    placeholder={
                      "O-soto-gari\nIppon-seoi-nage\nDe-ashi-harai → O-soto-gari"
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCategories((current) =>
                    current.filter((item) => item.id !== category.id),
                  )
                }
                disabled={categories.length === 1}
                aria-label={`Remover ${category.name}`}
              >
                <X size={18} />
              </button>
            </article>
          ))}
        </div>
      </section>
      {error && (
        <div className="management-error" role="alert">
          {error}
        </div>
      )}
      <footer>
        <button
          type="button"
          className="management-secondary"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button className="management-primary" disabled={busy}>
          <Check size={18} /> {busy ? "Salvando…" : "Criar matriz"}
        </button>
      </footer>
    </form>
  );
}

export function MatricesView({
  matrices,
  loading,
  canManage,
  reload,
}: MatricesViewProps) {
  const [creating, setCreating] = useState(false);
  if (creating)
    return (
      <MatrixForm
        onCancel={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          reload();
        }}
      />
    );
  if (loading) return <LoadingBlock label="Carregando matrizes…" />;
  return (
    <div className="management-page">
      <header className="management-page-heading">
        <div>
          <h1>Matrizes de avaliação</h1>
          <p>
            Conteúdo técnico, kata e regras de aprovação reunidos em uma única
            definição.
          </p>
        </div>
        {canManage && (
          <button
            className="management-primary"
            onClick={() => setCreating(true)}
          >
            <FilePlus2 size={18} /> Nova matriz
          </button>
        )}
      </header>
      {!matrices.length ? (
        <EmptyState
          icon={<BookOpenCheck size={29} />}
          title="Nenhuma matriz personalizada"
          detail={
            canManage
              ? "Crie a primeira matriz para organizar um novo exame."
              : "O Super Admin ainda não publicou uma matriz."
          }
          action={
            canManage ? (
              <button
                className="management-primary"
                onClick={() => setCreating(true)}
              >
                Criar matriz
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="matrix-list">
          {matrices.map((matrix) => (
            <article key={matrix.id}>
              <header>
                <div>
                  <span className={`matrix-status ${matrix.status}`}>
                    {matrix.status === "active"
                      ? "Ativa"
                      : matrix.status === "draft"
                        ? "Rascunho"
                        : "Arquivada"}
                  </span>
                  <h2>{matrix.name}</h2>
                  <p>{matrix.description || "Sem descrição adicional."}</p>
                </div>
                <BookOpenCheck size={25} />
              </header>
              <div className="matrix-rules">
                <span>
                  <b>{matrix.minimumScore.toFixed(1)}</b> nota mínima
                </span>
                <span>
                  <b>{matrix.maxCategoriesBelowFive}</b> categorias abaixo de 5
                </span>
                <span>
                  <b>{matrix.hasKata ? "Sim" : "Não"}</b> kata
                </span>
              </div>
              {matrix.hasKata && (
                <div className="matrix-kata">
                  <Activity size={17} />{" "}
                  {matrix.kataType === "nage-no-kata-partial"
                    ? "Nage-no-Kata parcial"
                    : matrix.kataType === "nage-no-kata-complete"
                      ? "Nage-no-Kata completo"
                      : "Katame-no-Kata"}
                </div>
              )}
              <details>
                <summary>
                  {matrix.categories.length} categorias ·{" "}
                  {matrix.categories.reduce(
                    (sum, category) => sum + category.techniques.length,
                    0,
                  )}{" "}
                  técnicas <ChevronDown size={17} />
                </summary>
                <div>
                  {matrix.categories.map((category) => (
                    <section key={category.id}>
                      <strong>{category.name}</strong>
                      <p>{category.techniques.join(" · ")}</p>
                    </section>
                  ))}
                </div>
              </details>
              <footer>
                Criada por {matrix.creatorName} em{" "}
                {formatDate(matrix.createdAt)}
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
