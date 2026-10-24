import type { TheoryTemplateQuestion } from "../../lib/theory-exams";

const sourceExplanation =
  "Resposta correta conforme o gabarito oficial fornecido para a faixa laranja.";
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

function grid(
  type: "grid_single" | "grid_multiple",
  category: string,
  prompt: string,
  options: string[],
  rows: { text: string; correctOptionIndexes: number[] }[],
  points = 20,
): TheoryTemplateQuestion {
  return {
    type,
    category,
    prompt,
    points,
    explanation: sourceExplanation,
    options: options.map((text) => ({ text, isCorrect: false })),
    rows,
  };
}

// Transcrição do gabarito em docs/exams para a faixa laranja.
// Questões com mídia mantêm apenas enunciado, alternativas e gabarito até a mídia ser cadastrada.
export const ORANGE_THEORY_QUESTIONS = [
  single("História", "Jigoro Kano é o fundador do Judô Kodokan. Qual foi a principal motivação dele ao reformular o Jujutsu em Judô?", ["Preservar a essência do Jujutsu, porém alterando o nome para ser mais comercial.", "Criar um método seguro para o desenvolvimento físico, intelectual e, principalmente, moral.", "Focar apenas em técnicas de solo (Ne-waza).", "Assegurar a vitória do Japão em competições internacionais.", "Preservar integralmente todas as técnicas do Jujutsu."], 1, 20, false),
  grid("grid_single", "História", "Faça a correspondência corretas dos fatos com suas respectivas datas.", ["Outubro de 1860", "Maio de 1938", "Maio de 1882", "Outubro de 1964"], [{"text": "Jigoro Kano nasceu", "correctOptionIndexes": [0]}, {"text": "Jigoro Kano morreu no navio Hikawa Maru Jigoro Kano morreu no navio Hikawa Maru", "correctOptionIndexes": [1]}, {"text": "Jigoro Kano fundou a Kodokan", "correctOptionIndexes": [2]}, {"text": "Judô participou das Olimpíadas como esporte demonstração Judô participou das Olimpíadas como esporte demonstração", "correctOptionIndexes": [3]}], 20),
  single("História", "Qual é o termo que Jigoro Kano utilizou para diferenciar o Judô do Jujutsu, enfatizando o aspecto educativo e filosófico?", ["Waza", "Riai", "Do", "Jutsu", "Budô"], 2, 20, false),
  single("História", "O Judô foi incluído como esporte olímpico pela primeira vez em Tóquio 1964 como um esporte de demonstração. Qual era a visão de Jigoro Kano sobre a competição (Shiai) no Judô?", ["Ele a via como o objetivo final e mais importante do Judô.", "Ele a via como um meio para testar a eficácia das técnicas e promover o desenvolvimento moral.", "Ele era totalmente contra a competição, preferindo apenas o Kata.", "Ele a via apenas como uma forma de entretenimento.", "Ele a via como a única forma de aplicar o princípio Seiryoku Zen'yo."], 1, 20, false),
  single("História", "Qual é o nome do sistema de classificação das técnicas de projeção da Kodokan, que foi revisado em 1920 e é a base para o aprendizado técnico?", ["Katame no Waza", "Ukemi no Waza", "Gokyo no Waza", "Gokyu no Waza", "Nage no Waza"], 2, 20, false),
  single("História", "Qual foi a principal contribuição da Kodokan para a disseminação do Judô no mundo?", ["A promoção de competições internacionais.", "A padronização e a sistematização do ensino do Judô como um método de educação física e moral.", "O desenvolvimento de novas técnicas de Kansetsu-waza.", "A unificação de todas as escolas de Jujutsu no Japão.", "O foco exclusivo na formação de atletas de alto rendimento."], 1, 20, false),
  single("História", "Qual foi o principal meio pelo qual as técnicas de Jujutsu e Judô foram inicialmente divulgadas ao público brasileiro por Mitsuyo Maeda?", ["Aulas em academias formais.", "Desafios públicos e apresentações em circos e teatros.", "Competições oficiais no Japão.", "Publicação de livros e manuais.", "Ensino em escolas militares."], 1, 25, false),
  single("História", "Qual foi a primeira Federação Estadual de Judô a ser criada em 1958?", ["FJERJ, Federação de Judô do Estado do Rio de Janeiro.", "FPJ, Federação Paulista de Judô.", "FECJU, Federação Cearense de Judô.", "FGJ, Federação Gaúcha de Judô", "FPAJU, Federação Paraense de Judô."], 1, 25, false),
  single("História", "Chiaki Ishii, um japonês naturalizado brasileiro, foi o primeiro medalhista olímpico do judô brasileiro, conquistando o bronze em Munique 1972. Considerando apenas os atletas nascidos no Brasil, quem foi o primeiro brasileiro a conquistar a medalha de ouro nas olimpíadas para o Brasil no Judô Masculino?", ["Flávio Canto", "Aurélio Miguel", "Rogério Sampaio", "Douglas Vieira", "Tiago Camilo"], 1, 20, false),
  single("História", "A Confederação Brasileira de Judô foi fundada anos antes das Olimpíadas de Munique, sendo essa a primeira Olimpíadas que o Judô participaria em definitivo em não somente como um esporte de demonstração. Que ano foi esse?", ["1964", "1969", "1972", "1957", "1968"], 1, 20, false),
  single("História", "Em 1961, o cearense que residia no Rio de Janeiro chegou em Fortaleza, seu nome era Antônio Lima Filho. Portando seu 2°Dan começou a ministrar aulas na academia do Prof. Nilo Veloso onde ocorriam aulas de diversas modalidades em evidência o Jiu-Jitsu. Um dos alunos de Nilo, já faixa marrom de Jiu-Jitsu, se tornou o primeiro faixa preta no Ceará. Qual o seu nome?", ["Antônio Lima", "Milton Lima", "Milton Moreira", "Antônio Moreira", "Rogério Cruz"], 2, 20, false),
  single("Filosofia", "Qual é a relação filosófica estabelecida por Jigoro Kano entre os princípios Seiryoku Zen'yo e Jita Kyoei?", ["São princípios concorrentes, onde um deve ser priorizado em detrimento do outro.", "Seiryoku Zen'yo é a técnica de luta, e Jita Kyoei é a regra de competição.", "Seiryoku Zen'yo é o meio, e Jita Kyoei é o fim social e ético.", "Ambos representam o mesmo conceito, apenas com terminologias diferentes.", "Jita Kyoei é o meio, e Seiryoku Zen'yo é o fim social e ético."], 2, 20, false),
  single("História", "Jigoro Kano, o fundador do Judô, defendia que a prática do judoca não deveria se restringir ao dojo. Para ele, qual é o princípio filosófico que representa o objetivo mais elevado do Judô, devendo ser aplicado para contribuir com a melhoria da sociedade?", ["A excelência técnica (Waza) no Randori.", "O Ju no Ri (Princípio da Suavidade) aplicado à defesa pessoal.", "O Jita Kyoei (Prosperidade Mútua) como um princípio universal de convivência social.", "O Shoshin (Mente de Principiante) mantido ao longo da carreira.", "A preservação dos Katas antigos como forma de história."], 2, 20, false),
  single("Técnicas", "O Judô é frequentemente descrito como um Budo. Qual é a diferença fundamental entre Budo (Caminho Marcial) e Bujutsu (Técnica Marcial)?", ["Budo foca na competição, e Bujutsu foca no Kata.", "Budo foca no desenvolvimento moral e espiritual, e Bujutsu foca na eficácia da técnica.", "Budo é o termo moderno, e Bujutsu é o termo antigo.", "Budo é o Judô, e Bujutsu é o Jujutsu.", "Não há diferença; os termos são sinônimos."], 1, 20, false),
  single("Etiqueta", "No Judô, o cumprimento cerimonial, o \"Rei\", é realizado no início e no final de cada prática ou luta. Qual é o seu significado filosófico mais profundo?", ["Apenas um gesto formal de cortesia, sem grande significado.", "Uma demonstração de submissão à autoridade do oponente.", "A manifestação do respeito mútuo e gratidão, essenciais para uma prática segura e ética.", "Uma regra burocrática imposta por federações esportivas.", "Exclusivamente um sinal para dar início e encerrar o combate."], 2, 20, false),
  single("História", "No Judô, o Randori é um exercício de luta livre. Para seu fundador, Jigoro Kano, qual era o seu principal propósito filosófico e educacional?", ["A busca pela vitória a qualquer custo, focando em superar o oponente.", "A preparação específica para competições, priorizando o desempenho.", "A execução rígida e precisa de técnicas de forma isolada.", "Desenvolver a aplicação prática dos princípios do Judô para o crescimento mútuo.", "O fortalecimento físico e a demonstração de força e resistência."], 3, 20, false),
  single("Terminologia", "Qual é o termo para o ato de quebrar o equilíbrio/postura do oponente, considerado o primeiro passo essencial para a execução eficaz de uma técnica de projeção?", ["Tsukuri", "Kake", "Kuzushi", "Uchi-komi", "Randori"], 2, 20, false),
  single("Terminologia", "Qual é o termo para a fase de encaixe da técnica, o momento em que o Tori se posiciona para a projeção?", ["Kuzushi", "Kake", "Tsukuri", "Uchi-komi", "Randori"], 2, 20, false),
  single("Terminologia", "Qual é o termo para a fase final da técnica, o momento da projeção ou queda do Uke?", ["Kuzushi", "Kake", "Tsukuri", "Uchi-komi", "Randori"], 1, 20, false),
  single("Terminologia", "Qual é o termo para o treinamento repetitivo de uma técnica de projeção, sem a finalização da queda?", ["Randori", "Shiai", "Kata", "Uchi-komi", "Kumite"], 3, 20, false),
  single("Terminologia", "Qual é o termo para o conjunto de técnicas de controle no solo, que inclui imobilizações, estrangulamentos e chaves de articulação?", ["Nage-waza", "Katame-waza", "Ashi-waza", "Te-waza", "Koshi-waza"], 1, 20, false),
  single("Terminologia", "Qual é o termo para as técnicas de perna, como O-soto-gari e De-ashi-harai?", ["Te-waza", "Koshi-waza", "Ashi-waza", "Sutemi-waza", "Katame-waza"], 2, 20, false),
  single("Terminologia", "Qual é o termo para as técnicas de quadril, como O-goshi e Uki-goshi?", ["Te-waza", "Koshi-waza", "Ashi-waza", "Sutemi-waza", "Katame-waza"], 1, 20, false),
  single("Terminologia", "Qual é o termo para as técnicas de mão/braço, como Seoi-nage e Tai-otoshi?", ["Te-waza", "Koshi-waza", "Ashi-waza", "Sutemi-waza", "Katame-waza"], 0, 20, false),
  single("Terminologia", "Qual é o termo para o conjunto de técnicas de contra-ataque?", ["Renraku-waza", "Renzoku-waza", "Kaeshi-waza", "Nage-waza", "Katame-waza"], 2, 20, false),
  single("Técnicas", "Complete corretamente: \"O uniforme de treino de judô é o Judogi, ele é composto pelo que é o casaco, onde fazemos as pegadas, no que é a gola, e no que é a manga. No Judogi também temos a calça que chamamos de ou zubon, e também temos o , que é a faixa.\"", ["Uwagi; Eri; Sode; Shitabaki; Obi.", "Uwagi; Sode; Obi; Shitabaki; Eri.", "Shitabaki; Eri; Sode; Uwagi; Obi.", "Uwagi; Sode; Eri; Shitabaki; Obi.", "Uwagi; Shitabaki; Obi; Eri; Sode."], 0, 20, false),
  single("Técnicas", "Complete corretamente: \"No Judô, saber como andar é muito importante. O é a forma de andar natural e comum; já o é a forma de andar onde um pé passa o outro, mas sempre deslizando e mantendo o contato com o chão com as pontas dos dedos. Já o é a forma de andar mais comum no kata, também conhecida como andar contínuo, pois um pé não ultrapassa o outro.", ["Ayumi-ashi; Suri-ashi; Tsugi-ashi", "Suri-ashi; Ayumi-ashi; Tsugi-ashi", "Ayumi-ashi; Tsugi-ashi; Suri-ashi", "Tsugi-ashi; Suri-ashi; Ayumi-ashi", "Ayumi-ashi; Okuri-ashi; Tsugi-ashi"], 0, 20, false),
  single("Etiqueta", "Qual é a diferença entre Ritsurei e Zarei?", ["Ritsurei é realizado em pé, geralmente ao cumprimentar o professor, e Zarei é realizado sentado ao cumprimentar colegas.", "Ritsurei é o cumprimento em pé, e Zarei é o cumprimento sentado.", "Ritsurei é feito no início da aula ou da prática, e Zarei ao encerrar ou durante exercícios específicos.", "Ritsurei é o cumprimento formal de respeito, e Zarei é a forma tradicional de mostrar disciplina sentada.", "Não há diferença, são sinônimos."], 1, 20, false),
  single("Terminologia", "O Shizentai é a postura natural. Qual é a principal característica da postura defensiva Jigotai?", ["O corpo está levemente inclinado para frente, com joelhos semi-flexionados e pés próximos.", "O peso do corpo está distribuído igualmente nos dois pés, com os joelhos flexionados e os pés mais afastados.", "O peso do corpo está deslocado ligeiramente para a perna da frente, preparando defesa e contra-ataque.", "O corpo está baixo, quase em Seiza, mantendo equilíbrio defensivo.", "O corpo está recuado, com os pés paralelos e joelhos semi-flexionados, pronto para reagir."], 1, 20, false),
  single("Técnicas", "Qual é a importância de amarrar a faixa corretamente no Judogi?", ["É principalmente estética, mas influencia levemente a disciplina e a segurança.", "É uma demonstração de respeito e disciplina, e garante a segurança durante a prática.", "Indica a graduação e ajuda a manter o Judogi firme durante os movimentos.", "É exigida em competições e contribui para a postura e disciplina do praticante.", "Tem pouca importância prática, mas mostra atenção aos detalhes do Judogi."], 1, 20, false),
  single("Arbitragem", "Qual é a condição para que um Nage-waza seja pontuado como Ippon?", ["O oponente cai de lado, com controle parcial e impacto moderado.", "O oponente cai de costas, com força, velocidade, controle e aterrissagem completa.", "O oponente cai de costas, mas sem força suficiente para controle completo.", "O oponente cai de lado, com velocidade e controle limitados.", "O oponente cai parcialmente de costas, com impacto reduzido."], 1, 20, false),
  single("Arbitragem", "Qual é a pontuação concedida quando o oponente é projetado, mas falta um dos quatro elementos de Ippon?", ["Yuko", "Waza-ari", "Koka", "Shido", "Hansoku-make"], 1, 20, false),
  single("Arbitragem", "Qual é o comando dado pelo árbitro para interromper a luta temporariamente?", ["Mate", "Hajime", "Sono-mama", "Osaekomi", "Toketa"], 0, 20, false),
  single("Arbitragem", "Qual é o termo para a desclassificação imediata do Judoca, geralmente aplicada após a terceira penalidade leve (Shido) ou por uma infração grave?", ["Mate", "Hajime", "Hansoku-make", "Sono-mama", "Osaekomi"], 2, 20, false),
  single("Arbitragem", "Qual o termo utilizado pelo árbitro quando uma imobilização é desfeita?", ["Toketa", "Saiu", "Fora", "Osae", "Torikeshi"], 0, 25, false),
  single("História", "De acordo com as regras de arbitragem da Federação Internacional de Judô (IJF), qual é o conjunto de critérios que deve ser preenchido para que uma projeção seja considerada Ippon e, consequentemente, encerre a luta?", ["Força; velocidade; controle; e queda com contato substancial das costas", "Força; velocidade; controle; e queda com contato parcial das costas", "Força; velocidade e controle", "Força; velocidade; controle; e queda com contato lateral do corpo", "Força; velocidade; controle; e imobilização imediata"], 0, 20, false),
  single("Técnicas · mídia pendente", "A nalise a imagem e diga que técnica está sendo aplicada.", ["O-soto-gari", "Ko-soto-gari", "O-uchi-gari", "Okuri-ashi-harai", "De-ashi-harai"], 2, 20, true),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Seoi-nage", "Ippon-seoi-nage", "Ko-uchi-gari", "Ko-uchi-gake", "Ko-uchi-makikomi"], 4, 20, true),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Tsurikomi-goshi", "Sode-tsurikomi-goshi", "Seoi-nage", "Morote-seoi-nage", "Eri-tsurikomi-goshi"], 1, 20, true),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Ude-hishigi-ude-gatame", "Ude-garami", "Ude-jime", "Kimura", "Juji-gatame"], 1, 20, true),
  single("Técnicas", "Analise a descrição da técnica: \"Uma imobilização de controle lateral com o Tori abraçando a cabeça e a perna do Uke.\" Que técnica está sendo descrita?", ["Kesa-gatame", "Kami-shiho-gatame", "Yoko-shiho-gatame", "Tate-shiho-gatame", "Ushiro-kesa-gatame"], 2, 20, false),
  single("Técnicas", "Analise a descrição da técnica: \"Um estrangulamento cruzando as mãos e segurando as gola de forma invertida de forma que as palmas das mãos fique voltada para cima.\" Que técnica está sendo descrita?", ["Nami-juji-jime", "Kata-juji-jime", "Gyaku-juji-jime", "Hadaka-jime", "Okuri-eri-jime"], 2, 20, false),
  single("Técnicas", "Analise a descrição da técnica: \"Uma chave de articulação onde se põe o Uke dentro de um triângulo feito com as pernas, podendo fazer 2 aplicações de chave.\" Que técnica está sendo descrita?", ["Ude-hishigi-juji-gatame", "Ude-hishigi-ude-gatame", "Ude-hishigi-sankaku-gatame", "Sankaku-gatame", "Ashi-garami"], 2, 20, false),
  single("Técnicas", "Analise a descrição da técnica: \"O Tori tenta aplicar um O-uchi-gari no Uke. O Uke se defende, e o Tori imediatamente muda a direção e aplica um Ko-uchi-gari no pé oposto do Uke.\" Qual categoria de técnica está sendo descrita?", ["Kaeshi-waza", "Renzoku-waza", "Renraku-Henka Waza", "Sutemi-waza", "Nage-no-kata"], 2, 20, false),
  single("Técnicas", "Analise a descrição da técnica: \"O Uke tenta aplicar um O-soto-gari no Tori. O Tori resisti, ajusta o corpo, e aplica um O-soto-gaeshi, projetando o Uke.\" Qual categoria de técnica está sendo descrita?", ["Renraku-Henka Waza", "Renzoku-waza", "Kaeshi-waza", "Sutemi-waza", "Nage-no-kata"], 2, 20, false),
  single("Técnicas", "Analise a descrição da técnica de Ne-waza: \"O Tori está em Kesa-gatame, mas o Uke começa a escapar. O Tori rapidamente transiciona para uma imobilização onde ele se ajoelha sobre o Uke e o segura com quatro pontos de apoio.\" Qual imobilização o Tori transicionou?", ["Kami-shiho-gatame", "Yoko-shiho-gatame", "Tate-shiho-gatame", "Ushiro-kesa-gatame", "Kuzure-kesa-gatame"], 2, 20, false),
  single("Técnicas", "Analise a descrição da técnica de Shime-waza: \"O Tori está por trás do Uke e usa as duas golas do Judogi do Uke para aplicar um estrangulamento com as duas mãos, apertando.\" Qual técnica de estrangulamento esta sendo descrita?", ["Kata-juji-jime", "Nami-juji-jime", "Okuri-eri-jime", "Hadaka-jime", "Sankaku-jime"], 2, 20, false),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Ude-garami", "Ude-hishigi-juji-gatame", "Ude-hishigi-ude-gatame", "Ude-hishigi-ashi-gatame", "Ashi-garami"], 3, 20, true),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Sankaku-jime", "Estrangulamento em triângulo", "Sankaku-gatame", "Sankaku", "Triângulo"], 0, 25, true),
] satisfies TheoryTemplateQuestion[];

export const ORANGE_THEORY_TEMPLATE = ORANGE_THEORY_QUESTIONS;

export const ORANGE_THEORY_TEMPLATE_SUMMARY = {
  questionCount: ORANGE_THEORY_QUESTIONS.length,
  totalPoints: ORANGE_THEORY_QUESTIONS.reduce((total, question) => total + question.points, 0),
  gridQuestionCount: ORANGE_THEORY_QUESTIONS.filter((question) => question.type !== "single_choice").length,
  pendingMediaCount: ORANGE_THEORY_QUESTIONS.filter((question) => question.mediaPending).length,
} as const;
