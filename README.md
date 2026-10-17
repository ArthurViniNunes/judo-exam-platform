# Plataforma de Exames de Judô

Aplicação web para os exames da Associação Judô Rogério Cruz. O projeto funciona de forma autônoma, sem ChatGPT, OpenAI Sites, conectores ou autenticação proprietária.

## Arquitetura

- **Frontend:** Next.js 16/React 19 exportado como HTML, CSS e JavaScript estáticos.
- **Backend:** API independente em Cloudflare Workers.
- **Banco:** Cloudflare D1 (SQLite distribuído) em produção e SQLite local gerenciado pelo Wrangler no desenvolvimento.
- **Autenticação:** sessões individuais com senha derivada por PBKDF2, convites por e-mail e papéis de `Super Admin` e `Avaliador`.
- **Modo de contingência:** se a API estiver indisponível, o frontend continua utilizável com os dados já salvos no `localStorage`. O painel mostra `API conectada` ou `Modo local`.

Na área pública, a avaliação teórica direciona o atleta aos formulários oficiais no Google Forms. As avaliações técnica e de kata permanecem integradas à aplicação. O backend persiste as questões administradas e os resultados dessas avaliações; os dados demonstrativos das outras áreas do painel ainda são estáticos.

## Avaliação de kata

A tela de kata oferece `Nage-no-Kata` e `Katame-no-Kata`. No Nage-no-Kata, o avaliador escolhe entre o exame parcial, que apresenta Te-waza, Koshi-waza e Ashi-waza, e o exame completo. Os dois formatos incluem cerimônia de abertura e de encerramento. Cada item começa com 10 pontos e recebe os seguintes descontos:

- erro pequeno: -1 ponto, com duas caixas independentes;
- erro médio: -3 pontos;
- erro grande: -5 pontos;
- erro grave ou esquecimento: -10 pontos.

Se existir ao menos um erro grave, a média geral é dividida por 2 uma única vez, mesmo que haja mais de um erro grave. Essa avaliação apenas registra a nota e os erros; ela não classifica o atleta como aprovado ou reprovado.

## Cadastrar os vídeos das técnicas

Os botões `?` das avaliações técnica e de kata usam os vídeos do YouTube cadastrados em um único lugar: `lib/practical-exams.ts`, no objeto `TECHNIQUE_VIDEOS`.

Abra o arquivo e adicione uma linha para cada técnica. O texto antes dos dois-pontos deve ser idêntico ao nome usado na matriz:

```ts
export const TECHNIQUE_VIDEOS: Record<string, string> = {
  "O-soto-gari": "https://www.youtube.com/watch?v=ID_DO_VIDEO",
  "De-ashi-harai → O-soto-gari": "https://youtu.be/ID_DO_VIDEO",
};
```

São aceitos links nos formatos `youtube.com/watch`, `youtu.be`, `youtube.com/shorts` e `youtube.com/embed`. Se uma técnica ainda não tiver link, o sistema mostra uma orientação ao avaliador em vez de abrir um vídeo quebrado. Depois de editar, salve o arquivo; no modo de desenvolvimento a página é atualizada automaticamente.

## Requisitos

- Node.js 22.13 ou mais recente
- Corepack, incluído na instalação do Node.js

## Rodar tudo localmente

No Windows, abra o **PowerShell** e copie os comandos abaixo, um por vez:

```powershell
Set-Location "C:\Users\arthu\Documents\Code\judo-exam-platform"
corepack pnpm install
corepack pnpm backend:migrate:local
node scripts/dev-all.mjs
```

O último comando permanece aberto mostrando os logs dos dois serviços. Não feche esse terminal enquanto estiver usando o sistema. Para encerrar frontend e backend, pressione `Ctrl+C` uma vez.

Nas próximas vezes, basta:

```powershell
Set-Location "C:\Users\arthu\Documents\Code\judo-exam-platform"
node scripts/dev-all.mjs
```

Acesse:

- Frontend: <http://127.0.0.1:3000>
- API: <http://127.0.0.1:8787>
- Saúde da API: <http://127.0.0.1:8787/health>

