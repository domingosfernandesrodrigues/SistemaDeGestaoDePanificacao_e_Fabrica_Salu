# Guia Operacional - Fábrica e Produção

## 1. Gestão de Fichas Técnicas
- Como cadastrar a "receita" do polvilho associando insumos.

## 2. Fluxo de Ordem de Produção (OP)
- Passo 1: Abrir OP e conferir reserva de insumos.
- Passo 2: Reportar produção final.
- Passo 3: Conferir entrada automática no estoque de produtos acabados.

# Guia Operacional - Portal do Cliente

## 1. Acesso e Cadastro
- Clientes devem se cadastrar inserindo dados básicos da empresa.
- O administrador deve aprovar o cadastro antes que o cliente possa fazer pedidos.

## 2. Criação de Pedidos
- O cliente acessa o "Portal do Cliente" e navega pelo catálogo.
- O carrinho é adicionado em modo "Rascunho" até o envio.
- **Importante:** Todos os pedidos criados via portal iniciam com status "Pendente_Aprovacao" e devem ser validados internamente.

## 3. Configurações do Cliente
- Clientes podem ter suas próprias tabelas de preços (Atacado/Varejo).
- Configurar se o cliente é Ativo (pode comprar) ou Inativo.

# Guia Operacional - Controle de Qualidade e Inspeção

## 1. Inspeção de Produtos Acabados
- **Responsável:** Supervisor ou Fiscal de Qualidade.
- **Quando:** Ao finalizar uma Ordem de Produção.
- **Ação:** O supervisor deve acessar a área de "Qualidade", visualizar os lotes recém-produzidos e realizar a inspeção.
- **Status:**
  - **Aprovado:** O lote é liberado para venda.
  - **Reprovado:** O lote é bloqueado. O sistema deve sugerir ajustes na produção (Ficha Técnica ou Processo) para evitar recorrência.

## 2. Registros de Validade
- A data de validade deve ser registrada no ato da produção (ou na inspeção final).
- O sistema deve gerar alertas automáticos quando a validade estiver próxima (ex: 10 dias antes do vencimento).

# Guia Operacional - Logística, Frota e Entregas

## 1. Planejamento de Rotas
- O responsável pela logística deve planejar as entregas diárias.
- É possível atribuir múltiplos pedidos a uma única rota.
- **Veículos:** O sistema deve informar a capacidade de carga do veículo para evitar sobrecarga.

## 2. Controle de Veículos
- **Manutenção Preventiva:** Deve ser agendada automaticamente com base na quilometragem (KM) ou tempo.
- **Manutenção Corretiva:** Deve ser registrada imediatamente quando o veículo apresentar problemas.
- **Status:** O status do veículo (Disponível, Em Manutenção, Em Rota) deve ser atualizado em tempo real.

## 3. Abastecimento e KM
- O motorista deve registrar os litros abastecidos e a quilometragem atual.
- O sistema calcula o consumo médio (KM/Litro) para identificar veículos com problemas de eficiência.

# Guia Operacional - RH e Gestão de Pessoas

## 1. Cadastro de Funcionários
- Registrar dados pessoais, cargo e salário base.
- Definir jornada de trabalho padrão e percentual de hora extra (ex: 50%).

## 2. Controle de Ponto e Frequência
- Funcionários registram entrada e saída via dispositivo.
- O sistema calcula horas trabalhadas e horas extras automaticamente.

## 3. Processamento da Folha de Pagamento
- Fechamento mensal calcula salários, descontos e extras.
- **Adiantamentos:** Funcionários podem solicitar adiantamentos, que são descontados automaticamente no fechamento da folha.
- O sistema gera demonstrativos de pagamento e relatórios de custo para a gestão.

# Guia Operacional - Financeiro e Contabilidade

## 1. Contas a Pagar e Receber
- O sistema gera automaticamente contas a pagar com base em: compras de insumos, manutenções e folha de pagamento.
- Contas a receber são geradas automaticamente a partir das vendas aprovadas.

## 2. Fluxo de Caixa
- **Visão Diária:** Acompanhamento de entradas e saídas previstas para o dia.
- **Visão Mensal:** Projeção e controle do saldo final do mês.
- **Regra:** O saldo do fluxo de caixa deve ser o ponto de partida para o planejamento de investimentos e pagamentos.

## 3. Relatório DRE (Demonstrativo de Resultados)
- **Cálculo:** (Receita Bruta - Impostos - Custos de Produção - Despesas Operacionais) = Lucro Líquido.
- **Importância:** Ajuda a identificar quais produtos ou processos estão gerando mais lucro ou prejuízo.    