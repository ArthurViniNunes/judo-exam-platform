# Plataforma de Exames de Judô

Aplicação web da Associação Judô Rogério Cruz para aplicar, registrar e acompanhar exames de graduação. O sistema reúne avaliações técnicas, avaliações de kata, histórico dos alunos e administração de avaliadores em uma interface responsiva.

## O que a plataforma faz

- oferece entradas separadas para alunos e equipe, com o acesso de aluno como porta principal;
- permite que a mesma identidade acumule os papéis de aluno e avaliador sem misturar seus contextos de sessão;
- cadastra o aluno na equipe ao criar sua conta e aplica sua prova teórica dentro da plataforma;
- registra, no primeiro cadastro do aluno, a graduação que ele pretende alcançar;
- permite que o Super Admin prepare, revise, publique e encerre versões imutáveis das provas teóricas por graduação;
- apresenta todas as questões em ordem aleatória, salva respostas, corrige no servidor e mostra o gabarito comentado depois da entrega;
- aceita escolha única e associações em grade com uma ou várias respostas por item, exibidas em blocos verticais no celular;
- aceita imagem, áudio, vídeo próprio ou YouTube nas questões teóricas;
- importa, como rascunho, o modelo do exame marrom com 52 questões e 1.000 pontos;
- autentica avaliadores e Super Admins com contas individuais;
- permite que o Super Admin autorize e desative avaliadores;
- aplica avaliações técnicas somente para alunos aprovados no teórico, usando automaticamente a graduação autorizada;
- trata cada sequência de `Renraku-Henka Waza` como um único movimento e cria avaliações adicionais somente quando o item pede explicitamente duas ou mais execuções;
- oferece vídeos de apoio do YouTube com reprodução iniciada ao abrir a referência;
- aplica `Nage-no-Kata` parcial ou completo e `Katame-no-Kata`;
- salva rascunhos no aparelho e sincroniza avaliações concluídas quando a conexão retorna;
- registra a nota final, a média de cada categoria, cada técnica, eventuais execuções múltiplas, observações, graduação, data e avaliador;
- mostra histórico, média e evolução por aluno, separando provas incompatíveis e comparando notas, categorias e dificuldades recorrentes;
- exclui avaliações de forma reversível, exigindo motivo, registrando auditoria e permitindo restauração pelo Super Admin;
- corrige avaliações por revisões imutáveis: a versão anterior, o motivo, o autor e a data permanecem consultáveis pelo Super Admin;
- oferece um painel com volume de avaliações, médias, aprovação e registros recentes;
- permite que o Super Admin escolha, com modelos prontos ou seletores de cor, a identidade visual global dos temas claro e escuro;
- cria elegibilidade sem expiração quando o aluno é aprovado e permite nova tentativa imediata quando ele reprova.

As avaliações teórica, técnica e de kata são processadas na aplicação e persistidas na API. A prova teórica fica indisponível somente enquanto não existir uma versão oficial publicada para a graduação do aluno. O editor administrativo não cria perguntas provisórias automaticamente.

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
- **Perfis e contextos:** uma identidade pode ter `student`, `evaluator` e `super_admin`; cada sessão é restrita ao contexto `student` ou `professional` escolhido na entrada.
- **Cliente HTTP:** `lib/api.ts` envia o token Bearer e trata expiração da sessão.

## Requisitos

- Node.js `22.13.0` ou mais recente;
- Corepack, normalmente incluído no Node.js;
- pnpm `12.14.0`, definido pelo campo `packageManager` do projeto e executado pelo Corepack;
- PowerShell no Windows, para seguir os exemplos abaixo;
- somente para publicação: conta Cloudflare com Workers e D1. Uma conta Cloudflare não é necessária para rodar localmente.

## Desenvolvimento local

### Início rápido no Windows

O projeto precisa de dois processos: o frontend Next.js na porta `3000` e a API com o banco local do Cloudflare Wrangler na porta `8787`. O comando `dev:all` inicia os dois no mesmo terminal.

1. Abra o PowerShell e entre na pasta do projeto:

```powershell
Set-Location "C:\caminho\para\judo-exam-platform"
```

Neste computador, se o repositório continuar no local atual, o comando é:

```powershell
Set-Location "C:\Users\arthu\Documents\Code\judo-exam-platform"
```

2. Confirme as ferramentas. Node `22.13.0` ou superior é aceito:

```powershell
node --version
corepack --version
```

3. Instale as dependências:

```powershell
corepack pnpm install
```

4. Crie os dois arquivos de configuração local. Os comandos preservam os arquivos caso eles já existam:

