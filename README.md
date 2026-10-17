# Plataforma de Exames de Judô

Aplicação web para os exames da Associação Judô Rogério Cruz. O projeto funciona de forma autônoma, sem ChatGPT, OpenAI Sites, conectores ou autenticação proprietária.

## Arquitetura

- **Frontend:** Next.js 16/React 19 exportado como HTML, CSS e JavaScript estáticos.
- **Backend:** API independente em Cloudflare Workers.
- **Banco:** Cloudflare D1 (SQLite distribuído) em produção e SQLite local gerenciado pelo Wrangler no desenvolvimento.
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

O comando retorna um `database_id`. Copie esse UUID para `backend/wrangler.jsonc`, substituindo `00000000-0000-0000-0000-000000000000`.

### 3. Criar as tabelas e dados iniciais

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

Durante a configuração inicial, `FRONTEND_ORIGIN` está como `*`. Depois que o frontend tiver uma URL pública, edite `backend/wrangler.jsonc`:

```jsonc
"vars": {
  "FRONTEND_ORIGIN": "https://seu-projeto.pages.dev"
}
```

Mais de uma origem pode ser informada separando-as por vírgula. Publique novamente com `pnpm backend:deploy`.

## Hospedar o frontend gratuitamente

O frontend é totalmente estático e pode ser hospedado no Cloudflare Pages, GitHub Pages, Netlify ou qualquer servidor de arquivos. No Cloudflare Pages, requisições a arquivos estáticos são gratuitas e ilimitadas segundo a [documentação de preços](https://developers.cloudflare.com/pages/functions/pricing/).

Para Cloudflare Pages:

1. Envie este projeto para um repositório GitHub ou GitLab.
2. No painel Cloudflare, abra **Workers & Pages → Create application → Pages → Import an existing Git repository**.
3. Configure **Build command** como `pnpm build` e **Build output directory** como `out`.
4. Em **Environment variables**, adicione `NEXT_PUBLIC_API_URL` com a URL do Worker publicado.
5. Faça o deploy e depois restrinja o `FRONTEND_ORIGIN` do backend à URL recebida.

O fluxo corresponde ao [guia oficial para export estático do Next.js](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/).

## Scripts

| Comando | Função |
| --- | --- |
| `pnpm dev` | Frontend local na porta 3000 |
| `pnpm backend:dev` | API e D1 local na porta 8787 |
| `pnpm dev:all` | Frontend e backend juntos |
| `pnpm backend:migrate:local` | Aplica migrações no banco local |
| `pnpm backend:migrate:remote` | Aplica migrações no D1 de produção |
| `pnpm backend:deploy` | Publica apenas o backend |
| `pnpm build` | Gera o frontend estático em `out/` |
| `pnpm start` | Serve localmente o build estático |
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

## Estrutura principal

```text
app/                         interface Next.js
backend/src/index.ts         API do Worker
backend/migrations/          schema e dados iniciais do D1
backend/wrangler.jsonc       configuração local e de deploy
lib/api.ts                   cliente HTTP do frontend
lib/practical-exams.ts       técnicas, sorteios e vídeos da avaliação técnica
lib/kata-exams.ts            katas, técnicas e cálculo da avaliação de kata
public/                      arquivos estáticos locais
scripts/dev-all.mjs          inicia os dois serviços
scripts/serve-static.mjs     servidor local do build estático
```

## Segurança antes de uso real

Esta versão mantém a área administrativa sem login e permite alterações na API sem autenticação. Isso é adequado para demonstração ou uso controlado, mas **não para uma administração exposta à internet**. A coleta e a correção dos exames teóricos passam a seguir as configurações de segurança dos Google Forms vinculados.

Antes de cadastrar dados pessoais ou aplicar provas reais, implemente autenticação, perfis de acesso, correção no servidor, rate limiting, política de privacidade e backups/exportações periódicas do D1. O CORS restringe navegadores, mas não substitui autenticação.