Conta inicial para desenvolvimento local:

```text
E-mail: admin@judorogeriocruz.com.br
Senha: TroqueEstaSenha123!
```

Essa senha fica somente em `backend/.dev.vars`, que é ignorado pelo Git. Altere-a antes de compartilhar o ambiente local. O Super Admin autoriza os e-mails na seção **Equipe**; depois disso, cada avaliador escolhe **Criar conta** na tela de entrada e define a própria senha.

O nome mostrado nas avaliações vem da conta autenticada. Cada usuário pode alterá-lo em **Menu → Ver e editar perfil** ou tocando no próprio nome na Administração; a atualização também passa a identificar seus registros anteriores.

O banco local é persistido em `.wrangler/state` e não é enviado ao repositório.

### Rodar frontend e backend separadamente

Terminal 1 — somente o backend:

```powershell
corepack pnpm backend:migrate:local
corepack pnpm backend:dev
```

Terminal 2 — somente o frontend:

```powershell
corepack pnpm dev
```

### Testar pelo celular na mesma rede Wi-Fi

Para liberar temporariamente o ambiente de desenvolvimento na rede local, conecte o computador e o celular ao mesmo Wi-Fi e execute:

```powershell
corepack pnpm dev:lan
```

O terminal do Next.js mostra um endereço de rede semelhante a `http://192.168.0.10:3000`. Abra esse endereço no navegador do celular. Se o Windows solicitar permissão de firewall, permita apenas em **Redes privadas**.

Esse modo serve para testes acompanhados. Ele depende do computador ligado, não usa HTTPS e não deve ser exposto diretamente à internet. Para outras pessoas acessarem de qualquer rede, publique frontend, API e banco na Cloudflare conforme as seções abaixo.

### Erros comuns no Windows

- **`pnpm não é reconhecido`**: use sempre `corepack pnpm` como nos exemplos acima.
- **`EADDRINUSE` ou porta em uso**: outro terminal já está executando o projeto. Localize-o e pressione `Ctrl+C`; depois rode `node scripts/dev-all.mjs` novamente.
- **A página não abre**: confirme que o terminal mostra `Ready on http://127.0.0.1:8787` e `Local: http://127.0.0.1:3000`.
- **A primeira abertura demora alguns segundos**: o Next.js compila a página no primeiro acesso. Aguarde o terminal mostrar `Compiled` antes de atualizar o navegador.
- **Não use `pnpm start` para desenvolver**: esse comando serve um build de produção que precisa ter sido criado antes. Para o uso normal, execute `node scripts/dev-all.mjs`.

Para usar uma API em outro endereço, copie `.env.example` para `.env.local` e altere:

```dotenv
NEXT_PUBLIC_API_URL=https://sua-api.workers.dev
```

Essa variável é incorporada ao JavaScript durante o build; depois de alterá-la, reinicie o servidor ou gere o build novamente.

