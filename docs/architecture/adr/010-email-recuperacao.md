# ADR 010 — E-mail transacional e recuperação de senha

- Estado: proposta
- Data: 2026-10-21

## Contexto

Contas não possuem recuperação autônoma de senha. O projeto já executa a API em
Cloudflare Workers e precisa manter baixo custo e pouca operação manual.

## Decisão proposta

Usar uma interface interna `EmailProvider`, inicialmente implementada com a API
transacional da Brevo e sua franquia gratuita. A credencial fica em um secret do
Worker e nunca chega ao frontend. Cloudflare Email Sending permanece como
implementação alternativa caso a conta adote Workers Paid. O provedor será
reavaliado antes da implementação para confirmar limites e preços vigentes.

O domínio remetente deve ser autenticado no provedor com SPF, DKIM e DMARC.

Recuperação usa token aleatório de uso único. Apenas o hash é persistido, junto
de usuário, expiração, data de consumo e metadados mínimos. A resposta da rota é
igual para contas existentes e inexistentes. Após a troca, sessões anteriores
são invalidadas.

Mensagens possuem versões texto e HTML. Envio, falha e consumo são auditados sem
registrar o token. Limites por IP e conta reduzem abuso.

## Alternativas consideradas

- redefinição manual pelo Super Admin: mantida apenas como contingência;
- acoplamento direto ao fornecedor: rejeitado para permitir substituição;
- Cloudflare Email Sending na conta gratuita: rejeitado neste momento porque o
  envio para destinatários arbitrários exige Workers Paid;
- enviar senha temporária: rejeitado; a mensagem envia somente um link de uso
  único;
- usar e-mail para marketing: fora do escopo.

## Consequências

- criar a conta do provedor e autenticar o domínio é pré-requisito operacional;
- indisponibilidade do provedor não pode criar tokens ilimitados;
- templates e entregabilidade passam a exigir teste;
- logs nunca podem conter o link completo de recuperação.

