import type { ThemeSettings } from "./platform";

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  lightAccent: "#4f7646",
  darkAccent: "#ef4444",
  darkBackground: "#100808",
};

export const THEME_PRESETS: Array<{
  name: string;
  description: string;
  colors: ThemeSettings;
}> = [
  {
    name: "Dojo vermelho",
    description: "Verde institucional no claro e vermelho forte no escuro.",
    colors: DEFAULT_THEME_SETTINGS,
  },
  {
    name: "Vermelho integral",
    description: "Identidade vermelha nos dois modos.",
    colors: {
      lightAccent: "#a61b1b",
      darkAccent: "#ff5252",
      darkBackground: "#0d0707",
    },
  },
  {
    name: "Azul profundo",
    description: "Azul sóbrio com fundo quase preto.",
    colors: {
      lightAccent: "#24568f",
      darkAccent: "#60a5fa",
      darkBackground: "#07101d",
    },
  },
  {
    name: "Roxo intenso",
    description: "Roxo contrastante sem tons rosados.",
    colors: {
      lightAccent: "#6236a0",
      darkAccent: "#a78bfa",
      darkBackground: "#0d0915",
    },
  },
];
