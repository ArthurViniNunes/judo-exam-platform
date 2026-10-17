export const CATEGORY_ORDER = [
  "Nage Waza",
  "Renraku-Henka Waza",
  "Kaeshi Waza",
  "Osaekomi Waza",
  "Shime Waza",
  "Kansetsu Waza",
] as const;

export type PracticalCategory = (typeof CATEGORY_ORDER)[number];
export type PracticalBeltId = "gray" | "blue" | "yellow" | "orange" | "green" | "purple" | "brown";

type DrawRule = {
  count: number;
  from: PracticalBeltId;
};

type CategoryDefinition = {
  fixed: string[];
  draws?: DrawRule[];
};

export type PracticalBelt = {
  id: PracticalBeltId;
  name: string;
  kyu: string;
  color: string;
  categories: Partial<Record<PracticalCategory, CategoryDefinition>>;
};

export type ExamTechnique = {
  id: string;
  name: string;
  drawnFrom?: string;
};

export type ExamCategory = {
  name: PracticalCategory;
  techniques: ExamTechnique[];
};

// Convenção obrigatória: Renraku-Henka usa "→" e Kaeshi usa "×".
// Mesmo quando o par de técnicas é igual, mantenha as duas grafias para que
// cada categoria tenha sua própria chave de vídeo e não haja troca de referência.
export const PRACTICAL_BELTS: PracticalBelt[] = [
  {
    id: "gray",
    name: "Cinza",
    kyu: "7º Kyu",
    color: "#a5a9ad",
    categories: {
      "Nage Waza": { fixed: ["O-soto-gari", "Ippon-seoi-nage", "O-uchi-gari", "De-ashi-harai"] },
      "Renraku-Henka Waza": { fixed: ["De-ashi-harai → O-soto-gari", "O-soto-gari → O-soto-otoshi"] },
      "Osaekomi Waza": { fixed: ["Kesa-gatame", "Kami-shiho-gatame", "Yoko-shiho-gatame"] },
    },
  },
  {
    id: "blue",
    name: "Azul",
    kyu: "6º Kyu",
    color: "#3977c5",
    categories: {
      "Nage Waza": { fixed: ["De-ashi-harai", "O-goshi", "O-soto-gari", "Uki-goshi", "O-uchi-gari", "Ippon-seoi-nage"] },
      "Renraku-Henka Waza": { fixed: ["De-ashi-harai → O-soto-gari", "O-soto-gari → O-soto-otoshi", "O-uchi-gari → Ippon-seoi-nage"] },
      "Kaeshi Waza": { fixed: ["O-soto-gari × O-soto-gaeshi", "De-ashi-harai × Tsubame-gaeshi", "O-uchi-gari × Ippon-seoi-nage"] },
      "Osaekomi Waza": { fixed: ["Kesa-gatame", "Kuzure-kesa-gatame", "Kami-shiho-gatame", "Yoko-shiho-gatame"] },
    },
  },
  {
    id: "yellow",
    name: "Amarela",
    kyu: "5º Kyu",
    color: "#e4bd21",
    categories: {
      "Nage Waza": { fixed: ["De-ashi-harai", "Hiza-guruma", "Sasae-tsurikomi-ashi", "Uki-goshi", "O-soto-gari", "O-goshi", "O-uchi-gari", "Seoi-nage"] },
      "Renraku-Henka Waza": { fixed: ["Sasae-tsurikomi-ashi → O-soto-gari", "Seoi-nage → Seoi-otoshi", "De-ashi-harai → O-soto-gari", "O-soto-gari → O-soto-otoshi", "Ippon-seoi-nage → O-soto-gari"] },
      "Kaeshi Waza": { fixed: ["De-ashi-harai × Tsubame-gaeshi", "O-soto-gari × O-soto-gaeshi", "O-uchi-gari × Ippon-seoi-nage", "Uki-goshi × O-goshi"] },
      "Osaekomi Waza": { fixed: ["Kesa-gatame", "Kuzure-kesa-gatame", "Ushiro-kesa-gatame", "Kami-shiho-gatame", "Yoko-shiho-gatame"] },
      "Shime Waza": { fixed: ["Nami-juji-jime", "Kata-juji-jime", "Gyaku-juji-jime", "Hadaka-jime"] },
      "Kansetsu Waza": { fixed: ["Ude-garami", "Ude-hishigi-juji-gatame", "Ude-hishigi-ude-gatame"] },
    },
  },
  {
    id: "orange",
    name: "Laranja",
    kyu: "4º Kyu",
    color: "#e87f20",
    categories: {
      "Nage Waza": { draws: [{ count: 3, from: "yellow" }], fixed: ["Ko-soto-gari", "Ko-uchi-gari", "Koshi-guruma", "Tsurikomi-goshi", "Okuri-ashi-harai", "Tai-otoshi", "Harai-goshi", "Uchi-mata"] },
      "Renraku-Henka Waza": { draws: [{ count: 2, from: "yellow" }], fixed: ["O-uchi-gari → Ko-uchi-gari", "Uchi-mata → Ko-uchi-gari", "Uchi-mata → Ko-uchi-makikomi", "Uki-goshi → Harai-goshi", "Harai-goshi → Tsurikomi-goshi"] },
      "Kaeshi Waza": { draws: [{ count: 2, from: "yellow" }], fixed: ["Ko-uchi-gari × Ko-uchi-gaeshi", "O-goshi × Koshi-guruma", "O-soto-gari × Harai-goshi", "Uchi-mata × Uchi-mata-sukashi", "Hiza-guruma × Kibisu-gaeshi", "Koshi-guruma × Sode-tsurikomi-goshi"] },
      "Osaekomi Waza": { fixed: ["Kesa-gatame", "Kuzure-kesa-gatame", "Ushiro-kesa-gatame", "Kami-shiho-gatame", "Yoko-shiho-gatame", "Kata-gatame", "Tate-shiho-gatame", "Fuga de Kuzure-kesa-gatame", "Fuga de Kami-shiho-gatame", "Fuga da Guarda Fechada"] },
      "Shime Waza": { fixed: ["Nami-juji-jime", "Kata-juji-jime", "Gyaku-juji-jime", "Hadaka-jime", "Okuri-eri-jime", "Kataha-jime", "Sankaku-jime"] },
      "Kansetsu Waza": { fixed: ["Ude-garami", "Ude-hishigi-juji-gatame", "Ude-hishigi-ude-gatame", "Ude-hishigi-sankaku-gatame", "Ude-hishigi-ashi-gatame"] },
    },
  },
  {
    id: "green",
    name: "Verde",
    kyu: "3º Kyu",
    color: "#4e9858",
    categories: {
      "Nage Waza": { draws: [{ count: 2, from: "yellow" }, { count: 2, from: "orange" }], fixed: ["Ko-soto-gake", "Tsuri-goshi", "Yoko-otoshi", "Ashi-guruma", "Hane-goshi", "Harai-tsurikomi-ashi", "Tomoe-nage", "Kata-guruma"] },
      "Renraku-Henka Waza": { draws: [{ count: 2, from: "yellow" }, { count: 2, from: "orange" }], fixed: ["O-uchi-gari → Tomoe-nage", "Hiza-guruma → Ashi-guruma", "Ippon-seoi-nage → Kata-guruma", "O-uchi-gari → Kuchiki-taoshi", "O-uchi-gari → Harai-tsurikomi-ashi", "O-uchi-gari → Uchi-mata → Tai-otoshi"] },
      "Kaeshi Waza": { draws: [{ count: 2, from: "yellow" }, { count: 2, from: "orange" }], fixed: ["O-uchi-gari × Tomoe-nage", "O-goshi × Tsuri-goshi", "Ko-uchi-gari × Harai-tsurikomi-ashi", "Koshi-guruma × Daki-wakare", "Uchi-mata × Uchi-mata-gaeshi", "Ko-soto-gake × Uchi-mata"] },
      "Osaekomi Waza": { fixed: ["Kesa-gatame", "Kuzure-kesa-gatame", "Ushiro-kesa-gatame", "Kami-shiho-gatame", "Yoko-shiho-gatame", "Kata-gatame", "Tate-shiho-gatame", "Kuzure-kami-shiho-gatame", "Ura-gatame", "2 Fugas de Kuzure-kesa-gatame", "Fuga de Kami-shiho-gatame", "Fuga de Yoko-shiho-gatame", "Fuga de Kata-gatame", "2 Fugas da Guarda Fechada", "Fuga da Meia-Guarda"] },
      "Shime Waza": { fixed: ["Nami-juji-jime", "Kata-juji-jime", "Gyaku-juji-jime", "Hadaka-jime", "Okuri-eri-jime", "Kataha-jime", "Sankaku-jime", "Ryote-jime", "Sode-guruma-jime", "Tsukkomi-jime", "Fuga de Kata-juji-jime", "Fuga de Hadaka-jime"] },
      "Kansetsu Waza": { fixed: ["Ude-garami", "Ude-hishigi-juji-gatame", "Ude-hishigi-ude-gatame", "Ude-hishigi-sankaku-gatame", "Ude-hishigi-ashi-gatame", "Ude-hishigi-waki-gatame", "Ude-hishigi-hara-gatame", "Ude-hishigi-te-gatame", "Fuga de Ude-hishigi-juji-gatame"] },
    },
  },
  {
    id: "purple",
    name: "Roxa",
    kyu: "2º Kyu",
    color: "#805aa4",
    categories: {
      "Nage Waza": { draws: [{ count: 1, from: "yellow" }, { count: 2, from: "orange" }, { count: 2, from: "green" }], fixed: ["Sumi-gaeshi", "Tani-otoshi", "Hane-makikomi", "Sukui-nage", "Utsuri-goshi", "O-guruma", "Soto-makikomi", "Uki-otoshi"] },
      "Renraku-Henka Waza": { draws: [{ count: 1, from: "yellow" }, { count: 2, from: "orange" }, { count: 2, from: "green" }], fixed: ["Ippon-seoi-nage → Uchi-makikomi", "Koshi-guruma → Soto-makikomi", "O-soto-gari → Tani-otoshi", "Uchi-mata → Sumi-gaeshi", "Tsuri-goshi → Obi-tori-gaeshi", "O-uchi-gari → Yoko-shiho-gatame", "1 transição de Tachi-waza → Ne-waza"] },
      "Kaeshi Waza": { draws: [{ count: 1, from: "yellow" }, { count: 2, from: "orange" }, { count: 2, from: "green" }], fixed: ["Harai-goshi × Sukui-nage (Te-guruma)", "O-uchi-gari × O-uchi-gaeshi", "O-soto-gari × Uki-otoshi", "O-soto-gari × O-soto-makikomi", "Koshi-guruma × Obi-otoshi", "O-soto-gari × Utsuri-goshi", "Morote-gari × Tawara-gaeshi", "Tomoe-nage × Ne Waza", "Seoi-otoshi × Kansetsu Waza"] },
      "Osaekomi Waza": { fixed: ["Kesa-gatame", "Kuzure-kesa-gatame", "Ushiro-kesa-gatame", "Kami-shiho-gatame", "Yoko-shiho-gatame", "Kata-gatame", "Tate-shiho-gatame", "Kuzure-kami-shiho-gatame", "Ura-gatame", "Uki-gatame", "2 Fugas de Kuzure-kesa-gatame", "Fuga de Kami-shiho-gatame", "2 Fugas de Yoko-shiho-gatame", "Fuga de Kata-gatame", "Fuga da Meia-Guarda", "2 Fugas da Guarda Fechada"] },
      "Shime Waza": { fixed: ["Nami-juji-jime", "Kata-juji-jime", "Gyaku-juji-jime", "Hadaka-jime", "Okuri-eri-jime", "Kataha-jime", "Sankaku-jime", "Ryote-jime", "Sode-guruma-jime", "Tsukkomi-jime", "Katate-jime", "Do-jime", "Fuga de Kata-juji-jime", "Fuga de Hadaka-jime"] },
      "Kansetsu Waza": { fixed: ["Ude-garami", "Ude-hishigi-juji-gatame", "Ude-hishigi-ude-gatame", "Ude-hishigi-sankaku-gatame", "Ude-hishigi-ashi-gatame", "Ude-hishigi-waki-gatame", "Ude-hishigi-hara-gatame", "Ude-hishigi-te-gatame", "Ude-hishigi-hiza-gatame", "Ashi-garami", "2 Fugas de Ude-hishigi-juji-gatame", "Fuga de Ude-hishigi-sankaku-gatame"] },
    },
  },
  {
    id: "brown",
    name: "Marrom",
    kyu: "1º Kyu",
    color: "#704b37",
    categories: {
      "Nage Waza": { draws: [{ count: 1, from: "yellow" }, { count: 1, from: "orange" }, { count: 2, from: "green" }, { count: 2, from: "purple" }], fixed: ["O-soto-guruma", "Yoko-wakare", "Ushiro-goshi", "Sumi-otoshi", "Uki-waza", "Yoko-guruma", "Ura-nage", "Yoko-gake"] },
      "Renraku-Henka Waza": { draws: [{ count: 1, from: "yellow" }, { count: 1, from: "orange" }, { count: 2, from: "green" }, { count: 2, from: "purple" }], fixed: ["O-soto-gari → O-soto-guruma", "Kata-guruma → Uki-waza", "Hiza-guruma → Sumi-otoshi", "Sasae-tsurikomi-ashi → Yoko-gake", "Ko-uchi-gari → Yama-arashi", "2 transições de Tachi-waza → Ne-waza"] },
      "Kaeshi Waza": { draws: [{ count: 1, from: "yellow" }, { count: 1, from: "orange" }, { count: 2, from: "green" }, { count: 2, from: "purple" }], fixed: ["O-goshi × Yoko-wakare", "Hane-goshi × Ushiro-goshi", "Uchi-mata × Yoko-guruma", "Ippon-seoi-nage × Uki-waza", "Koshi-guruma × Ura-nage", "Tomoe-nage × Ne Waza", "Koshi-guruma × Kansetsu-waza", "Seoi-otoshi × Kansetsu-waza"] },
      "Osaekomi Waza": { fixed: ["Kesa-gatame", "Kuzure-kesa-gatame", "Ushiro-kesa-gatame", "Kami-shiho-gatame", "Yoko-shiho-gatame", "Kata-gatame", "Tate-shiho-gatame", "Kuzure-kami-shiho-gatame", "Ura-gatame", "Uki-gatame", "2 Fugas de Kuzure-kesa-gatame", "2 Fugas de Kami-shiho-gatame", "2 Fugas de Yoko-shiho-gatame", "Fuga de Kata-gatame", "2 Fugas da Meia-Guarda", "2 Fugas da Guarda Fechada"] },
      "Shime Waza": { fixed: ["Nami-juji-jime", "Kata-juji-jime", "Gyaku-juji-jime", "Hadaka-jime", "Okuri-eri-jime", "Kataha-jime", "Sankaku-jime", "Ryote-jime", "Sode-guruma-jime", "Tsukkomi-jime", "Katate-jime", "Do-jime", "Fuga de Kata-juji-jime", "Fuga de Hadaka-jime"] },
      "Kansetsu Waza": { fixed: ["Ude-garami", "Ude-hishigi-juji-gatame", "Ude-hishigi-ude-gatame", "Ude-hishigi-sankaku-gatame", "Ude-hishigi-ashi-gatame", "Ude-hishigi-waki-gatame", "Ude-hishigi-hara-gatame", "Ude-hishigi-te-gatame", "Ude-hishigi-hiza-gatame", "Ashi-garami", "2 Fugas de Ude-hishigi-juji-gatame", "Fuga de Ude-hishigi-sankaku-gatame"] },
    },
  },
];

