# ADR 005 — Catálogo oficial de exames não configurável

- Status: aceito
- Data: 2026-10-17

## Contexto

A administração permitia criar matrizes com técnicas e regras de aprovação. O
cliente considerou que essa liberdade poderia produzir exames diferentes para
atletas da mesma graduação e comprometer a percepção de justiça.

## Decisão

O catálogo de técnicas, a seleção de técnicas de faixas anteriores e as regras
de aprovação passam a ser definidos somente no código versionado. A interface
e a API de matrizes personalizadas são removidas. Tabelas históricas permanecem
no D1 para evitar uma migração destrutiva, mas não têm rotas ativas.

Alterações futuras no exame exigem revisão de código, testes e o mesmo processo
de entrega usado para qualquer mudança de regra de negócio.

## Consequências

- todos os avaliadores aplicam o mesmo catálogo publicado;
- mudanças ficam auditáveis pelo histórico do Git;
- o Super Admin não consegue adaptar exames diretamente pelo navegador;
- ajustes urgentes no catálogo exigem uma nova versão da aplicação.
