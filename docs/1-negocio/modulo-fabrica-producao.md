# Módulo: Fábrica e Produção

Este módulo é o núcleo transformador da indústria, responsável por gerenciar a conversão de matérias-primas em produtos acabados com controle rigoroso de custos e estoque.

## 1. Ficha Técnica (BOM - Bill of Materials)
A Ficha Técnica é o "DNA" do produto. Ela define a composição exata de cada item fabricado.

- **Rendimento Base:** Quantidade total produzida pela receita (ex: 100 pães ou 50kg de massa).
- **Lista de Insumos:** Associação de cada ingrediente necessário.
- **Quantidade Necessária:** Valor líquido do ingrediente para atingir o Rendimento Base.
- **Perda Percentual:** Margem de segurança para desperdícios inerentes ao processo produtivo.
- **Cálculo de Custo:** `Custo Unitário = Σ (Preço do Insumo * Quantidade com Perda) / Rendimento Base`.

## 2. Ordem de Produção (OP)
Gerencia o fluxo de trabalho na linha de produção.

- **Status Planejada:** A OP foi aberta, mas não iniciada. Permite edição de produto e quantidade.
- **Status Em Execução (Abertura):** 
    - Bloqueia edições.
    - Realiza a **Reserva de Estoque** baseada na Ficha Técnica (Quantidade OP * Proporção da Receita).
- **Status Finalizada:**
    - Efetiva a baixa dos insumos reservados.
    - Registra a entrada do produto acabado no estoque.
    - Consolida o custo real da produção.

## 3. Gestão de Insumos e Produtos
- **Insumos (Tipo 0):** Somente itens marcados como Tipo 0 podem ser usados como ingredientes.
- **Produtos Fabricados (Tipo 1):** Itens que possuem Ficha Técnica e são gerados via OP.
- **Segurança:** Itens com histórico de produção não podem ser excluídos, apenas inativados.