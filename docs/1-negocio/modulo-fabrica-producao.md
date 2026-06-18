# Módulo: Fábrica e Produção

Este módulo é o núcleo transformador da indústria, responsável por gerenciar a conversão de matérias-primas em produtos acabados com controle rigoroso de custos e estoque.

## 1. Ficha Técnica (BOM - Bill of Materials)
A Ficha Técnica é o "DNA" do produto. Ela define a composição exata de cada item fabricado.

- **Rendimento Base:** Quantidade total produzida pela receita (ex: 100 pães ou 50kg de massa).
- **Lista de Insumos:** Associação de cada ingrediente necessário.
- **Quantidade Necessária:** Valor líquido do ingrediente para atingir o Rendimento Base.
- **Perda Percentual:** Margem de segurança para desperdícios inerentes ao processo produtivo.
- **Cálculo de Custo:** `Custo Unitário = Σ (Preço do Insumo * Quantidade com Perda) / Rendimento Base`.

### 1.1 Conversão Dinâmica de Unidades de Medida (UoM)
Para dar maior flexibilidade no cadastro de receitas, o sistema suporta o uso de sub-unidades nas Fichas Técnicas.
- **Unidades Compatíveis:**
  - **Massa:** Conversões bidirecionais entre `Kg` e `g` (fator `1000`).
  - **Volume:** Conversões bidirecionais entre `L` e `ml` (fator `1000`).
  - **Unidade:** Medida discreta `Un` (sem conversão de escala).
- **Conversão Automática de Estoque:** Ao planejar uma OP, o sistema converte a quantidade do insumo da unidade da receita (ex: `g` ou `ml`) para a unidade base de estoque (ex: `Kg` ou `L`) usando a classe utilitária `UnitConverter`. Isso impede erros de cálculo de preço de custo e falsas sinalizações de estoque insuficiente.
- **Simulação em Tempo Real:** No frontend, o custo estimado da Ficha Técnica é calculado em tempo real convertendo as quantidades digitadas na unidade da receita para a unidade base do insumo cadastrada.

## 2. Ordem de Produção (OP)
Gerencia o fluxo de trabalho na linha de produção.

- **Status Planejada (Criação/Edição):**
    - Permite edição do produto e da quantidade.
    - **Validação de Estoque Projetado:** Só é possível criar ou alterar uma OP para o status `Planejada` se houver insumos físicos disponíveis suficientes em estoque. O cálculo deduz as necessidades de insumos exigidas por *outras* OPs que também estejam no status `Planejada` ou `Em Execução` (evitando que o mesmo estoque de insumos seja comprometido para múltiplos planejamentos simultâneos). Se o estoque projetado for insuficiente para cobrir a ficha técnica da OP, a gravação é impedida e um erro de validação é exibido.
- **Status Em Execução (Abertura):** 
    - Bloqueia edições na OP.
    - Realiza a **Reserva de Estoque** física baseada na Ficha Técnica (Quantidade OP * Proporção da Receita).
- **Status Finalizada:**
    - Efetiva a baixa física definitiva dos insumos que estavam reservados.
    - Registra a entrada física do produto acabado no estoque.
    - Consolida o custo real da produção.
    - **Prevenção de Custos Zerados (Fallback):** Caso a lista de insumos consumidos reais seja submetida vazia ou nula pelo operador na tela de finalização, o backend automaticamente preenche o consumo real igualando-o ao planejado, garantindo que o custo de produção do lote não zere e ocorra a devida movimentação de inventário.

## 3. Gestão de Insumos e Produtos
- **Insumos (Tipo 0):** Somente itens marcados como Tipo 0 podem ser usados como ingredientes.
- **Produtos Fabricados (Tipo 1):** Itens que possuem Ficha Técnica e são gerados via OP.
- **Segurança:** Itens com histórico de produção não podem ser excluídos, apenas inativados.