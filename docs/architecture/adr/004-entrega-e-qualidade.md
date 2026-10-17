# ADR 004 — CI/CD, testes de domínio e migrações aditivas

- Estado: aceita
- Data: 2026-10-17

## Contexto

O sistema será usado em dias de exame. Erros em pontuação, sorteio, autenticação
ou migração afetam registros reais. Ao mesmo tempo, o projeto precisa continuar
simples de executar por pessoas com pouca familiaridade com infraestrutura.

## Decisão

Toda entrega executa testes, lint, typecheck e build. Pushes na `main` aplicam
migrações D1 pendentes, publicam a API, geram o frontend com a URL da API e
verificam os endpoints públicos. Regras de negócio críticas possuem testes de
regressão em Vitest.

Migrações são versionadas, aditivas e aplicadas antes da nova API. Tipos de
bindings do Worker são gerados por `wrangler types` e versionados.

## Consequências

- um push válido pode chegar automaticamente à produção;
- mudanças incompatíveis de schema exigem estratégia expandir/migrar/contrair;
- segredos continuam fora do repositório, em GitHub Actions e Cloudflare;
- a suíte atual cobre domínio, mas testes de integração com D1 e navegação
  completa permanecem próximos passos.
