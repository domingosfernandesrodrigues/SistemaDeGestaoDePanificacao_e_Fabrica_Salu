# Módulo: Logística, Vendas, Compras e Revenda

## 1. Fluxo de Revenda
- **Compra:** Entrada de produtos prontos (terceirizados) no estoque via **Módulo de Compras e Entradas**.
- **Venda:** Saída de produtos via pedidos de clientes.
- **Entrega:** Atribuição de pedidos a veículos da frota própria.

## 2. Módulo de Compras e Entradas (Mercadoria)

### 2.1 Fluxo de Compra
- **Rascunho:** O usuário registra a compra com fornecedor e itens. Não impacta estoque ou financeiro.
- **Confirmada:** Ao confirmar, o sistema automaticamente:
  1. Soma a quantidade ao estoque de cada produto.
  2. Atualiza o Preço de Custo do produto com o valor pago.
  3. Gera uma entrada em **Contas a Pagar**.
- **Regra de Imutabilidade:** Compras Confirmadas não podem ser editadas ou excluídas.

### 2.2 Categorização
- `Mercadoria` — Para Produtos Acabados (fabricados) e Revenda (comprados prontos).
- `Insumo` — Exclusivo para Matéria-Prima. Gerenciado pelo formulário **Entrada de Insumos**.

### 2.3 Interface
- Listagem com colunas: Data, Fornecedor, Resumo de Produtos, Total Itens, Valor Total, Status.
- Linhas expansíveis (Master-Detail) com tabela de itens detalhados (Produto, Qtd, Preço Unit., Subtotal).
- Filtros por: Fornecedor, Produto, Data, Status. Botão de limpeza rápida.
- Paginação com 10 registros por página.
- Responsivo: Tabela (desktop) e Cards (mobile / iPhone 14 Pro Max).

## 3. Módulo de Entrada de Insumos (Matéria-Prima)
- Formulário dedicado exclusivamente para compras de insumos (Farinha, Ovos, Açúcar, etc.).
- Lista apenas produtos do tipo `Insumo` no formulário.
- Mesmo fluxo Rascunho → Confirmada do módulo de Compras.
- Identidade visual laranja para diferenciação do módulo de Mercadorias.
- Acessível via menu lateral: **"Entrada de Insumos"**.

## 4. Gestão de Trocas e Avarias
- **Registro:** Identificação de itens vencidos ou danificados no cliente.
- **Regra de Negócio:** Entrada do item avariado (perda) e saída imediata de um novo.
- **Financeiro:** A troca não gera nova cobrança, mas deve abater o lucro no relatório de DRE.

## 5. Gestão de Frota
- **Manutenção:** Registro de manutenções Corretivas, Preventivas e Preditivas.
- **Abastecimento:** Controle de consumo e KM para cálculo de eficiência.
