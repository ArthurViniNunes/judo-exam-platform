# ADR 013 — Acesso delegado de responsáveis

- Estado: proposta; decisões do stakeholder pendentes
- Data: 2026-10-24

## Contexto

O portal do judoca já limita a consulta à identidade vinculada à sessão e aos
relatórios liberados pela associação. Para menores ou alunos que dependam de
outra pessoa, falta definir um vínculo delegado sem presumir parentesco, expor
documentos desnecessários ou conceder permissões administrativas.

## Perguntas para decisão

As respostas recomendadas formam um fluxo simples, auditável e de baixo risco.

1. **Quando o responsável será obrigatório?** A regra será por idade definida
   pela associação, por decisão do Super Admin em cada cadastro ou nunca será
   obrigatória? **Recomendação:** o Super Admin marca que o aluno precisa de
   responsável; não inferir somente pela data de nascimento.
2. **Quem inicia o vínculo?** O Super Admin informa o e-mail após conferir a
   situação, o aluno envia um convite ou qualquer responsável pode solicitar?
   **Recomendação:** somente o Super Admin inicia; o destinatário ainda precisa
   aceitar o convite autenticado.
3. **Como a associação confirma que a pessoa pode representar o aluno?** A
   conferência será presencial, por contato já conhecido ou por documento
   enviado ao sistema? **Recomendação:** conferência fora da plataforma e
   registro apenas de quem confirmou, quando e por qual procedimento; não
   armazenar documento pessoal nesta primeira versão.
4. **Quantos vínculos são permitidos?** Um aluno pode ter mais de um responsável
   e uma pessoa pode acompanhar vários alunos? **Recomendação:** sim nos dois
   sentidos, com cada vínculo autorizado e revogável separadamente.
5. **O aluno também pode ter conta própria?** O acesso do responsável substitui
   ou convive com a conta do aluno? **Recomendação:** convive; são identidades e
   sessões distintas, com o mesmo conjunto de relatórios liberados.
6. **O que o responsável pode consultar?** Apenas resultado final, relatório
   completo, PDF, evolução, vídeos de referência e tentativas teóricas? Notas
   internas do avaliador entram? **Recomendação:** o mesmo portal de leitura do
   aluno, somente para relatórios liberados; rascunhos e anotações internas
   permanecem ocultos.
7. **O responsável pode executar alguma ação?** Baixar PDF, pedir correção,
   alterar cadastro ou realizar prova em nome do aluno? **Recomendação:** apenas
   consultar, baixar PDF e abrir uma solicitação de correção; nunca responder
   prova, editar dados ou aceitar termos pelo aluno.
8. **Quem revoga e quando o vínculo termina?** Super Admin, responsável, aluno
   ou encerramento automático por idade/data? **Recomendação:** Super Admin e o
   próprio responsável podem revogar imediatamente; qualquer automação por
   idade só deve existir depois de uma regra formal e data de nascimento
   confiável.
9. **Como funcionam os avisos?** O responsável recebe e-mail a cada relatório
   liberado, apenas no convite ou não recebe notificações? **Recomendação:**
   convite e revogação obrigatórios; aviso de novo relatório configurável.
10. **Uma pessoa pode acumular papéis?** O mesmo e-mail pode ser responsável,
    aluno e avaliador? **Recomendação:** sim; uma identidade, contextos de
    entrada separados e permissões avaliadas no backend.
11. **Qual aceite precisa ser guardado?** Basta registrar o aceite do convite ou
    haverá texto de consentimento próprio da associação? **Recomendação:** texto
    versionado, data, identidade que aceitou, responsável que aprovou o vínculo
    e trilha de auditoria para criação, acesso e revogação.

## Proposta técnica condicionada às respostas

- papel `guardian` na identidade existente, sem criar uma segunda senha quando
  o e-mail já pertence a aluno ou avaliador;
- relação muitos-para-muitos entre responsáveis e alunos, com estado pendente,
  ativo ou revogado;
- convite curto, de uso único e com expiração;
- autorização de cada consulta pelo vínculo ativo e pela liberação do relatório;
- seletor de contexto e de aluno quando uma conta possuir mais de um vínculo;
- auditoria de convite, aceite, consulta sensível, download e revogação;
- nenhuma resposta de prova ou mutação de nota disponível ao responsável.

## Fora do escopo até aprovação

- upload de documentos de identidade, guarda ou filiação;
- reconhecimento automático de parentesco;
- acesso por link público permanente;
- assinatura jurídica ou aceite em nome do aluno;
- encerramento automático do vínculo baseado apenas em idade presumida.

