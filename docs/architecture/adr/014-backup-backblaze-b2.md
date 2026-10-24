# ADR 014 — Backups externos no Backblaze B2

- Estado: aceita; ativação pendente
- Data: 2026-10-24
- Substitui: destino R2 definido no ADR 011

## Contexto

O ADR 011 definiu exportações do D1 para um bucket Cloudflare R2. A conta usada
pelo projeto exige habilitação comercial do R2, contrariando o requisito do
cliente de manter a operação sem gastos e sem cadastrar uma forma de pagamento.

O D1 continua protegido pelo Time Travel gratuito por sete dias, mas é desejável
uma cópia lógica externa com retenção maior e restauração verificável.

## Decisão

Manter o GitHub Actions como executor e trocar apenas o destino dos arquivos por
um bucket privado no Backblaze B2, usando sua API compatível com S3.

O workflow:

1. exporta o D1 com uma credencial Cloudflare limitada a leitura;
2. compacta o SQL e cria manifesto e SHA-256;
3. envia cópias diárias e mensais com uma Application Key limitada ao bucket;
4. baixa novamente a cópia diária e valida o checksum;
5. não torna o bucket nem os objetos públicos.

A retenção inicial permanece em 30 dias para cópias diárias e 370 dias para
mensais. Regras de ciclo de vida do B2 fazem a expiração. O titular deve
acompanhar o consumo e interromper uploads antes de ultrapassar a franquia
gratuita vigente.

Mídias sanitizadas de questões poderão usar outro bucket B2 no futuro. O bucket
de backup continuará separado e privado; nenhuma rota pública da aplicação deve
servir objetos a partir dele.

## Alternativas consideradas

- **GitHub Actions Artifacts:** rejeitado como destino principal porque o
  repositório é público, os artefatos também podem ser baixados por leitores e
  a retenção máxima pública é curta para as cópias mensais. Criptografia do lado
  do cliente reduziria o risco, mas aumentaria a dependência de uma chave offline.
- **Workers Static Assets:** adequado para mídias públicas e sanitizadas, mas não
  para backups com dados pessoais.
- **Somente Time Travel:** mantido como primeira camada, mas sete dias não cobrem
  retenção histórica nem independência do provedor do banco.

## Consequências

- surge uma conta externa Backblaze e duas credenciais protegidas no GitHub;
- o backup deixa de depender da contratação do R2;
- o endpoint S3 e a AWS CLI tornam o fluxo portátil;
- a gratuidade depende de respeitar a franquia vigente, portanto não é garantia
  permanente;
- um ensaio de restauração continua obrigatório antes de considerar a operação
  concluída.