// Cadastre aqui os vídeos. A chave precisa ser exatamente o nome da técnica.
// Aceita links youtube.com/watch, youtu.be, shorts ou embed.
export const TECHNIQUE_VIDEOS: Record<string, string> = {
  "O-soto-gari": "https://www.youtube.com/watch?v=c-A_nP7mKAc",
  "Ippon-seoi-nage": "https://www.youtube.com/watch?v=FQnOlCxo4oI",
  "O-uchi-gari": "https://www.youtube.com/watch?v=0itJFhV9pDQ",
  "De-ashi-harai": "https://www.youtube.com/watch?v=4BUUvqxi_Kk",
  "De-ashi-harai → O-soto-gari": "https://youtu.be/NOlxrsXpaOQ?si=fw4BPwnqeNogkEGO",
  "O-soto-gari → O-soto-otoshi": "https://www.youtube.com/watch?v=rF6ZpAAH1ME",
  "Kesa-gatame": "https://www.youtube.com/watch?v=NDaQuJOFBYk",
  "Kami-shiho-gatame": "https://www.youtube.com/watch?v=HFuMjOv0WN8",
  "Yoko-shiho-gatame": "https://www.youtube.com/watch?v=TT7XJVSEQxA",
  "O-goshi": "https://www.youtube.com/watch?v=yhu1mfy2vJ4",
  "Uki-goshi": "https://www.youtube.com/watch?v=bPKwtB4lyOQ",
  "O-uchi-gari → Ippon-seoi-nage": "https://youtu.be/gFkX2H8AHg0?si=Bd1ZLrrdvsgCtH_S",
  "O-uchi-gari × Ippon-seoi-nage": "https://youtu.be/dKSx8WfsFrQ?si=kColAg0EP1sN6Irt",
  "O-soto-gari × O-soto-gaeshi": "https://youtu.be/xFn6-LqP-Dk?si=TlVlxqGMtUhIbzhS",
  "De-ashi-harai × Tsubame-gaeshi": "https://youtu.be/sPzyhPhLWwU?si=VORfaFGe3K1YN6a9",
  "Kuzure-kesa-gatame": "https://www.youtube.com/watch?v=Q2fb9jaoUFQ",
  "Hiza-guruma": "https://www.youtube.com/watch?v=JPJx9-oAVns",
  "Sasae-tsurikomi-ashi": "https://www.youtube.com/watch?v=699i--pvYmE",
  "Seoi-nage": "https://www.youtube.com/watch?v=zIq0xI0ogxk",
  "Sasae-tsurikomi-ashi → O-soto-gari": "https://youtu.be/CNPNY3J-69k?si=PIlaHQDNlC83XAhT",
  "Seoi-nage → Seoi-otoshi": "https://youtu.be/OqcEsriaI1Y?si=xXXyQhgIwdOjBwx_",
  "Ippon-seoi-nage → O-soto-gari": "https://youtube.com/shorts/qzyZLc1dNBQ?si=ofetK3wPpI-BaO1i",
  "Uki-goshi × O-goshi": "",
  "Ushiro-kesa-gatame": "https://www.youtube.com/watch?v=SBapox2M2dE",
  "Nami-juji-jime": "https://www.youtube.com/watch?v=k2cHry9HByQ",
  "Kata-juji-jime": "https://www.youtube.com/watch?v=3VZVUAmiMD8",
  "Gyaku-juji-jime": "https://www.youtube.com/watch?v=t3tQriIPdlI",
  "Hadaka-jime": "https://www.youtube.com/watch?v=9f0n8jez7iA",
  "Ude-garami": "https://www.youtube.com/watch?v=AIlTvZb4RlE",
  "Ude-hishigi-juji-gatame": "https://www.youtube.com/watch?v=OWgSOlCuMXw",
  "Ude-hishigi-ude-gatame": "https://www.youtube.com/watch?v=SBf0aTma1VI",
  "Ko-soto-gari": "https://www.youtube.com/watch?v=jeQ541ScLB4",
  "Ko-uchi-gari": "https://www.youtube.com/watch?v=3Jb3tZvr9Ng",
  "Koshi-guruma": "https://www.youtube.com/watch?v=SU7Id6uVJ44",
  "Tsurikomi-goshi": "https://www.youtube.com/watch?v=McfzA0yRVt4",
  "Okuri-ashi-harai": "https://www.youtube.com/watch?v=nw1ZdRjrdRI",
  "Tai-otoshi": "https://www.youtube.com/watch?v=4x6S3Q-Ktv8",
  "Harai-goshi": "https://www.youtube.com/watch?v=qTo8HlAAkOo",
  "Uchi-mata": "https://www.youtube.com/watch?v=iUpSu5J-bgw",
  "O-uchi-gari → Ko-uchi-gari": "https://youtu.be/pJdSJRWI0oE?si=C0wxS1myer6vQw93",
  "Uchi-mata → Ko-uchi-gari": "https://youtu.be/wVqHdlqUHps?si=1lpnpYorSYrHm3EH",
  "Uchi-mata → Ko-uchi-makikomi": "https://youtu.be/wVqHdlqUHps?si=R35qxh6ERExqVwjn",
  "Uki-goshi → Harai-goshi": "https://youtu.be/5riwuGsymQc?si=jJx5UcAVuDlDQUmG",
  "Harai-goshi → Tsurikomi-goshi": "",
  "Ko-uchi-gari × Ko-uchi-gaeshi": "https://youtu.be/_MWAdYi_LC4?si=fjKha-sEdsJAsYNU",
  "O-goshi × Koshi-guruma": "https://youtu.be/BU2X1xDeajE?si=RJoFf_nlilbBAxGc",
  "O-soto-gari × Harai-goshi": "https://youtu.be/qAFXYa_RG6A?si=QT7FzIhFtZ5MfcxZ",
  "Uchi-mata × Uchi-mata-sukashi": "https://youtu.be/V-RS3uhtVWM?si=zLbe5xVyD6GW0tlF",
  "Hiza-guruma × Kibisu-gaeshi": "https://youtu.be/tcOmL4a9mj8?si=y3nBGP-unghVrAaH",
  "Koshi-guruma × Sode-tsurikomi-goshi": "",
  "Kata-gatame": "https://www.youtube.com/watch?v=zQR3IOXxO_Q",
  "Tate-shiho-gatame": "https://www.youtube.com/watch?v=55-rFmBx53g",
  "Fuga de Kuzure-kesa-gatame": "https://youtu.be/-zFQ6h4yKT4?si=U0Rs7mZCW6SjXUIi",
  "Fuga de Kami-shiho-gatame": "https://youtu.be/seGsXy9I4G8?si=CstcWTfXZXVw69q8",
  "Fuga da Guarda Fechada": "https://youtu.be/JMJBjnst_DA?si=ED6yFb-Kwc8Jd9fc",
  "Okuri-eri-jime": "https://www.youtube.com/watch?v=EiqyoVcIAi8",
  "Kataha-jime": "https://www.youtube.com/watch?v=yaTGgRjnwB8",
  "Sankaku-jime": "https://www.youtube.com/watch?v=lq1CUBRAm7s",
  "Ude-hishigi-sankaku-gatame": "https://www.youtube.com/watch?v=WefAmW4azhk",
  "Ude-hishigi-ashi-gatame": "https://www.youtube.com/watch?v=ClY7g_pX-4s",
  "Ko-soto-gake": "https://www.youtube.com/watch?v=8b6kY4s4zH4",
  "Tsuri-goshi": "https://www.youtube.com/watch?v=51Htlp7xEvE",
  "Yoko-otoshi": "https://www.youtube.com/watch?v=MnNG67pF_a0",
  "Ashi-guruma": "https://www.youtube.com/watch?v=ROeayhvom9U",
  "Hane-goshi": "https://www.youtube.com/watch?v=M9_7De6A1kk",
  "Harai-tsurikomi-ashi": "https://www.youtube.com/watch?v=gGPXvWL8VbE",
  "Tomoe-nage": "https://www.youtube.com/watch?v=880WbHvHv6A",
  "Kata-guruma": "https://www.youtube.com/watch?v=cnHRhSy8yi4",
  "O-uchi-gari → Tomoe-nage": "https://youtu.be/xtGeW6RFtfM?si=M6flHL1iUhk6w6Ki",
  "O-uchi-gari × Tomoe-nage": "https://youtu.be/FeF0pq0ce6s?si=XHHqA44rigL_OjGC",
  "Hiza-guruma → Ashi-guruma": "https://youtu.be/u6niEfbmTng?si=Rdj-p6cRH_dY7ry8",
  "Ippon-seoi-nage → Kata-guruma": "https://youtu.be/qQUK9Lz42_E?si=qzjF7PUrfIAjZuf0",
  "O-uchi-gari → Kuchiki-taoshi": "https://youtu.be/S-HdKH8upCg?si=fXoNcLWcPCJZEO9-",
  "O-uchi-gari → Harai-tsurikomi-ashi": "https://youtu.be/b6FRv6AfEC0?si=-VYjRcZ_g5sNx75n",
  "O-uchi-gari → Uchi-mata → Tai-otoshi": "https://youtu.be/Q8IGAF9tNKA?si=bF-PjA_WSbAnVcAE&t=129",
  "O-goshi × Tsuri-goshi": "https://youtu.be/kJLmTFtwkWM?si=WktEDcg-POxW2bZ6",
  "Ko-uchi-gari × Harai-tsurikomi-ashi": "https://youtu.be/J2TPisK9ECk?si=hKrEsjwjwALHEcmT",
  "Koshi-guruma × Daki-wakare": "https://youtu.be/Hr0cOMGBDYo?si=SWA0y9D3BW8vyVSU",
  "Uchi-mata × Uchi-mata-gaeshi": "https://youtu.be/Sy6sLWxkWYw?si=7oLjQJWiBIpCFkEj",
  "Ko-soto-gake × Uchi-mata": "https://youtu.be/N78tAtufsyU?si=xDp0z-F7blTuAzHJ",
  "Kuzure-kami-shiho-gatame": "https://www.youtube.com/watch?v=YUrogQWdwiY",
  "Ura-gatame": "https://www.youtube.com/watch?v=eeAHZB0v3XY",
  "2 Fugas de Kuzure-kesa-gatame": "https://youtu.be/-zFQ6h4yKT4?si=BYesJRCuDlxVSiOe",
  "Fuga de Yoko-shiho-gatame": "https://youtu.be/yK_GSamSPko?si=Igbw_m32QnxJ3YGJ",
  "Fuga de Kata-gatame": "https://youtu.be/7hP1-W2yovk?si=Cn7lEYJsq9LYTADL",
  "2 Fugas da Guarda Fechada": "https://youtu.be/JMJBjnst_DA?si=ED6yFb-Kwc8Jd9fc",
  "Fuga da Meia-Guarda": "https://youtu.be/duNtLmhXeuo?si=sjCcJeUoww9ZxyG9&t=7",
  "Ryote-jime": "https://www.youtube.com/watch?v=-RHC4V7TQiY",
  "Sode-guruma-jime": "https://www.youtube.com/watch?v=E3nvQzClcAU",
  "Tsukkomi-jime": "https://www.youtube.com/watch?v=dKKpnD3eLcY",
  "Fuga de Kata-juji-jime": "",
  "Fuga de Hadaka-jime": "",
  "Ude-hishigi-waki-gatame": "https://www.youtube.com/watch?v=8F5p1zuJRG0",
  "Ude-hishigi-hara-gatame": "https://www.youtube.com/watch?v=ZzEycg8R_9M",
  "Ude-hishigi-te-gatame": "https://www.youtube.com/watch?v=6DnvhY0tQVM",
  "Fuga de Ude-hishigi-juji-gatame": "https://youtu.be/wIvdU00BdtU?si=Ev_DxnR3PkeGeyHQ",
  "Sumi-gaeshi": "https://www.youtube.com/watch?v=5VhduA5xkbA",
  "Tani-otoshi": "https://www.youtube.com/watch?v=3b9Me3Fohpk",
  "Hane-makikomi": "https://www.youtube.com/watch?v=6CRBGLGz9j8",
  "Sukui-nage": "https://www.youtube.com/watch?v=vU6aJ2kFxoI",
  "Utsuri-goshi": "https://www.youtube.com/watch?v=4pQd_bEnlf0",
  "O-guruma": "https://www.youtube.com/watch?v=SnZciTAY9vc",
  "Soto-makikomi": "https://www.youtube.com/watch?v=bWG9O1BVKtQ",
  "Uki-otoshi": "https://www.youtube.com/watch?v=6H5tmncOY4Q",
  "Ippon-seoi-nage → Uchi-makikomi": "https://youtu.be/7OuHtWlqZCw?si=TTtwvbkMG0XpLkAA",
  "Koshi-guruma → Soto-makikomi": "https://youtu.be/vIBQTlNrSW0?si=0tvYLdqJh8uxOsyi",
  "O-soto-gari → Tani-otoshi": "https://youtu.be/R4Uau0szBIc?si=HsZcC2NA7qpfzS31",
  "Uchi-mata → Sumi-gaeshi": "https://youtu.be/SeiaysRlIVk?si=glNKRl7uv_MbIN7J",
  "Tsuri-goshi → Obi-tori-gaeshi": "",
  "O-uchi-gari → Yoko-shiho-gatame": "https://youtu.be/EvmCC2kfm3M?si=WowtSITZpUDSkBgc",
  "1 transição de Tachi-waza → Ne-waza": "https://youtu.be/EvmCC2kfm3M?si=WowtSITZpUDSkBgc",
  "Harai-goshi × Sukui-nage (Te-guruma)": "https://youtu.be/ayeyjigNxe8?si=W3x_Xrubgb8dMKRo",
  "O-uchi-gari × O-uchi-gaeshi": "https://youtu.be/dCyZTXyjIXE?si=FMO9ZLRzaGAvBEy0",
  "O-soto-gari × Uki-otoshi": "https://youtu.be/xuHJFKJp290?si=Xsq_mp0OfHB2lFQC",
  "O-soto-gari × O-soto-makikomi": "",
  "Koshi-guruma × Obi-otoshi": "https://youtu.be/kgpaX241J9A?si=y8xNgcEEa4vNJQxS",
  "O-soto-gari × Utsuri-goshi": "https://youtu.be/CdG2zVCePbY?si=UIuaPx_UfV9br9fs",
  "Morote-gari × Tawara-gaeshi": "https://youtu.be/VEcuA-5sVcU?si=D6shtMU6SPcR0P_B",
  "Tomoe-nage × Ne Waza": "https://youtu.be/KntCJxSN21o?si=4ln14T6JDqDLsefS",
  "Seoi-otoshi × Kansetsu Waza": "",
  "Uki-gatame": "https://www.youtube.com/watch?v=e_lAjik1SUM",
  "2 Fugas de Yoko-shiho-gatame": "https://youtu.be/yK_GSamSPko?si=Igbw_m32QnxJ3YGJ",
  "Katate-jime": "https://www.youtube.com/watch?v=cHeIs-fSqwE",
  "Do-jime": "https://www.youtube.com/watch?v=D_0fFcoIbvY",
  "Ude-hishigi-hiza-gatame": "https://www.youtube.com/watch?v=H2HtAJdiJcE",
  "Ashi-garami": "https://www.youtube.com/watch?v=BWWb0GoAtZw",
  "2 Fugas de Ude-hishigi-juji-gatame": "https://youtu.be/wIvdU00BdtU?si=ptm7uNdSKvAKps-w",
  "Fuga de Ude-hishigi-sankaku-gatame": "",
  "O-soto-guruma": "https://www.youtube.com/watch?v=92KbCm6pQeI",
  "Yoko-wakare": "https://www.youtube.com/watch?v=bp1tscHlePI",
  "Ushiro-goshi": "https://www.youtube.com/watch?v=ORIYstuxYT8",
  "Sumi-otoshi": "https://www.youtube.com/watch?v=lLU9wv52ni0",
  "Uki-waza": "https://www.youtube.com/watch?v=weVOpJ63gII",
  "Yoko-guruma": "https://www.youtube.com/watch?v=MehP6I5cY2c",
  "Ura-nage": "https://www.youtube.com/watch?v=Fgi9b8DJ5sQ",
  "Yoko-gake": "https://www.youtube.com/watch?v=tP1Sj1uDfSo",
  "O-soto-gari → O-soto-guruma": "https://youtu.be/KMl8CrUhY8M?si=nxD-3CHXH1FP30Qg",
  "Kata-guruma → Uki-waza": "https://youtu.be/Li-49Ca7nbs?si=9IJYAVuTGdDtbLvH",
  "Hiza-guruma → Sumi-otoshi": "https://youtu.be/Q3nVh7_QOoI?si=tOxfYAXIUdtzsopC",
  "Sasae-tsurikomi-ashi → Yoko-gake": "",
  "Ko-uchi-gari → Yama-arashi": "",
  "2 transições de Tachi-waza → Ne-waza": "https://youtu.be/EvmCC2kfm3M?si=WowtSITZpUDSkBgc",
  "O-goshi × Yoko-wakare": "https://youtu.be/UURQeN0S0nU?si=v_ZeEON42Tx7tF62",
  "Hane-goshi × Ushiro-goshi": "https://youtu.be/Zud6TBkX5EA?si=Nxje7rFsCYAmXLCL",
  "Uchi-mata × Yoko-guruma": "https://youtu.be/u18jIQfC6Hc?si=VTu_RFugVP-aHIjQ",
  "Ippon-seoi-nage × Uki-waza": "https://youtu.be/LVHjDzxDR1Y?si=ooQbl9cN-3I42Tte",
  "Koshi-guruma × Ura-nage": "https://youtu.be/Fgi9b8DJ5sQ?si=A14RP_vRnZ2lP6rp",
  "Koshi-guruma × Kansetsu-waza": "",
  "Seoi-otoshi × Kansetsu-waza": "",
  "2 Fugas de Kami-shiho-gatame": "https://youtu.be/seGsXy9I4G8?si=CstcWTfXZXVw69q8",
  "2 Fugas da Meia-Guarda": "https://youtu.be/duNtLmhXeuo?si=sjCcJeUoww9ZxyG9&t=7",
};