```powershell
if (!(Test-Path ".env.local")) {
  Copy-Item -LiteralPath ".env.example" -Destination ".env.local"
}

if (!(Test-Path "backend\.dev.vars")) {
  Copy-Item -LiteralPath "backend\.dev.vars.example" -Destination "backend\.dev.vars"
}
```

Confira `.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8787
```

Abra `backend/.dev.vars`:

```powershell
notepad "backend\.dev.vars"
```

O arquivo precisa conter:

```dotenv
SUPER_ADMIN_INITIAL_PASSWORD=TroqueEstaSenhaLocal123!
FRONTEND_ORIGIN=http://127.0.0.1:3000,http://localhost:3000
THEORY_EXAMS_ENABLED=true
```

Escolha uma senha local com pelo menos 10 caracteres, uma letra e um número. Não coloque a senha entre aspas. `FRONTEND_ORIGIN` é obrigatório para o navegador permitir que o frontend local acesse a API local.

`THEORY_EXAMS_ENABLED` controla apenas a abertura de novas provas teóricas. Use
`false` durante a preparação do conteúdo oficial; tentativas já iniciadas,
correções e aprovações existentes continuam acessíveis.

5. Crie ou atualize o banco local:

```powershell
corepack pnpm backend:migrate:local
```

6. Inicie todo o sistema:

```powershell
corepack pnpm dev:all
```

Espere o terminal mostrar as duas mensagens:

```text
Next.js ... Ready
Wrangler ... Ready on http://127.0.0.1:8787
```

O terminal precisa permanecer aberto enquanto o sistema estiver em uso. Para encerrar frontend e backend, pressione `Ctrl+C` uma vez e confirme o encerramento se o PowerShell perguntar.

7. Abra estes endereços:

- aplicação: <http://127.0.0.1:3000>;
- API: <http://127.0.0.1:8787>;
- saúde da API: <http://127.0.0.1:8787/health>.

Use preferencialmente `127.0.0.1`, como nos endereços acima. Na tela inicial, escolha **Acesso de avaliador** e use:

- e-mail: `admin@judorogeriocruz.com.br`;
- senha: o valor definido em `SUPER_ADMIN_INITIAL_PASSWORD`.

O Super Admin local é criado automaticamente na primeira tentativa de login. O banco local fica em `.wrangler/state` e é independente do banco de produção.

### Verificação rápida

Com `dev:all` rodando, abra outro PowerShell na pasta do projeto e execute:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8787/health"
```

O resultado esperado é:

```text
status         : ok
database       : ok
authentication : configured
```

### Problemas comuns

#### `EADDRINUSE` ou `address already in use`

Uma execução antiga ainda está usando a porta `3000` ou `8787`. Primeiro, volte aos terminais antigos e pressione `Ctrl+C`. Para descobrir o processo que ainda está usando uma porta:

```powershell
Get-NetTCPConnection -LocalPort 3000,8787 -State Listen |
  Select-Object LocalPort, OwningProcess
```

Confira o processo antes de encerrá-lo:

```powershell
Get-Process -Id NUMERO_DO_PROCESSO
```

Se for uma instância antiga de `node` ou `workerd` deste projeto:

```powershell
Stop-Process -Id NUMERO_DO_PROCESSO
```

Depois execute novamente `corepack pnpm dev:all`.

#### A tela abre, mas aparece erro de rede ou login

Confirme os dois pontos abaixo e reinicie `dev:all` depois de qualquer alteração:

- `.env.local` contém `NEXT_PUBLIC_API_URL=http://127.0.0.1:8787`;
- `backend/.dev.vars` contém `FRONTEND_ORIGIN=http://127.0.0.1:3000,http://localhost:3000`.

Também verifique <http://127.0.0.1:8787/health>. Se esse endereço não responder, a API não iniciou.

#### `no such table`, banco ausente ou migração pendente

Pare o sistema com `Ctrl+C` e execute:

```powershell
corepack pnpm backend:migrate:local
corepack pnpm dev:all
```

#### A senha local foi alterada, mas o login continua recusado

Alterar `SUPER_ADMIN_INITIAL_PASSWORD` não troca a senha de uma conta que já foi criada no banco local. Se os dados locais puderem ser descartados, pare o sistema e recrie somente o banco de desenvolvimento:

```powershell
Remove-Item -LiteralPath ".wrangler\state" -Recurse -Force
corepack pnpm backend:migrate:local
corepack pnpm dev:all
```

> Atenção: esse comando apaga todos os usuários, alunos e avaliações do banco local. Ele não altera o D1 de produção.

