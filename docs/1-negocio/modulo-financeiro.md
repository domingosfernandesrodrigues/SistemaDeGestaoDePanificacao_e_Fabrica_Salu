# Módulo: Financeiro e Fluxo de Caixa

## 1. Contas a Pagar e Receber
- **Gestão Descentralizada:** O módulo de "Despesas Gerais" é exclusivo para custos fixos/operacionais (aluguel, água, luz). 
- Pagamentos atrelados a operações de terceiros possuem seu próprio checkout financeiro descentralizado:
  - **Compras e Insumos:** Pagos diretamente nas telas de Compras / Entrada de Insumos (botão "Pagar/Liquidar" gerado após confirmação do estoque).
  - **Folha de Pagamento:** Liquidada diretamente no módulo de RH.
- **Conciliação Automática:** Ao baixar uma conta (descentralizada ou via despesa geral), o sistema localiza a fatura oculta e debita/credita automaticamente o `SaldoAtual` da `ContaBancaria` padrão.

## 2. Contas Bancárias e Saldos (`ContaBancaria`)
Entidade central para gestão de saldos e configurações de recebimento.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `Id` | Guid | Identificador único |
| `Nome` | string | Nome da conta (ex: "Banco do Brasil") |
| `Tipo` | int | 0=Outros, 1=Corrente, 2=Poupança, 3=Investimento |
| `SaldoInicial` | decimal | Saldo no momento da implantação do sistema |
| `SaldoAtual` | decimal | Saldo atualizado automaticamente via conciliação |
| `Ativa` | bool | Se a conta está em uso (sem exclusão física) |
| `IsPadrao` | bool | Define a conta padrão para recebimentos (única ativa) |
| `PixChave` | string? | Chave Pix para geração de QR Code |
| `BancoNome` | string? | Nome do banco para Boleto |
| `Agencia` | string? | Agência bancária |
| `NumeroConta` | string? | Número da conta |
| `GatewayToken` | string? | Token de API para integração com gateway de pagamento |

### Regras de Negócio
- Apenas uma conta pode ser marcada como `IsPadrao` por vez — o sistema desmarca automaticamente as demais.
- Contas não podem ser excluídas, apenas inativadas (`Ativa = false`).
- O `SaldoAtual` é atualizado automaticamente nos seguintes eventos:
  - **Baixa de ContaReceber** → crédito no saldo da conta padrão
  - **Baixa de ContaPagar** → débito no saldo da conta padrão
  - **Toggle de Pagamento de Venda** → crédita/reverte na conta padrão
  - **Movimentação Manual** → entrada ou saída avulsa via endpoint `/movimentar`

### Histórico de Movimentações Bancárias (`MovimentacaoBancaria`)
Entidade que registra todo o fluxo histórico de entrada e saída financeira vinculada às contas, servindo de extrato cronológico e base para fluxos de caixa e DRE.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `Id` | Guid | Identificador único da transação |
| `ContaBancariaId` | Guid | Chave estrangeira ligada à conta bancária de origem/destino |
| `Tipo` | string | Tipo do lançamento: "entrada" ou "saida" |
| `Valor` | decimal | Valor financeiro com precisão decimal configurada (18,2) |
| `Descricao` | string | Detalhes do lançamento (ex: "Baixa de Conta a Receber", "Sangria manual") |
| `DataMovimentacao` | DateTime | Data e hora em UTC em que a transação ocorreu |
| `Origem` | int (Enum) | Mapeamento técnico da origem da transação: 0=Manual, 1=BaixaPagar, 2=BaixaReceber, 3=Venda, 4=FrotaAbastecimento, 5=FrotaManutencao, 6=AberturaConta |
| `ReferenciaId` | Guid? | ID opcional para referência cruzada com tabelas de vendas, frotas ou despesas gerais |

### Lógica de Cálculo de Saldos Retroativos
Para reconstruir o saldo histórico com exatidão no final de qualquer período passado selecionado, o sistema executa um **algoritmo de cálculo reverso**:
- Partindo do `SaldoAtual` real consolidado hoje, o sistema subtrai/soma as receitas, despesas e lançamentos futuros posteriores à data limite selecionada:
  $$\text{SaldoPeriodo} = \text{SaldoAtual} - \text{EntradasFuturas} + \text{SaidasFuturas}$$
- Se a conta bancária foi aberta (`DataAbertura`) após a data limite do período selecionado, seu saldo é automaticamente retornado como zero, indicando que a conta ainda não existia naquela data.

## 3. Configurações de Pagamento (Pix / Boleto)
- Os dados de Pix e Boleto (chave, banco, agência) são gerenciados exclusivamente pela entidade `ContaBancaria`.
- A conta marcada como `IsPadrao` é utilizada automaticamente nos Documentos de Pagamento do módulo de Vendas.
- Os campos de pagamento foram **removidos** da entidade `Empresa` para evitar duplicidade.

## 4. Fluxo de Caixa
- `SaldoEmCaixa` no Dashboard/Financeiro é calculado como a soma de `SaldoAtual` de todas as `ContasBancarias` ativas.
- Visão diária e mensal de entradas (ContasReceber) e saídas (ContasPagar).

## 5. Demonstrativo de Resultados (DRE)
- Cálculo: Receita Bruta - Custos de Produção/Revenda - Despesas Operacionais (RH/Logística/Avarias) = Lucro Líquido.

## 6. Métricas Financeiras Chave
- **Margem Bruta**: (Lucro Bruto / Receita Total) × 100
- **Ponto de Equilíbrio**: Volume necessário para cobrir todos os custos fixos e variáveis.
- **Ticket Médio**: Valor médio gasto por cliente por venda.

## 7. Endpoints da API (`/api/v1/ContasBancarias`)
| Método | Rota | Função |
|--------|------|--------|
| GET | `/` | Lista todas as contas |
| GET | `/{id}` | Busca conta por ID |
| POST | `/` | Cria nova conta |
| PUT | `/{id}` | Atualiza conta |
| DELETE | `/{id}` | Exclui conta (sem soft-delete, usar `Ativa=false`) |
| POST | `/{id}/movimentar` | Lança entrada ou saída manual no saldo |
| GET | `/extrato` | Obtém extrato consolidado do período filtrado por data e origem com paginação (O(1) HashSet lookup) |
| GET | `/saldos-periodo` | Calcula os saldos históricos retroativos por agrupamento SQL nativo via `SumAsync` e `GroupBy` |

**Autorizações:** `Admin`, `Gestor`