# Architecture Decision Records

ADRs registram decisões estruturais relevantes, o contexto existente na data da
decisão e suas consequências. Uma decisão aceita não deve ser reescrita para
refletir o presente; mudanças posteriores recebem um novo ADR que substitui o
anterior.

| ADR | Decisão | Estado |
| --- | --- | --- |
| [001](001-cloudflare-workers-d1.md) | Cloudflare Workers e D1 como plataforma | Aceita |
| [002](002-autenticacao-e-autorizacao.md) | Sessões próprias e RBAC no backend | Aceita |
| [003](003-monolito-modular.md) | Monólito modular por capacidade de negócio | Aceita |
| [004](004-entrega-e-qualidade.md) | CI/CD, testes de domínio e migrações aditivas | Aceita |
| [005](005-catalogo-fixo-exames.md) | Catálogo oficial de exames não configurável | Aceita |
| [006](006-offline-first-sync.md) | Avaliação offline-first e sincronização idempotente | Aceita |
| [007](007-eventos-multiplos-avaliadores.md) | Eventos com múltiplos avaliadores | Aceita e implementada |
| [008](008-revisoes-auditoria.md) | Revisões imutáveis e auditoria | Aceita; implementação incremental |
| [009](009-portal-do-judoca.md) | Portal somente leitura para judoca ou responsável | Proposta |
| [010](010-email-recuperacao.md) | E-mail transacional e recuperação de senha | Proposta |
| [011](011-backup-restauracao.md) | Recuperação D1 e cópias no R2 | Substituída parcialmente pela ADR 014 |
| [012](012-identidade-aluno-e-elegibilidade-teorica.md) | Identidade do aluno e elegibilidade pelo exame teórico | Aceita; implementação incremental |
| [013](013-acesso-de-responsaveis.md) | Acesso delegado de responsáveis | Proposta; decisões pendentes |
| [014](014-backup-backblaze-b2.md) | Backups externos no Backblaze B2 | Aceita; ativação pendente |
| [015](015-midias-teoricas-backblaze-b2.md) | Mídias teóricas em bucket B2 separado | Aceita; ativação pendente |
