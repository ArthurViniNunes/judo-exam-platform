# ADR 006 — Avaliação offline-first e sincronização idempotente

- Estado: proposta
- Data: 2026-10-21

## Contexto

O sistema será usado principalmente em celulares, inclusive em ginásios com
rede instável. Perder uma avaliação concluída é mais grave do que atrasar sua
chegada ao servidor. A interface atual depende da resposta da API e não possui
uma fila persistente no aparelho.

## Decisão proposta

Adotar uma PWA com Service Worker para os arquivos da aplicação e IndexedDB
para rascunhos e uma caixa de saída por usuário. O cliente gera um identificador
imutável para cada avaliação; a API trata repetições com o mesmo identificador
como a mesma operação.

A máquina de estados local será `draft`, `queued`, `syncing`, `synced` e
`attention_required`. O usuário sempre verá se o conteúdo está apenas no
aparelho ou confirmado no D1. O primeiro login continuará exigindo rede.

O servidor permanecerá como autoridade. Uma sincronização grava a avaliação
completa e o evento de auditoria em operação atômica. Conteúdo administrativo
não será disponibilizado offline.

## Alternativas consideradas

- exigir conexão constante: rejeitada pelo risco operacional;
- usar `localStorage`: rejeitada por capacidade, estrutura e concorrência
  inadequadas para uma fila;
- armazenar toda a base no aparelho: rejeitada por privacidade e complexidade;
- introduzir Durable Objects: adiado, pois idempotência e transações D1 cobrem
  a escala prevista.

## Consequências

- avaliações continuam durante uma queda de rede;
- o frontend passa a ter migrações do schema local e política de limpeza;
- logout e troca de conta precisam tratar pendências explicitamente;
- testes devem simular interrupção, retomada, duplicidade e conflito;
- dados pessoais permanecerão temporariamente no dispositivo e exigem regras
  claras de expiração e remoção.

