import { json } from "./http";

export type ThemeSettings = {
  lightAccent: string;
  darkAccent: string;
  darkBackground: string;
};

type ThemeSettingsRow = {
  light_accent: string;
  dark_accent: string;
  dark_background: string;
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  lightAccent: "#4f7646",
  darkAccent: "#ef4444",
  darkBackground: "#100808",
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first: string, second: string) {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

export function validateThemeSettings(value: unknown): ThemeSettings | string {
  if (!value || typeof value !== "object") return "Informe as três cores do tema.";
  const candidate = value as Partial<ThemeSettings>;
  const colors = [candidate.lightAccent, candidate.darkAccent, candidate.darkBackground];
  if (colors.some((color) => typeof color !== "string" || !HEX_COLOR.test(color))) {
    return "Use cores no formato hexadecimal, como #ef4444.";
  }

  const theme = {
    lightAccent: candidate.lightAccent!.toLowerCase(),
    darkAccent: candidate.darkAccent!.toLowerCase(),
    darkBackground: candidate.darkBackground!.toLowerCase(),
  };
  if (contrast(theme.lightAccent, "#ffffff") < 4.5) {
    return "A cor principal clara precisa ter mais contraste com o branco.";
  }
  if (relativeLuminance(theme.darkBackground) > 0.12) {
    return "O fundo escuro precisa ser realmente escuro para manter a leitura.";
  }
  if (contrast(theme.darkAccent, theme.darkBackground) < 4.5) {
    return "O destaque escuro precisa ter mais contraste com o fundo.";
  }
  return theme;
}

function fromRow(row: ThemeSettingsRow | null): ThemeSettings {
  return row
    ? {
        lightAccent: row.light_accent,
        darkAccent: row.dark_accent,
        darkBackground: row.dark_background,
      }
    : DEFAULT_THEME_SETTINGS;
}

export async function getThemeSettings(request: Request, env: Env) {
  const row = await env.DB.prepare(
    "SELECT light_accent, dark_accent, dark_background FROM theme_settings WHERE id = 1",
  ).first<ThemeSettingsRow>();
  return json(request, env, fromRow(row));
}

export async function updateThemeSettings(request: Request, env: Env) {
  const parsed = validateThemeSettings(await request.json<unknown>());
  if (typeof parsed === "string") {
    return json(request, env, { error: parsed }, 400);
  }

  await env.DB.prepare(
    `INSERT INTO theme_settings (id, light_accent, dark_accent, dark_background, updated_at)
     VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       light_accent = excluded.light_accent,
       dark_accent = excluded.dark_accent,
       dark_background = excluded.dark_background,
       updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(parsed.lightAccent, parsed.darkAccent, parsed.darkBackground)
    .run();

  return json(request, env, parsed);
}