## Validar e executar o build de produção

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm start
```

`pnpm build` cria o site estático em `out/`. `pnpm start` serve esse diretório em <http://127.0.0.1:3000>, sem depender do servidor do Next.js.

## Backend independente e disponível 24/7 sem custo

### Ambiente publicado

- Site: <https://judo-exam-platform.judo-rogerio-cruz.workers.dev>
- API: <https://judo-exam-api.judo-rogerio-cruz.workers.dev>
- Saúde da API: <https://judo-exam-api.judo-rogerio-cruz.workers.dev/health>

O banco D1 `judo-exam-db`, a API e o frontend já estão publicados na conta Cloudflare configurada. Os passos abaixo servem para manutenção ou para recriar a infraestrutura em outra conta.

A alternativa indicada para este volume é **Cloudflare Workers + D1 no plano Free**. É serverless: não existe uma máquina ligada continuamente, mas a URL fica disponível o tempo todo e a infraestrutura escala a zero quando ninguém usa. Isso evita suspensão por inatividade típica de alguns hosts gratuitos.

Em 14 de outubro de 2026, o plano gratuito documentava até 100 mil chamadas de Worker por dia, 5 milhões de linhas lidas/dia, 100 mil linhas gravadas/dia e 5 GB totais no D1. Para uma associação com pouco tráfego, há bastante margem. Ao exceder uma cota diária, novas operações falham até a renovação à meia-noite UTC; portanto, “sem gastos” significa permanecer dentro dessas cotas, e não uma garantia contratual de serviço ilimitado.

Referências oficiais:

- [Preços e cotas do Workers](https://developers.cloudflare.com/workers/platform/pricing/)
- [Preços e cotas do D1](https://developers.cloudflare.com/d1/platform/pricing/)
- [Comandos e migrações do D1](https://developers.cloudflare.com/d1/wrangler-commands/)

### 1. Criar a conta e autenticar

Crie uma conta gratuita na Cloudflare e rode:

```bash
pnpm wrangler login
```

### 2. Criar o banco D1 remoto

```bash
pnpm wrangler d1 create judo-exam-db
```

O comando retorna um `database_id`. Ao recriar a infraestrutura em outra conta, substitua no `backend/wrangler.jsonc` o UUID do banco atualmente configurado.

### 3. Criar as tabelas e dados iniciais

Defina a senha inicial do Super Admin como segredo do Worker:

```bash
pnpm wrangler secret put SUPER_ADMIN_INITIAL_PASSWORD --config backend/wrangler.jsonc
```

O e-mail inicial fica em `SUPER_ADMIN_EMAIL`, dentro de `backend/wrangler.jsonc`. Para usar outro endereço, altere essa variável antes da primeira autenticação.

Depois aplique as migrações:

```bash
pnpm backend:migrate:remote
```

### 4. Publicar a API

```bash
pnpm backend:deploy
```

O terminal mostrará uma URL semelhante a `https://judo-exam-api.<conta>.workers.dev`. Teste:

```bash
curl https://judo-exam-api.<conta>.workers.dev/health
```

Resposta esperada:

```json
{"status":"ok","database":"ok"}
```

### 5. Restringir o CORS

Depois que o frontend tiver uma URL pública, mantenha `FRONTEND_ORIGIN` em `backend/wrangler.jsonc` restrito a esse endereço:

```jsonc
"vars": {
  "FRONTEND_ORIGIN": "https://judo-exam-platform.sua-conta.workers.dev"
}
```

Mais de uma origem pode ser informada separando-as por vírgula. Publique novamente com `pnpm backend:deploy`.

## Hospedar o frontend gratuitamente

O frontend é totalmente estático. Para projetos novos, a Cloudflare recomenda **Workers Static Assets**, que entrega os arquivos pelo mesmo ambiente global dos Workers e não exige um servidor ligado.

Depois de publicar a API, gere o frontend apontando para a URL dela e publique os arquivos de `out/`:

```powershell
$env:NEXT_PUBLIC_API_URL="https://sua-api.workers.dev"
corepack pnpm build
corepack pnpm frontend:deploy
Remove-Item Env:NEXT_PUBLIC_API_URL
```

A configuração está em `wrangler.frontend.jsonc`. O comando retorna uma URL como `https://judo-exam-platform.sua-conta.workers.dev`. Depois do primeiro deploy, restrinja `FRONTEND_ORIGIN` do backend a essa URL e publique a API novamente.

Referência oficial: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/).

## Publicação automática pelo GitHub

O workflow `.github/workflows/ci.yml` valida e publica a plataforma quando um commit chega à branch `main`. A publicação só começa depois que lint, tipos e build passam. Em seguida, o workflow:

1. aplica somente as migrações D1 ainda pendentes;
2. publica a API;
3. gera o frontend com a URL pública da API;
4. publica os arquivos estáticos;
5. testa as URLs de produção.

Para habilitar esse fluxo, crie um token da Cloudflare limitado à conta do projeto com as permissões `Workers Scripts: Edit` e `D1: Edit`. No GitHub, abra **Settings → Secrets and variables → Actions** e cadastre dois *repository secrets*:

```text
CLOUDFLARE_ACCOUNT_ID = 6d1be23e462ef3a4e2f7fdeb2702ec0c
CLOUDFLARE_API_TOKEN = token criado na Cloudflare
```

