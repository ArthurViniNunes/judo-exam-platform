# ADR 008 — Revisões imutáveis, exclusão lógica e auditoria

- Estado: aceita; revisões e exclusão lógica implementadas
- Data: 2026-10-21

## Contexto

Notas podem ser lançadas incorretamente e hoje uma avaliação pode ser excluída.
Para manter confiança no histórico, uma correção precisa informar o que mudou,
quem alterou e por quê. Auditoria também é necessária para convites, vínculos de
alunos, eventos, restaurações e mudanças administrativas.

## Decisão

Tratar a avaliação original como imutável. Correções criam revisões ordenadas,
com valores anteriores e novos, autor, data e motivo. Consultas comuns retornam
a revisão vigente; Super Admins podem consultar a linha do tempo completa.

Cada revisão recebe um novo identificador, aponta para a versão imediatamente
anterior por `supersedes_id` e compartilha a raiz em `revision_root_id`. O
registro preserva a data original do exame; `corrected_at` identifica quando a
correção ocorreu. Painéis, perfil do judoca e métricas consideram somente a
revisão vigente não excluída.

Excluir pela interface passa a arquivar o registro. Restaurar e remover
fisicamente são ações distintas. `audit_events` registra ações relevantes com
tipo, entidade, ator, instante, `requestId` e metadados mínimos.

Senhas, tokens, hashes e conteúdo pessoal desnecessário nunca são copiados para
o log. Eventos de auditoria não podem ser alterados pela interface.

## Alternativas consideradas

- sobrescrever a linha existente: rejeitada por apagar contexto;
- guardar somente logs textuais: rejeitada porque não reconstrói revisões;
- manter exclusão física imediata: rejeitada para uso cotidiano, mas continua
  possível em procedimento administrativo de retenção.

## Consequências

- aumenta o volume de dados, ainda pequeno para o uso previsto;
- relatórios precisam indicar quando existe correção;
- permissões e prazo de correção tornam-se regra de negócio;
- pedidos legais de exclusão exigem processo específico que trate cópias e
  auditoria conforme a política definida pela associação.

