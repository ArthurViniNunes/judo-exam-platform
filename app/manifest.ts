import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Exames de Faixa | Judô Rogério Cruz",
    short_name: "Exames AJRC",
    description: "Avaliações de faixa e kata da Associação Judô Rogério Cruz.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f2f4f3",
    theme_color: "#8f171d",
    lang: "pt-BR",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