Nunca grave o token em arquivos do projeto. Depois de cadastrar os secrets, use **Actions → Qualidade do projeto → Run workflow** para testar manualmente. Os próximos `push` para `main` publicarão automaticamente. Pull requests executam apenas as validações e não alteram a produção.

Referência oficial: [GitHub Actions para Cloudflare Workers](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).

## Scripts

| Comando | Função |
| --- | --- |
| `pnpm dev` | Frontend local na porta 3000 |
| `pnpm backend:dev` | API e D1 local na porta 8787 |
| `pnpm dev:all` | Frontend e backend juntos |
| `pnpm dev:lan` | Frontend e backend acessíveis por celulares na mesma rede |
| `pnpm backend:migrate:local` | Aplica migrações no banco local |
| `pnpm backend:migrate:remote` | Aplica migrações no D1 de produção |
| `pnpm backend:deploy` | Publica apenas o backend |
| `pnpm frontend:deploy` | Publica o frontend estático no Cloudflare Workers |
| `pnpm build` | Gera o frontend estático em `out/` |
| `pnpm start` | Serve localmente o build estático |
| `pnpm start:lan` | Serve o build estático para dispositivos na mesma rede |
| `pnpm lint` | Verifica regras de código |
| `pnpm typecheck` | Verifica os tipos TypeScript |

## API

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/health` | Saúde do serviço e banco |
| `GET` | `/api/questions` | Lista questões |
| `GET` | `/api/questions?belt=Verde` | Filtra questões por graduação |
| `POST` | `/api/questions` | Cria questão |
| `DELETE` | `/api/questions/:id` | Exclui questão |
| `GET` | `/api/evaluations` | Lista os 100 resultados mais recentes |
| `POST` | `/api/evaluations` | Registra um resultado |
| `POST` | `/api/auth/login` | Inicia uma sessão |
| `POST` | `/api/auth/register` | Ativa um e-mail previamente autorizado |
| `GET` | `/api/auth/me` | Valida a sessão atual |
| `PATCH` | `/api/auth/profile` | Atualiza o nome do usuário autenticado |
| `GET` | `/api/dashboard` | Retorna estatísticas permitidas ao usuário |
| `GET` | `/api/students` | Lista alunos e evolução por avaliador |
| `GET/POST` | `/api/matrices` | Consulta ou cria matrizes de exame |
| `GET` | `/api/users` | Lista usuários para o Super Admin |
| `POST` | `/api/users/invite` | Autoriza um novo e-mail |

## Estrutura principal

```text
app/                         interface Next.js
backend/src/index.ts         API do Worker
backend/migrations/          schema e dados iniciais do D1
backend/wrangler.jsonc       configuração local e de deploy
wrangler.frontend.jsonc      publica o frontend como Workers Static Assets
lib/api.ts                   cliente HTTP do frontend
lib/practical-exams.ts       técnicas, sorteios e vídeos da avaliação técnica
lib/kata-exams.ts            katas, técnicas e cálculo da avaliação de kata
public/                      arquivos estáticos locais
scripts/dev-all.mjs          inicia os dois serviços
scripts/serve-static.mjs     servidor local do build estático
```

## Segurança antes de uso real

Toda a aplicação exige uma conta. Avaliadores enxergam somente avaliações e alunos vinculados a eles; o Super Admin possui visão global, autoriza e desativa acessos e cria matrizes. As senhas são derivadas com PBKDF2 e as sessões são armazenadas no D1 apenas como hashes.

Antes do primeiro uso real:

1. Troque a senha inicial do Super Admin.
2. Restrinja `FRONTEND_ORIGIN` à URL exata do frontend.
3. Cadastre apenas e-mails conhecidos na seção **Equipe**.
4. Configure rate limiting no endpoint de login.
5. Defina política de privacidade, retenção e exportação dos dados dos alunos.
6. Faça exportações periódicas do D1 e teste a restauração.

O sistema ainda não envia convites ou recuperação de senha por e-mail. A coleta e a correção dos exames teóricos seguem as configurações de segurança dos Google Forms vinculados.
