# Regras de interface do projeto

Estas regras são obrigatórias para toda criação ou alteração de interface neste repositório.

## Mobile-first

- Comece o layout pela largura de 320 px e pelo uso com uma mão.
- A ação principal e os controles frequentes devem ter área de toque mínima de 44 x 44 px.
- Não dependa de `hover`; toda ação precisa funcionar por toque e teclado.
- Evite rolagem horizontal. Textos longos devem quebrar sem encobrir ações.
- Só depois do celular, adapte progressivamente para tablet e desktop.

## Tema claro e escuro

- Todo componente novo deve nascer com os dois temas na mesma alteração.
- Use as variáveis existentes sempre que possível. Quando houver cores fixas, adicione também o equivalente sob `.dark`.
- O tema escuro deve preservar hierarquia, contraste, estados de foco, seleção, erro e aprovação; não basta inverter cores.
- Modais, menus, campos, estados vazios, barras fixas e animações também precisam dos dois temas.
- Respeite `prefers-color-scheme` na primeira visita e a escolha salva pelo usuário nas visitas seguintes.

## Adaptação por dispositivo

- Celular: uma coluna, conteúdo prioritário primeiro e navegação alcançável pelo polegar.
- Tablet: aproveite duas colunas quando a leitura continuar confortável, sem reduzir alvos de toque.
- Desktop: limite a largura de leitura e use o espaço extra para navegação ou contexto, não para esticar cards.
- Verifique pelo menos 360 px, 768 px e 1280 px antes de concluir uma alteração visual.

## Acessibilidade e validação

- Mantenha foco visível, HTML semântico, nomes acessíveis e suporte a teclado.
- Respeite `prefers-reduced-motion`.
- Antes de concluir, execute `pnpm typecheck`, `pnpm lint` e `pnpm build`.