#### `corepack` ou `node` não foi encontrado

Instale uma versão atual do Node.js 22 LTS ou superior, feche o PowerShell, abra um novo terminal e repita a verificação de versões.

### Serviços separados

Se quiser acompanhar os logs separadamente, use dois terminais abertos na raiz do projeto.

Terminal 1 — backend:

```powershell
corepack pnpm backend:migrate:local
corepack pnpm backend:dev
```

Terminal 2 — frontend:

```powershell
corepack pnpm dev
```

As mesmas configurações de `.env.local` e `backend/.dev.vars` continuam obrigatórias.

### Testar pelo celular na mesma rede

Descubra o IPv4 do computador com `ipconfig`. Supondo que seja `192.168.0.50`, altere temporariamente:

`.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://192.168.0.50:8787
```

`backend/.dev.vars`:

```dotenv
FRONTEND_ORIGIN=http://192.168.0.50:3000
```

Reinicie usando:

```powershell
corepack pnpm dev:lan
```

No celular, conectado à mesma rede Wi-Fi, abra `http://192.168.0.50:3000`, substituindo pelo IPv4 real do computador. O Firewall do Windows pode pedir permissão para o Node.js; permita somente em redes privadas. Esse modo é apenas para testes acompanhados: depende do computador ligado, não usa HTTPS e não deve ser exposto à internet.

## Fluxo de acesso

1. A página principal abre a **Área do aluno**. No primeiro acesso, o judoca cria sua conta e entra automaticamente no cadastro de alunos da equipe.
2. Quando existe uma versão publicada para sua graduação, o aluno faz a prova na plataforma, sem limite de tempo. Todas as questões e alternativas são embaralhadas em cada tentativa; associações aparecem em blocos verticais, sem tabela larga no celular.
3. Depois da entrega, o aluno vê a nota, os acertos, os erros, a resposta correta e a explicação de cada questão. Se reprovar, pode tentar novamente imediatamente; se passar, a elegibilidade não expira.
4. Avaliadores usam o botão **Acesso de avaliador**. O Super Admin também pode compartilhar um convite, que já abre essa entrada no modo de criação de conta.
5. Em **Equipe**, o Super Admin informa nome, e-mail e graduação do avaliador para autorizar o acesso profissional.
6. Se um aluno também for avaliador, ele usa a mesma identidade e senha nas duas entradas. Cada login cria uma sessão limitada ao contexto escolhido.
7. Em **Administração → Alunos**, usuários profissionais podem continuar cadastrando previamente judocas que ainda não possuem conta.
8. Ao iniciar uma avaliação técnica, o avaliador escolhe um judoca aprovado no teórico. A faixa e a data da aprovação aparecem automaticamente e não podem ser alteradas. Kata continua disponível para os judocas cadastrados.
9. Ao salvar a primeira avaliação, o sistema associa automaticamente o judoca ao usuário logado. O avaliador consulta apenas quem já avaliou e seus próprios registros, enquanto o Super Admin mantém a visão completa.
10. O nome exibido pode ser alterado em **Ver e editar perfil**.
11. Em **Administração → Eventos**, o Super Admin organiza o dia do exame. Durante o evento, cada avaliador assume uma tarefa livre e abre a prova diretamente pela fila; o vínculo é preservado no rascunho local e na avaliação sincronizada. A fila se atualiza a cada 10 segundos e pode ser filtrada por situação, modalidade e responsável.
12. Em **Administração → Notas**, os registros podem ser combinados por avaliador, modalidade, graduação, resultado, categoria, técnica e período. O painel de dificuldades sempre informa o tamanho da amostra e destaca quando ainda há poucos exames para uma conclusão segura.
13. Abra **Detalhes → Imprimir ou salvar PDF** para gerar um relatório somente quando necessário. A versão de impressão inclui identidade visual, judoca, graduação, avaliador, evento, data, resultado, categorias, técnicas, execuções e a referência imutável do registro.
14. Em **Administração → Alunos**, escolha um judoca e a série de exames. A plataforma compara somente avaliações da mesma modalidade, graduação e matriz, mostrando a mudança da nota geral, cada categoria e técnicas que ficaram abaixo de 7,0 de forma recorrente. O histórico completo pode ser filtrado por modalidade, graduação e período.
15. Em **Administração → Auditoria**, o Super Admin consulta um histórico cronológico somente leitura, com filtros por responsável, ação, tipo de registro, período e identificadores. Cada item preserva o ator, o horário, os metadados mínimos e o identificador da requisição para investigação.

