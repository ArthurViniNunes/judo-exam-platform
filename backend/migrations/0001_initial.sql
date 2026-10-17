CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  belt TEXT NOT NULL,
  category TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options TEXT NOT NULL,
  answer INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'Ativa' CHECK (status IN ('Ativa', 'Rascunho')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  athlete TEXT NOT NULL,
  professor TEXT,
  belt TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('teórica', 'técnica')),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questions_belt_status ON questions (belt, status);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations (created_at DESC);

INSERT OR IGNORE INTO questions (id, belt, category, prompt, options, answer, points, status) VALUES
(1, 'Amarela / Ponta Laranja', 'História', 'Qual é o termo que Jigoro Kano usava para descrever o Judô como um caminho de vida para o autoaperfeiçoamento?', '["Jutsu","Waza","Do","Riai","Budô"]', 2, 20, 'Ativa'),
(2, 'Amarela / Ponta Laranja', 'História', 'Em qual tipo de local a Kodokan foi inicialmente estabelecida em 1882?', '["Uma casa de chá","Um templo budista","Um castelo","Um ginásio moderno","Uma escola militar"]', 1, 20, 'Ativa'),
(3, 'Amarela / Ponta Laranja', 'Filosofia', 'Qual é o significado da palavra Judô?', '["Caminho do Guerreiro","Arte da Luta","Caminho da Suavidade","Caminho da Força","Mente e Corpo"]', 2, 20, 'Ativa'),
(4, 'Amarela / Ponta Laranja', 'Etiqueta', 'Qual é o nome do cumprimento feito na posição em pé?', '["Zarei","Jigotai","Seiza","Ritsu Rei","Shizentai"]', 3, 20, 'Ativa'),
(5, 'Amarela / Ponta Laranja', 'Terminologia', 'Qual é o termo para a prática livre de combate?', '["Kumite","Shiai","Budô","Kata","Randori"]', 4, 20, 'Ativa'),
(6, 'Amarela / Ponta Laranja', 'Arbitragem', 'Qual é a pontuação máxima no Judô que encerra a luta imediatamente?', '["Shido","Ippon","Waza-ari","Yuko","Koka"]', 1, 20, 'Ativa'),
(7, 'Amarela / Ponta Laranja', 'Técnicas', 'Qual das técnicas abaixo é uma técnica de mão, Te-waza?', '["Seoi-nage","De-ashi-harai","O-goshi","O-soto-gari","Uki-goshi"]', 0, 20, 'Ativa'),
(8, 'Laranja', 'Filosofia', 'O que o princípio Jita Kyoei orienta o praticante a buscar?', '["A vitória em todas as lutas","Benefício e bem-estar mútuos","A força física","Apenas a perfeição técnica"]', 1, 20, 'Ativa'),
(9, 'Verde', 'Arbitragem', 'Quantos Shidos resultam em Hansoku-make?', '["Um","Dois","Três","Quatro"]', 2, 20, 'Ativa'),
(10, 'Roxa', 'Técnicas', 'Qual dessas é uma técnica de chave de articulação?', '["Kesa-gatame","Nami-juji-jime","Ude-garami","Kami-shiho-gatame"]', 2, 20, 'Rascunho'),
(11, 'Marrom', 'Técnicas', 'Qual é a principal diferença entre Nage-waza e Katame-waza?', '["Ataque e defesa","Projeção e controle no solo","Quadril e perna","Velocidade e força"]', 1, 20, 'Ativa');
