# Módulo: Financeiro e Fluxo de Caixa

## 1. Contas a Pagar e Receber
- **Gestão Descentralizada:** O módulo de "Despesas Gerais" é exclusivo para custos fixos/operacionais (aluguel, água, luz, energia, manutenção, etc.).
- Pagamentos atrelados a operações de terceiros possuem seu próprio checkout financeiro descentralizado:
  - **Compras e Insumos:** Pagos diretamente nas telas de Compras / Entrada de Insumos (botão "Pagar/Liquidar" gerado após confirmação do estoque).
  - **Folha de Pagamento:** Liquidada diretamente no módulo de RH.
- **Conciliação Automática:** Ao baixar uma conta (descentralizada ou via despesa geral), o sistema localiza a fatura oculta e debita/credita automaticamente o `SaldoAtual` da `ContaBancaria` padrão.

### Fluxo de Pagamento do Controle de Despesas
O formulário **Controle de Despesas** suporta um fluxo completo de ciclo de vida do pagamento:

| Ação | Comportamento |
|------|---------------|
| **Criar como Pendente** | Despesa salva com `Status = Pendente`. Sem débito no banco. |
| **Criar como Paga** | Despesa criada, `BaixarContaPagarAsync` é chamado automaticamente: debita o valor da conta bancária padrão e registra movimentação no extrato. |
| **Botão "✓" (Baixa rápida)** | Rota `POST /api/v1/Financeiro/pagar/{id}/baixa`. Transição `Pendente → Pago`: debita no banco e registra no extrato. |
| **Editar valor/descrição (já Pago)** | Calcula a diferença (`novoValor - valorAntigo`) e aplica o ajuste incremental no saldo bancário. O registro do extrato existente é **atualizado** com o novo valor e a nova descrição. |
| **Editar status: Pago → Pendente** | Estorno: credita o **valor original pago** (não o novo valor editado) de volta na conta bancária e insere nova entrada de "Estorno" no extrato. |
| **Excluir despesa Paga** | Estorna automaticamente o valor na conta bancária e registra movimentação de entrada de estorno. |


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
| `GatewayToken` | string? | Token de API para integração com gateway de pagamento (suporta múltiplos provedores — veja seção Gateway Universal) |

### Regras de Negócio
- Apenas uma conta pode ser marcada como `IsPadrao` por vez — o sistema desmarca automaticamente as demais.
- Contas não podem ser excluídas, apenas inativadas (`Ativa = false`).
- O `SaldoAtual` é atualizado automaticamente nos seguintes eventos:
  - **Baixa de ContaReceber** → crédito no saldo da conta padrão
  - **Baixa de ContaPagar** → débito no saldo da conta padrão
  - **Toggle de Pagamento de Venda** → crédita/reverte na conta padrão
  - **Movimentação Manual** → entrada ou saída avulsa via endpoint `/movimentar`

### Histórico de Movimentações Bancárias (`MovimentacaoBancaria`)
Entidade que registra todo o fluxo histórico de entrada e saída financeira vinculada às contas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `Id` | Guid | Identificador único da transação |
| `ContaBancariaId` | Guid | Chave estrangeira ligada à conta bancária de origem/destino |
| `Tipo` | string | Tipo do lançamento: "entrada" ou "saida" |
| `Valor` | decimal | Valor financeiro com precisão decimal configurada (18,2) |
| `Descricao` | string | Detalhes do lançamento |
| `DataMovimentacao` | DateTime | Data e hora em UTC em que a transação ocorreu |
| `Origem` | int (Enum) | 0=Manual, 1=BaixaPagar, 2=BaixaReceber, 3=Venda, 4=FrotaAbastecimento, 5=FrotaManutencao, 6=AberturaConta |
| `ReferenciaId` | Guid? | ID opcional para referência cruzada com tabelas de vendas, frotas ou despesas gerais |

### Lógica de Cálculo de Saldos Retroativos
Para reconstruir o saldo histórico com exatidão no final de qualquer período passado:
$$\text{SaldoPeriodo} = \text{SaldoAtual} - \text{EntradasFuturas} + \text{SaidasFuturas}$$

## 3. Gateway de Pagamento Universal

O sistema adota uma arquitetura de **Strategy Pattern** para suporte a múltiplos provedores de pagamento. O provedor é selecionado automaticamente com base no formato do `GatewayToken` da conta bancária padrão.

### Arquitetura (Strategy Pattern)

```
IPaymentGateway (interface)
├── AsaasPaymentGateway       → Token padrão / sem prefixo / $$ / sandbox:
├── MercadoPagoPaymentGateway → Prefixo: mp:, mercadopago:, APP_USR-, TEST-
└── GenericPaymentGateway     → Prefixo: generic:, mock:  (simulador offline)
```

A classe `PaymentGatewayFactory` recebe o token e instancia o provedor correto automaticamente.

### Roteamento por Prefixo de Token

