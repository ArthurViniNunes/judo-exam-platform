# ADR 015 — Mídias teóricas em bucket B2 separado

- Estado: aceita; ativação pendente
- Data: 2026-10-24
- Complementa: ADR 014

## Contexto

Questões teóricas podem depender de imagem, áudio ou vídeo cujo nome, título ou
canal revele a resposta. Links do YouTube não resolvem esse caso, e armazenar
arquivos no D1 aumentaria o banco, os backups e o custo de leitura. O projeto
precisa permitir que o Super Admin prepare os cadernos sem adicionar binários ao
Git e sem exigir uma contratação inicial.

## Decisão

Usar um segundo bucket Backblaze B2, independente do bucket privado de backups,
para arquivos sanitizados das questões. Esse bucket é público para leitura,
porque os elementos nativos de imagem, áudio e vídeo precisam buscar o objeto
sem receber credenciais. O conteúdo não inclui dados de alunos nem informações
operacionais privadas.

O navegador envia o corpo binário ao Worker autenticado. O Worker:

1. exige uma sessão de Super Admin;
2. aceita apenas formatos de imagem, áudio e vídeo explicitamente permitidos;
3. exige tamanho conhecido e limita o arquivo a 50 MB;
4. cria uma chave opaca em `theory-media/AAAA/MM/<uuid>.<extensão>`;
5. assina um `PUT` compatível com S3 usando uma Application Key restrita;
6. devolve apenas a URL pública e o tipo inferido ao editor.

O nome original não é persistido ou enviado ao B2. A URL fica no D1 junto da
questão. As credenciais existem apenas como secrets do Worker. Sem os quatro
valores B2, somente a rota de upload responde como indisponível; provas, editor
e URLs HTTPS manuais continuam funcionando.

## Alternativas consideradas

- **Cloudflare R2:** tecnicamente mais integrado ao Worker, mas a conta atual
  exige habilitação comercial incompatível com o requisito de começar sem custo.
- **D1 ou Base64:** rejeitado por inflar banco, respostas, backups e memória.
- **Arquivos no repositório/Static Assets:** rejeitado porque cada mídia exigiria
  commit e novo deploy, além de misturar conteúdo editorial e código.
- **Somente YouTube:** rejeitado porque título, canal, recomendações e miniatura
  podem entregar o gabarito.
- **Upload direto do navegador ao B2:** adiado para evitar credenciais ou regras
  CORS adicionais no cliente. O Worker mantém autorização e política de arquivo
  em um único limite de confiança.

## Consequências

- o bucket de mídia deve ser público, exclusivo e nunca armazenar dados pessoais;
- arquivos precisam ser sanitizados antes do envio, pois a aplicação não remove
  EXIF, faixas de áudio ou metadados internos;
- uploads abandonados podem deixar objetos órfãos; a limpeza automática fica
  como evolução se o volume justificar;
- o limite gratuito e os preços do provedor podem mudar, portanto o consumo deve
  ser acompanhado;
- o endpoint S3 mantém a implementação portável para outro armazenamento
  compatível caso seja necessário.
