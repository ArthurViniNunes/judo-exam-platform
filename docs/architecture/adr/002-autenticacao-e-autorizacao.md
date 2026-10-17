# ADR 002 — Sessões próprias e RBAC no backend

- Estado: aceita
- Data: 2026-10-17

## Contexto

Somente avaliadores autorizados podem usar o sistema. Cada avaliador deve acessar
seus próprios alunos, enquanto o Super Admin possui visão global e gerencia a
equipe. A autoria de uma avaliação não pode depender de um nome enviado pelo
navegador.

## Decisão

O Super Admin autoriza e-mails previamente. O usuário conclui o cadastro com
senha, armazenada como derivação PBKDF2 com salt individual. O login cria um
token aleatório; apenas o hash do token é persistido. A cada requisição, a API
resolve usuário e papel pela sessão e aplica autorização no backend.

As sessões expiram em sete dias. O frontend guarda o Bearer token no
`localStorage`, pois frontend e API estão em origens independentes.

## Alternativas consideradas

- um avaliador fixo no código: rejeitado por não representar autoria ou escopo;
- autenticação apenas na interface: rejeitada por não proteger a API;
- provedor externo de identidade: válido no futuro, mas excessivo para a equipe
  pequena e o fluxo de convites atual;
- cookies `HttpOnly`: preferíveis contra leitura por JavaScript, porém exigem
  estratégia de mesma origem ou cookies cross-site cuidadosamente configurados.

## Consequências

- toda gravação usa o usuário autenticado como avaliador;
- desativar um usuário bloqueia suas sessões nas próximas requisições;
- o Super Admin não pode desativar a própria conta pela API;
- a proteção contra XSS é crítica enquanto o token estiver no `localStorage`;
- rate limiting do login continua necessário como camada de produção.
