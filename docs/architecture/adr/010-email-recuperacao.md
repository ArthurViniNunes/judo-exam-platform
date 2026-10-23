# ADR 010 — E-mail transacional e recuperação de senha

- Estado: aceita e implementada
- Data: 2026-10-23

## Contexto

Contas não possuem recuperação autônoma de senha. O projeto já executa a API em
Cloudflare Workers e precisa manter baixo custo e pouca operação manual.

## Decisão

Usar uma interface interna `EmailProvider`, inicialmente implementada com a API
transacional da Brevo e sua franquia gratuita. A credencial fica em um secret do
Worker e nunca chega ao frontend. A integração usa o endpoint oficial
`POST /v3/smtp/email`, remetente verificado e chave no cabeçalho `api-key`.
Cloudflare Email Sending permanece como implementação alternativa caso a
conta adote Workers Paid.

O domínio remetente deve ser autenticado no provedor com SPF, DKIM e DMARC.

Recuperação usa token aleatório de uso único. Apenas o hash é persistido, junto
de usuário, expiração, data de consumo e metadados mínimos. A resposta da rota é
igual para contas existentes e inexistentes. Após a troca, sessões anteriores
são invalidadas.

A mensagem usa HTML semântico e inclui o endereço por extenso como alternativa
ao botão. Envio, falha e consumo são auditados sem registrar o token. Limites
por IP e conta reduzem abuso. A entrega ocorre em `waitUntil`, para a resposta
pública não depender da latência do provedor.

O link expira em 20 minutos. Uma nova solicitação invalida links anteriores,
o consumo é atômico e uma troca bem-sucedida encerra todas as sessões abertas.
O frontend usa o mesmo fluxo para aluno e avaliador, pois ambos compartilham a
mesma identidade.

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

