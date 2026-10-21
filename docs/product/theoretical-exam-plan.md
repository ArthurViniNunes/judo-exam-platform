# Plano prioritário — exame teórico dentro da plataforma

- Estado: planejamento solicitado; regras de prova pendentes de confirmação
- Prioridade: máxima, antes das fases 2 a 5
- Impacto: autenticação, cadastro de alunos, elegibilidade e início do exame prático
- Data: 2026-10-21

## 1. Objetivo

Trazer o exame teórico para dentro da plataforma e fazer dele a origem confiável
da graduação pretendida. O aluno cria sua própria conta, passa a integrar o
cadastro de alunos da equipe — nunca o cadastro de avaliadores — e realiza
somente o exame teórico correspondente. Depois da aprovação, fica elegível para
a avaliação prática daquela graduação.

O avaliador deixa de escolher a faixa no início da prova prática. O backend
consulta a aprovação teórica vigente e devolve a faixa autorizada.

## 2. Experiência de entrada

### Entrada principal — aluno

A página inicial de acesso passa a ser voltada ao aluno:

1. `Entrar como aluno`;
2. `Criar conta de aluno`;
3. chamada secundária `Sou avaliador`.

Depois do login, o aluno acessa apenas:

- situação cadastral;
- exame teórico disponível;
- instruções e tentativa em andamento;
- resultado e situação de elegibilidade.

Ele não acessa alunos de terceiros, avaliações práticas, kata, equipe,
estatísticas ou administração.

### Entrada secundária — avaliadores

A entrada de avaliadores fica em rota/tela própria, sugerida como
`/avaliadores`. Ela preserva o modelo atual:

- avaliador somente cria a conta após convite do Super Admin;
- Super Admin e avaliadores usam a mesma entrada profissional;
- o tipo de conta é decidido pelo servidor, nunca por um seletor no login;
- um link claro permite voltar à entrada do aluno.

## 3. Fluxo do aluno

```text
Criar conta
  → validar identidade/e-mail
  → criar ou vincular cadastro de judoca
  → escolher graduação pretendida permitida
  → ler instruções
  → iniciar tentativa
  → responder prova
  → entregar
  → correção automática
  → aprovado: elegível para a prática daquela faixa
  → não aprovado: seguir política de nova tentativa
```

O cadastro e a tentativa são operações distintas. Criar conta não significa
aprovação, e iniciar uma tentativa não altera a faixa pretendida até a entrega
ser validada pelo servidor.

## 4. Reflexo na avaliação prática

O início da avaliação prática muda para:

1. avaliador escolhe o aluno;
2. sistema mostra a faixa autorizada e a data da aprovação teórica;
3. avaliador confirma o aluno;
4. backend cria a avaliação usando a faixa da elegibilidade.

O seletor `Faixa pretendida` será removido. Alunos sem aprovação teórica
vigente aparecem separados e não podem iniciar a prova. A mensagem deve explicar
o motivo, sem permitir que o avaliador contorne a regra pelo frontend.

Exceções administrativas, caso sejam necessárias, exigem uma ação exclusiva
do Super Admin, justificativa e auditoria. Elas não fazem parte do fluxo normal.

## 5. Regras e invariantes

- cada conta de aluno se vincula a exatamente um cadastro de judoca;
- criar a conta inclui automaticamente o judoca no cadastro de alunos da equipe;
- cada cadastro de judoca possui no máximo uma conta principal;
- o aluno não escolhe o papel `avaliador` durante o cadastro;
- avaliadores continuam dependendo de convite;
- uma versão publicada da prova e de suas respostas fica imutável;
- a tentativa guarda uma cópia da ordem, perguntas e alternativas apresentadas;
- a nota é calculada no backend;
- respostas corretas nunca são enviadas ao navegador antes da entrega;
- somente uma aprovação confirmada cria elegibilidade prática;
- a faixa da prova prática vem da elegibilidade no backend;
- mudar a faixa pretendida exige outra prova teórica aprovada;
- uma tentativa entregue não pode ser sobrescrita;
- criação de conta, início, entrega, correção e elegibilidade são auditados.

## 6. Modelo de dados proposto

### Alterações existentes

- `users.role`: incluir `student`;
- `students.user_id`: vínculo opcional e único com a conta;
- preservar alunos antigos sem conta até que sejam vinculados pelo Super Admin.

### Novas tabelas

| Tabela | Responsabilidade |
| --- | --- |
| `theory_exam_versions` | faixa, versão, nota mínima, regras e estado de publicação |
| `theory_questions` | enunciado, alternativas, valor e resposta protegida |
| `theory_attempts` | aluno, versão, estado, nota, resultado e datas |
| `theory_attempt_questions` | fotografia das perguntas e da ordem apresentada |
| `theory_answers` | resposta dada e pontuação calculada |
| `student_eligibilities` | faixa autorizada, tentativa de origem, validade e eventual revogação |

Não reutilizar diretamente a tabela histórica `questions`: ela pertence a
uma versão anterior do produto e não possui versionamento nem isolamento de
tentativas suficiente para este fluxo.

## 7. Catálogo e publicação das provas

As provas devem ser versionadas. Uma versão passa pelos estados:

```text
Rascunho → Publicada → Encerrada
```

- avaliadores não editam provas;
- somente o Super Admin publica ou encerra uma versão;
- publicar congela perguntas, respostas, pesos e nota mínima;
- uma mudança posterior cria uma nova versão;
- tentativas antigas continuam ligadas à versão usada;
- o exame publicado é realizado integralmente na própria plataforma;
- não há redirecionamento nem contingência por formulário externo.

