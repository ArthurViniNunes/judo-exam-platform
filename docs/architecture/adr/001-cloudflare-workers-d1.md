# ADR 001 — Cloudflare Workers e D1 como plataforma

- Estado: aceita
- Data: 2026-10-17

## Contexto

A plataforma atende eventos de baixa frequência, com picos curtos de cerca de
dezenas de avaliadores. O projeto precisa de publicação simples, disponibilidade
24/7 e custo mínimo, sem administrar servidor ou processo permanente.

## Decisão

Publicar o frontend estático em Cloudflare Workers Assets, a API em um Worker
independente e os dados em D1. A API acessa D1 por binding, sem chamada à API REST
da Cloudflare. Desenvolvimento local usa Wrangler e um banco D1 persistido.

## Alternativas consideradas

- VPS: mais controle, mas exige atualização, monitoramento e custo contínuo.
- Backend Next.js único: simplificaria a origem, mas eliminaria a exportação
  estática e aumentaria o acoplamento de deploy.
- Firebase/Supabase: resolveriam autenticação e dados, porém mudariam o modelo de
  domínio e adicionariam outro fornecedor sem necessidade atual.

## Consequências

- frontend e API podem ser publicados e revertidos separadamente;
- o plano gratuito atende o perfil atual, sujeito aos limites vigentes da conta;
- D1 e APIs de Worker tornam a infraestrutura específica da Cloudflare;
- migrações precisam ser aplicadas antes de código que dependa delas;
- logs e traces do Worker são a principal fonte de diagnóstico em produção.
