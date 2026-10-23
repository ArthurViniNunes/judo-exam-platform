# ADR 011 — Recuperação do D1 e cópias de longo prazo no R2

- Estado: aceita; automação preparada, ativação operacional pendente
- Data: 2026-10-21

## Contexto

O histórico de avaliações é o principal ativo operacional da plataforma. Uma
estratégia de backup precisa cobrir erro humano, migração defeituosa e retenção
superior à janela de recuperação nativa, sem depender de um servidor próprio.

## Decisão

Usar duas camadas:

1. Time Travel do D1 para recuperação por ponto no tempo dentro da janela
   oferecida pelo plano ativo;
2. exportações lógicas diárias executadas pelo GitHub Actions e armazenadas em
   um bucket R2 privado.

Cada cópia possui o SQL compactado, um checksum SHA-256 e um manifesto com data,
banco, commit, arquivo, tamanho e checksum. O próprio workflow baixa novamente
a cópia diária e valida sua integridade antes de terminar. A política inicial
usa os prefixos `daily/` e `monthly/`, com expiração por idade de 30 e 370 dias,
respectivamente. O bucket permanece privado e usa uma credencial exclusiva com
o menor conjunto de permissões necessário.

A automação versionada em `.github/workflows/backup-d1.yml` cria uma cópia
diária às 03:17 UTC. No primeiro dia de cada mês, o mesmo arquivo também recebe
uma chave no prefixo mensal. Uma execução manual pode forçar essa cópia mensal.
Bucket, token e regras de ciclo de vida são ativados separadamente, para que um
commit não crie ou altere recursos externos sem revisão operacional.

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

- R2 e GitHub Actions passam a fazer parte da infraestrutura;
- retenção e eliminação precisam acompanhar a política de dados da associação;
- backup bem-sucedido não substitui teste de restauração;
- segredos, permissões e alertas do processo entram no runbook operacional.

