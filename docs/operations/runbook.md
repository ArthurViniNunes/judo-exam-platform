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
bucket privado no Backblaze B2 e baixa a cópia novamente para conferir sua
integridade. No primeiro dia do mês também grava a mesma cópia sob `monthly/`.

O B2 foi escolhido porque a franquia vigente inclui 10 GB gratuitos e permite
começar sem forma de pagamento. O uso precisa permanecer abaixo da franquia; o
bucket não deve ser público.

### Criar o bucket gratuito

1. Crie uma conta Backblaze e habilite **B2 Cloud Storage**.
2. Em **Buckets → Create a Bucket**, crie um bucket privado com nome globalmente
   único, por exemplo `judo-exam-backups-arthur`.
3. Anote a região mostrada no endpoint S3, por exemplo `us-west-004`.
4. Em **Lifecycle Settings**, crie regras para ocultar `daily/` após 30 dias e
   `monthly/` após 370 dias, apagando versões ocultas um dia depois.
5. Em **Application Keys**, crie uma chave restrita a esse bucket, com leitura e
   escrita e permissão para listar os nomes dos buckets. Use uma chave criada
   manualmente; a chave mestra não funciona na API compatível com S3.

No GitHub, em **Settings → Secrets and variables → Actions**:

1. mantenha `CLOUDFLARE_ACCOUNT_ID` e um token Cloudflare com **D1 Read** em
   `CLOUDFLARE_BACKUP_API_TOKEN`;
2. crie o secret `B2_KEY_ID` com o identificador da Application Key;
3. crie o secret `B2_APPLICATION_KEY` com a chave mostrada uma única vez;
4. crie a variável `B2_BACKUP_BUCKET` com o nome exato do bucket;
5. crie a variável `B2_REGION` apenas com a região, como `us-west-004`;
6. abra **Actions → Backup do banco D1 → Run workflow** e faça a primeira
   execução manual;
7. confira no B2 os três objetos em `daily/AAAA/MM/DD/`.

O workflow aceita as duas variáveis B2 também como secrets. A etapa
`Conferir acesso ao D1 e ao B2` diferencia configuração ausente, falha de acesso
ao D1 e credencial ou bucket B2 inválido.

## Mídias das provas teóricas

Mídias usam um bucket diferente do backup. O bucket de backup contém dados
pessoais e permanece privado; nunca altere sua visibilidade para atender às
questões.

### Preparar o bucket

1. Em **B2 Cloud Storage → Buckets**, crie outro bucket globalmente único, por
   exemplo `judo-exam-theory-media-arthur`.
2. Marque **Files in Bucket are Public**. Publique somente recortes sanitizados,
   sem nomes, rostos ou dados de alunos.
3. Anote a região do endpoint S3, por exemplo `us-west-004`.
4. Em **Application Keys**, crie uma chave exclusiva, restrita a esse bucket,
   com acesso **Write Only**. Quando disponível, restrinja também ao prefixo
   `theory-media/`.
5. Guarde o `keyID` e o `applicationKey` no gerenciador de senhas. A chave de
   aplicação é mostrada apenas uma vez.

Não é necessário configurar upload direto nem CORS no B2: o navegador envia o
arquivo ao Worker e o Worker grava no bucket.

### Cadastrar no Worker

Execute os quatro comandos e cole cada valor apenas no prompt protegido:

```powershell
corepack pnpm wrangler secret put B2_MEDIA_KEY_ID --config backend/wrangler.jsonc
corepack pnpm wrangler secret put B2_MEDIA_APPLICATION_KEY --config backend/wrangler.jsonc
corepack pnpm wrangler secret put B2_MEDIA_BUCKET --config backend/wrangler.jsonc
corepack pnpm wrangler secret put B2_MEDIA_REGION --config backend/wrangler.jsonc
```

Em `B2_MEDIA_REGION`, informe somente a região, sem `https://` ou o restante do
endpoint. Consulte `/health`: `theoryMedia` deve mudar de
`missing_media_storage_configuration` para `configured`.

