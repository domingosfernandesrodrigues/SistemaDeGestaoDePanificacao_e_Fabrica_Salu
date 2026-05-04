# Mensuração de Valor e Precificação (Valuation)

## 1. Modelo de Negócio
O SGP-F foi concebido para operar preferencialmente como **SaaS (Software as a Service)**, focado no nicho de indústrias de panificação e fábricas de derivados de mandioca/polvilho.

### Sugestão de Faixas de Preço (Assinatura Mensal):
- **Plano Startup:** Até 3 usuários e 1 veículo. (R$ 450,00/mês)
- **Plano Business:** Até 10 usuários e 5 veículos + Módulo RH completo. (R$ 850,00/mês)
- **Plano Enterprise:** Usuários ilimitados, frota completa e Dashboards BI customizados. (A partir de R$ 1.500,00/mês)

## 2. Diferenciais Competitivos (Drivers de Valor)
Para fins de venda do software ou da empresa, os seguintes pontos elevam o valor do ativo:
- **Verticalização Total:** Integração nativa entre a fábrica (produção química/física) e a logística/venda, algo raro em ERPs genéricos.
- **Precisão de Margem:** O cálculo de custo que une Insumos + Mão de Obra (RH) + Logística permite ao dono da fábrica saber o lucro real por quilo de polvilho.
- **Tecnologia de Ponta:** Desenvolvido em .NET 10 e React 19, garantindo uma vida útil tecnológica de pelo menos 5 a 8 anos sem necessidade de refatoração pesada.

## Valor Agregado: Portal do Cliente
- **Redução de Custo Operacional:** Clientes lançam seus próprios pedidos, diminuindo a carga de trabalho do setor comercial interno.
- **Stickiness (Retenção):** Clientes que utilizam o portal têm menor taxa de cancelamento devido à facilidade de reposição de estoque.
- **Escalabilidade:** Permite ao SGP-F atuar como uma plataforma de vendas B2B, aumentando o Valuation anual (ARR Multiplier) para o patamar de 5x a 7x o faturamento anual.

## 3. Estimativa de Valuation (Ativo de Software)
O valor de mercado de uma empresa de software (SaaS) é geralmente calculado com base no **ARR (Annual Recurring Revenue)**:
- **Cenário Conservador:** 2x a 3x o faturamento anual.
- **Cenário de Alto Crescimento:** 5x a 8x o faturamento anual, caso o índice de cancelamento (Churn) seja inferior a 5%.

## 4. Indicadores para Investidores
A IA deve monitorar e preparar dados para os seguintes indicadores de venda:
- **CAC (Custo de Aquisição de Cliente):** Quanto custa converter uma nova padaria/fábrica.
- **LTV (Lifetime Value):** Quanto de receita o cliente traz ao longo de todo o tempo que usa o sistema.
- **Margem de Contribuição:** Lucro gerado por cada contrato após descontar os custos de infraestrutura cloud.

---
**Objetivo deste Documento:** Servir de base para a criação de relatórios de saúde financeira do próprio software, visando uma futura venda ou entrada de sócios investidores.

# Tabela de Férias - Simulação Anual

Esta tabela é utilizada para simular o impacto financeiro das férias de todos os funcionários ao longo de um ano civil.

## 2025

| Nome do Funcionário | Função | Período de Férias | Salário Base Mensal | Custo Total Férias (30 dias) | Observações |
| :--- | :--- | :--- | :--- | :--- | :--- |
| João Santos | Auxiliar de Padaria | 01/03 a 30/03/2025 | R$ 1.800,00 | R$ 2.340,00 | Inclui 1/3 Constitucional |
| Maria Oliveira | Padeiro | 05/04 a 04/05/2025 | R$ 2.500,00 | R$ 3.250,00 | Inclui 1/3 Constitucional |
| Carlos Silva | Auxiliar de Limpeza | 10/04 a 09/05/2025 | R$ 1.600,00 | R$ 2.080,00 | Inclui 1/3 Constitucional |
| Ana Costa | Confeiteira | 15/05 a 14/06/2025 | R$ 2.800,00 | R$ 3.640,00 | Inclui 1/3 Constitucional |
| Pedro Santos | Motorista | 01/06 a 30/06/2025 | R$ 2.200,00 | R$ 2.860,00 | Inclui 1/3 Constitucional |
| Sofia Oliveira | Assistente Administrativo | 01/07 a 30/07/2025 | R$ 2.000,00 | R$ 2.600,00 | Inclui 1/3 Constitucional |
| Lucas Costa | Encarregado de Produção | 01/08 a 30/08/2025 | R$ 3.200,00 | R$ 4.160,00 | Inclui 1/3 Constitucional |
| Mariana Silva | Caixa | 01/09 a 30/09/2025 | R$ 1.800,00 | R$ 2.340,00 | Inclui 1/3 Constitucional |
| Rafael Oliveira | Auxiliar de Padaria | 01/10 a 30/10/2025 | R$ 1.800,00 | R$ 2.340,00 | Inclui 1/3 Constitucional |
| Beatriz Costa | Confeiteira | 01/11 a 30/11/2025 | R$ 2.800,00 | R$ 3.640,00 | Inclui 1/3 Constitucional |
| Tiago Santos | Motorista | 01/12 a 30/12/2025 | R$ 2.200,00 | R$ 2.860,00 | Inclui 1/3 Constitucional |
| Laura Oliveira | Assistente Administrativo | 15/12/2025 a 13/01/2026 | R$ 2.000,00 | R$ 2.600,00 | Início em 2025, fim em 2026 |
| **Total 2025** | | | | **R$ 34.260,00** | |

