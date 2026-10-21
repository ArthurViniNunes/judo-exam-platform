# ADR 012 — Identidade de aluno e elegibilidade originada no exame teórico

- Estado: proposta
- Data: 2026-10-21

## Contexto

O exame teórico atual é externo e o avaliador escolhe manualmente a graduação
pretendida ao iniciar a avaliação prática. O novo requisito coloca o aluno como
usuário da plataforma, restringe o contexto estudantil ao exame teórico e define
que a aprovação teórica deve autorizar a faixa usada nas provas seguintes. Uma
mesma pessoa pode ser aluno e avaliador.

## Decisão proposta

Separar identidade, papéis concedidos e contexto ativo. Substituir o papel único
por `user_roles`, permitindo que uma identidade acumule `student`, `evaluator`
e, quando aplicável, `super_admin`. O vínculo `student` aponta para exatamente
um registro de `students` e o inclui automaticamente no cadastro de alunos da
equipe. O cadastro público nunca concede `evaluator`, que continua dependendo
de convite do Super Admin.

A entrada principal ativa uma sessão no contexto de aluno. Avaliadores e Super
Admins usam uma entrada profissional separada, que ativa o contexto profissional
somente após o backend confirmar a permissão. A rota escolhida restringe a
sessão, mas não serve como prova nem como fonte de autorização. A sessão guarda
o contexto ativo para que cada requisição seja autorizada no escopo correto.

Provas teóricas serão versionadas. Entregar uma tentativa gera correção no
backend e, quando aprovada, uma `student_eligibility` imutavelmente ligada à
tentativa. A avaliação prática receberá apenas o aluno; o backend resolverá e
validará a faixa autorizada. O frontend não enviará uma faixa escolhida pelo
avaliador como autoridade.

Antes da entrega, respostas corretas e explicações ficam exclusivamente no
backend. Após a entrega definitiva, a API de resultado devolve, para cada
questão, resposta do aluno, gabarito e explicação pedagógica.

Questões aceitam mídia opcional. Metadados externos não são mostrados pela
interface. Como o player do YouTube pode exibir título e canal e não permite que
essas áreas sejam ocultadas de forma suportada, mídia cujo metadado entregue a
resposta precisa ser um arquivo sanitizado no armazenamento próprio; YouTube é
permitido somente para conteúdo não sensível.

Os cadastros de alunos existentes permanecem válidos e podem ser vinculados a
uma conta. Não haverá criação automática de duplicata quando um vínculo exigir
revisão. Quando uma versão oficial for publicada, a prova será realizada
integralmente dentro da plataforma, sem fallback para formulários externos.
Enquanto as questões ainda não estiverem disponíveis, a faixa permanecerá com
o estado de prova não liberada.

## Alternativas consideradas

- manter um login único com seletor de papel: rejeitada porque permitiria
  confusão e tentativa de elevação de permissão;
- guardar um único papel em `users`: rejeitada porque aluno e avaliador não são
  mutuamente exclusivos;
- inferir a autorização apenas pela tela de entrada: rejeitada porque a rota
  seleciona contexto, mas o backend precisa validar o papel concedido;
- criar aluno sem conta: rejeitada porque não permite retomar a prova com
  identidade confiável;
- gravar a faixa diretamente em `students`: insuficiente, pois perderia a origem,
  versão e resultado teórico que justificam a autorização;
- confiar na faixa enviada pelo frontend prático: rejeitada por permitir contorno
  da regra;
- editar uma prova publicada: rejeitada porque altera a referência histórica de
  tentativas já realizadas;
- esconder o título do YouTube com CSS ou sobreposição: rejeitada porque não é
  garantida pelo player e contraria os requisitos de exibição do YouTube.

## Consequências

- autenticação e autorização passam a atender múltiplos papéis e um contexto de
  sessão explícito;
- o cadastro de aluno torna-se uma operação pública protegida contra abuso;
- verificação de identidade/e-mail torna-se prioridade anterior ao portal;
- a tela prática fica mais simples e consistente;
- regras de nova tentativa, validade e exceção precisam ser aprovadas;
- o editor exige explicação e política de mídia antes de publicar uma questão;
- vídeos sensíveis exigem armazenamento próprio e direito de uso;
- o portal futuro deve reutilizar a mesma identidade de aluno;
- migrações precisam preservar alunos atuais sem conta e resolver duplicatas
  explicitamente.