Depois, entre como Super Admin, abra um rascunho em **Provas teóricas**, edite
uma questão e envie um arquivo pequeno. Confira se a URL criada abre em uma
janela anônima e se a mídia aparece na prévia do aluno. O editor aceita URL HTTPS
manual mesmo quando o B2 não está configurado.

### Segurança e consumo

- limite atual: 50 MB por arquivo;
- formatos ativos como SVG e HTML são recusados;
- o nome original não vai para o bucket; a chave usa UUID;
- remova EXIF e metadados internos antes do upload;
- revise mensalmente o volume armazenado e a franquia vigente;
- ao rotacionar a chave, repita somente os dois comandos de credencial; URLs já
  gravadas continuam válidas.

### Recuperação de senha com Brevo

1. Na Brevo, abra **Settings → Senders, Domains, IPs → Domains**, adicione o
   domínio de `EMAIL_FROM_ADDRESS` e conclua a autenticação indicada pela Brevo.
2. Em **Senders**, cadastre e verifique exatamente o remetente configurado em
   `backend/wrangler.jsonc`.
3. Abra **Settings → SMTP & API → API Keys & MCP**, gere uma chave exclusiva
   chamada `judo-exam-production` e copie-a uma única vez para um gerenciador de
   senhas. Não envie a chave por mensagem e não a salve no repositório.
4. No terminal do projeto, execute o comando abaixo e cole a chave somente no
   prompt protegido do Wrangler:

```powershell
corepack pnpm wrangler secret put BREVO_API_KEY --config backend/wrangler.jsonc
```

5. Gere um segredo independente para os tokens de redefinição e grave-o sem
   imprimi-lo no terminal:

```powershell
$resetPepper = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
$resetPepper | corepack pnpm wrangler secret put PASSWORD_RESET_PEPPER --config backend/wrangler.jsonc
Remove-Variable resetPepper
```

6. Consulte `/health`. O item `missing_email_configuration` deve desaparecer.
   Em seguida, solicite uma redefinição para uma conta de teste e confira caixa
   de entrada, spam, validade de 20 minutos e uso único do link.

Chaves Brevo podem expirar por prazo configurado ou ser desativadas por
inatividade. Registre o responsável pela rotação e verifique a integração após
cada troca.

### Ensaio de restauração isolada

Nunca importe primeiro no banco de produção. Pelo painel do B2, escolha o trio
`.sql.gz`, `.sha256` e `.manifest.json` de uma mesma data e copie suas chaves.
Você pode baixá-los pelo painel ou usar um perfil `b2` da AWS CLI. Confira a
cópia em uma pasta temporária:

```powershell
$bucket = "judo-exam-platform-backups"
$regiao = "us-west-004"
$endpoint = "https://s3.$regiao.backblazeb2.com"
$prefixo = "daily/AAAA/MM/DD"
$arquivo = "judo-exam-db-AAAAMMDDTHHMMSSZ.sql.gz"
$teste = Join-Path $env:TEMP "judo-restore-test"
New-Item -ItemType Directory -Force -Path $teste | Out-Null
aws s3 cp "s3://$bucket/$prefixo/$arquivo" "$teste/$arquivo" --profile b2 --endpoint-url $endpoint --region $regiao
aws s3 cp "s3://$bucket/$prefixo/$arquivo.sha256" "$teste/$arquivo.sha256" --profile b2 --endpoint-url $endpoint --region $regiao
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
- backup falhou antes da exportação: confira as variáveis e secrets indicados
  pela etapa de configuração e as permissões das duas credenciais;
- backup falhou no upload ou na conferência: não considere a execução válida;
  confirme bucket, regras de acesso e espaço antes de executar novamente.
- upload de mídia indisponível: confira `theoryMedia` em `/health` e os quatro
  secrets `B2_MEDIA_*`; URLs manuais continuam sendo uma contingência segura;
- mídia retorna 403: confirme que o bucket de mídias, e somente ele, está público;
- mídia retorna 404: confirme se o objeto ainda existe e recadastre a URL na
  questão em rascunho.

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
