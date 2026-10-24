import type { TheoryTemplateQuestion } from "../../lib/theory-exams";

const sourceExplanation =
  "Resposta correta conforme o gabarito oficial fornecido para a faixa verde.";
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

// Transcrição do gabarito em docs/exams para a faixa verde.
// Questões com mídia mantêm apenas enunciado, alternativas e gabarito até a mídia ser cadastrada.
export const GREEN_THEORY_QUESTIONS = [
  grid("grid_single", "Filosofia", "Complete: \"Jigoro Kano ao fundar o Kodokan e o Judô idealizou a filosofia que guia essa arte até os dias de hoje. Kano Sensei idealizou 2 máximas principais que é o que tem como significado o \"benefício mútuo para todos\", e o que tem como significado o \"melhor uso da energia mental e física\". Um princípio que Jigoro Kano aderiu ao Judô e vem do Ju-jutsu é o que vêm da ideia de que \"o flexível, a suavidade supera o rígido.\"", ["1", "2", "3"], [{"text": "Jita Kyoei", "correctOptionIndexes": [0]}, {"text": "Seiryoku Zen'yo", "correctOptionIndexes": [1]}, {"text": "Ju no Ri", "correctOptionIndexes": [2]}], 18),
  single("História", "Qual foi a principal inovação de Jigoro Kano em relação às escolas tradicionais de Jujutsu que ele estudou, que garantiu a segurança e a popularização do Judô?", ["A criação de novas técnicas de estrangulamento.", "A ênfase nas técnicas de sacrifício.", "A sistematização e a exclusão das técnicas mais perigosas.", "A introdução de competições com regras rígidas.", "A obrigatoriedade do uso do Judogi."], 2, 20, false),
  single("História", "Jigoro Kano foi o primeiro asiático a se tornar membro do Comitê Olímpico Internacional (COI). Qual era a sua visão sobre o papel do Judô no movimento olímpico?", ["O Judô deveria ser apenas uma demonstração cultural.", "O Judô deveria focar na vitória, independentemente dos meios.", "O Judô deveria contribuir para a paz mundial e o entendimento mútuo através do esporte.", "O Judô deveria ser ensinado apenas no Japão.", "O Judô deveria ser o esporte principal das Olimpíadas."], 2, 20, false),
  single("História", "O que o termo Kodokan significa literalmente, refletindo a intenção de Jigoro Kano para o seu instituto?", ["O Salão da Projeção", "O Local para Estudar o Caminho", "O Templo da Força", "A Escola da Suavidade", "O Centro de Treinamento Marcial"], 1, 20, false),
  single("História", "O Gokyo no Waza é o currículo de projeções da Kodokan. Qual é o principal propósito desse sistema de classificação?", ["Determinar a graduação dos Judocas.", "Organizar as técnicas de forma didática e progressiva, facilitando o aprendizado.", "Limitar o número de técnicas que podem ser usadas em competição.", "Separar as técnicas perigosas das seguras.", "Classificar as técnicas por força."], 1, 20, false),
  single("Técnicas", "Qual é o nome do Kata (forma) mais fundamental do Judô, que demonstra as técnicas de projeção?", ["Ju no Kata", "Katame no Kata", "Nage no Kata", "Kime no Kata", "Itsutsu no Kata"], 2, 20, false),
  single("História", "Qual é o nome do Judoca japonês que se naturalizou brasileiro e foi o primeiro a conquistar uma medalha olímpica para o Brasil no Judô (bronze em Munique 1972)?", ["Yamamoto Genryusai", "Hanzo Hasashi", "Chiaki Ishii", "João Minakawa", "Hiroshi Ishikawa"], 2, 20, false),
  grid("grid_single", "História", "Faça a correspondência dos fatos com suas respectivas datas:", ["Outubro de 1860", "Maio de 1938", "Maio de 1882", "Outubro de 1964"], [{"text": "Jigoro Kano nasceu", "correctOptionIndexes": [0]}, {"text": "Jigoro Kano morreu no navio Hikawa Maru Jigoro Kano morreu no navio Hikawa Maru", "correctOptionIndexes": [1]}, {"text": "Jigoro Kano fundou a Kodokan", "correctOptionIndexes": [2]}, {"text": "A primeira aparição do Judô nas Olimpíadas A primeira aparição do Judô nas Olimpíadas", "correctOptionIndexes": [3]}], 20),
  single("História", "Em 1961, o cearense que residia no Rio de Janeiro chegou em Fortaleza, seu nome era Antônio Lima Filho. Portando seu 2°Dan começou a ministrar aulas na academia do Prof. Nilo Veloso onde ocorriam aulas de diversas modalidades em evidência o Jiu-Jitsu. Um dos alunos de Nilo, já faixa marrom de Jiu-Jitsu, se tornou o primeiro faixa preta no Ceará. Qual o seu nome?", ["Milton Moreira", "Nilo Veloso", "Milton Lima", "Antônio Moreira", "Nilo Filho"], 0, 20, false),
  single("Filosofia", "O princípio Seiryoku Zen'yo (Melhor uso da energia mental e física/Mínimo de esforço e máximo de eficiência) é a base técnica do Judô. Qual é a sua implicação mais profunda no contexto do Randori?", ["Vencer o oponente rapidamente.", "Usar a força bruta para superar a técnica.", "Utilizar a força do oponente e o seu desequilíbrio para aplicar a técnica de forma eficiente.", "Evitar o confronto físico.", "Apenas aplicar técnicas de perna."], 2, 20, false),
  single("Filosofia", "Qual é a aplicação do princípio Jita Kyoei (Prosperidade Mútua) no contexto da prática no Dojo?", ["O mais forte deve sempre vencer o mais fraco.", "O Tori deve sempre projetar o Uke com força máxima.", "O Uke deve cooperar com o Tori para que ambos aprendam e se desenvolvam.", "A competição é o único caminho para a prosperidade mútua.", "O Judô deve ser praticado individualmente."], 2, 20, false),
  single("Filosofia", "A filosofia do Judô valoriza o Rei como pilar da prática. Qual entendimento melhor expressa esse princípio de forma completa?", ["Cumprir ordens sem questionar.", "Reconhecer a dignidade do parceiro e agir com responsabilidade para que ambos evoluam com segurança.", "Aceitar a posição de inferioridade perante o oponente.", "Manter gestos formais de reverência ligados à tradição.", "Exibir postura firme para impor respeito."], 1, 20, false),
  single("Técnicas", "O Judô é um Do (Caminho). Qual é o principal objetivo de seguir este Caminho?", ["A excelência técnica e a vitória em competições.", "O aperfeiçoamento do ser humano através da disciplina física e mental.", "A preservação das tradições japonesas.", "O domínio de todas as técnicas do Gokyo.", "A obtenção da faixa preta."], 1, 20, false),
  single("Filosofia", "Qual é a relação entre o Ukemi e a filosofia do Judô?", ["Um procedimento voltado apenas para evitar lesões.", "Uma prática que expressa humildade e a disposição de cair, aprender e continuar avançando.", "A aplicação direta do princípio de melhor uso da energia na hora da queda.", "Um movimento voltado para atacar o oponente.", "Um recurso utilizado para gerar desequilíbrio."], 1, 20, false),
  grid("grid_single", "Terminologia", "Correlacione os as partes do Judogi:", ["Casaco, parte de cima", "Manga", "Gola", "Calça, parte de baixo", "Faixa"], [{"text": "Uwagi", "correctOptionIndexes": [0]}, {"text": "Sode", "correctOptionIndexes": [1]}, {"text": "Eri", "correctOptionIndexes": [2]}, {"text": "Shitabaki", "correctOptionIndexes": [3]}, {"text": "Obi", "correctOptionIndexes": [4]}], 20),
  single("Terminologia", "Qual é o termo para o conjunto de técnicas de sacrifício, onde o Tori se sacrifica para projetar o Uke?", ["Nage-waza", "Katame-waza", "Sutemi-waza", "Ashi-waza", "Te-waza"], 2, 20, false),
  single("Terminologia", "Qual é o termo para as técnicas de projeção executadas com o corpo do Tori caindo para o lado?", ["Yoko-sutemi-waza", "Mae-sutemi-waza", "Tomoe-nage", "Ura-nage", "Ma-sutemi-waza"], 0, 20, false),
  single("Terminologia", "Qual é o termo para as técnicas de projeção executadas com o corpo do Tori caindo para trás, em sacrifício completo?", ["Yoko-sutemi-waza", "Mae-sutemi-waza", "Tomoe-nage", "Ura-nage", "Ma-sutemi-waza"], 4, 20, false),
  single("Terminologia", "Qual é o termo para a pegada no Judogi que permite ao Tori controlar o Uke e aplicar a técnica?", ["Ma-ai", "Shisei", "Kumi-kata", "Hajime", "Mate"], 2, 20, false),
  single("Terminologia", "Qual é o termo para a técnica de projeção que utiliza a força do Uke para projetá-lo no sentido oposto ao ataque original?", ["Renraku-waza", "Renzoku-waza", "Kaeshi-waza", "Sutemi-waza", "Uchi-komi"], 2, 20, false),
  single("Terminologia", "Qual é a postura defensiva básica no Judô, onde o Judoca flexiona os joelhos e afasta os pés para aumentar a base e dificultar o Kuzushi?", ["Shizen Hontai", "Jigo Hontai", "Migi Shizen Tai", "Hidari Shizen Tai", "Seiza"], 1, 20, false),
  single("Etiqueta", "Em que momento o Ritsu Rei é realizado ao entrar e sair do Tatame?", ["Ao pisar no Tatame com o pé esquerdo.", "Ao pisar no Tatame com o pé direito.", "Antes de entrar no Tatame e após sair dele.", "Apenas ao cumprimentar o professor.", "Apenas ao cumprimentar o colega."], 2, 20, false),
  single("Etiqueta", "Qual é a regra de etiqueta fundamental em relação ao Judogi?", ["Utilizar exclusivamente a cor branca.", "Utilizar exclusivamente a cor azul.", "Manter o Judogi limpo, bem conservado e devidamente ajustado.", "Reservá-lo apenas para situações competitivas.", "Substituí-lo com frequência a cada treino."], 2, 20, false),
  single("Arbitragem", "Qual é a pontuação que, quando alcançada duas vezes, equivale a um Ippon?", ["Yuko", "Waza-ari", "Koka", "Shido", "Hansoku-make"], 1, 20, false),
  grid("grid_single", "Terminologia", "Correlacione os termo da arbitagem:", ["Árbitro", "Menor pontuação", "Pontuação intermediária", "Pontuação máxima", "Desclassificado", "Imobilização desfeita", "Imobilizar, imobilização válida"], [{"text": "Shinpan", "correctOptionIndexes": [0]}, {"text": "Yuko", "correctOptionIndexes": [1]}, {"text": "Wazaari", "correctOptionIndexes": [2]}, {"text": "Ippon", "correctOptionIndexes": [3]}, {"text": "Hansoku-make", "correctOptionIndexes": [4]}, {"text": "Toketa", "correctOptionIndexes": [5]}, {"text": "Osaekomi", "correctOptionIndexes": [6]}], 28),
  single("Arbitragem", "Qual é o comando dado pelo árbitro para iniciar a luta?", ["Mate", "Hajime", "Sono-mama", "Osaekomi", "Toketa"], 1, 20, false),
  single("Arbitragem", "Durante uma luta, o Tori aplica uma técnica de projeção, e o Uke cai de lado, com velocidade e controle, mas sem aterrissagem completa de costas. Qual é a pontuação correta a ser atribuída?", ["Ippon", "Waza-ari", "Yuko", "Shido", "Nenhum ponto"], 1, 20, false),
  single("Arbitragem", "Em situação de Golden Score, um Judoca aplica uma imobilização; o árbitro anuncia “Osaekomi!” e, ao atingir 6 segundos, o árbitro interrompe o combate e anuncia sore-made. Qual é o resultado?", ["Yuko para o Tori e o combate continua em pé", "Waza-ari para o Tori e o combate continua em pé", "Yuko para o Tori e o combate se encerra", "Shido para o judoca que estava sendo imobilizado", "A luta continua sem pontuação"], 2, 20, false),
  single("Arbitragem", "O Tori aplica uma imobilização, e o árbitro anuncia \"Osaekomi\". Após 13 segundos, o Uke consegue escapar. Qual é a pontuação final a ser atribuída ao Tori?", ["Ippon", "Waza-ari", "Yuko", "Shido", "Nenhum ponto"], 1, 20, false),
  single("Arbitragem", "Em uma situação de Golden Score, um Judoca recebe um Shido por aplicar um falso ataque. Qual é o resultado da luta?", ["A luta continua.", "O Judoca que recebeu o Shido perde por Hansoku-make.", "O Judoca branco vence por Waza-ari.", "O Judoca branco vence por Ippon.", "A luta é declarada empate."], 0, 20, false),
  single("Arbitragem", "Em Golden Score, ambos os atletas recebem dois Shidos ao longo do combate. Após uma nova infração cometida apenas pelo atleta de Azul, qual é o resultado?", ["A luta continua porque Shido no Golden Score não decide.", "O Judoca que recebeu o Shido perde por Hansoku-make.", "O Judoca adversário vence por Waza-ari.", "O Judoca adversário vence por Ippon.", "A luta é declarada empate."], 1, 20, false),
  single("Técnicas", "\"O ______________ é um Osae waza em que o Tori se posiciona na altura da cabeça do Uke, apoia-se em quatro pontos e fixa o controle usando o tronco enquanto segura na faixa. Já o ______________ mantém a mesma lógica de domínio por cima, porém altera os pontos de apoio e as pegadas, criando uma variação do controle original, abraçando um braço e segurando uma gola com esse mesmo braço.\"", ["Kami-shiho-gatame / Kuzure-kami-shiho-gatame", "Kesa-gatame / Kata-gatame", "Yoko-shiho-gatame / Tate-shiho-gatame", "Osae-komi / Shime-waza", "Kuzure-kami-shiho-gatame / Kami-shiho-gatame"], 0, 20, false),
  single("Técnicas", "Complete: \"O ______________ é um Shime waza realizado sem depender de gola ou manga, produzindo o estrangulamento por meio da pressão direta exercida pelos braços sobre o pescoço do Uke.\"", ["Kata-juji-jime", "Hadaka-jime", "Okuri-eri-jime", "Sankaku-jime", "Ryote-jime"], 1, 20, false),
  grid("grid_multiple", "Técnicas", "Correlacione as técnicas com as suas devidas classificações:", ["Te Waza", "Koshi Waza", "Ashi Waza"], [{"text": "Tai-otoshi", "correctOptionIndexes": [0]}, {"text": "Harai-goshi", "correctOptionIndexes": [1]}, {"text": "Kata-guruma", "correctOptionIndexes": [0]}, {"text": "Kuchiki-taoshi", "correctOptionIndexes": [0]}, {"text": "Tsubame-gaeshi", "correctOptionIndexes": [2]}, {"text": "Tsurikomi-goshi", "correctOptionIndexes": [1]}, {"text": "Uchi-mata-sukashi", "correctOptionIndexes": [0]}], 14),
  single("Técnicas", "Qual é o principal objetivo da prática do Nage no Kata (Forma de Projeções)?", ["Vencer o Uke Rapidamente.", "Desenvolver a compreensão dos princípios de Kuzushi, Tsukuri e Kake é a perfeição da forma.", "Preparar para a competição.", "Apenas memorizar a sequência de movimentos.", "Evitar que o Uke caia."], 1, 20, false),
  single("Técnicas", "Qual é o nome do primeiro estágio do Nage no Kata?", ["Ashi Waza", "Koshi Waza", "Te Waza", "Sutemi Waza", "Ma Sutemi Waza"], 2, 20, false),
  single("Técnicas", "Qual técnica do primeiro estágio do Nage no Kata envolve o bloqueio da perna do Uke com o avanço da perna do Tori e uma defesa do braço do Uke com o braço do Tori para projetá-lo por cima do ombro?", ["Uki-otoshi", "Seoi-nage", "Kata-guruma", "Tai-otoshi", "Ippon-seoi-nage"], 1, 20, false),
  single("Técnicas", "Qual é o nome do segundo estágio do Nage no Kata?", ["Ashi Waza", "Koshi Waza", "Te Waza", "Sutemi Waza", "Ma Sutemi Waza"], 1, 20, false),
  single("Técnicas", "Qual técnica do segundo estágio do Nage no Kata é uma projeção de quadril onde o Tori usa o quadril como ponto de apoio e projeta o Uke com a ajuda da perna para varrer o quadril do Uke?", ["Uki-goshi", "Harai-goshi", "Tsurikomi-goshi", "Uchi-mata", "O-goshi"], 1, 20, false),
  single("Técnicas", "Qual é o nome do terceiro estágio do Nage no Kata?", ["Ashi Waza", "Koshi Waza", "Te Waza", "Sutemi Waza", "Ma Sutemi Waza"], 0, 20, false),
  single("Técnicas", "Tendo como referência o Joseki, no Nage no Kata onde o Tori fica posicionado?", ["A Direita", "A Esquerda", "Na Frente", "Atrás", "Começa na esquerda e termina na direita"], 0, 20, false),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Ude-hishigi-juji-gatame", "Ude-hishigi-ude-gatame", "Ashi-gatame", "Sankaku-gatame", "Ude-hishigi-ashi-gatame"], 4, 20, true),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Daki-nage", "Koshi-wakare", "Yoko-wakare", "Daki-wakare"], 3, 20, true),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Seoi-nage", "Seoi-otoshi", "Morote-seoi-nage", "Ippon-seoi-nage", "Seoi"], 1, 20, true),
  single("Técnicas", "Analise a descrição da técnica: \"O Tori tenta aplicar um O-uchi-gari no Uke. O Uke se defende, e o Tori imediatamente muda a direção e aplica um Tomoe-nage no Uke.\" Qual categoria de técnica está sendo descrita?", ["Kaeshi-waza", "Renzoku-waza", "Renraku-Henka-waza", "Sutemi-waza", "Nage-no-kata"], 2, 20, false),
  single("Técnicas · mídia pendente", "Analise e diga qual técnica foi aplicada:", ["Kata", "Kata-gatame", "Kata-otoshi", "Kata-guruma", "Single Leg"], 3, 20, true),
  single("Técnicas · mídia pendente", "A partir da imagem podemos dizer que o atleta de azul aplicou:", ["Um Renraku", "Um Kaeshi", "Um Rezoku", "Um Koka"], 1, 20, true),
  single("Técnicas · mídia pendente", "Analise a imagem e que técnica está sendo aplicada:", ["Ko-uchi-gari", "Ko-uchi-gake", "Ko-uchi-gaeshi", "Ko-uchi-makikomi", "Ko-soto-gari"], 3, 20, true),
  single("Terminologia", "Analise a descrição: \"O Tori está em Kumi-kata com o Uke. O Uke está com a postura Jigo Hontai. O Tori aplica um Kuzushi para frente, forçando o Uke a dar um passo à frente. O Tori então entra com o quadril e aplica um Harai-goshi.\" Qual é a fase da técnica que o Tori está executando ao entrar com o quadril?", ["Kuzushi", "Kake", "Tsukuri", "Uchi-komi", "Randori"], 2, 20, false),
  single("Técnicas · mídia pendente", "Analise e diga qual é essa técnica:", ["Arm Lock", "Juji-gatame", "Ude-hishiji-juji-gatame", "Ude-hishigi-ude-gatame", "Ude-juji-gatame"], 2, 20, true),
] satisfies TheoryTemplateQuestion[];

export const GREEN_THEORY_TEMPLATE = GREEN_THEORY_QUESTIONS;

export const GREEN_THEORY_TEMPLATE_SUMMARY = {
  questionCount: GREEN_THEORY_QUESTIONS.length,
  totalPoints: GREEN_THEORY_QUESTIONS.reduce((total, question) => total + question.points, 0),
  gridQuestionCount: GREEN_THEORY_QUESTIONS.filter((question) => question.type !== "single_choice").length,
  pendingMediaCount: GREEN_THEORY_QUESTIONS.filter((question) => question.mediaPending).length,
} as const;
