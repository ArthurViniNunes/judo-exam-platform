# ADR 012 — Identidade de aluno e elegibilidade originada no exame teórico

- Estado: proposta
- Data: 2026-10-21

## Contexto

O exame teórico atual é externo e o avaliador escolhe manualmente a graduação
pretendida ao iniciar a avaliação prática. O novo requisito coloca o aluno como
usuário da plataforma, restringe sua permissão ao exame teórico e define que a
aprovação teórica deve autorizar a faixa usada nas provas seguintes.

## Decisão proposta

Adicionar `student` aos papéis de identidade e vincular a conta a exatamente um
registro de `students`, incluindo-o automaticamente no cadastro de alunos da
equipe sem conceder permissão de avaliador. A entrada principal será do aluno;
avaliadores e Super Admins usarão uma entrada profissional separada e
continuarão sujeitos ao fluxo de convite.

Provas teóricas serão versionadas. Entregar uma tentativa gera correção no
backend e, quando aprovada, uma `student_eligibility` imutavelmente ligada à
tentativa. A avaliação prática receberá apenas o aluno; o backend resolverá e
validará a faixa autorizada. O frontend não enviará uma faixa escolhida pelo
avaliador como autoridade.

Os cadastros de alunos existentes permanecem válidos e podem ser vinculados a
uma conta. Não haverá criação automática de duplicata quando um vínculo exigir
revisão. Quando uma versão oficial for publicada, a prova será realizada
integralmente dentro da plataforma, sem fallback para formulários externos.
Enquanto as questões ainda não estiverem disponíveis, a faixa permanecerá com
o estado de prova não liberada.

## Alternativas consideradas

- manter um login único com seletor de papel: rejeitada porque permitiria
  confusão e tentativa de elevação de permissão;
- criar aluno sem conta: rejeitada porque não permite retomar a prova com
  identidade confiável;
- gravar a faixa diretamente em `students`: insuficiente, pois perderia a origem,
  versão e resultado teórico que justificam a autorização;
- confiar na faixa enviada pelo frontend prático: rejeitada por permitir contorno
  da regra;
- editar uma prova publicada: rejeitada porque altera a referência histórica de
  tentativas já realizadas.

## Consequências

- autenticação e autorização passam a atender três papéis;
- o cadastro de aluno torna-se uma operação pública protegida contra abuso;
- verificação de identidade/e-mail torna-se prioridade anterior ao portal;
- a tela prática fica mais simples e consistente;
- regras de nova tentativa, validade e exceção precisam ser aprovadas;
- o portal futuro deve reutilizar a mesma identidade de aluno;
- migrações precisam preservar alunos atuais sem conta e resolver duplicatas
  explicitamente.
