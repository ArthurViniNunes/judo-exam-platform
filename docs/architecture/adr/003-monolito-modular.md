# ADR 003 — Monólito modular por capacidade de negócio

- Estado: aceita
- Data: 2026-10-17

## Contexto

O backend nasceu em um único arquivo que misturava criptografia, HTTP,
validação, SQL, agregações e roteamento. No frontend, a Administração também
mantinha implementações duplicadas para matrizes e equipe. O volume de tráfego
não justifica serviços distribuídos, mas a estrutura dificultava mudanças
pontuais e revisão de segurança.

## Decisão

Manter um único Worker e um único banco, dividindo o código por capacidade:
autenticação, avaliações, matrizes e usuários. Elementos transversais
ficam em módulos pequenos de contratos, domínio, HTTP e segurança. `index.ts`
apenas compõe e encaminha rotas.

No frontend, componentes permanecem separados por fluxo e regras de pontuação
saem dos componentes para funções puras em `lib/`.

## Alternativas consideradas

- microserviços: rejeitados pelo custo operacional e ausência de necessidade de
  escala ou times independentes;
- framework de rotas: não adotado porque a superfície HTTP ainda é pequena;
- camadas genéricas de repository/service/controller: rejeitadas onde apenas
  repetiriam chamadas sem criar uma fronteira útil.

## Consequências

- cada mudança tende a afetar menos arquivos e responsabilidades;
- regras puras podem ser testadas sem navegador ou D1;
- todos os módulos ainda compartilham deploy e banco, o que é intencional;
- se o roteamento crescer significativamente, a composição atual permite adotar
  um roteador em uma decisão futura sem reescrever o domínio.
