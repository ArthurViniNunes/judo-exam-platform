"use client";

import { Check, Palette, RotateCcw, Save } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { apiRequest } from "@/lib/api";
import type { ThemeSettings } from "@/lib/platform";
import { DEFAULT_THEME_SETTINGS, THEME_PRESETS } from "@/lib/theme";

type ThemeSettingsViewProps = {
  settings: ThemeSettings;
  onSaved: (settings: ThemeSettings) => void;
};

const fields: Array<{
  key: keyof ThemeSettings;
  label: string;
  help: string;
}> = [
  {
    key: "lightAccent",
    label: "Cor principal · tema claro",
    help: "Botões, ícones e elementos em destaque.",
  },
  {
    key: "darkAccent",
    label: "Cor principal · tema escuro",
    help: "O vermelho forte padrão pode ser trocado aqui.",
  },
  {
    key: "darkBackground",
    label: "Fundo · tema escuro",
    help: "Escolha um tom escuro; as superfícies são calculadas automaticamente.",
  },
];

export function ThemeSettingsView({ settings, onSaved }: ThemeSettingsViewProps) {
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const choose = (next: ThemeSettings) => {
    setDraft(next);
    setSaved(false);
    setError("");
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const next = await apiRequest<ThemeSettings>("/api/settings/theme", {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      onSaved(next);
      setDraft(next);
      setSaved(true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Não foi possível salvar as cores.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="management-page theme-settings-page">
      <header className="management-page-heading">
        <div>
          <h1>Aparência</h1>
          <p>
            Defina a identidade visual da aplicação. A alteração é global e será
            aplicada para todos os avaliadores.
          </p>
        </div>
      </header>

      <section className="theme-settings-grid">
        <div className="theme-editor-card">
          <div className="theme-section-heading">
            <span><Palette size={20} /></span>
            <div>
              <h2>Escolha uma combinação</h2>
              <p>Use um modelo pronto ou personalize cada cor abaixo.</p>
            </div>
          </div>

          <div className="theme-presets" role="list" aria-label="Combinações prontas">
            {THEME_PRESETS.map((preset) => {
              const selected = JSON.stringify(draft) === JSON.stringify(preset.colors);
              return (
                <button
                  key={preset.name}
                  type="button"
                  className={selected ? "selected" : ""}
                  onClick={() => choose(preset.colors)}
                  aria-pressed={selected}
                >
                  <span className="theme-preset-colors" aria-hidden="true">
                    <i style={{ background: preset.colors.lightAccent }} />
                    <i style={{ background: preset.colors.darkBackground }} />
                    <i style={{ background: preset.colors.darkAccent }} />
                  </span>
                  <span><strong>{preset.name}</strong><small>{preset.description}</small></span>
                  {selected && <Check size={17} />}
                </button>
              );
            })}
          </div>

          <div className="theme-color-fields">
            {fields.map((field) => (
              <label key={field.key}>
                <span><strong>{field.label}</strong><small>{field.help}</small></span>
                <span className="theme-color-control">
                  <input
                    type="color"
                    value={draft[field.key]}
                    onChange={(event) => choose({ ...draft, [field.key]: event.target.value })}
                    aria-label={field.label}
                  />
                  <code>{draft[field.key].toUpperCase()}</code>
                </span>
              </label>
            ))}
          </div>

          {error && <p className="management-error" role="alert">{error}</p>}
          {saved && (
            <p className="management-success" role="status">
              <Check size={17} /> Cores atualizadas para toda a plataforma.
            </p>
          )}
          <div className="theme-editor-actions">
            <button
              type="button"
              className="management-secondary"
              onClick={() => choose(DEFAULT_THEME_SETTINGS)}
            >
              <RotateCcw size={17} /> Restaurar padrão
            </button>
            <button
              type="button"
              className="management-primary"
              disabled={saving || JSON.stringify(draft) === JSON.stringify(settings)}
              onClick={() => void save()}
            >
              <Save size={17} /> {saving ? "Salvando…" : "Salvar para todos"}
            </button>
          </div>
        </div>

        <aside className="theme-preview-card" aria-label="Prévia das cores">
          <div
            className="theme-preview light-preview"
            style={{ "--preview-accent": draft.lightAccent } as CSSProperties}
          >
            <small>Tema claro</small>
            <strong>Exame de graduação</strong>
            <span>Judoca selecionado</span>
            <button type="button" tabIndex={-1}>Continuar</button>
          </div>
          <div
            className="theme-preview dark-preview"
            style={{
              "--preview-accent": draft.darkAccent,
              "--preview-background": draft.darkBackground,
            } as CSSProperties}
          >
            <small>Tema escuro</small>
            <strong>Exame de graduação</strong>
            <span>Judoca selecionado</span>
            <button type="button" tabIndex={-1}>Continuar</button>
          </div>
          <p>A prévia muda na hora; a plataforma inteira muda depois de salvar.</p>
        </aside>
      </section>
    </div>
  );
}