export const SCORE_OPTIONS = [
  { value: 10, label: "Ótimo", description: "Técnica aplicada sem erros e sem auxílio." },
  { value: 7, label: "Bom", description: "Técnica aplicada com erro ou com auxílio." },
  { value: 5, label: "Ruim", description: "Técnica aplicada com auxílio e com erros." },
  { value: 0, label: "Insuficiente", description: "Técnica não aplicada ou trocada." },
] as const;

export function beltNeedsDraw(beltId: PracticalBeltId) {
  const belt = PRACTICAL_BELTS.find((item) => item.id === beltId);
  return Boolean(belt && Object.values(belt.categories).some((category) => category?.draws?.length));
}

function shuffled<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function createPracticalExam(beltId: PracticalBeltId, random: () => number = Math.random): ExamCategory[] {
  const belt = PRACTICAL_BELTS.find((item) => item.id === beltId);
  if (!belt) return [];

  return CATEGORY_ORDER.flatMap((categoryName) => {
    const definition = belt.categories[categoryName];
    if (!definition) return [];

    const used = new Set<string>();
    const drawn: ExamTechnique[] = [];

    definition.draws?.forEach((rule) => {
      const source = PRACTICAL_BELTS.find((item) => item.id === rule.from);
      const pool = source?.categories[categoryName]?.fixed.filter((name) => !used.has(name)) ?? [];
      shuffled(pool, random).slice(0, rule.count).forEach((name, index) => {
        used.add(name);
        drawn.push({
          id: `${categoryName}-draw-${rule.from}-${index}-${name}`,
          name,
          drawnFrom: `Faixa ${source?.name ?? rule.from}`,
        });
      });
    });

    const fixed = definition.fixed.map((name, index) => ({ id: `${categoryName}-fixed-${index}-${name}`, name }));
    return [{ name: categoryName, techniques: [...drawn, ...fixed] }];
  });
}

export function toYouTubeEmbedUrl(url: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let id = "";
    if (parsed.hostname.includes("youtu.be")) id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    if (parsed.hostname.includes("youtube.com")) {
      id = parsed.searchParams.get("v") ?? parsed.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1] ?? "";
    }
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}
