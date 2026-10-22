# ADR 007 — Eventos com múltiplos avaliadores e responsável por avaliação

- Estado: aceita; implementação incremental
- Data: 2026-10-21
- Aceita em: 2026-10-22

## Contexto

Um dia de exame reúne aproximadamente 50 usuários e vários avaliadores. É
necessário distribuir a fila, acompanhar pendências e impedir que duas pessoas
iniciem por engano a mesma modalidade do mesmo judoca.

## Decisão proposta

Criar a entidade `exam_events`, suas inscrições e seus avaliadores participantes.
Cada modalidade de uma inscrição origina uma tarefa em `exam_event_tasks`. Vários
avaliadores podem trabalhar no mesmo evento, mas cada sessão possui um único
responsável ativo.

O primeiro incremento entrega o ciclo de vida do evento, participantes,
inscrições e tarefas. O incremento seguinte implementa a tomada atômica de
responsabilidade, a liberação controlada e a ligação única da tarefa com a
avaliação concluída. Esse corte mantém as migrações aditivas e permite validar a
organização do evento antes de alterar o fluxo principal do avaliador.

Assumir uma sessão é uma atualização condicional no D1: só tem sucesso quando
ela está livre e na versão esperada. O coordenador pode atribuir, liberar ou
reatribuir. O painel consulta alterações periodicamente; tempo real contínuo não
é requisito inicial.

Sem conectividade, um avaliador pode continuar e concluir sessões já atribuídas
a ele e armazenadas no aparelho. Assumir uma sessão da fila compartilhada ou
transferi-la exige conexão, preservando a garantia contra duplicidade.

## Alternativas consideradas

- lista compartilhada sem responsável: rejeitada por permitir duplicidade;
- atribuição fixa de todos os alunos antes do evento: disponível como opção,
  mas não obrigatória;
- vários avaliadores pontuando a mesma prova: fora desta decisão, pois exigiria
  uma nova regra de consolidação;
- Durable Objects por evento: adiado até haver demanda por coordenação em tempo
  real que o D1 não atenda de forma simples.

## Consequências

- o sistema representa vários avaliadores sem perder autoria individual;
- o encerramento do evento pode validar pendências e duplicidades;
- sessões abandonadas precisam de expiração ou liberação administrativa;
- a operação de assumir exige teste concorrente;
- o cliente deve decidir separadamente se deseja banca com múltiplas notas.

