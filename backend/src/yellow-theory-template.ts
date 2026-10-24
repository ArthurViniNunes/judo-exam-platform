import type { TheoryTemplateQuestion } from "../../lib/theory-exams";

const sourceExplanation =
  "Resposta correta conforme o gabarito oficial fornecido para a faixa amarela.";
const pendingMediaExplanation =
  `${sourceExplanation} Mídia pendente: adicione a imagem ou o vídeo correspondente antes de publicar esta questão.`;

function single(
  category: string,
  prompt: string,
  options: string[],
  correctIndex: number,
  points = 20,
  mediaPending = false,
): TheoryTemplateQuestion {
  return {
    type: "single_choice",
    category,
    prompt,
    points,
    explanation: mediaPending ? pendingMediaExplanation : sourceExplanation,
    options: options.map((text, index) => ({ text, isCorrect: index === correctIndex })),
    rows: [],
    mediaPending,
  };
}

// Transcrição do gabarito em docs/exams para a faixa amarela.
// Questões com mídia mantêm apenas enunciado, alternativas e gabarito até a mídia ser cadastrada.
export const YELLOW_THEORY_QUESTIONS = [
  single("Filosofia", "Quem é o fundador do Judô Kodokan e o criador do princípio Seiryoku Zen'yo?", ["Mitsuyo Maeda", "Gichin Funakoshi", "Jigoro Kano", "Morihei Ueshiba", "Kyuzo Mifune"], 2, 20, false),
  single("História", "Em que ano Jigoro Kano fundou a primeira escola de Judô, marcando o início da arte marcial moderna?", ["1868", "1882", "1900", "1920", "1938"], 1, 20, false),
  single("História", "Qual era o nome genérico das diversas artes marciais tradicionais que Jigoro Kano estudou e reformulou para criar o Judô?", ["Iai-Jutsu", "Jo-Jutsu", "Ju-Jutsu", "Ken-Jutsu", "Kyuu-Jutsu"], 2, 20, false),
  single("História", "Qual é o termo que Jigoro Kano usava para descrever o Judô como um caminho de vida para o auto-aperfeiçoamento, em oposição a uma simples técnica de combate?", ["Jutsu", "Waza", "Do", "Riai", "Budô"], 2, 20, false),
  single("História", "Qual é o significado do nome \"Kodokan\"?", ["Escola da Força", "Lugar para Estudar o Caminho", "Templo da Suavidade", "Academia de Luta", "Casa do Guerreiro"], 1, 20, false),
  single("História", "Em qual tipo de local a Kodokan foi inicialmente estabelecida em 1882?", ["Um ginásio moderno", "Um templo budista", "Uma escola militar", "Um castelo", "Uma casa de chá"], 1, 20, false),
  single("História", "Em que ano o criador do Judô nasceu?", ["1860", "1960", "1882", "1982", "1862"], 0, 20, false),
  single("História", "Qual imigrante japonês é reconhecido por ter introduzido o Judô no Brasil no início do século XX?", ["Takeo Yano", "Ryuzo Ogawa", "Mitsuyo Maeda", "Yasuichi Ono", "Shiro Saigo"], 2, 20, false),
  single("História", "Qual família brasileira é historicamente ligada ao aprendizado e à disseminação das técnicas de Maeda, que culminaram na criação do Jiu-Jitsu Brasileiro?", ["Família Yamashita", "Família Gracie", "Família Graça", "Família Fadda", "Família Cruz"], 1, 20, false),
  single("Terminologia", "Qual é o significado da palavra \"Judô\"?", ["Caminho da Força", "Caminho da Suavidade", "Arte da Luta", "Caminho do Guerreiro", "Mente e Corpo"], 1, 20, false),
  single("Técnicas", "Qual é o nome do princípio filosófico que se traduz como \"Máxima Eficiência com Mínimo Esforço\"?", ["Jita Kyoei", "Seiryoku Zen'yo", "Ju no Ri", "Reiho", "Randori"], 1, 20, false),
  single("Filosofia", "O que o princípio Jita Kyoei sugere que o praticante deve buscar, além do seu próprio desenvolvimento?", ["A vitória em todas as competições.", "A perfeição técnica individual.", "O benefício e o bem-estar dos outros e da sociedade.", "O acúmulo de títulos e honrarias.", "A não-resistência em qualquer situação."], 2, 20, false),
  single("Filosofia", "Qual é a principal ideia por trás do Ju no Ri (Princípio da Suavidade)?", ["Usar a força bruta para vencer.", "Ceder à força do oponente para, em seguida, utilizá-la contra ele.", "Evitar o confronto físico a todo custo.", "Apenas usar técnicas de solo.", "Apenas usar técnicas de projeção."], 1, 20, false),
  single("Filosofia", "Jigoro Kano via o Judô como um método de educação. Qual aspecto ele considerava o mais importante para o desenvolvimento do ser humano?", ["O aspecto físico (força e resistência).", "O aspecto intelectual (estudo de técnicas e Katas).", "O aspecto moral (formação do caráter e conduta ética).", "O aspecto competitivo (vitória em torneios).", "O aspecto técnico (execução perfeita)."], 2, 20, false),
  single("Terminologia", "Qual é o termo para o uniforme de treino usado no Judô?", ["Kimono", "Gi", "Judogi", "Dogi", "Todas as anteriores"], 2, 20, false),
  single("Terminologia", "Qual é o termo para as técnicas de projeção?", ["Katame-waza", "Nage-waza", "Shime-waza", "Kansetsu-waza", "Osaekomi-waza"], 1, 20, false),
  single("Terminologia", "Qual é o termo para as técnicas de controle no solo?", ["Katame-waza", "Nage-waza", "Shime-waza", "Kansetsu-waza", "Osaekomi-waza"], 0, 20, false),
  single("Terminologia", "Qual é o termo para a quebra de equilíbrio/postura do oponente?", ["Tsukuri", "Kake", "Kuzushi", "Uchi-komi", "Randori"], 2, 20, false),
  single("Terminologia", "Qual é o termo para a prática livre de combate?", ["Kata", "Shiai", "Randori", "Kumite", "Budô"], 2, 20, false),
  single("Terminologia", "Qual é o termo para as técnicas de amortecimento de queda?", ["Nage-waza", "Katame-waza", "Ukemi-waza", "Atemi-waza", "Ashi-waza"], 2, 20, false),
  single("Terminologia", "Qual é o termo para o local de treino?", ["Tatame", "Dojo", "Sensei", "Obi", "Kyu"], 1, 20, false),
  single("Terminologia", "Qual é o termo para o professor de Judô?", ["Senpai", "Kohai", "Sensei", "Shihan", "Kyoshi"], 2, 20, false),
  single("Etiqueta", "Qual é o termo japonês para a etiqueta e cortesia no Judô, que reflete o respeito e a disciplina?", ["Ukemi", "Shisei", "Reiho", "Waza", "Kuzushi"], 2, 20, false),
  single("Etiqueta", "Qual é o nome do cumprimento feito na posição em pé?", ["Zarei", "Ritsu Rei", "Seiza", "Shizentai", "Jigotai"], 1, 20, false),
  single("Etiqueta", "Qual é o nome do cumprimento feito na posição sentada (Seiza)?", ["Zarei", "Ritsu Rei", "Seiza Rei", "Shizentai", "Jigotai"], 0, 20, false),
  single("Terminologia", "Qual é a postura defensiva do Judô, caracterizada por abaixar o quadril e afastar os pés?", ["Jigotai", "Shizontai", "Jiutai", "Shizentai", "Jirotai"], 0, 20, false),
  single("Terminologia", "Qual é a postura fundamental do Judô, onde o atleta, está em pé de forma neutra e natural?", ["Jiugotae", "Shiutai", "Shizontai", "Jigotai", "Shizentai"], 4, 20, false),
  single("Etiqueta", "Em que momento o Ritsu Rei é tipicamente realizado?", ["Apenas ao entrar e sair do Dojo.", "Ao iniciar e encerrar a aula, ao entrar e sair do Tatame e ao iniciar e encerra o combate.", "Apenas ao cumprimentar um professor, ao entrar e sair do Tatame", "Apenas ao iniciar e terminar um combate.", "Apenas ao sentar-se."], 1, 20, false),
  single("Etiqueta", "Qual é o termo para a posição sentada formal no Tatame?", ["Ritsu Rei", "Zarei", "Seiza", "Anza", "Agura"], 2, 20, false),
  single("Etiqueta", "A etiqueta (Reiho) no Judô é uma manifestação física de qual princípio fundamental?", ["A força física", "O espírito de respeito", "A velocidade", "A técnica", "O ataque"], 1, 20, false),
  single("Terminologia", "Assinale a alternativa correta: \"O Judogi é composto por 3 peças principais o que é a a parte de cima, o casaco; o que é a parte de baixo e o que é a faixa.", ["Uwagi; Shitabaki; Obi", "Obi; Shitabaki; Uwagi", "Uwagi; Hakama; Obi", "Obi; Zubon; Uwagi", "Zubon; Kimono; Obi"], 0, 20, false),
  single("Arbitragem", "Qual é a pontuação máxima no Judô que encerra a luta imediatamente?", ["Waza-ari", "Yuko", "Ippon", "Koka", "Shido"], 2, 20, false),
  single("Arbitragem", "O que significa a pontuação Waza-ari?", ["Vitória imediata.", "Meio ponto.", "Um ponto completo.", "Uma penalidade.", "Uma imobilização de 20 segundos."], 1, 20, false),
  single("Terminologia", "Qual é o termo para a penalidade leve no Judô, que é dada por infrações menores e acumula-se até a desclassificação?", ["Hansoku-make", "Shido", "Hantei", "Sono-mama", "Mate"], 1, 20, false),
  single("Arbitragem", "Quantos Shidos um Judoca pode acumular antes de ser desclassificado (Hansoku-make)?", ["Quatro", "Três", "Dois", "Um", "Cinco"], 2, 20, false),
  single("Arbitragem", "Durante uma luta, o atleta de azul tenta projetar e falha, o atleta de branco aproveita e imobiliza o adversário, o árbitro dá o comando de osaekomi, afirmando que a imobilização está sendo aplicada e é válida. Por quantos segundos o atleta de branco tem que segurar para obter a pontuação máxima?", ["20 segundos", "30 segundos", "10 segundos", "5 segundos", "15 segundos"], 0, 20, false),
  single("Técnicas", "Qual das técnicas abaixo é uma técnica de projeção de perna (Ashi-waza)?", ["Tai-otoshi", "Seoi-nage", "Hiza-guruma", "Uki-goshi", "Hiza-gatame"], 2, 20, false),
  single("Técnicas", "Qual das técnicas abaixo é uma técnica de quadril (Koshi-waza)?", ["Tai-otoshi", "O-soto-gari", "Uki-goshi", "Uki-waza", "Uki-gatame"], 2, 20, false),
  single("Técnicas", "Qual das técnicas abaixo é uma técnica de mão (Te-waza)?", ["O-goshi", "Seoi-nage", "O-soto-gari", "De-ashi-harai", "Uki-goshi"], 1, 20, false),
  single("Arbitragem", "Qual das técnicas abaixo é uma técnica de imobilização (Osaekomi-waza)?", ["Ude-garami", "Nami-juji-jime", "Kesa-gatame", "Gyaku-juji-jime", "Hadaka-jime"], 2, 20, false),
  single("Técnicas", "Qual dessas é uma técnica de estrangulamento (Shime-waza)?", ["Ude-garami", "Nami-juji-jime", "Kata-gatame", "Ude-hishigi-juji-gatame", "Yoko-shiho-gatame"], 1, 20, false),
  single("Técnicas", "Qual dessas é uma técnica de chave de articulação (Kansetsu-waza)?", ["Kesa-gatame", "Nami-juji-jime", "Ude-garami", "Kami-shiho-gatame", "Gyaku-juji-jime"], 2, 20, false),
  single("Arbitragem", "O que significa Osaekomi-waza?", ["Técnicas de projeção", "Técnicas de estrangulamento", "Técnicas de imobilização", "Técnicas de chave de articulação", "Técnicas de ataque sucessivo"], 2, 20, false),
  single("Técnicas", "Qual é a principal diferença entre Nage-waza e Katame-waza?", ["Nage-waza é a técnica de projeção e Katame-waza é a técnica de controle no solo", "Nage-waza é a técnica de quadril e Katame-waza é a técnica de perna.", "Nage-waza é o ataque e Katame-waza é a defesa.", "Nage-waza é a técnica em pé e Katame-waza é a técnica de controle no solo.", "Nage-waza é a projeção e Katame-waza é o contra-ataque."], 0, 20, false),
  single("Técnicas", "Analise a descrição da técnica: \"O Tori entra, girando e projetando o Uke por cima do ombro, segurando a manga e a gola, colocando um antebraço na axila do Uke.\" Qual técnica de Te-waza (mão) está sendo descrita?", ["O-goshi", "O-soto-gari", "Seoi-nage", "Ippon-seoi-nage", "Seoi-otoshi"], 2, 20, false),
  single("Técnicas", "Analise a descrição da técnica: “O Tori utiliza a perna para varrer o pé de apoio do Uke no momento em que ele avança esse pé.\" Qual técnica de Ashi-waza (perna) está sendo descrita?", ["Sasae-tsurikomi-ashi", "O-soto-gari", "Seoi-nage", "De-ashi-harai", "Uki-goshi"], 3, 20, false),
  single("Técnicas · mídia pendente", "Que técnica é está sendo aplicada nessa imagem?", ["Kesa-gatame", "Yoko-shiho-gatame", "Kami-shiho-gatame", "Ushiro-kesa-gatame", "Tate-shiho-gatame"], 0, 20, true),
  single("Técnicas · mídia pendente", "Que técnica é está sendo aplicada nessa imagem?", ["Hadaka-jime", "Kata-juji-jime", "Gyaku-juji-jime", "Nami-juji-jime", "Ude-garami"], 0, 20, true),
  single("Técnicas · mídia pendente", "Que técnica é está sendo aplicada nessa imagem?", ["Ippon-seoi-nage", "Seoi-nage", "Seoi-otoshi", "Morote-seoi-nage", "Eri-seoi-nage"], 2, 20, true),
  single("Técnicas · mídia pendente", "Que técnica é está sendo aplicada nessa imagem?", ["Kimura", "Ude-Gatame", "Ude-Garami", "Ude-hishigi-ude-gatame", "Ude-hishigi-ude-garami"], 2, 20, true),
] satisfies TheoryTemplateQuestion[];

export const YELLOW_THEORY_TEMPLATE = YELLOW_THEORY_QUESTIONS;

export const YELLOW_THEORY_TEMPLATE_SUMMARY = {
  questionCount: YELLOW_THEORY_QUESTIONS.length,
  totalPoints: YELLOW_THEORY_QUESTIONS.reduce((total, question) => total + question.points, 0),
  gridQuestionCount: YELLOW_THEORY_QUESTIONS.filter((question) => question.type !== "single_choice").length,
  pendingMediaCount: YELLOW_THEORY_QUESTIONS.filter((question) => question.mediaPending).length,
} as const;