| Prefixo do Token | Provedor Ativado | Ambiente |
|-----------------|------------------|----------|
| *(sem prefixo)* | Asaas | Produção |
| `sandbox:` / `test:` / `$$` | Asaas | Sandbox |
| `mp:` / `mercadopago:` / `APP_USR-` | Mercado Pago | Produção |
| `TEST-` | Mercado Pago | Sandbox |
| `generic:` / `mock:` | Simulador Offline | N/A |
| *(em branco ou falha)* | Fallback Offline | N/A |

### Mercado Pago — Detalhes de Integração
- **API:** `https://api.mercadopago.com/v1/payments`
- **Autenticação:** Bearer Token no header `Authorization`.
- **Idempotência:** Header `X-Idempotency-Key` com UUID único por requisição.
- **E-mail do Pagador:** Lido dinamicamente do campo `Email` da entidade `Empresa` (Configurações da Empresa). Fallback: `vendas@sgpf-salu.com.br`.
- **Webhook:** `POST /api/v1/pagamentos/webhook/mercadopago` escuta eventos `payment` e processa `approved`, `authorized` como confirmação de pagamento.

### Asaas — Detalhes de Integração
- **API Produção:** `https://api.asaas.com/api/v3`
- **API Sandbox:** `https://sandbox.asaas.com/api/v3`
- **Autenticação:** Header `access_token` com o token cadastrado.
- **Fluxo:** Pesquisa/cadastro de cliente por CPF/CNPJ → Criação de cobrança → Retorno de linha digitável (Boleto) ou payload EMV (Pix).
- **Webhook:** `POST /api/v1/pagamentos/webhook/asaas` (retrocompatível) ou `/webhook/gateway`.

### Webhook Universal
- **Rota:** `POST /api/v1/pagamentos/webhook/gateway`
- **Retrocompatibilidade:** A rota `/webhook/asaas` continua funcional.
- **Comportamento:** Identifica o pedido via `externalReference`, altera status para "Pago", deduz tarifa (`NetValue`) e credita o valor líquido na conta bancária correspondente.
- **Resiliência:** Se a conta do pedido estiver inativa, o crédito é redirecionado para a primeira conta bancária ativa disponível.

### DTO de Resultado (`GatewayBillingResult`)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `Success` | bool | Indica se a cobrança foi criada com sucesso |
| `BillingType` | string | "PIX", "BOLETO", "OFFLINE" |
| `ChargeId` | string? | ID da cobrança no gateway |
| `LinhaDigitavel` | string? | Linha digitável do boleto |
| `PixCopiaECola` | string? | Payload EMV do Pix |
| `QrCodeBase64` | string? | QR Code em base64 (quando disponível) |
| `ErrorMessage` | string? | Mensagem de erro, se houver |
| `ProviderName` | string | Nome do provedor utilizado |

## 4. Configurações de Pagamento (Pix / Boleto)
- Os dados de Pix e Boleto são gerenciados exclusivamente pela entidade `ContaBancaria`.
- A conta marcada como `IsPadrao` é utilizada automaticamente nos documentos de pagamento do módulo de Vendas.
- Os campos de pagamento foram **removidos** da entidade `Empresa` para evitar duplicidade.

## 5. Fluxo de Caixa
- `SaldoEmCaixa` no Dashboard é calculado como a soma de `SaldoAtual` de todas as `ContasBancarias` ativas.
- Visão diária e mensal de entradas (ContasReceber) e saídas (ContasPagar).

## 6. Demonstrativo de Resultados (DRE)
- Cálculo: Receita Bruta - Custos de Produção/Revenda - Despesas Operacionais (RH/Logística/Avarias) = Lucro Líquido.

## 7. Métricas Financeiras Chave
- **Margem Bruta**: (Lucro Bruto / Receita Total) × 100
- **Ponto de Equilíbrio**: Volume necessário para cobrir todos os custos fixos e variáveis.
- **Ticket Médio**: Valor médio gasto por cliente por venda.

## 8. Endpoints da API (`/api/v1/ContasBancarias`)
| Método | Rota | Função |
|--------|------|--------|
| GET | `/` | Lista todas as contas |
| GET | `/{id}` | Busca conta por ID |
| POST | `/` | Cria nova conta |
| PUT | `/{id}` | Atualiza conta |
| DELETE | `/{id}` | Exclui conta (sem soft-delete, usar `Ativa=false`) |
| POST | `/{id}/movimentar` | Lança entrada ou saída manual no saldo |
| GET | `/extrato` | Obtém extrato consolidado do período filtrado |
| GET | `/saldos-periodo` | Calcula os saldos históricos retroativos |

## 9. Endpoints de Gateway e Webhooks (`/api/v1/Pagamentos`)
| Método | Rota | Função |
|--------|------|--------|
| POST | `/webhook/gateway` | Webhook universal para qualquer provedor |
| POST | `/webhook/asaas` | Webhook Asaas (retrocompatível) |
| POST | `/webhook/mercadopago` | Webhook exclusivo Mercado Pago |

**Autorizações:** `Admin`, `Gestor` (exceto webhooks públicos, que validam assinatura/segredo do provedor).