O Super Admin pode carregar o caderno fornecido para 1º Kyu em **Administração → Provas teóricas → Importar exame marrom**. Ele entra como rascunho: revise o gabarito provisório e inclua as 14 mídias pendentes antes de publicar. O inventário está em [`docs/product/brown-theory-exam.md`](docs/product/brown-theory-exam.md).

Não há envio automático de convite, recuperação de senha ou redefinição por e-mail. A autorização precisa ser comunicada manualmente ao avaliador.

## Regras das avaliações

### Avaliação técnica

O catálogo técnico oficial fica em `lib/practical-exams.ts`. Ele organiza as técnicas por graduação e categoria, incluindo `Nage Waza`, `Renraku-Henka Waza`, `Kaeshi Waza`, `Osaekomi Waza`, `Shime Waza` e `Kansetsu Waza`. Quando uma faixa exige técnicas anteriores, a seleção é feita automaticamente ao iniciar o exame e a origem sorteada aparece no próprio card.

O início do exame exige a seleção de um judoca com aprovação teórica ativa. A API recupera do banco o nome, a graduação autorizada e a data da aprovação. Ao salvar, o backend consulta novamente a elegibilidade e rejeita a avaliação se ela estiver ausente, revogada ou associada a outra faixa. Assim, nem o frontend nem uma fila offline conseguem substituir a graduação autorizada.

Cada item de `Renraku-Henka Waza` recebe uma única avaliação, mesmo quando o nome contém `→`. Avaliações múltiplas no mesmo card são criadas somente quando o texto pede explicitamente mais de uma execução, como `2 Fugas de Yoko-shiho-gatame`; nesse caso, a média das execuções compõe a nota do item.

No celular, depois da primeira técnica aberta, escolher uma nota abre automaticamente a próxima técnica pendente da categoria. O botão fixo **Desfazer** restaura o último lançamento; itens com várias execuções só avançam depois que todas as notas do bloco forem informadas.

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

Todas as rotas abaixo, exceto `/`, `/health`, login/registro e a leitura pública do tema, exigem `Authorization: Bearer <token>`.

