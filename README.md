# Plataforma de Exames de Judô

Aplicação web da Associação Judô Rogério Cruz para aplicar, registrar e acompanhar exames de graduação. O sistema reúne avaliações técnicas, avaliações de kata, histórico dos alunos e administração de avaliadores em uma interface responsiva.

## O que a plataforma faz

- autentica avaliadores e Super Admins com contas individuais;
- permite que o Super Admin autorize e desative avaliadores;
- aplica avaliações técnicas por graduação, selecionando automaticamente técnicas de faixas anteriores quando necessário;
- avalia separadamente cada movimento de uma sequência de `Renraku-Henka Waza` e usa a média no resultado;
- oferece vídeos de apoio do YouTube com reprodução iniciada ao abrir a referência;
- aplica `Nage-no-Kata` parcial ou completo e `Katame-no-Kata`;
- registra notas, observações, modalidade, graduação e avaliador;
- mostra histórico, média e evolução por aluno;
- oferece um painel com volume de avaliações, médias, aprovação e registros recentes;
- direciona a avaliação teórica do atleta para os Google Forms oficiais configurados na interface.

As avaliações técnica e de kata são processadas na aplicação e persistidas na API. A avaliação teórica usa exclusivamente os formulários externos definidos em `components/exam-public.tsx`.

## Arquitetura

```text
Next.js 16 / React 19
        |
        | NEXT_PUBLIC_API_URL
        v
Cloudflare Worker (API) ---- Cloudflare D1 / SQLite
```

- **Frontend:** Next.js com `output: "export"`, gerando arquivos estáticos em `out/`.
- **Backend:** Cloudflare Worker modular; `backend/src/index.ts` apenas compõe as rotas e os módulos de negócio ficam no mesmo diretório.
- **Banco:** D1 em produção e D1 local persistido pelo Wrangler em `.wrangler/state`.
- **Autenticação:** sessões de sete dias; tokens não são armazenados em texto no banco. As senhas usam PBKDF2 com SHA-256 e 100.000 iterações.
- **Perfis:** `super_admin` tem visão global e gerencia a equipe; `evaluator` acessa seus próprios alunos e avaliações.
- **Cliente HTTP:** `lib/api.ts` envia o token Bearer e trata expiração da sessão.

## Requisitos

- Node.js `22.13.0` ou mais recente;
- Corepack, incluído no Node.js;
- pnpm 11, instalado automaticamente pelo Corepack;
- para publicação: conta Cloudflare com Workers e D1 e um token da API com as permissões necessárias.

## Desenvolvimento local

Instale as dependências e aplique as migrações no D1 local:

```powershell
corepack pnpm install
corepack pnpm backend:migrate:local
```

Para iniciar frontend e backend juntos:

```powershell
corepack pnpm dev:all
```

Endereços locais:

- aplicação: <http://127.0.0.1:3000>;
- API: <http://127.0.0.1:8787>;
- saúde da API: <http://127.0.0.1:8787/health>.

O script `dev:all` inicia o Worker local e o Next.js no mesmo terminal. Encerre os dois com `Ctrl+C`.

### Configuração local

O backend pode usar `backend/.dev.vars` para os valores secretos locais. Esse arquivo não deve ser versionado. Um exemplo mínimo:

```dotenv
SUPER_ADMIN_INITIAL_PASSWORD=TroqueEstaSenha123!
```

O e-mail inicial do Super Admin está em `backend/wrangler.jsonc`, na variável `SUPER_ADMIN_EMAIL`. O Worker cria essa conta na primeira autenticação quando os dois valores estão configurados.

