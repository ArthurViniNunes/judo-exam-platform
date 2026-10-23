# ADR 009 — Portal somente leitura para judoca ou responsável

- Estado: aceita e implementada para conta própria do judoca
- Data: 2026-10-22

## Contexto

Judocas devem poder consultar evolução e relatórios sem receber acesso à área
administrativa. Parte do público pode ser menor de idade, e o cadastro atual não
possui e-mail nem vínculo com responsáveis.

## Decisão

Usar a identidade única já criada para o aluno. Uma mesma pessoa pode possuir
o contexto de aluno e também um papel profissional; a entrada escolhida no
login determina qual superfície será aberta, sem duplicar cadastro ou senha.
Toda consulta do portal é autorizada no backend pelo vínculo da sessão.

O portal é somente leitura e mostra apenas a revisão vigente das avaliações
explicitamente liberadas pelo Super Admin. Corrigir uma avaliação recolhe o
relatório anterior; a nova revisão precisa ser conferida e liberada novamente.
Exclusão lógica ou recolhimento removem imediatamente o relatório do portal.

O vínculo de responsáveis por menores não é presumido. Ele permanece como uma
extensão futura porque exige regra de consentimento e prova de representação
definidas pela associação.

## Alternativas consideradas

- link público por aluno: rejeitado por risco de compartilhamento;
- criar outra conta quando o aluno também é avaliador: rejeitado por duplicar
  identidade; os contextos continuam separados por autorização;
- cadastrar e-mail obrigatório de todo aluno desde já: rejeitado até existir
  política clara para menores e consentimento.

## Consequências

- o portal do próprio judoca não cria permissão administrativa;
- autorização deve ser validada em toda rota, não apenas na navegação;
- relatórios só aparecem depois de liberação administrativa explícita;
- o vínculo de responsáveis exigirá uma ADR complementar antes de ser criado;
- a associação precisa definir retenção, liberação de relatórios e atendimento
  a pedidos de correção ou exclusão.

