# Runbook de operação

Use este documento para desenvolvimento, publicação e resposta a incidentes. Os
comandos partem da raiz do repositório.

## Subir localmente

```powershell
corepack pnpm install
corepack pnpm backend:migrate:local
corepack pnpm dev:all
```

- aplicação: <http://127.0.0.1:3000>
- API: <http://127.0.0.1:8787>
- saúde: <http://127.0.0.1:8787/health>

O segredo local fica em `backend/.dev.vars`, nunca no Git. Use
`backend/.dev.vars.example` como referência.

## Checklist antes de um exame

1. Verifique se o último workflow da `main` terminou com sucesso.
2. Abra o site em um celular usando rede móvel e Wi-Fi.
3. Entre com uma conta de avaliador e atualize o nome do perfil.
4. Faça uma avaliação técnica de teste e confirme seu aparecimento no painel.
5. Confirme os vídeos e o catálogo técnico que serão usados no dia.
6. Teste a entrada principal com uma conta de aluno e confirme o estado atual da prova teórica.
7. Teste a entrada profissional com uma conta de Super Admin e uma de avaliador comum.
8. Exporte ou registre um ponto de recuperação do D1 conforme a política da
   associação.
9. Tenha uma planilha ou ficha em papel como contingência de indisponibilidade.

## Publicação manual

```powershell
corepack pnpm backend:migrate:remote
corepack pnpm backend:deploy
$env:NEXT_PUBLIC_API_URL="https://judo-exam-api.judo-rogerio-cruz.workers.dev"
corepack pnpm build
corepack pnpm frontend:deploy
Remove-Item Env:NEXT_PUBLIC_API_URL
```

Após a publicação:

```powershell
Invoke-RestMethod https://judo-exam-api.judo-rogerio-cruz.workers.dev/health
```

## Backup automático do D1

O workflow `.github/workflows/backup-d1.yml` exporta o banco todos os dias às
03:17 UTC, compacta o SQL, gera manifesto e SHA-256, envia os três arquivos a um
bucket R2 privado e baixa a cópia novamente para conferir sua integridade. No
primeiro dia do mês também grava a mesma cópia sob `monthly/`.

Ativação única, feita por uma pessoa autenticada na conta Cloudflare:

```powershell
$bucket = "judo-exam-platform-backups"
corepack pnpm wrangler r2 bucket create $bucket
corepack pnpm wrangler r2 bucket lifecycle add $bucket "expirar-diarios" "daily/" --expire-days 30 --force
corepack pnpm wrangler r2 bucket lifecycle add $bucket "expirar-mensais" "monthly/" --expire-days 370 --force
corepack pnpm wrangler r2 bucket lifecycle list $bucket
```

No GitHub, em **Settings → Secrets and variables → Actions**:

1. crie a variável `CLOUDFLARE_BACKUP_BUCKET` com o nome exato do bucket;
2. mantenha o secret `CLOUDFLARE_ACCOUNT_ID` já usado no deploy;
3. crie `CLOUDFLARE_BACKUP_API_TOKEN` com `D1 Content Read-Only` e
   `R2 Admin Read & Write`. O Wrangler usa a API REST do R2, portanto essa
   permissão R2 abrange a conta; não reutilize o token em outras automações;
4. abra **Actions → Backup do banco D1 → Run workflow** e faça a primeira
   execução manual;
5. confira no R2 os três objetos em `daily/AAAA/MM/DD/` e mantenha o bucket sem
   domínio público e sem `r2.dev`.

### Ensaio de restauração isolada

Nunca importe primeiro no banco de produção. Pelo painel do R2, escolha o trio
`.sql.gz`, `.sha256` e `.manifest.json` de uma mesma data e copie suas chaves.
Baixe e confira a cópia em uma pasta temporária:

```powershell
$bucket = "judo-exam-platform-backups"
$prefixo = "daily/AAAA/MM/DD"
$arquivo = "judo-exam-db-AAAAMMDDTHHMMSSZ.sql.gz"
$teste = Join-Path $env:TEMP "judo-restore-test"
New-Item -ItemType Directory -Force -Path $teste | Out-Null
corepack pnpm wrangler r2 object get "$bucket/$prefixo/$arquivo" --remote --file "$teste/$arquivo"
corepack pnpm wrangler r2 object get "$bucket/$prefixo/$arquivo.sha256" --remote --file "$teste/$arquivo.sha256"
Push-Location $teste
Get-FileHash -Algorithm SHA256 $arquivo
Get-Content "$arquivo.sha256"
Pop-Location
```

Compare os dois hashes. Depois, descompacte o SQL e importe-o em um D1 novo,
nunca referenciado pelo Worker de produção:

```powershell
node -e "const fs=require('node:fs'),zlib=require('node:zlib');fs.createReadStream(process.argv[1]).pipe(zlib.createGunzip()).pipe(fs.createWriteStream(process.argv[2]))" "$teste/$arquivo" "$teste/judo-exam-db-AAAAMMDDTHHMMSSZ.sql"
corepack pnpm wrangler d1 create judo-exam-restore-test
corepack pnpm wrangler d1 execute judo-exam-restore-test --remote --file "$teste/judo-exam-db-AAAAMMDDTHHMMSSZ.sql" --yes
corepack pnpm wrangler d1 execute judo-exam-restore-test --remote --command "SELECT COUNT(*) AS total FROM users" --json
```

Valide login, alunos, avaliações, detalhamento e auditoria contra os totais do
manifesto operacional do dia. Registre data, responsável, duração e resultado
do ensaio. Exclua o banco de teste somente depois dessa evidência e com dupla
conferência do nome. Uma restauração em produção exige incidente registrado,
janela de manutenção e aprovação explícita do responsável pela associação.

## Diagnóstico

- erro de login: confirme o secret `SUPER_ADMIN_INITIAL_PASSWORD`, status do
  usuário e relógio do dispositivo;
- erro de CORS: compare a origem do navegador com `FRONTEND_ORIGIN`;
- erro de tabela/coluna: confirme se todas as migrações remotas foram aplicadas;
- frontend antigo: verifique o workflow, o Worker de assets e o cache do
  navegador;
- avaliação ausente: confira a aba Rede do navegador e os logs estruturados do
  Worker antes de repetir o registro.
- backup falhou antes da exportação: confira os três nomes configurados no
  GitHub e as permissões do token exclusivo;
- backup falhou no upload ou na conferência: não considere a execução válida;
  confirme bucket, regras de acesso e espaço antes de executar novamente.

Logs em tempo real:

```powershell
corepack pnpm wrangler tail --config backend/wrangler.jsonc
```

## Rollback

Para regressão apenas de código, republique um commit conhecido e compatível com
o schema atual. Não reverta migrações destrutivamente durante um evento. Em uma
mudança de banco, publique primeiro código compatível com as duas versões do
schema, migre dados e só depois remova estruturas antigas.

## Rotação de segredo

```powershell
corepack pnpm wrangler secret put SUPER_ADMIN_INITIAL_PASSWORD --config backend/wrangler.jsonc
```

A senha inicial só é usada para criar ou completar a conta bootstrap que ainda
não possui senha. Contas ativas não têm a senha substituída automaticamente.

## Pós-incidente

Registre horário, impacto, usuários afetados, evidência dos logs, ação de
contenção, causa e ação preventiva. Nunca copie tokens, hashes ou dados pessoais
dos alunos para issues públicas.
