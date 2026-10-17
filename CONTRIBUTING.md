# Contribuindo

## Preparação

Use Node.js 22.13 ou superior e pnpm 11 via Corepack.

```powershell
corepack pnpm install
corepack pnpm backend:migrate:local
corepack pnpm dev:all
```

## Regras de mudança

- comece a interface por 320 px e valide 360, 768 e 1280 px;
- todo componente visual deve funcionar em tema claro e escuro, por toque,
  teclado e com `prefers-reduced-motion`;
- não coloque regras de pontuação dentro de componentes; use funções puras em
  `lib/` e cubra casos-limite com testes;
- a API deve derivar autoria e permissões da sessão, nunca do corpo enviado pelo
  cliente;
- mudanças de banco recebem uma nova migração aditiva em `backend/migrations/`;
- mudanças estruturais precisam atualizar a documentação ou incluir um ADR.

## Validação obrigatória

```powershell
corepack pnpm backend:types
corepack pnpm test
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

`backend:types` deve ser executado sempre que bindings ou variáveis do Wrangler
mudarem. Não edite `backend/worker-configuration.d.ts` manualmente.

## Commits sugeridos

Use mensagens no imperativo e agrupe por intenção:

```text
refactor(api): separa autenticação e avaliações por domínio
test: cobre regras de pontuação e seleção automática
docs: registra arquitetura e operação da plataforma
```

Não misture arquivos gerados, refatoração ampla e uma mudança funcional sem
explicar a relação entre elas no corpo do commit ou no pull request.
