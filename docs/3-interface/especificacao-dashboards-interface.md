# Especificação do Painel Executivo 360°

## 1. Arquitetura de Navegação (Abas)
O dashboard foi redesenhado para uma arquitetura em abas temáticas, garantindo que a diretoria tenha acesso rápido a diferentes esferas da operação sem poluição visual.

- **Filtros Globais Consolidados:** Ano, Mês, Dia e Cliente.
- As abas disponíveis são renderizadas com base na Role (Admin, Gestor, Operador).

## 2. Aba Geral (Macro Visão)
- **KPIs Principais:** Vendas Totais, Ordens Finalizadas, Produtos em Estoque, Despesas Gerais, Lucro Estimado.
- **Gráfico Principal:** Eficiência da Produção (OEE simplificado) em gráfico circular (donut).
- **Alertas Dinâmicos:** Estoque Crítico (Ruptura) e Entregas Ativas no Dia.

## 3. Aba Vendas
- **KPIs Principais:** Ticket Médio, Total de Pedidos, Faturamento Total.
- **Widgets:** 
  - Vendas por Forma de Pagamento (Bar Chart).
  - Crescimento Dinâmico (Cálculo Automático MoM e YoY).
  - Tabela de Ranking Top Produtos (Quantidade, Faturamento e Lucratividade).

## 4. Aba Produção
- **KPIs Principais:** Lead Time Médio (Horas), Volume Produzido, Eficiência Geral (%).
- **Widgets:**
  - Status das Ordens de Produção (Bar Chart).
  - Meta de Produção Visível.

## 5. Aba Estoque
- **KPIs Principais:** Total em Compras, Valor Total em Estoque, Alertas de Ruptura (Low Stock).

## 6. Aba Logística
- **KPIs Principais:** Frota Total, Entregas Ativas, Custo de Manutenção, Custo Total de Abastecimento.
- **Widgets de Auditoria (Trocas/Avarias):**
  - Índice de Trocas (Ocorrências vs Perda Financeira).
  - Top Produtos com Avarias e Top Clientes com Ocorrências.

## 7. Aba Financeiro
- **KPIs Principais:** Folha de Pagamento, Horas Extras Pagas, Total de Despesas.
- **Widgets:**
  - Maiores Gastos por Categoria (Bar Chart).
  - Lucratividade Estimada (Percentual da Margem e Valor Absoluto).