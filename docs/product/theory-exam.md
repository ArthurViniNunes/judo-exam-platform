# Exame teórico — quaisquer faixas

## Estado

Modelo importável entregue como **rascunho**. O conteúdo foi transcrito do
formulário fornecido em 22 de outubro de 2026, mas o gabarito ainda é
provisório e as mídias precisam ser adicionadas antes da publicação.

## Como importar

1. Entre como Super Admin.
2. Abra **Administração → Provas teóricas**.
3. Use **Importar exames teóricos padrão** na lista de templates disponíveis.
4. Abra o caderno criado e revise cada questão.

A importação é bloqueada quando já existe um rascunho da faixa marrom, evitando
duplicação acidental. Versões publicadas ou encerradas não são alteradas. O
mesmo fluxo é reutilizado pelos templates das demais faixas cadastradas.

## Pendências obrigatórias antes de publicar

- conferir e marcar o gabarito correto de todas as questões;
- substituir as explicações provisórias por correções didáticas;
- adicionar imagem ou vídeo nas 14 questões marcadas como
  `Técnicas · mídia pendente`;
- conferir regras de arbitragem que possam ter mudado desde a criação do
  formulário;
- fazer uma tentativa completa com uma conta de aluno de teste.

O editor aceita imagem, áudio, vídeo próprio e YouTube. Quando título, canal ou
outro metadado puder revelar a resposta, deve ser usado um arquivo próprio
sanitizado em vez do player do YouTube.

## Como entregar as mídias pendentes

O cadastro administrativo atual recebe uma URL HTTPS; ele ainda não faz upload
do arquivo. Para preparar as mídias sem ambiguidade, envie os arquivos originais
com este padrão:

```text
<faixa>-q<numero>-<descricao-curta>.<extensao>
verde-q42-ude-hishigi-ashi-gatame.mp4
marrom-q39-uchi-mata-gaeshi.jpg
```

Junto dos arquivos, informe apenas `faixa | número da questão | arquivo`. Se a
mídia veio de um vídeo cujo título ou canal revela a resposta, envie o recorte
sanitizado, não o link do YouTube. Imagens devem ter texto alternativo; vídeos
devem evitar áudio ou quadros que revelem o gabarito sem intenção.

Os arquivos dos cadernos e suas mídias não devem entrar em commits de código sem
revisão explícita. Depois de hospedados em endereço HTTPS, o Super Admin abre a
questão, seleciona o tipo de mídia e cola a URL.

## Questões em grade

Questões de associação aparecem com o selo **Grade · uma resposta** ou
**Grade · múltiplas respostas**. Na administração, use **Ver grade e gabarito**
para conferir cada linha sem abrir o editor. Para o aluno, cada linha é exibida
com suas respostas possíveis e precisa ser preenchida antes de avançar.

A importação cria uma cópia do template no banco. Alterar o template depois não
modifica um rascunho já importado; revise o rascunho existente diretamente ou
exclua-o conscientemente antes de uma nova importação.

## Regra temporária de gabarito

Para viabilizar o fluxo técnico solicitado, a primeira alternativa foi marcada
como correta em cada questão de escolha única. Nas grades, a primeira coluna
foi marcada em cada linha. Essa regra é propositalmente provisória e não
representa o gabarito pedagógico do exame.