Para apontar o frontend para outra API, copie `.env.example` para `.env.local` e ajuste:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8787
```

Essa variável é incorporada ao build do frontend. Reinicie o servidor após alterá-la.

### Serviços separados

Backend:

```powershell
corepack pnpm backend:migrate:local
corepack pnpm backend:dev
```

Frontend, em outro terminal:

```powershell
corepack pnpm dev
```

Para testar pelo celular na mesma rede Wi-Fi:

```powershell
corepack pnpm dev:lan
```

Esse modo é apenas para testes acompanhados: depende do computador ligado, não usa HTTPS e não deve ser exposto à internet.

## Fluxo de acesso

1. O Super Admin entra com a conta inicial.
2. Em **Equipe**, autoriza o e-mail do avaliador.
3. O avaliador seleciona **Criar conta**, informa nome, e-mail autorizado e uma senha com pelo menos 10 caracteres, uma letra e um número.
4. O avaliador passa a poder aplicar exames e consultar os próprios registros.
5. O nome exibido pode ser alterado em **Ver e editar perfil**.

Não há envio automático de convite, recuperação de senha ou redefinição por e-mail. A autorização precisa ser comunicada manualmente ao avaliador.

## Regras das avaliações

### Avaliação técnica

O catálogo técnico oficial fica em `lib/practical-exams.ts`. Ele organiza as técnicas por graduação e categoria, incluindo `Nage Waza`, `Renraku-Henka Waza`, `Kaeshi Waza`, `Osaekomi Waza`, `Shime Waza` e `Kansetsu Waza`. Quando uma faixa exige técnicas anteriores, a seleção é feita automaticamente ao iniciar o exame e a origem sorteada aparece no próprio card.

Em `Renraku-Henka Waza`, cada movimento separado por `→` recebe sua própria avaliação no mesmo card. A média desses movimentos compõe a nota da sequência.

Os links de apoio ficam no objeto `TECHNIQUE_VIDEOS`, no mesmo arquivo. A chave precisa ser exatamente igual ao nome da técnica:

```ts
export const TECHNIQUE_VIDEOS: Record<string, string> = {
  "O-soto-gari": "https://www.youtube.com/watch?v=ID_DO_VIDEO",
  "De-ashi-harai → O-soto-gari": "https://youtu.be/ID_DO_VIDEO",
};
```

Preserve a grafia exata já usada pelo catálogo, inclusive os caracteres `→` e `×`. São aceitos links `youtube.com/watch`, `youtu.be`, `youtube.com/shorts` e `youtube.com/embed`. Sem um link válido, o botão de referência não aparece.

### Avaliação de kata

Disponíveis:

- `Nage-no-Kata` parcial: abertura, Te-waza, Koshi-waza, Ashi-waza e encerramento;
- `Nage-no-Kata` completo: abertura, cinco grupos e encerramento;
- `Katame-no-Kata`: abertura, Osaekomi-waza, Shime-waza, Kansetsu-waza e encerramento.

Cada item parte de 10 pontos. Os descontos são:

- erro pequeno: `-1`, com até duas marcações independentes;
- erro médio: `-3`;
- erro grande: `-5`;
- erro grave ou esquecimento: `-10`.

Se houver pelo menos um erro grave, a média geral é dividida por 2 uma única vez. O resultado do kata é informativo e não define aprovação ou reprovação.

## API autenticada

Todas as rotas abaixo, exceto `/`, `/health` e login/registro, exigem `Authorization: Bearer <token>`.

| Método | Rota | Acesso | Finalidade |
| --- | --- | --- | --- |
| `GET` | `/` | público | Identificação da API |
| `GET` | `/health` | público | Verifica Worker, D1 e configuração do Super Admin |
| `POST` | `/api/auth/login` | público | Inicia uma sessão |
| `POST` | `/api/auth/register` | público | Ativa um e-mail previamente autorizado |
| `GET` | `/api/auth/me` | autenticado | Retorna o usuário atual |
| `PATCH` | `/api/auth/profile` | autenticado | Atualiza o nome do usuário |
| `POST` | `/api/auth/logout` | autenticado | Encerra a sessão atual |
| `GET` | `/api/dashboard` | autenticado | Retorna indicadores e registros recentes |
| `GET` | `/api/students` | autenticado | Lista alunos e seus históricos |
| `GET` | `/api/evaluations` | autenticado | Lista avaliações permitidas ao usuário |
| `POST` | `/api/evaluations` | autenticado | Registra uma avaliação |
| `GET` | `/api/users` | Super Admin | Lista usuários e métricas |
| `POST` | `/api/users/invite` | Super Admin | Autoriza um e-mail |
| `PATCH` | `/api/users/:id` | Super Admin | Ativa ou desativa um avaliador |

O Super Admin pode filtrar dashboard e alunos por avaliador com `?evaluator=<id>`. Avaliadores comuns recebem apenas seus próprios registros.

## Banco e migrações

As migrações ficam em `backend/migrations/` e são aplicadas pelo Wrangler:

```powershell
corepack pnpm backend:migrate:local
corepack pnpm backend:migrate:remote
```

O schema ativo cobre usuários, sessões, alunos e avaliações. Tabelas históricas de questões e matrizes permanecem nas migrações já aplicadas para evitar uma operação destrutiva, mas não possuem rotas ou interfaces ativas. O estado local fica em `.wrangler/state` e não deve ser commitado.

## Build e validação

Execute antes de publicar:

```powershell
corepack pnpm test
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
```

O build estático é criado em `out/`. Para servi-lo localmente:

```powershell
corepack pnpm start
```

Esse comando não inicia o servidor de desenvolvimento do Next.js; ele usa `scripts/serve-static.mjs`. O script também protege contra traversal de caminho e oferece `pnpm start:lan` para a rede local.

## Publicação na Cloudflare

### Publicação manual

Autentique o Wrangler:

```powershell
corepack pnpm wrangler login
```

Configure o segredo do Super Admin no Worker:

```powershell
corepack pnpm wrangler secret put SUPER_ADMIN_INITIAL_PASSWORD --config backend/wrangler.jsonc
```

Depois, aplique as migrações e publique a API:

```powershell
corepack pnpm backend:migrate:remote
corepack pnpm backend:deploy
```

Gere o frontend com a URL pública da API e publique os arquivos estáticos:

```powershell
$env:NEXT_PUBLIC_API_URL="https://judo-exam-api.judo-rogerio-cruz.workers.dev"
corepack pnpm build
corepack pnpm frontend:deploy
Remove-Item Env:NEXT_PUBLIC_API_URL
```

As configurações de deploy ficam em `backend/wrangler.jsonc` e `wrangler.frontend.jsonc`. Depois de publicar o frontend, mantenha `FRONTEND_ORIGIN` do backend restrito à origem real do site.

Ambiente atualmente configurado:

- site: <https://judo-exam-platform.judo-rogerio-cruz.workers.dev>;
- API: <https://judo-exam-api.judo-rogerio-cruz.workers.dev>;
- saúde: <https://judo-exam-api.judo-rogerio-cruz.workers.dev/health>.

### GitHub Actions

O workflow `.github/workflows/ci.yml` roda em pull requests e em pushes para `main`. Ele instala dependências, executa lint, typecheck e build. Em pushes para `main`, depois da validação, também:

1. aplica migrações remotas pendentes;
2. publica a API;
3. gera o frontend com `NEXT_PUBLIC_API_URL` de produção;
4. publica o frontend;
5. verifica `/health` e a página pública.

Cadastre estes repository secrets em **Settings → Secrets and variables → Actions**:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

O token deve ser restrito à conta do projeto e ter permissões para editar Workers e D1. Nunca grave credenciais em arquivos versionados.

O GitHub Actions é o único responsável pela publicação automática. Mantenha
**Disable builds** ativado em **Settings → Builds** tanto no Worker
`judo-exam-api` quanto no `judo-exam-platform`. A integração Git nativa da
Cloudflare não coordena a migração D1 com os dois deploys e, neste monorepo,
tentaria usar `npx wrangler deploy` sem escolher entre
`backend/wrangler.jsonc` e `wrangler.frontend.jsonc`.

## Documentação técnica

- [Visão de arquitetura](docs/architecture/README.md): limites, diagramas, fluxos e invariantes;
- [ADRs](docs/architecture/adr/README.md): decisões, alternativas e consequências;
- [Runbook](docs/operations/runbook.md): checklist de exame, diagnóstico e rollback;
- [Guia de contribuição](CONTRIBUTING.md): regras de mudança e validação.

Diagramas são escritos em Mermaid e ficam versionados junto do código que descrevem.

## Estrutura principal

```text
app/page.tsx                  Estado global e composição dos fluxos
app/globals.css               Estilos globais e temas
components/auth-screen.tsx    Login e criação de conta
components/admin-portal*.tsx  Módulos do painel de gestão
components/technical-exam.tsx Fluxo da avaliação prática
components/kata-exam.tsx      Fluxo da avaliação de kata
components/profile-dialog.tsx Edição do perfil autenticado
lib/api.ts                    Cliente HTTP e token de sessão
lib/kata-exams.ts             Definições e cálculo de kata
lib/practical-exams.ts        Catálogo, seleção automática e vídeos
lib/practical-scoring.ts      Regra pura de aprovação prática
lib/platform.ts               Tipos compartilhados do domínio
backend/src/index.ts          Composição das rotas do Worker
backend/src/*.ts              Autenticação, domínio e casos de uso
backend/migrations/           Migrações do D1
tests/                        Regressões das regras de negócio
scripts/dev-all.mjs           Inicialização local dos dois serviços
scripts/serve-static.mjs      Servidor local do build estático
docs/                         Arquitetura, ADRs e operação
```

## Segurança e limitações conhecidas

Antes do uso real:

1. altere a senha inicial do Super Admin;
2. restrinja `FRONTEND_ORIGIN` à origem exata do frontend;
3. configure rate limiting para login no ambiente de produção;
4. defina política de privacidade, retenção e exportação dos dados dos alunos;
5. faça backups periódicos do D1 e teste a restauração;
6. revise os links e o catálogo técnico antes de cada ciclo de exames.

As avaliações são dados pessoais operacionais. Antes de ampliar o uso, documente a base legal, o prazo de retenção, o responsável por exportações e o procedimento para correção ou exclusão de registros.

## Licença e operação

Este repositório é privado (`private: true` no `package.json`). A aplicação foi preparada para a operação da Associação Judô Rogério Cruz; qualquer publicação em outra conta Cloudflare exige revisar nomes de Workers, identificador do D1, origem permitida, secrets e URLs de produção.
