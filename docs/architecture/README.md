# Arquitetura da Plataforma de Exames de Judô

Este documento apresenta a visão técnica atual do sistema. As decisões que
explicam por que a arquitetura chegou a este formato estão no
[índice de ADRs](adr/README.md); os procedimentos operacionais ficam no
[runbook](../operations/runbook.md).

## Objetivos arquiteturais

- funcionar bem no celular durante um exame, inclusive em redes instáveis;
- manter frontend e API publicáveis de forma independente;
- preservar autoria, isolamento e histórico das avaliações por avaliador;
- concentrar regras de pontuação em funções puras, testáveis e sem dependência
  da interface;
- operar com baixo custo usando serviços gerenciados da Cloudflare;
- permitir evolução incremental sem introduzir um framework interno.

## Contexto e contêineres

```mermaid
C4Context
  title Contexto da Plataforma de Exames
  Person(evaluator, "Avaliador", "Aplica exames e acompanha seus alunos")
  Person(admin, "Super Admin", "Gerencia avaliadores e possui visão global")
  System(platform, "Plataforma de Exames", "Avaliações técnicas, kata e administração")
  System_Ext(forms, "Google Forms", "Exames teóricos oficiais")
  System_Ext(youtube, "YouTube", "Vídeos de referência das técnicas")

  Rel(evaluator, platform, "Usa pelo navegador")
  Rel(admin, platform, "Administra pelo navegador")
  Rel(platform, forms, "Abre formulário externo")
  Rel(platform, youtube, "Incorpora vídeo com youtube-nocookie.com")
```

```mermaid
C4Container
  title Contêineres de execução
  Person(user, "Usuário autenticado")
  Container(frontend, "Frontend estático", "Next.js / React", "Interface, fluxo dos exames e regras puras de pontuação")
  Container(api, "API", "Cloudflare Worker", "Autenticação, autorização, validação e persistência")
  ContainerDb(db, "Banco", "Cloudflare D1", "Usuários, sessões, alunos e avaliações")

  Rel(user, frontend, "HTTPS")
  Rel(frontend, api, "JSON/HTTPS + Bearer token")
  Rel(api, db, "Binding D1")
```

## Limites de código

```text
app/                         composição da aplicação Next.js
components/                  apresentação e fluxos por área
  admin-*                    administração
  technical-exam.tsx         avaliação prática
  kata-exam.tsx              avaliação de kata
lib/                         domínio executado no navegador e contratos da API
  practical-exams.ts         catálogo, seleção automática e vídeos
  practical-scoring.ts       regra de aprovação da prática
  kata-exams.ts              catálogo e pontuação de kata
backend/src/                 módulos do Worker
  index.ts                   composição e roteamento HTTP
  auth.ts                    casos de uso de autenticação e perfil
  security.ts                senha, sessão e autenticação da requisição
  evaluations.ts             consultas e escrita de avaliações
  users.ts                   equipe e convites
  domain.ts                  validações e transformações puras
  http.ts                    respostas, CORS e autorização comum
  contracts.ts               tipos internos do backend
tests/                       regressões das regras de negócio
```

As dependências devem apontar da interface para `lib`, e do entrypoint do Worker
para os módulos de caso de uso. Arquivos de domínio não importam React, Next.js
ou componentes. Acesso a D1 acontece apenas no backend.

## Fluxo de uma avaliação prática

```mermaid
sequenceDiagram
  actor A as Avaliador
  participant UI as Frontend
  participant D as Domínio de pontuação
  participant API as Worker API
  participant DB as D1

  A->>UI: Escolhe aluno e faixa
  UI->>UI: Monta o exame e seleciona técnicas anteriores
  A->>UI: Avalia cada técnica
  UI->>D: calculatePracticalResult(exam, scores)
  D-->>UI: Nota, categorias e resultado
  UI->>API: POST /api/evaluations
  API->>API: Autentica, valida e associa avaliador
  API->>DB: Cria/associa aluno e grava avaliação
  DB-->>API: Registro persistido
  API-->>UI: 201 + avaliação
```

## Modelo de dados principal

```mermaid
erDiagram
  USERS ||--o{ SESSIONS : possui
  USERS ||--o{ EVALUATIONS : aplica
  STUDENTS ||--o{ EVALUATIONS : recebe

  USERS {
    text id PK
    text email UK
    text role
    text status
  }
  EVALUATIONS {
    text id PK
    text evaluator_id FK
    text student_id FK
    text type
    integer score
  }
```

## Invariantes

- o backend deriva o avaliador da sessão; o cliente não escolhe a autoria;
- um avaliador comum só consulta as próprias avaliações;
- apenas o Super Admin convida e gerencia usuários;
- IDs de avaliações são idempotentes por avaliador;
- a nota persistida usa a escala inteira de 0 a 100; a interface exibe 0 a 10;
- kata não participa do indicador de aprovação de exames técnicos;
- erro grave de kata divide a nota geral por dois uma única vez;
- seleções automáticas não repetem uma técnica fixa na mesma categoria;
- o catálogo de técnicas e as regras de aprovação não são configuráveis pela interface;
- sequências de Renraku-Henka usam a média das avaliações de seus movimentos.

## Qualidade e observabilidade

`pnpm test` protege regras de aprovação, kata, seleção automática e agregações
administrativas. `pnpm typecheck`, `pnpm lint` e `pnpm build` são barreiras de
entrega. O Worker registra falhas em JSON e habilita logs e traces com amostragem
de 10% para traces.

## Riscos conhecidos

- o token de sessão fica no `localStorage` porque frontend e API são Workers
  separados; uma origem única permitiria migrar para cookie `HttpOnly`;
- nomes ainda funcionam como fallback de identidade para registros históricos;
- a interface calcula o resultado antes da persistência; uma falha de rede deve
  permanecer visível ao avaliador em uma evolução futura com fila local;
- rate limiting de autenticação e política formal de retenção ainda são ações
  operacionais pendentes.