### Observações Importantes sobre o Custo de Férias:

1.  **Base de Cálculo:** O custo total inclui o **Salário Base** mais o **1/3 Constitucional** (férias proporcionais ou integrais). A fórmula é: `Custo = Salário * 1.3333` (aproximadamente).
2.  **Recolhimentos:** Este valor **NÃO** inclui os encargos sociais (FGTS, INSS) sobre o pagamento de férias, que devem ser calculados separadamente na folha de pagamento.
3.  **Provisão:** Para o cálculo de fluxo de caixa futuro, recomenda-se provisionar mensalmente 1/12 do valor total de férias (R$ 2.855,00 por mês em 2025), independentemente de quando as férias serão gozadas.
4.  **Ano Calendário vs. Ano Fiscal:** Note que a funcionária Laura Oliveira tem férias que iniciam em dezembro de 2025 e terminam em janeiro de 2026. Para o ano calendário 2025, considera-se apenas o valor proporcional ao período de gozo dentro do ano. Para o ano fiscal, o valor integral deve ser contabilizado no exercício correspondente.   

---

## 2026

| Nome do Funcionário | Função | Período de Férias | Salário Base Mensal | Custo Total Férias (30 dias) | Observações |
| :--- | :--- | :--- | :--- | :--- | :--- |
| João Santos | Auxiliar de Padaria | 01/02 a 02/03/2026 | R$ 2.000,00 | R$ 2.666,67 | Inclui 1/3 Constitucional |
| Maria Oliveira | Padeiro | 05/04 a 04/05/2026 | R$ 2.800,00 | R$ 3.733,33 | Inclui 1/3 Constitucional |
| Carlos Silva | Auxiliar de Limpeza | 01/05 a 30/05/2026 | R$ 1.800,00 | R$ 2.400,00 | Inclui 1/3 Constitucional |
| Ana Costa | Confeiteira | 15/06 a 14/07/2026 | R$ 3.200,00 | R$ 4.266,67 | Inclui 1/3 Constitucional |
| Pedro Santos | Motorista | 01/07 a 30/07/2026 | R$ 2.400,00 | R$ 3.200,00 | Inclui 1/3 Constitucional |
| Sofia Oliveira | Assistente Administrativo | 01/08 a 30/08/2026 | R$ 2.200,00 | R$ 2.933,33 | Inclui 1/3 Constitucional |
| Lucas Costa | Encarregado de Produção | 01/09 a 30/09/2026 | R$ 3.600,00 | R$ 4.800,00 | Inclui 1/3 Constitucional |
| Mariana Silva | Caixa | 01/10 a 30/10/2026 | R$ 2.000,00 | R$ 2.666,67 | Inclui 1/3 Constitucional |
| Rafael Oliveira | Auxiliar de Padaria | 01/11 a 30/11/2026 | R$ 2.000,00 | R$ 2.666,67 | Inclui 1/3 Constitucional |
| Beatriz Costa | Confeiteira | 01/12 a 30/12/2026 | R$ 3.200,00 | R$ 4.266,67 | Inclui 1/3 Constitucional |
| Tiago Santos | Motorista | 15/12/2026 a 13/01/2027 | R$ 2.400,00 | R$ 3.200,00 | Início em 2026, fim em 2027 |
| Laura Oliveira | Assistente Administrativo | 15/12/2026 a 13/01/2027 | R$ 2.200,00 | R$ 2.933,33 | Início em 2026, fim em 2027 |
| **Total 2026** | | | | **R$ 39.133,34** | |

### Observações Importantes sobre o Custo de Férias:

1.  **Base de Cálculo:** O custo total inclui o **Salário Base** mais o **1/3 Constitucional** (férias proporcionais ou integrais). A fórmula é: `Custo = Salário * 1.3333` (aproximadamente).
2.  **Recolhimentos:** Este valor **NÃO** inclui os encargos sociais (FGTS, INSS) sobre o pagamento de férias, que devem ser calculados separadamente na folha de pagamento.
3.  **Provisão:** Para o cálculo de fluxo de caixa futuro, recomenda-se provisionar mensalmente 1/12 do valor total de férias (R$ 3.261,11 por mês em 2026), independentemente de quando as férias serão gozadas.
4.  **Ano Calendário vs. Ano Fiscal:** Note que Tiago Santos e Laura Oliveira têm férias que iniciam em dezembro de 2026 e terminam em janeiro de 2027. Para o ano calendário 2026, considera-se apenas o valor proporcional ao período de gozo dentro do ano. Para o ano fiscal, o valor integral deve ser contabilizado no exercício correspondente.

### Análise Comparativa 2025 vs. 2026:

| Indicador | 2025 | 2026 | Variação |
| :--- | :--- | :--- | :--- |
| Total de Funcionários | 12 | 12 | 0% |
| Custo Total de Férias | R$ 34.260,00 | R$ 39.133,34 | +14,26% |
| Salário Médio Mensal | R$ 2.245,83 | R$ 2.525,00 | +12,43% |
| Ticket Médio de Férias (por funcionário) | R$ 2.855,00 | R$ 3.261,11 | +14,23% |

**Causas da Variação:**
- Aumento salarial de 12,43% em média entre 2025 e 2026, refletido diretamente no custo de férias.
- Aumento do ticket médio de férias acompanha o aumento salarial, mantendo a consistência do custo por funcionário.
- A composição das férias (meses de início e fim) foi distribuída de forma similar entre os dois anos, sem distorções significativas no cálculo anual.

---

**Objetivo deste Documento:** Servir de base para a criação de relatórios de saúde financeira do próprio software, visando uma futura venda ou entrada de sócios investidores.                                                                                              