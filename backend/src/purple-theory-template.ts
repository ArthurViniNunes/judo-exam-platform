import type { TheoryTemplateQuestion } from "../../lib/theory-exams";

const sourceExplanation =
  "Resposta correta conforme o gabarito oficial fornecido para a faixa roxa.";
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

// Transcrição do gabarito em docs/exams para a faixa roxa.
// Questões com mídia mantêm apenas enunciado, alternativas e gabarito até a mídia ser cadastrada.
export const PURPLE_THEORY_QUESTIONS = [
  single("História", "A fundação do Judô por Jigoro Kano é frequentemente vista como um marco na transição das artes marciais japonesas de Jutsu para Do. Qual é a implicação sociológica mais profunda dessa mudança de nomenclatura?", ["A substituição da ênfase na eficácia militar pela ênfase na competição esportiva.", "A mudança de um foco puramente técnico para um foco educacional e de desenvolvimento moral.", "A padronização das técnicas para facilitar a exportação para o Ocidente.", "A exclusão de todas as técnicas de solo (Ne-waza).", "A criação de um sistema de graduação por cores de faixa."], 1, 20, false),
  single("História", "Qual foi o objetivo original de Jigoro Kano na criação do sistema Dan e Kyu?", ["Apenas para diferenciar os alunos mais antigos.", "Criar uma hierarquia rígida de poder dentro do Dojo.", "Fornecer um sistema de reconhecimento de mérito e incentivar o estudo contínuo, independentemente da idade ou força física.", "Determinar quem poderia competir em torneios internacionais.", "Somente para substituir o sistema de licenças (Menkyo) das escolas antigas."], 2, 20, false),
  single("Filosofia", "Qual foi a principal contribuição de Jigoro Kano para a filosofia do Judô, que o diferencia de outras artes marciais japonesas?", ["A ênfase na vitória a qualquer custo.", "A introdução do conceito de Kuzushi.", "A sistematização dos princípios Seiryoku Zen'yo e Jita Kyoei como pilares éticos e técnicos.", "A criação do Nage no Kata.", "A popularização do Randori."], 2, 20, false),
  single("História", "Em 1961, o cearense que residia no Rio de Janeiro chegou em Fortaleza, seu nome era Antônio Lima Filho. Portando seu 2°Dan começou a ministrar aulas na academia do Prof. Nilo Veloso onde ocorriam aulas de diversas modalidades em evidência o Jiu-Jitsu. Um dos alunos de Nilo, já faixa marrom de Jiu-Jitsu, se tornou o primeiro faixa preta no Ceará. Qual o seu nome?", ["Milton Moreira", "Milton Lima", "Rogério Cruz", "Antônio Moreira", "Nilo Veloso"], 0, 20, false),
  single("História", "A Kodokan, ao longo de sua história, passou por diversas revisões do Gokyo no Waza. Qual é o principal motivo por trás dessas revisões periódicas?", ["A necessidade de remover técnicas que se tornaram ineficazes em competições.", "A adaptação do currículo para refletir a evolução do Judô como esporte e a necessidade de maior segurança.", "A inclusão de técnicas de outras artes marciais.", "A exclusão de técnicas de solo.", "A simplificação do currículo para iniciantes."], 1, 20, false),
  single("Filosofia", "Qual é o significado da frase \"O Judô é o caminho para o uso mais eficiente da energia física e mental para atingir o benefício para todos\"?", ["Uma descrição voltada ao princípio de cooperação mútua.", "Uma formulação que expressa o ideal de melhor aproveitamento da energia.", "A definição do Judô proposta por Jigoro Kano, reunindo seus dois princípios centrais.", "Uma explicação sobre a prática livre de treino.", "Uma referência às demonstrações formais."], 2, 20, false),
  single("Técnicas", "Qual é o papel do Kime no Kata (Forma da Decisão) no currículo da Kodokan, e por que ele é ensinado apenas em níveis avançados?", ["É uma forma de aquecimento.", "É o Kata de competição, usado para demonstrar finalizações de lutas.", "Ele preserva as técnicas de ataque (Atemi-waza), vinda dos Ju-jutsus, que foram excluídas do Randori e do Shiai.", "É o Kata de Ne-waza.", "É o Kata de Ukemi."], 2, 20, false),
  single("História", "Qual foi a principal razão pela qual a Kodokan se consolidou como o centro mundial do Judô, mesmo após a expansão internacional da arte?", ["Possuir exclusividade na concessão do 10º Dan.", "Preservar a orientação filosófica, o currículo técnico e a responsabilidade sobre os Kata.", "Ser oficialmente a sede da Federação Internacional de Judô.", "Ter autoridade exclusiva para promover competições de alcance mundial.", "Ser a única instituição autorizada a formar árbitros internacionais."], 1, 20, false),
  single("História", "Complete a frase: ___________ foi a primeira medalhista olímpica feminina do judô brasileiro, conquistando o bronze nos Jogos de Pequim 2008. A primeira campeã olímpica da história do judô brasileiro, ao vencer na categoria até 48 kg nos Jogos de Londres 2012, foi ___________.", ["Ketlyn Quadros; Sarah Menezes", "Sarah Menezes; Rafaela Silva", "Rafaela Silva; Ketlyn Quadros", "Ketlyn Quadros; Beatriz Souza", "Rafaela Silva; Beatriz Souza"], 0, 20, false),
  single("História", "Chiaki Ishii se naturalizou brasileiro e competiu nas Olimpíadas de Munique, trazendo a primeira medalha olímpica de judô para o Brasil. Isso só foi possível graças ao crescimento do judô no Brasil. Em ___________ foi fundada a Federação Paulista de Judô, a primeira federação estadual do país. Isso foi um passo crucial para a criação da Confederação Brasileira de Judô no ano de ___________.", ["1958; 1969", "1960; 1969", "1958; 1970", "1932; 1969", "1932; 1958"], 0, 20, false),
  grid("grid_single", "História", "Correlacione os fatos com as datas", ["Outubro de 1860", "Maio de 1938", "Maio de 1882", "Outubro de 1964", "Novembro de 1914", "Abril de 1958", "Agosto de 1972"], [{"text": "Nascimento de Jigoro Kano", "correctOptionIndexes": [0]}, {"text": "Morte de Jigoro Kano", "correctOptionIndexes": [1]}, {"text": "Fundação da Kodokan", "correctOptionIndexes": [2]}, {"text": "Primeira participação do Judô nas Olimpíadas", "correctOptionIndexes": [3]}, {"text": "Mitsuyo Maeda chega ao Brasil", "correctOptionIndexes": [4]}, {"text": "Fundação da primeira Federação Estadual de Judô", "correctOptionIndexes": [5]}, {"text": "Chiaki Ishii ganha a primeira medalha olímpica do Brasil no Judô", "correctOptionIndexes": [6]}], 20),
  single("Terminologia", "Complete corretamente: \"No Judô, saber como andar é muito importante. O é a forma de andar natural e comum; já o é a forma de andar onde um pé passa o outro, mas sempre deslizando e mantendo o contato com o chão com as pontas dos dedos. Já o é a forma de andar mais comum no kata, também conhecida como andar contínuo, pois um pé não ultrapassa o outro.", ["Ayumi-ashi; Suri-ashi; Tsugi-ashi", "Tsugi-ashi; Ayumi-ashi; Suri-ashi;", "Ayumi-ashi; Tsugi-ashi; Suri-ashi", "Suri-ashi; Tsugi-ashi; Ayumi-ashi;", "Tsugi-ashi; Suri-ashi; Ayumi-ashi"], 0, 20, false),
  single("Técnicas", "Complete: \"A execução de uma projeção no Judô passa por três fases essenciais: por ultimo _______1_______, que corresponde ao lançamento efetivo e à finalização da técnica; em seguida, _______2_______, quando o Tori posiciona o corpo e ajusta a força; e por fim, _______3_______, em que o Tori desequilibra o Uke para preparar o movimento.\":", ["Ukemi / Tsukuri / Kuzushi", "Kuzushi / Tsukuri / Kake", "Kake / Tsukuri / Kuzushi", "Tsukuri / Kake / Kuzushi", "Kake / Kuzushi / Tsukuri"], 2, 20, false),
  single("Terminologia", "Qual é o termo que descreve a prática livre de ataque e defesa, permitindo que o Judoca aplique técnicas em situações dinâmicas?", ["Kata", "Randori", "Osae-waza", "Ukemi", "Kake"], 1, 20, false),
  single("Terminologia", "Complete a frase: \"O Judogi é composto por três partes principais: o ______________, que cobre o tronco; o ______________, usado nas pernas; e o ______________, que é utilizado para amarrar o Judogi e manter tudo firme.\"", ["Uwagi / Shitabaki / Obi", "Shitabaki / Uwagi / Obi", "Obi / Uwagi / Shitabaki", "Uwagi / Obi / Shitabaki", "Shitabaki / Obi / Uwagi"], 0, 20, false),
  single("Terminologia", "Qual é o termo que descreve os movimentos de deslocamento corporal, fundamentais para esquiva, ataque e reposicionamento durante o combate?", ["Ukemi", "Tai-sabaki", "Kuzushi", "Kumi-kata", "Zanshin"], 1, 20, false),
  single("Terminologia", "Complete a frase: \"O Judoca deve estar atento aos deslocamentos de seu corpo à esquerda e à direita, conhecidos como ______________ e ______________, para manter equilíbrio, postura e eficácia durante as técnicas.\"", ["Hidari / migi", "Migi / hidari", "Kumi / kake", "Tsukuri / Kake", "Shisei / Zanshin"], 0, 20, false),
  single("Terminologia", "Qual é o termo que descreve a técnica de contra-ataque, onde o Judoca usa o movimento de ataque do oponente para projetá-lo?", ["Renraku-waza", "Henka-waza", "Kaeshi-waza", "Sutemi-waza", "Nage-waza"], 2, 20, false),
  single("Filosofia", "Interprete o seguinte provérbio japonês: \"Se você cair sete vezes, levante-se oito.\" Qual princípio filosófico do Judô essa frase melhor ilustra?", ["Seiryoku Zen'yo (Máxima Eficiência)", "Jita Kyoei (Prosperidade Mútua)", "Rei (Respeito)", "Resiliência e Perseverança (o espírito do Do, caminho)", "Zanshin (Alerta Mental)"], 3, 20, false),
  single("Filosofia", "Qual é a relação entre o Seiryoku Zen'yo e o Jita Kyoei na visão de Jigoro Kano?", ["Funcionam como ideias separadas, sem ligação direta.", "O Seiryoku Zen'yo atua como caminho prático para que o Jita Kyoei se realize como ideal social e moral.", "O Jita Kyoei serve como método para atingir o Seiryoku Zen'yo.", "São entendidos apenas como conceitos aplicados à luta.", "Representam exclusivamente formas de saudação."], 1, 20, false),
  single("Filosofia", "Um Judoca, durante o Randori, percebe que seu oponente é mais forte e tenta aplicar uma técnica de projeção usando a força bruta. O Judoca mais fraco, em vez de resistir, usa o movimento do oponente para aplicar um contra-ataque. Qual princípio está sendo aplicado?", ["Jita Kyoei", "Rei", "Seiryoku Zen'yo", "Zanshin", "Mushin"], 2, 20, false),
  single("Filosofia", "Um Judoca mais graduado dedica tempo para ensinar e corrigir um iniciante, garantindo que o iniciante aprenda a cair corretamente (Ukemi) e a aplicar as técnicas de forma segura. Qual princípio filosófico é o foco dessa interação?", ["Seiryoku Zen'yo", "Jita Kyoei", "Zanshin", "Shoshin", "Kiai"], 1, 20, false),
  single("Arbitragem", "Qual é a principal diferença entre a aplicação do Hansoku-make por acúmulo de Shido e o Hansoku-make direto (por infração grave)?", ["Não há diferença, ambos resultam na desclassificação imediata.", "O Hansoku-make por acúmulo de Shido é reversível após a revisão do vídeo.", "O Hansoku-make direto implica a exclusão do Judoca da competição, enquanto o por Shido apenas encerra a luta.", "O Hansoku-make por Shido só é aplicado no Golden Score.", "O Hansoku-make direto só é aplicado em Ne-waza."], 2, 20, false),
  single("Arbitragem", "Qual é o sinal que indica que o Judoca aplicou uma técnica que vale Ippon, encerrando a luta imediatamente?", ["Levantar o braço acima da cabeça e dizer Ippon.", "Levantar um braço apenas.", "Dizer Ippon, sem gestos.", "Apontar para o Judoca vencedor com um braço.", "Dizer “Mate” enquanto mantém os braços abaixados."], 0, 20, false),
  single("Arbitragem", "Qual é o sinal utilizado para indicar que uma imobilização está sendo válida?", ["Apontar os braços lateralmente para os Judocas.", "Estender o braço em direção aos atletas apenas.", "Estender o braço em direção aos atletas e dizer \"Osaekomi”.", "Cruzar os braços sobre o peito e dizer “Osaekomi”.", "Bater palmas rapidamente."], 2, 20, false),
  single("Arbitragem", "Qual é a regra atual da FIJ sobre a pegada de perna abaixo da linha do glúteo e qual é a penalidade aplicada?", ["É permitido, sem penalidade.", "É permitido apenas como contra-ataque.", "É proibido e penalizado com Shido na primeira ocorrência.", "É proibido e penalizado com Hansoku-make direto.", "É proibido e penalizado com Waza-ari para o oponente."], 2, 20, false),
  single("Arbitragem", "Durante uma luta, o Tori aplica uma técnica de projeção, e o Uke cai de lado, com velocidade e controle, mas sem aterrissagem completa de costas. Qual é a pontuação correta a ser atribuída?", ["Ippon", "Waza-ari", "Yuko", "Shido", "Nenhum ponto"], 1, 20, false),
  single("Arbitragem", "Um Judoca está passivo, evitando o combate e não tentando pegar o Judogi do oponente por mais de 25 segundos. Qual é a penalidade correta a ser aplicada?", ["Hansoku-make", "Shido", "Mate", "Hajime", "Nenhum"], 1, 20, false),
  single("Arbitragem", "O Tori aplica uma imobilização, e o árbitro anuncia \"Osaekomi\". Após 15 segundos, o Uke consegue escapar. Qual é a pontuação final a ser atribuída ao Tori?", ["Ippon", "Waza-ari", "Yuko", "Shido", "Nenhum ponto"], 1, 20, false),
  single("Arbitragem", "Em uma situação de Golden Score, um Judoca recebe um Shido por sair da área de combate. Qual é o resultado da luta?", ["A luta continua.", "O Judoca que recebeu o Shido perde por Hansoku-make.", "O Judoca adversário vence por Waza-ari.", "O Judoca adversário vence por Ippon.", "A luta é declarada empate."], 0, 20, false),
  single("Kata", "O Nage no Kata é composto por quantos estágios e quantas técnicas no total?", ["3 estágios e 15 técnicas", "5 estágios e 20 técnicas", "5 estágios e 15 técnicas", "5 estágios e 40 técnicas", "7 estágios e 40 técnicas"], 2, 20, false),
  single("Kata", "Qual é o nome do quarto estágio do Nage no Kata?", ["Ashi Waza", "Koshi Waza", "Te Waza", "Ma Sutemi Waza", "Yoko Sutemi Waza"], 3, 20, false),
  single("Kata", "Qual é o nome do quinto estágio do Nage no Kata?", ["Ashi Waza", "Koshi Waza", "Te Waza", "Ma Sutemi Waza", "Yoko Sutemi Waza"], 4, 20, false),
  single("Kata", "Qual é o nome da 1ª técnica do quarto estágio do Nage no Kata?", ["Tomoe-nage", "Sumi-gaeshi", "Ura-nage", "Yoko-otoshi", "Tani-otoshi"], 0, 20, false),
  single("Kata", "Quantas projeções ocorrem durante o Nage no Kata?", ["15", "35", "30", "20", "25"], 2, 20, false),
  grid("grid_multiple", "Técnicas", "Correlacione os estágios de uma técnica de projeção:", ["Kumikata", "Kuzushi", "Tsukuri", "Kake", "Kime"], [{"text": "Pegada", "correctOptionIndexes": [0]}, {"text": "Desequilíbrio", "correctOptionIndexes": [1]}, {"text": "Encaixe", "correctOptionIndexes": [2]}, {"text": "Projeção", "correctOptionIndexes": [3]}, {"text": "Finalização", "correctOptionIndexes": [4]}], 20),
  grid("grid_multiple", "Técnicas", "Correlacione as técnicas as suas devidas classificações:", ["Tachi-waza", "Sutemi-waza", "Shime-waza", "Kansetsu-waza", "Osaekomi-waza"], [{"text": "Tomoe-nage", "correctOptionIndexes": [1]}, {"text": "Harai-makikomi", "correctOptionIndexes": [1]}, {"text": "Ashi-guruma", "correctOptionIndexes": [0]}, {"text": "Morote-gari", "correctOptionIndexes": [0]}, {"text": "Ude-hishigi-sankaku-gatame", "correctOptionIndexes": [3]}, {"text": "Ashi-garami", "correctOptionIndexes": [3]}, {"text": "Uki-gatame", "correctOptionIndexes": [4]}, {"text": "Ushiro-kesa-gatame", "correctOptionIndexes": [4]}, {"text": "Sankaku-jime", "correctOptionIndexes": [2]}, {"text": "Do-jime", "correctOptionIndexes": [2]}], 20),
  single("Técnicas", "Analise a descrição da técnica de Projeção: \"O Tori está em Kumi-kata com o Uke. O Uke está com a postura Jigo Hontai. O Tori aplica um Kuzushi para frente, forçando o Uke a dar um passo à frente. O Tori então entra com o quadril e aplica um Harai-goshi.\" Qual é a fase da técnica que o Tori está executando ao entrar com o quadril?", ["Kuzushi", "Kake", "Tsukuri", "Uchi-komi", "Randori"], 2, 20, false),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Tani-otoshi", "Uchi-mata-gaeshi", "Ko-soto-gari", "Nidan-gake", "Yoko-gake"], 1, 20, true),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Yoko-guruma", "Ura-nage", "Suplex", "Tani-otoshi", "Ushiro-goshi"], 1, 20, true),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Uki-gatame", "Ura-gatame", "Uki-kesa-gatame", "Uke-gateme", "Uki-shiho-gatame"], 0, 20, true),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Obi-tori-gaeshi", "Obi-otoshi", "Obi-nage", "Sukui-nage", "Tori-gaeshi"], 0, 20, true),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Uchi-makikomi", "Ippon-seoi-makikomi", "Soto-makikomi", "Ippon-seoi-nage", "Maki-makikomi"], 0, 20, true),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Ashi-guruma", "Harai-goshi", "O-Guruma", "Uchi-mata", "Hiza-guruma"], 0, 20, true),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Ude-hishigi-juji-gatame", "Ude-hishigi-ude-gatame", "Ude-gyaku-juji-gatame", "Ude-hishigi-ashi-gatame", "Ude-hishigi-sankaku-gatame"], 0, 20, true),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Morote-gari", "Morote-Seoi", "Kuchiki-taoshi", "Sumi-gaeshi", "Hane-goshi"], 0, 20, true),
  single("Técnicas · mídia pendente", "Analise a imagem e diga que técnica está sendo aplicada.", ["Ude-garami", "Ude-hishigi-ude-garami", "Kimura", "Ude-hishigi-ude-garame", "Ude-jime"], 0, 20, true),
  single("Técnicas", "Analise a descrição da técnica de Projeção: \"O Tori tenta aplicar um O-uchi-gari no Uke. O Uke se defende, e o Tori imediatamente muda a direção e aplica um Tomoe-nage no Uke.\" Qual categoria de técnica está sendo descrita?", ["Kaeshi-waza", "Renzoku-waza", "Renraku-Henka Waza", "Sutemi-waza", "Nage-no-kata"], 2, 20, false),
  single("Técnicas", "Analise a descrição da técnica de Controle no Solo: \"O Tori está por trás do Uke e usa as golas do Judogi do Uke para aplicar um estrangulamento com as duas mãos, apertando a artéria carótida.\" Qual técnica de estrangulamento é mais provável?", ["Kata-juji-jime", "Nami-juji-jime", "Okuri-eri-jime", "Hadaka-jime", "Sankaku-jime"], 2, 20, false),
  single("Técnicas", "Analise a descrição da técnica de Katame-waza: \"O Tori está em Ne-waza e prende o braço do Uke entre suas pernas sobre o tronco do Uke, aplicando pressão no cotovelo como quadril.\" Qual técnica de chave de articulação é mais provável?", ["Ude-garami", "Ude-hishigi-juji-gatame", "Ude-hishigi-ude-gatame", "Sankaku-gatame", "Ashi-garami"], 1, 20, false),
] satisfies TheoryTemplateQuestion[];

export const PURPLE_THEORY_TEMPLATE = PURPLE_THEORY_QUESTIONS;

export const PURPLE_THEORY_TEMPLATE_SUMMARY = {
  questionCount: PURPLE_THEORY_QUESTIONS.length,
  totalPoints: PURPLE_THEORY_QUESTIONS.reduce((total, question) => total + question.points, 0),
  gridQuestionCount: PURPLE_THEORY_QUESTIONS.filter((question) => question.type !== "single_choice").length,
  pendingMediaCount: PURPLE_THEORY_QUESTIONS.filter((question) => question.mediaPending).length,
} as const;