| Método | Rota | Acesso | Finalidade |
| --- | --- | --- | --- |
| `GET` | `/` | público | Identificação da API |
| `GET` | `/health` | público | Verifica Worker, D1 e configuração do Super Admin |
| `POST` | `/api/auth/login` | público | Inicia uma sessão |
| `POST` | `/api/auth/register` | público | Ativa um e-mail previamente autorizado |
| `POST` | `/api/student-auth/register` | público | Cria a identidade e o cadastro vinculados do aluno |
| `POST` | `/api/student-auth/login` | público | Inicia uma sessão no contexto de aluno |
| `GET` | `/api/student/me` | Aluno | Retorna o cadastro próprio e o histórico de elegibilidades |
| `PATCH` | `/api/student/me/target-belt` | Aluno | Define a graduação de cadastros antigos antes da primeira tentativa |
| `GET` | `/api/auth/me` | autenticado | Retorna o usuário atual |
| `PATCH` | `/api/auth/profile` | autenticado | Atualiza o nome do usuário |
| `POST` | `/api/auth/logout` | autenticado | Encerra a sessão atual |
| `GET` | `/api/settings/theme` | público | Retorna as cores globais da aplicação |
| `PATCH` | `/api/settings/theme` | Super Admin | Valida e atualiza as cores globais |
| `GET` | `/api/audit-events` | Super Admin | Consulta o histórico paginado com filtros de ator, ação, entidade, período e identificador |
| `GET/POST` | `/api/theory/admin/versions` | Super Admin | Lista ou cria versões teóricas em rascunho |
| `GET/PATCH/DELETE` | `/api/theory/admin/versions/:id` | Super Admin | Consulta, configura ou exclui um rascunho |
| `POST` | `/api/theory/admin/versions/:id/questions` | Super Admin | Adiciona uma questão ao rascunho |
| `PATCH/DELETE` | `/api/theory/admin/questions/:id` | Super Admin | Edita ou remove uma questão do rascunho |
| `POST` | `/api/theory/admin/versions/:id/publish` | Super Admin | Valida e congela uma versão oficial |
| `POST` | `/api/theory/admin/versions/:id/close` | Super Admin | Encerra uma versão publicada |
| `GET` | `/api/theory-exams/available` | Aluno | Informa prova disponível, tentativa em andamento ou elegibilidade |
| `GET` | `/api/theory-attempts/current` | Aluno | Retoma a tentativa ativa sem expor o gabarito |
| `POST` | `/api/theory-attempts` | Aluno | Inicia ou retoma a prova publicada da graduação escolhida |
| `PATCH` | `/api/theory-attempts/:id/answers` | Aluno | Salva uma resposta de forma idempotente |
| `POST` | `/api/theory-attempts/:id/submit` | Aluno | Entrega, corrige e cria elegibilidade quando aprovado |
| `GET` | `/api/theory-attempts/:id/result` | Aluno | Mostra nota, resposta dada, gabarito e explicação após a entrega |
| `GET` | `/api/dashboard` | autenticado | Retorna indicadores e registros recentes |
| `GET` | `/api/students` | autenticado | Lista alunos e seus históricos |
| `GET` | `/api/students/available` | autenticado | Lista o catálogo global para iniciar exames |
| `GET` | `/api/practical-candidates` | autenticado | Lista candidatos, faixa autorizada e origem da elegibilidade prática |
| `POST` | `/api/students` | autenticado | Cadastra previamente um judoca |
| `GET` | `/api/evaluations` | autenticado | Lista avaliações permitidas ao usuário |
| `POST` | `/api/evaluations` | autenticado | Registra uma avaliação |
| `POST` | `/api/evaluations/sync` | autenticado | Sincroniza uma avaliação local de forma idempotente |
| `GET` | `/api/evaluations/:id/revisions` | Super Admin | Consulta todas as versões imutáveis da avaliação |
| `POST` | `/api/evaluations/:id/revisions` | Super Admin | Cria uma correção com motivo, autor e auditoria |
| `DELETE` | `/api/evaluations/:id` | autenticado | Arquiva uma avaliação permitida, com motivo obrigatório e auditoria |
| `GET` | `/api/evaluations/deleted` | Super Admin | Lista avaliações excluídas logicamente |
| `POST` | `/api/evaluations/:id/restore` | Super Admin | Restaura uma avaliação excluída e registra auditoria |
| `GET/POST` | `/api/exam-events` | autenticado / Super Admin | Lista eventos acessíveis ou cria um evento |
| `GET/PATCH` | `/api/exam-events/:id` | participante / Super Admin | Consulta o evento completo ou edita sua preparação |
| `POST` | `/api/exam-events/:id/status` | Super Admin | Avança o ciclo de vida do evento |
| `POST` | `/api/exam-events/:id/tasks/:taskId/claim` | participante | Assume atomicamente uma avaliação livre |
| `POST` | `/api/exam-events/:id/tasks/:taskId/release` | responsável / Super Admin | Libera uma avaliação ainda não concluída |
| `POST` | `/api/exam-events/:id/evaluators` | Super Admin | Adiciona um avaliador participante |
| `DELETE` | `/api/exam-events/:id/evaluators/:userId` | Super Admin | Remove um avaliador sem tarefas atribuídas |
| `POST` | `/api/exam-events/:id/entries` | Super Admin | Inscreve um judoca elegível e cria suas modalidades |
| `DELETE` | `/api/exam-events/:id/entries/:entryId` | Super Admin | Remove uma inscrição ainda não iniciada |
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

O schema ativo cobre usuários e suas graduações, sessões, alunos, avaliações,
médias por categoria, notas por técnica, execuções múltiplas, auditoria, cores
globais, provas teóricas versionadas e eventos com suas filas por modalidade.
Tabelas históricas de questões e matrizes permanecem nas migrações já aplicadas
para evitar uma operação destrutiva, mas não são reutilizadas pelo fluxo novo.
O estado local fica em `.wrangler/state` e não deve ser commitado.

## Uso com conexão instável

Em produção, a plataforma instala um Service Worker e mantém no IndexedDB do
aparelho os rascunhos e a fila de avaliações concluídas. O primeiro login ainda
exige internet. Depois disso:

- alterações da prova em andamento são salvas automaticamente no aparelho;
- um rascunho pode ser retomado após fechar ou recarregar a página;
- concluir a prova coloca o registro na fila antes de tentar enviá-lo;
- a barra de estado distingue conteúdo local, sincronização, confirmação do
  servidor e pendências que exigem nova tentativa;
- envios repetidos usam o mesmo identificador e não duplicam a avaliação;
- registros já confirmados são removidos da fila local após 24 horas.

Antes de trocar de conta ou limpar os dados do navegador, confirme que a barra
indica **Salvo no servidor**. Conteúdo administrativo não é disponibilizado
offline.

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

- [Plano de evolução proposto](docs/product/evolution-plan.md): fases, critérios de aceite, UX, dados, APIs e decisões pendentes;
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
docs/                         Produto, arquitetura, ADRs e operação
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
