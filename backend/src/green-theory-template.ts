import type { TheoryQuestionType, TheoryTemplateQuestion } from "../../lib/theory-exams";

const provisionalExplanation =
  "Gabarito provisório importado do formulário. Revise a resposta correta e complemente esta explicação antes de publicar.";

function single(
  category: string,
  prompt: string,
  options: string[],
  points = 20,
  mediaPending = false,
): TheoryTemplateQuestion {
  return {
    type: "single_choice",
    category,
    prompt,
    points,
    explanation: mediaPending
      ? `${provisionalExplanation} Adicione a imagem ou o vídeo desta questão.`
      : provisionalExplanation,
    options: options.map((text, index) => ({ text, isCorrect: index === 0 })),
    rows: [],
    mediaPending,
  };
}

function grid(
  category: string,
  prompt: string,
  options: string[],
  rows: string[],
  points: number,
  type: Extract<TheoryQuestionType, "grid_single" | "grid_multiple">,
): TheoryTemplateQuestion {
  return {
    type,
    category,
    prompt,
    points,
    explanation: provisionalExplanation,
    options: options.map((text) => ({ text, isCorrect: false })),
    rows: rows.map((text) => ({ text, correctOptionIndexes: [0] })),
  };
}

export const GREEN_THEORY_QUESTIONS = [
  // História e fundamentos: edite cada pergunta mantendo a primeira opção como gabarito.
  single("História", "A fundação do Judô por Jigoro Kano é frequentemente vista como um marco na transição das artes marciais japonesas de Jutsu para Do. Qual é a implicação sociológica mais profunda dessa mudança de nomenclatura?", ["A substituição da ênfase na eficácia militar pela ênfase na competição esportiva.", "A mudança de um foco puramente técnico para um foco educacional e de desenvolvimento moral.", "A padronização das técnicas para facilitar a exportação para o Ocidente.", "A exclusão de todas as técnicas de solo (Ne-waza).", "A criação de um sistema de graduação por cores de faixa."]),
  single("História", "Qual foi o objetivo original de Jigoro Kano na criação do sistema Dan e Kyu?", ["Apenas para diferenciar os alunos mais antigos.", "Criar uma hierarquia rígida de poder dentro do Dojo.", "Fornecer um sistema de reconhecimento de mérito e incentivar o estudo contínuo, independentemente da idade ou força física.", "Determinar quem poderia competir em torneios internacionais.", "Somente para substituir o sistema de licenças (Menkyo) das escolas antigas."]),
  single("Filosofia", "Qual foi a principal contribuição de Jigoro Kano para a filosofia do Judô, que o diferencia de outras artes marciais japonesas?", ["A ênfase na vitória a qualquer custo.", "A introdução do conceito de Kuzushi.", "A sistematização dos princípios Seiryoku Zen'yo e Jita Kyoei como pilares éticos e técnicos.", "A criação do Nage no Kata.", "A popularização do Randori."]),
  single("História", "Em 1961, o cearense Antônio Lima Filho, então 2º Dan, começou a ministrar aulas na academia do Prof. Nilo Veloso. Um dos alunos de Nilo, já faixa marrom de Jiu-Jitsu, tornou-se o primeiro faixa preta no Ceará. Qual o seu nome?", ["Milton Moreira", "Milton Lima", "Rogério Cruz", "Antônio Moreira", "Nilo Veloso"]),
  single("História", "A Kodokan, ao longo de sua história, passou por diversas revisões do Gokyo no Waza. Qual é o principal motivo por trás dessas revisões periódicas?", ["A necessidade de remover técnicas que se tornaram ineficazes em competições.", "A adaptação do currículo para refletir a evolução do Judô como esporte e a necessidade de maior segurança.", "A inclusão de técnicas de outras artes marciais.", "A exclusão de técnicas de solo.", "A simplificação do currículo para iniciantes."]),
  single("Filosofia", "Qual é o significado da frase: “O Judô é o caminho para o uso mais eficiente da energia física e mental para atingir o benefício para todos”?", ["Uma descrição voltada ao princípio de cooperação mútua.", "Uma formulação que expressa o ideal de melhor aproveitamento da energia.", "A definição do Judô proposta por Jigoro Kano, reunindo seus dois princípios centrais.", "Uma explicação sobre a prática livre de treino.", "Uma referência às demonstrações formais."]),
  single("História", "Qual foi a principal razão pela qual a Kodokan se consolidou como o centro mundial do Judô, mesmo após a expansão internacional da arte?", ["Possuir exclusividade na concessão do 10º Dan.", "Preservar a orientação filosófica, o currículo técnico e a responsabilidade sobre os Kata.", "Ser oficialmente a sede da Federação Internacional de Judô.", "Ter autoridade exclusiva para promover competições de alcance mundial.", "Ser a única instituição autorizada a formar árbitros internacionais."]),
  single("História", "Complete: ______ foi a primeira medalhista olímpica feminina do judô brasileiro, com bronze em Pequim 2008. A primeira campeã olímpica do judô brasileiro, em Londres 2012, foi ______.", ["Ketlyn Quadros; Sarah Menezes", "Sarah Menezes; Rafaela Silva", "Rafaela Silva; Ketlyn Quadros", "Ketlyn Quadros; Beatriz Souza", "Rafaela Silva; Beatriz Souza"]),
  single("História", "Chiaki Ishii trouxe a primeira medalha olímpica do judô para o Brasil. Em ______ foi fundada a Federação Paulista de Judô, e em ______ foi criada a Confederação Brasileira de Judô.", ["1958; 1969", "1960; 1969", "1958; 1970", "1932; 1969", "1932; 1958"]),

  // Questões de associação: options são as respostas; rows são os itens a relacionar.
  grid("História", "Correlacione os fatos com as datas.", ["Outubro de 1860", "Maio de 1938", "Maio de 1882", "Outubro de 1964", "Novembro de 1914", "Abril de 1958", "Agosto de 1972"], ["Nascimento de Jigoro Kano", "Morte de Jigoro Kano", "Fundação da Kodokan", "Primeira participação do Judô nas Olimpíadas", "Mitsuyo Maeda chega ao Brasil", "Fundação da primeira Federação Estadual de Judô", "Chiaki Ishii ganha a primeira medalha olímpica do Brasil no Judô"], 8, "grid_single"),
  single("Terminologia", "Complete corretamente: no Judô, o ______ é a forma de andar natural e comum; o ______ é a forma em que um pé passa o outro, deslizando; e o ______ é o andar contínuo comum no kata, em que um pé não ultrapassa o outro.", ["Ayumi-ashi; Suri-ashi; Tsugi-ashi", "Tsugi-ashi; Ayumi-ashi; Suri-ashi", "Ayumi-ashi; Tsugi-ashi; Suri-ashi", "Suri-ashi; Tsugi-ashi; Ayumi-ashi", "Tsugi-ashi; Suri-ashi; Ayumi-ashi"]),
  single("Filosofia", "Qual é a relação entre o Seiryoku Zen'yo e o Jita Kyoei na visão de Jigoro Kano?", ["Funcionam como ideias separadas, sem ligação direta.", "O Seiryoku Zen'yo atua como caminho prático para que o Jita Kyoei se realize como ideal social e moral.", "O Jita Kyoei serve como método para atingir o Seiryoku Zen'yo.", "São entendidos apenas como conceitos aplicados à luta.", "Representam exclusivamente formas de saudação."]),
  grid("Filosofia", "Complete as três lacunas: benefício mútuo para todos; melhor uso da energia mental e física; e o princípio de que o flexível supera o rígido.", ["1", "2", "3"], ["Jita Kyoei", "Seiryoku Zen'yo", "Ju no Ri"], 20, "grid_single"),
  single("Filosofia", "Durante o Randori, um judoca mais fraco usa o movimento do oponente mais forte para aplicar um contra-ataque, em vez de resistir com força bruta. Qual princípio está sendo aplicado?", ["Jita Kyoei", "Rei", "Seiryoku Zen'yo", "Zanshin", "Mushin"]),
  single("Filosofia", "Um judoca mais graduado dedica tempo a ensinar e corrigir um iniciante, garantindo Ukemi correto e prática segura. Qual princípio filosófico é o foco dessa interação?", ["Seiryoku Zen'yo", "Jita Kyoei", "Zanshin", "Shoshin", "Kiai"]),
  grid("Etiqueta", "Complete a sequência da cerimônia inicial do treino e de eventos, relacionando cada termo à lacuna correspondente.", ["1", "2", "3", "4", "5", "6", "7", "8", "9"], ["Reiho", "Kyotsuke", "Seiza", "Mokuso", "Mokuso Yame", "Chokuritsu", "Shomen Ni Rei", "Sensei (Gata) Ni Rei", "Tatte"], 50, "grid_multiple"),

  // Terminologia e etiqueta.
  single("Terminologia", "Qual é o termo que descreve a prática livre de ataque e defesa, permitindo que o judoca aplique técnicas em situações dinâmicas?", ["Kata", "Randori", "Osae-waza", "Ukemi", "Uchikomi"]),
  single("Terminologia", "Qual é o termo que descreve os movimentos de deslocamento corporal fundamentais para esquiva, ataque e reposicionamento durante o combate?", ["Ukemi", "Tai-sabaki", "Kuzushi", "Kumi-kata", "Zanshin"]),
  grid("Terminologia", "Complete: o judoca deve estar atento à sua movimentação, aos lados esquerdo e direito e à postura correta. Relacione os termos às lacunas.", ["1", "2", "3", "4"], ["Shintai", "Hidari", "Migi", "Shisei"], 10, "grid_single"),
  single("Terminologia", "Complete: o Judogi é composto pelo ______, que cobre o tronco; pelo ______, usado nas pernas; e pelo ______, usado para amarrar o Judogi.", ["Uwagi / Shitabaki / Obi", "Shitabaki / Uwagi / Obi", "Obi / Uwagi / Shitabaki", "Uwagi / Obi / Shitabaki", "Shitabaki / Obi / Uwagi"]),
  grid("Terminologia", "Correlacione os termos aos respectivos significados.", ["Movimentação", "Aluno mais antigo", "Árbitro", "Aluno", "Local de treinamento", "Local de competição", "Uniforme de treino", "Cumprimento ajoelhado"], ["Shintai", "Senpai", "Shinpan", "Seito", "Dojo", "Shiaijo", "Keikogi", "Zarei", "Ritsurei", "Yudansha"], 10, "grid_single"),

  // Arbitragem: a primeira alternativa de cada single_choice é o gabarito atual.
  single("Arbitragem", "Qual é a principal diferença entre a aplicação do Hansoku-make por acúmulo de Shido e o Hansoku-make direto?", ["Não há diferença, ambos resultam na desclassificação imediata.", "O Hansoku-make por acúmulo de Shido é reversível após a revisão do vídeo.", "O Hansoku-make direto implica a exclusão do judoca da competição, enquanto o por Shido apenas encerra a luta.", "O Hansoku-make por Shido só é aplicado no Golden Score.", "O Hansoku-make direto só é aplicado em Ne-waza."]),
  single("Arbitragem", "Qual é o sinal que indica que o judoca aplicou uma técnica que vale Ippon, encerrando a luta imediatamente?", ["Levantar o braço acima da cabeça e dizer Ippon.", "Levantar um braço apenas.", "Dizer Ippon, sem gestos.", "Apontar para o judoca vencedor com um braço.", "Dizer Mate enquanto mantém os braços abaixados."]),
  single("Arbitragem", "Qual é o sinal utilizado para indicar que uma imobilização está sendo válida?", ["Apontar os braços lateralmente para os judocas.", "Estender o braço em direção aos atletas apenas.", "Estender o braço em direção aos atletas e dizer Osaekomi.", "Cruzar os braços sobre o peito e dizer Osaekomi.", "Bater palmas rapidamente."]),
  single("Arbitragem", "Qual é a regra atual da FIJ sobre a pegada de perna abaixo da linha do glúteo e qual é a penalidade aplicada?", ["É permitido, sem penalidade.", "É permitido apenas como contra-ataque.", "É proibido e penalizado com Shido na primeira ocorrência.", "É proibido e penalizado com Hansoku-make direto.", "É proibido e penalizado com Waza-ari para o oponente."]),
  single("Arbitragem", "Durante uma luta, o Tori projeta o Uke de lado, com velocidade e controle, mas sem aterrissagem completa de costas. Qual pontuação deve ser atribuída?", ["Ippon", "Waza-ari", "Yuko", "Shido", "Nenhum ponto"]),
  single("Arbitragem", "Assinale a alternativa que não é punida com Shido.", ["Pegar na calça abaixo da linha do glúteo.", "Postura excessivamente defensiva com braços estendidos.", "Ser passivo durante a luta em Ne-waza.", "Retirar Kumikata sem buscar fazer um Judô positivo.", "Sair da área de luta durante a disputa de Kumikata ou a aplicação de uma projeção."]),
  single("Arbitragem", "O Tori aplica uma imobilização e o árbitro anuncia Osaekomi. Após 15 segundos, o Uke escapa. Qual pontuação final deve ser atribuída ao Tori?", ["Ippon", "Waza-ari", "Yuko", "Shido", "Nenhum ponto"]),
  single("Arbitragem", "Em uma situação de Golden Score, um judoca recebe um Shido por ataque falso. Qual é o resultado da luta?", ["A luta continua.", "O judoca que recebeu o Shido perde por Hansoku-make.", "O judoca adversário vence por Waza-ari.", "O judoca adversário vence por Ippon.", "A luta é declarada empate."]),
  grid("Técnicas", "Relacione as duas técnicas proibidas de Tachi-waza descritas: a “Tesoura”, técnica de sacrifício, e a técnica em que o Tori entrelaça a perna por fora da perna do Uke.", ["1", "2"], ["Kawazu-gake", "Kani-basami", "Kawakami-gake", "Kani-gake", "Kawazu-basami"], 12, "grid_multiple"),

  // Kata e classificação técnica.
  single("Kata", "O Nage no Kata é composto por quantos estágios e quantas técnicas no total?", ["3 estágios e 15 técnicas", "5 estágios e 20 técnicas", "5 estágios e 15 técnicas", "5 estágios e 40 técnicas", "7 estágios e 40 técnicas"], 10),
  grid("Kata", "Relacione os estágios do Nage no Kata com os seus devidos nomes.", ["Ashi-waza", "Koshi-waza", "Te-waza", "Ma-sutemi-waza", "Yoko-sutemi-waza"], ["1º estágio", "2º estágio", "3º estágio", "4º estágio", "5º estágio"], 10, "grid_single"),
  single("Kata", "Qual técnica não faz parte do quarto estágio do Nage no Kata e também de nenhum outro estágio?", ["Tomoe-nage", "Sumi-gaeshi", "Ura-nage", "Okuri-ashi-harai", "Yoko-otoshi"]),
  single("Kata", "Quantas projeções ocorrem durante o Nage no Kata?", ["15", "35", "30", "20", "25"]),
  grid("Técnicas", "Correlacione as técnicas às suas devidas classificações.", ["Tachi-waza", "Sutemi-waza", "Shime-waza", "Kansetsu-waza", "Osaekomi-waza"], ["Tomoe-nage", "Harai-makikomi", "Ashi-guruma", "Morote-gari", "Ude-hishigi-sankaku-gatame", "Ashi-garami", "Uki-gatame", "Ushiro-kesa-gatame", "Sankaku-jime", "Do-jime"], 20, "grid_multiple"),
  grid("Técnicas", "Correlacione os estágios de uma técnica de projeção.", ["Kumikata", "Kuzushi", "Tsukuri", "Kake", "Kime"], ["Pegada", "Desequilíbrio", "Encaixe", "Projeção", "Finalização"], 10, "grid_multiple"),
  single("Técnicas", "O Tori aplica Kuzushi para frente e, em seguida, entra com o quadril para aplicar Harai-goshi. Qual fase da técnica está sendo executada ao entrar com o quadril?", ["Kuzushi", "Kake", "Tsukuri", "Uchi-komi", "Randori"]),

  // Mídias pendentes: inserir a mídia e revisar o gabarito antes de publicar.
  single("Técnicas · mídia pendente", "Analise a mídia e diga que técnica está sendo aplicada.", ["Tani-otoshi", "Uchi-mata-gaeshi", "Ko-soto-gari", "Nidan-gake", "Yoko-gake"], 20, true),
  single("Técnicas · mídia pendente", "Analise a mídia e diga que técnica está sendo aplicada.", ["Yoko-guruma", "Ura-nage", "Suplex", "Tani-otoshi", "Ushiro-goshi"], 20, true),
  single("Técnicas · mídia pendente", "Analise a mídia e diga que técnica está sendo aplicada.", ["De-ashi-harai", "Tsubame-gaeshi", "Ashi-gaeshi", "Ashi-harai", "Tsubame-harai"], 20, true),
  single("Técnicas · mídia pendente", "Analise a mídia e diga que técnica está sendo aplicada.", ["Ude-hishigi-ashi-gatame", "Ashi-garami", "Ashi-gatame", "Ude-hishigi-ashi-garami", "Ashi-guruma"], 20, true),
  single("Técnicas · mídia pendente", "Analise a mídia e diga que técnica está sendo aplicada.", ["Uki-gatame", "Ura-gatame", "Uki-kesa-gatame", "Uke-gatame", "Uki-shiho-gatame"], 20, true),
  single("Técnicas · mídia pendente", "Analise a mídia e diga que técnica está sendo aplicada.", ["Obi-tori-gaeshi", "Obi-otoshi", "Obi-nage", "Sukui-nage", "Tori-gaeshi"], 20, true),
  single("Técnicas · mídia pendente", "Analise a mídia e diga que técnica está sendo aplicada.", ["Uchi-makikomi", "Ippon-seoi-makikomi", "Soto-makikomi", "Ippon-seoi-nage", "Maki-makikomi"], 20, true),
  single("Técnicas · mídia pendente", "Analise a mídia e diga que técnica está sendo aplicada.", ["Sukui-nage", "Gaeshi-nage", "Kuchiki-taoshi", "Te-guruma", "Uchi-mata-gaeshi"], 20, true),
  single("Técnicas · mídia pendente", "Analise a mídia e diga que técnica está sendo aplicada.", ["Ashi-guruma", "Harai-goshi", "O-guruma", "Uchi-mata", "Hiza-guruma"], 20, true),
  single("Técnicas · mídia pendente", "Analise a mídia e diga que técnica está sendo aplicada.", ["Ude-hishigi-juji-gatame", "Ude-hishigi-ude-gatame", "Ude-gyaku-juji-gatame", "Ude-hishigi-ashi-gatame", "Ude-hishigi-sankaku-gatame"], 20, true),
  single("Técnicas · mídia pendente", "Analise a mídia e diga que técnica está sendo aplicada.", ["Kuchiki-gari", "Morote-gaeshi", "Kuchiki-taoshi", "Kibisu-gaeshi", "Ashi-taoshi"], 20, true),
  single("Técnicas · mídia pendente", "Analise a mídia e diga que técnica está sendo aplicada.", ["Ude-garami", "Ude-hishigi-ude-garami", "Ude-garame", "Ude-hishigi-ude-garame", "Ude-gatame"], 20, true),
  single("Técnicas · mídia pendente", "Analise a mídia e diga que técnica está sendo aplicada.", ["Hane-arashi", "Harai-goshi", "Yama-arashi", "Harai-arashi", "Yama-harai"], 20, true),
  single("Técnicas · mídia pendente", "Analise a mídia e diga que técnica está sendo aplicada.", ["O-goshi", "Tsuri-goshi", "Utsuri-goshi", "Tsurikomi-goshi", "Uki-goshi"], 20, true),
  single("Técnicas", "O Tori está montado sobre o Uke, passa um braço por baixo da nuca, segura uma mão por dentro do Sode e passa a outra por cima do pescoço para finalizar. Qual técnica é mais provável?", ["Sode-guruma-jime", "Sode-jime", "Ezequiel", "Katate-jime", "Morote-sode-jime"]),
] satisfies TheoryTemplateQuestion[];

export const GREEN_THEORY_TEMPLATE = GREEN_THEORY_QUESTIONS;

export const GREEN_THEORY_TEMPLATE_SUMMARY = {
  questionCount: GREEN_THEORY_QUESTIONS.length,
  totalPoints: GREEN_THEORY_QUESTIONS.reduce((total, question) => total + question.points, 0),
  gridQuestionCount: GREEN_THEORY_QUESTIONS.filter((question) => question.type !== "single_choice").length,
  pendingMediaCount: GREEN_THEORY_QUESTIONS.filter((question) => question.mediaPending).length,
} as const;
