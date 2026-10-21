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

## Diagnóstico

- erro de login: confirme o secret `SUPER_ADMIN_INITIAL_PASSWORD`, status do
  usuário e relógio do dispositivo;
- erro de CORS: compare a origem do navegador com `FRONTEND_ORIGIN`;
- erro de tabela/coluna: confirme se todas as migrações remotas foram aplicadas;
- frontend antigo: verifique o workflow, o Worker de assets e o cache do
  navegador;
- avaliação ausente: confira a aba Rede do navegador e os logs estruturados do
  Worker antes de repetir o registro.

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
