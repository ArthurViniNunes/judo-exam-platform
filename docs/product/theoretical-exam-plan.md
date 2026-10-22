# Plano prioritário — exame teórico dentro da plataforma

- Estado: Fases 0.1 e 0.2 entregues; aplicação da prova aguarda regras de negócio
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

Uma pessoa que também seja avaliadora usa a mesma identidade e as mesmas
credenciais, mas entra pelo portal do aluno para assumir o contexto de aluno.
Essa entrada restringe a sessão às permissões estudantis.

### Entrada secundária — avaliadores

A entrada de avaliadores fica em rota/tela própria, sugerida como
`/avaliadores`. Ela preserva o modelo atual:

- avaliador somente cria a conta após convite do Super Admin;
- Super Admin e avaliadores usam a mesma entrada profissional;
- a entrada profissional ativa o contexto de avaliador somente se a identidade
  possuir essa permissão;
- uma mesma identidade pode possuir também o vínculo de aluno;
- um link claro permite voltar à entrada do aluno.

A tela escolhida define o **contexto ativo**, não concede permissões. Entrar pela
rota de avaliadores não transforma um aluno em avaliador; o backend confirma se
aquela identidade possui o papel solicitado antes de criar a sessão.

## 3. Fluxo do aluno

```text
Criar conta
  → validar identidade/e-mail
  → criar ou vincular cadastro de judoca
  → confirmar a graduação pretendida no primeiro cadastro
  → ler instruções
  → iniciar tentativa
  → responder prova
  → entregar
  → correção automática
  → revisar respostas, gabarito e explicações
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
- uma identidade pode acumular os papéis `student` e `evaluator`;
- o método de entrada escolhe o contexto ativo da sessão, sem criar um papel;
- o cadastro público concede apenas `student`; o papel `evaluator` continua
  dependendo de convite do Super Admin;
- avaliadores continuam dependendo de convite;
- uma versão publicada da prova e de suas respostas fica imutável;
- a tentativa guarda uma cópia da ordem, perguntas, alternativas, mídias,
  respostas corretas e explicações da versão apresentada;
- a nota é calculada no backend;
- respostas corretas nunca são enviadas ao navegador antes da entrega;
- depois da entrega definitiva, o resultado mostra a resposta dada, a correta e
  a explicação cadastrada para cada questão;
- somente uma aprovação confirmada cria elegibilidade prática;
- a faixa da prova prática vem da elegibilidade no backend;
- mudar a faixa pretendida exige outra prova teórica aprovada;
- uma tentativa entregue não pode ser sobrescrita;
- criação de conta, início, entrega, correção e elegibilidade são auditados.

## 6. Modelo de dados proposto

### Alterações existentes

- criar `user_roles`, com chave composta por usuário e papel, e migrar para ela
  os papéis atualmente guardados em `users.role`;
- registrar em `sessions.context` se aquela sessão opera como `student` ou
  `professional`, sempre após validar `user_roles`;
- `students.user_id`: vínculo opcional e único com a conta;
- preservar alunos antigos sem conta até que sejam vinculados pelo Super Admin.

### Novas tabelas

| Tabela | Responsabilidade |
| --- | --- |
| `theory_exam_versions` | faixa, versão, nota mínima, regras e estado de publicação |
| `theory_questions` | categoria, enunciado, valor, resposta protegida e explicação |
| `theory_question_options` | alternativas ordenadas e indicação protegida da correta |
| `theory_question_media` | mídia opcional, modo de exibição e política de sigilo |
| `theory_attempts` | aluno, versão, estado, nota, resultado e datas |
| `theory_attempt_questions` | fotografia das perguntas e da ordem apresentada |
| `theory_answers` | resposta dada e pontuação calculada |
| `student_eligibilities` | faixa autorizada, tentativa de origem, validade e eventual revogação |

O histórico do commit `8ebf398` será usado como referência de interface e
estrutura. Ele já separava graduação, categoria, enunciado, alternativas,
resposta correta, pontuação e estado `Ativa`/`Rascunho`. Esses conceitos serão
mantidos, acrescidos de explicação, mídia e versionamento. A tabela histórica
`questions` não será reutilizada diretamente porque não possui isolamento de
tentativas, revisão imutável nem controle de acesso compatíveis com o novo
fluxo.

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

### Estrutura de uma questão

Cada questão poderá conter:

- graduação e categoria;
- enunciado;
- duas ou mais alternativas ordenadas;
- exatamente uma resposta correta;
- pontuação;
- explicação do gabarito, obrigatória para publicação;
- mídia opcional: imagem, áudio, vídeo próprio ou vídeo do YouTube;
- estado `Rascunho`, `Ativa` ou `Arquivada`.

O editor deve permitir pré-visualizar exatamente o que o aluno verá tanto na
prova quanto na correção. Depois de publicada dentro de uma versão, a questão
não é editada: uma correção cria nova revisão.

### Mídia e proteção contra pistas

A interface da prova nunca mostra nome do arquivo, URL, identificador externo,
canal ou título cadastrado. Rótulos acessíveis devem ser neutros, como
`Mídia da questão`, e textos alternativos da prova não podem conter a resposta.
Na correção, a descrição pedagógica pode ser mais detalhada.

Para YouTube, a plataforma pode usar `youtube-nocookie.com`, reprodução inline
e uma moldura própria sem título ou link externo ao redor do player. Porém, o
próprio player do YouTube pode exibir título, canal e relacionados: `showinfo`
foi removido e `modestbranding` não produz mais efeito. Também não é permitido
cobrir partes do player com uma sobreposição.

Por isso, questões em que qualquer metadado possa revelar a resposta devem ser
marcadas como `metadado sensível`. Nelas, vídeos do YouTube são recusados na
publicação; o Super Admin deve enviar uma cópia autorizada e sanitizada para o
armazenamento próprio da plataforma, sem título revelador. YouTube permanece
aceito somente quando título, canal e recomendações não comprometem a questão.

## 8. Telas planejadas

### Aluno

1. entrada principal;
2. criação/ativação da conta;
3. painel com prova disponível e situação;
4. instruções antes da tentativa;
5. prova com progresso, salvamento e retomada;
6. revisão antes da entrega;
7. resultado geral;
8. correção por questão, com resposta dada, gabarito e explicação;
9. situação de elegibilidade e próximo passo.

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
| `GET` | `/api/theory-attempts/:id/result` | consultar resultado, gabarito e explicações após a entrega |
| `GET` | `/api/practical-candidates` | listar alunos e faixa autorizada para a prática |

Rotas administrativas de versões e perguntas ficam separadas das rotas do
aluno. Toda autorização é validada no backend.

## 10. Entregas da Fase 0

### 0.1 — Identidade e duas entradas

**Estado: concluída.**

- criar o papel de aluno;
- permitir múltiplos papéis por identidade;
- separar entrada principal e entrada profissional;
- cadastrar e vincular automaticamente o judoca;
- migrar login sem quebrar avaliadores existentes;
- preparar verificação de e-mail ou a política equivalente aprovada.

### 0.2 — Provas versionadas

**Estado: infraestrutura e gestão concluídas; conteúdo oficial pendente.** O
Super Admin já pode criar cadernos vazios por graduação, configurar nota e
ordem, cadastrar perguntas com gabarito, explicação e mídia, publicar uma
versão imutável e encerrá-la. O schema de tentativas e elegibilidades também já
existe, mas ainda não é exposto ao aluno.

- criar schema de provas e tentativas;
- cadastrar o conteúdo oficial quando ele for disponibilizado;
- revisar respostas;
- publicar uma versão imutável por faixa;
- impedir a liberação de prova sem versão oficial publicada.

### 0.3 — Aplicação e correção

**Estado: motor de aplicação e correção concluído; interface em andamento.** A
área do aluno consulta o próprio cadastro e suas elegibilidades diretamente no
backend. A API já inicia ou retoma uma tentativa, embaralha todas as questões e
alternativas, salva cada resposta, exige a prova completa para entrega, corrige
no servidor, libera o gabarito comentado somente depois da entrega e cria a
elegibilidade quando há aprovação. Mídias são congeladas junto da tentativa e
entregues com descrição neutra, sem expor campos do gabarito.

- salvar cada resposta;
- permitir retomada segura;
- revisar antes de entregar;
- corrigir no servidor;
- liberar o gabarito somente depois da entrega definitiva;
- mostrar resposta dada, resposta correta e explicação por questão;
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
- a mesma identidade entra como aluno ou avaliador somente pelos portais para os
  quais possui permissão;
- recarregar a página não perde respostas;
- entregar duas vezes não cria duas tentativas nem duas elegibilidades;
- nota e aprovação são calculadas no backend;
- antes da entrega, nenhuma API do aluno revela resposta ou explicação;
- após a entrega, a correção identifica acertos e erros, mostra a alternativa
  escolhida, a correta e a explicação;
- mídia marcada como sensível não pode usar YouTube;
- aluno aprovado aparece para a prova prática com uma única faixa autorizada;
- avaliador não escolhe nem altera essa faixa;
- aluno sem elegibilidade não inicia a prática, mesmo manipulando o frontend;
- versão publicada da prova não pode ser alterada;
- faixa sem questões publicadas apresenta estado `Prova ainda não liberada`,
  sem redirecionar o aluno para um serviço externo;
- ações sensíveis ficam auditadas;
- 360 px, 768 px, 1280 px, claro, escuro, teclado e movimento reduzido são verificados.

## 12. Decisões da aplicação da prova

| Tema | Decisão |
| --- | --- |
| Nota mínima | configurada pelo Super Admin em cada versão publicada |
| Nova tentativa | permitida imediatamente após reprovação |
| Faixa pretendida | escolhida pelo aluno no primeiro cadastro |
| Validade | aprovação não expira |
| Banco de questões | todas as questões da versão publicada são apresentadas |
| Ordem | questões e alternativas embaralhadas em cada tentativa |
| Tempo | prova sem limite de duração |
| Explicação | formato e profundidade pedagógica esperados no gabarito |
| Identidade | verificação por e-mail e tratamento de menores de idade |
| Alunos antigos | regra de vinculação quando já existir nome igual ou semelhante |
| Exceção | quem pode liberar a prática sem aprovação e em quais casos |

As decisões ainda abertas não impedem o fluxo normal da prova, mas precisam ser
resolvidas antes de habilitar comunicação por e-mail, tratamento específico de
menores ou exceções administrativas.

## 13. Relação com as demais fases

Esta passa a ser a **Fase 0**, anterior a eventos, relatórios avançados,
governança e portal. A base offline da Fase 1 continua sendo concluída agora,
pois será reutilizada para salvar e retomar respostas do exame teórico.

A conta de aluno criada nesta fase será evoluída no futuro para o portal do
judoca, evitando um segundo cadastro e outra identidade paralela.

## 14. Referências para mídia do YouTube

- [Parâmetros oficiais do player incorporado](https://developers.google.com/youtube/player_parameters): registra a remoção de `showinfo`, a descontinuação de `modestbranding` e o comportamento de vídeos relacionados;
- [Modo de privacidade aprimorada](https://support.google.com/youtube/answer/171780): documenta o domínio `youtube-nocookie.com`;
- [Funcionalidade mínima obrigatória](https://developers.google.com/youtube/terms/required-minimum-functionality): proíbe cobrir ou ocultar partes do player com sobreposições.
