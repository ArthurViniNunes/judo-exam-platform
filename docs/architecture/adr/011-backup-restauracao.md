# ADR 011 — Recuperação do D1 e cópias de longo prazo no R2

- Estado: proposta
- Data: 2026-10-21

## Contexto

O histórico de avaliações é o principal ativo operacional da plataforma. Uma
estratégia de backup precisa cobrir erro humano, migração defeituosa e retenção
superior à janela de recuperação nativa, sem depender de um servidor próprio.

## Decisão proposta

Usar duas camadas:

1. Time Travel do D1 para recuperação por ponto no tempo dentro da janela
   oferecida pelo plano ativo;
2. exportações lógicas agendadas para um bucket R2 privado, seguindo o fluxo
   oficial D1 → Workflow → R2.

As cópias terão manifesto com data, ambiente, versão de schema, tamanho e
checksum. A política inicial sugerida mantém 30 diárias e 12 mensais. Acesso ao
bucket será limitado ao processo de backup e aos responsáveis por restauração.

Uma exportação do R2 nunca é importada primeiro em produção: ela é validada em
ambiente isolado. Como o Time Travel restaura o próprio banco, esse procedimento
exige janela de manutenção, aprovação explícita e registro do bookmark atual
para permitir desfazer a operação. Um ensaio trimestral comprova que as cópias
lógicas são utilizáveis.

## Alternativas consideradas

- depender apenas de Time Travel: insuficiente para retenção longa;
- exportação manual: rejeitada por depender de memória humana;
- bucket público: rejeitado por conter dados pessoais;
- restaurar diretamente sobre produção: rejeitado pelo risco de ampliar o
  incidente.

## Consequências

- R2 e execução agendada passam a fazer parte da infraestrutura;
- retenção e eliminação precisam acompanhar a política de dados da associação;
- backup bem-sucedido não substitui teste de restauração;
- segredos, permissões e alertas do processo entram no runbook operacional.

