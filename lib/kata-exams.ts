export type KataId = "nage-no-kata" | "katame-no-kata";
export type KataMode = "partial" | "complete";

export type KataTechnique = {
  id: string;
  name: string;
  videoTechnique?: string;
};

export type KataGroup = {
  id: string;
  name: string;
  techniques: KataTechnique[];
};

export type KataErrors = {
  small1: boolean;
  small2: boolean;
  medium: boolean;
  large: boolean;
  severe: boolean;
};

export type KataMark = KataErrors & {
  reviewed: boolean;
};

export type KataResult = {
  score: number;
  rawScore: number;
  severeApplied: boolean;
  totalDeductions: number;
  reviewedCount: number;
  groups: { name: string; score: number; deductions: number }[];
  errorCounts: { small: number; medium: number; large: number; severe: number };
  notes?: string;
};

type KataDefinition = {
  id: KataId;
  name: string;
  description: string;
  groups: { id: string; name: string; techniques: string[] }[];
};

export const KATAS: KataDefinition[] = [
  {
    id: "nage-no-kata",
    name: "Nage-no-Kata",
    description: "Cerimônias e formas de projeção organizadas em cinco grupos.",
    groups: [
      { id: "opening", name: "Abertura", techniques: ["Cerimônia de abertura"] },
      { id: "te-waza", name: "Te-waza", techniques: ["Uki-otoshi", "Seoi-nage", "Kata-guruma"] },
      { id: "koshi-waza", name: "Koshi-waza", techniques: ["Uki-goshi", "Harai-goshi", "Tsurikomi-goshi"] },
      { id: "ashi-waza", name: "Ashi-waza", techniques: ["Okuri-ashi-harai", "Sasae-tsurikomi-ashi", "Uchi-mata"] },
      { id: "mae-sutemi-waza", name: "Mae-sutemi-waza", techniques: ["Tomoe-nage", "Ura-nage", "Sumi-gaeshi"] },
      { id: "yoko-sutemi-waza", name: "Yoko-sutemi-waza", techniques: ["Yoko-gake", "Yoko-guruma", "Uki-waza"] },
      { id: "closing", name: "Encerramento", techniques: ["Cerimônia de encerramento"] },
    ],
  },
  {
    id: "katame-no-kata",
    name: "Katame-no-Kata",
    description: "Formas de controle, estrangulamento e chave articular.",
    groups: [
      { id: "opening", name: "Abertura", techniques: ["Cerimônia de abertura"] },
      { id: "osaekomi-waza", name: "Osaekomi-waza", techniques: ["Kesa-gatame", "Kata-gatame", "Kami-shiho-gatame", "Yoko-shiho-gatame", "Kuzure-kami-shiho-gatame"] },
      { id: "shime-waza", name: "Shime-waza", techniques: ["Kata-juji-jime", "Hadaka-jime", "Okuri-eri-jime", "Kataha-jime", "Gyaku-juji-jime"] },
      { id: "kansetsu-waza", name: "Kansetsu-waza", techniques: ["Ude-garami", "Ude-hishigi-juji-gatame", "Ude-hishigi-ude-gatame", "Ude-hishigi-hiza-gatame", "Ashi-garami"] },
      { id: "closing", name: "Encerramento", techniques: ["Cerimônia de encerramento"] },
    ],
  },
];

export const EMPTY_KATA_MARK: KataMark = {
  small1: false,
  small2: false,
  medium: false,
  large: false,
  severe: false,
  reviewed: false,
};

export function createKataExam(kataId: KataId, mode: KataMode): KataGroup[] {
  const kata = KATAS.find((item) => item.id === kataId) ?? KATAS[0];
  const groups =
    kataId === "nage-no-kata" && mode === "partial"
      ? kata.groups.filter((group) =>
          ["opening", "te-waza", "koshi-waza", "ashi-waza", "closing"].includes(
            group.id,
          ),
        )
      : kata.groups;

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    techniques: group.techniques.map((name, index) => ({
      id: `${group.id}-${index}`,
      name,
      videoTechnique: name.toLocaleLowerCase("pt-BR").startsWith("cerimônia") ? undefined : name,
    })),
  }));
}

export function kataMarkDeductions(mark: KataMark | undefined) {
  if (!mark) return 0;
  return (
    Number(mark.small1) +
    Number(mark.small2) +
    Number(mark.medium) * 3 +
    Number(mark.large) * 5 +
    Number(mark.severe) * 10
  );
}

export function calculateKataResult(groups: KataGroup[], marks: Record<string, KataMark>): KataResult {
  const techniques = groups.flatMap((group) => group.techniques);
  const reviewed = techniques.filter((technique) => marks[technique.id]?.reviewed);
  const severeApplied = reviewed.some((technique) => marks[technique.id]?.severe);
  const itemScore = (technique: KataTechnique) => Math.max(0, 10 - kataMarkDeductions(marks[technique.id]));
  const rawScore = reviewed.length
    ? reviewed.reduce((sum, technique) => sum + itemScore(technique), 0) / reviewed.length
    : 10;
  const score = severeApplied ? rawScore / 2 : rawScore;

  const errorCounts = reviewed.reduce((counts, technique) => {
    const mark = marks[technique.id];
    counts.small += Number(mark.small1) + Number(mark.small2);
    counts.medium += Number(mark.medium);
    counts.large += Number(mark.large);
    counts.severe += Number(mark.severe);
    return counts;
  }, { small: 0, medium: 0, large: 0, severe: 0 });

  return {
    score: Math.round(score * 10) / 10,
    rawScore: Math.round(rawScore * 10) / 10,
    severeApplied,
    totalDeductions: reviewed.reduce((sum, technique) => sum + kataMarkDeductions(marks[technique.id]), 0),
    reviewedCount: reviewed.length,
    groups: groups.map((group) => {
      const groupDeductions = group.techniques.reduce((sum, technique) => sum + kataMarkDeductions(marks[technique.id]), 0);
      const groupScore =
        group.techniques.reduce((sum, technique) => sum + itemScore(technique), 0) /
        group.techniques.length;
      return { name: group.name, score: Math.round(groupScore * 10) / 10, deductions: groupDeductions };
    }),
    errorCounts,
  };
}
