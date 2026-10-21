# ADR 009 — Portal somente leitura para judoca ou responsável

- Estado: proposta
- Data: 2026-10-21

## Contexto

Judocas devem poder consultar evolução e relatórios sem receber acesso à área
administrativa. Parte do público pode ser menor de idade, e o cadastro atual não
possui e-mail nem vínculo com responsáveis.

## Decisão proposta

Criar uma identidade de portal separada dos papéis administrativos. A conta
possui vínculos revogáveis com um ou mais judocas. Adultos podem usar conta
própria; menores usam a conta de um responsável verificado.

O portal é somente leitura e mostra apenas avaliações liberadas. Convites são
de uso único, expiram e exigem confirmação do e-mail. QR Codes, se usados,
apontam para login ou convite revogável; nunca contêm acesso permanente ao
histórico.

## Alternativas consideradas

- link público por aluno: rejeitado por risco de compartilhamento;
- reutilizar conta de avaliador: rejeitado por ampliar permissões;
- cadastrar e-mail obrigatório de todo aluno desde já: rejeitado até existir
  política clara para menores e consentimento.

## Consequências

- será necessário coletar contato e consentimento de forma explícita;
- autorização deve ser validada em toda rota, não apenas na navegação;
- acessos e downloads entram na auditoria;
- a associação precisa definir retenção, liberação de relatórios e atendimento
  a pedidos de correção ou exclusão.