Como as questões ainda não foram entregues, nenhuma pergunta provisória será
inventada. Até existir uma versão oficial publicada para a faixa, o painel do
aluno deve informar de forma clara que a prova ainda não foi liberada.

## 8. Telas planejadas

### Aluno

1. entrada principal;
2. criação/ativação da conta;
3. painel com prova disponível e situação;
4. instruções antes da tentativa;
5. prova com progresso, salvamento e retomada;
6. revisão antes da entrega;
7. resultado e próximo passo.

### Avaliador e Super Admin

1. entrada profissional separada;
2. listagem de alunos com situação teórica;
3. início da prática sem seletor de faixa;
4. detalhe da tentativa para o Super Admin;
5. gestão de versões da prova, sem edição de versão publicada.

Todas as telas nascem mobile-first, com temas claro e escuro, alvos de toque de
44 px, teclado, foco visível e movimento reduzido.

## 9. Contratos de API planejados

| Método | Rota | Responsabilidade |
| --- | --- | --- |
| `POST` | `/api/student-auth/register` | criar identidade de aluno e cadastro vinculado |
| `POST` | `/api/student-auth/login` | autenticar aluno |
| `GET` | `/api/student/me` | carregar perfil e elegibilidade |
| `GET` | `/api/theory-exams/available` | informar somente a prova permitida ao aluno |
| `POST` | `/api/theory-attempts` | iniciar tentativa e congelar a versão apresentada |
| `PATCH` | `/api/theory-attempts/:id/answers` | salvar respostas de forma idempotente |
| `POST` | `/api/theory-attempts/:id/submit` | entregar e corrigir atomicamente |
| `GET` | `/api/theory-attempts/:id/result` | consultar resultado autorizado |
| `GET` | `/api/practical-candidates` | listar alunos e faixa autorizada para a prática |

Rotas administrativas de versões e perguntas ficam separadas das rotas do
aluno. Toda autorização é validada no backend.

## 10. Entregas da Fase 0

### 0.1 — Identidade e duas entradas

- criar o papel de aluno;
- separar entrada principal e entrada profissional;
- cadastrar e vincular automaticamente o judoca;
- migrar login sem quebrar avaliadores existentes;
- preparar verificação de e-mail ou a política equivalente aprovada.

### 0.2 — Provas versionadas

- criar schema de provas e tentativas;
- cadastrar o conteúdo oficial quando ele for disponibilizado;
- revisar respostas;
- publicar uma versão imutável por faixa;
- impedir a liberação de prova sem versão oficial publicada.

### 0.3 — Aplicação e correção

- salvar cada resposta;
- permitir retomada segura;
- revisar antes de entregar;
- corrigir no servidor;
- mostrar resultado sem revelar o gabarito de forma indevida;
- criar elegibilidade quando aprovado.

### 0.4 — Integração com a prova prática

- listar candidatos com elegibilidade;
- remover escolha manual da faixa;
- validar novamente a elegibilidade ao salvar a prática;
- mostrar origem e data da aprovação teórica;
- cobrir exceções e auditoria.

### 0.5 — Migração e entrada em produção

- vincular alunos antigos sem criar duplicatas;
- ensaiar com contas de aluno e avaliador;
- validar notas e resultados contra os critérios oficiais aprovados;
- ativar por feature flag;
- substituir definitivamente os links externos pela prova interna quando a
  primeira versão oficial for publicada.

Cada subfase é um marco independente e recebe commit próprio.

## 11. Critérios de aceite

- a rota principal apresenta a entrada do aluno;
- a entrada de avaliadores continua acessível e exige convite;
- criar conta de aluno cria ou vincula exatamente um judoca;
- aluno acessa somente a própria prova e resultado;
- recarregar a página não perde respostas;
- entregar duas vezes não cria duas tentativas nem duas elegibilidades;
- nota e aprovação são calculadas no backend;
- aluno aprovado aparece para a prova prática com uma única faixa autorizada;
- avaliador não escolhe nem altera essa faixa;
- aluno sem elegibilidade não inicia a prática, mesmo manipulando o frontend;
- versão publicada da prova não pode ser alterada;
- faixa sem questões publicadas apresenta estado `Prova ainda não liberada`,
  sem redirecionar o aluno para um serviço externo;
- ações sensíveis ficam auditadas;
- 360 px, 768 px, 1280 px, claro, escuro, teclado e movimento reduzido são verificados.

## 12. Decisões necessárias antes da implementação das provas

| Tema | Decisão necessária |
| --- | --- |
| Nota mínima | percentual exigido em cada faixa |
| Nova tentativa | quantidade, intervalo e necessidade de liberação |
| Faixa pretendida | aluno escolhe entre opções permitidas ou recebe indicação da equipe |
| Validade | aprovação teórica expira ou vale até concluir o ciclo |
| Banco de questões | perguntas fixas ou subconjunto sorteado |
| Ordem | fixa ou embaralhada por tentativa |
| Tempo | prova livre ou com limite de duração |
| Resultado | mostrar somente nota/resultado ou também erros após encerramento |
| Identidade | verificação por e-mail e tratamento de menores de idade |
| Alunos antigos | regra de vinculação quando já existir nome igual ou semelhante |
| Exceção | quem pode liberar a prática sem aprovação e em quais casos |

Essas escolhas mudam regra de negócio e não devem ser inferidas no código.

## 13. Relação com as demais fases

Esta passa a ser a **Fase 0**, anterior a eventos, relatórios avançados,
governança e portal. A base offline da Fase 1 continua sendo concluída agora,
pois será reutilizada para salvar e retomar respostas do exame teórico.

A conta de aluno criada nesta fase será evoluída no futuro para o portal do
judoca, evitando um segundo cadastro e outra identidade paralela.
