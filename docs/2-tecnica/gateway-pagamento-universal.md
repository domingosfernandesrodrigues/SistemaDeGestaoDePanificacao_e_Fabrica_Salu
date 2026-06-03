# Integração de Gateway de Pagamento

## Visão Geral

O SGP-F implementa um sistema de cobrança **agnóstico de provedor** baseado no padrão **Strategy Pattern**. Qualquer banco ou processador de pagamentos pode ser integrado sem alterar o restante do sistema — basta adicionar uma nova implementação de `IPaymentGateway` e um prefixo de token na `PaymentGatewayFactory`.

---

## Interface Contratual

```csharp
// SGPF.Application.Interfaces
public interface IPaymentGateway
{
    string ProviderName { get; }
    Task<GatewayBillingResult> CriarCobrancaAsync(string token, PedidoVenda pedido, Cliente cliente);
}
```

---

## Provedores Implementados

### 1. `AsaasPaymentGateway`
| Item | Valor |
|------|-------|
| **Prefixo de Token** | *(sem prefixo)* / `$$` / `sandbox:` / `test:` |
| **API Produção** | `https://api.asaas.com/api/v3` |
| **API Sandbox** | `https://sandbox.asaas.com/api/v3` |
| **Autenticação** | Header `access_token` |
| **Fluxo** | Pesquisa/cadastra cliente por CPF/CNPJ → Cria cobrança → Retorna linha digitável ou EMV Pix |
| **Formas** | PIX e BOLETO |

### 2. `MercadoPagoPaymentGateway`
| Item | Valor |
|------|-------|
| **Prefixo de Token** | `mp:` / `mercadopago:` / `APP_USR-` / `TEST-` |
| **API** | `https://api.mercadopago.com/v1/payments` |
| **Autenticação** | `Authorization: Bearer {token}` |
| **Idempotência** | Header `X-Idempotency-Key` (UUID por requisição) |
| **E-mail do Pagador** | Lido de `Empresa.Email` (Configurações da Empresa); fallback: `vendas@sgpf-salu.com.br` |
| **Dependências** | Injeta `IRepository<Empresa>` no construtor |

### 3. `GenericPaymentGateway` (Simulador Offline)
| Item | Valor |
|------|-------|
| **Prefixo de Token** | `generic:` / `mock:` / *(token vazio ou falha)* |
| **Ambiente** | Sem acesso externo |
| **Comportamento** | Gera cobrança fictícia com `BillingType = "OFFLINE"` e dados simulados |
| **Uso** | Desenvolvimento, testes, ambientes sem internet, fallback de resiliência |

---

## Roteamento Automático (`PaymentGatewayFactory`)

```
GatewayToken → Factory.Create(token) → IPaymentGateway
    ├── "mp:" / "mercadopago:" / "APP_USR-" / "TEST-" → MercadoPagoPaymentGateway
    ├── "generic:" / "mock:" / vazio                  → GenericPaymentGateway
    └── qualquer outro / "$$" / "sandbox:"            → AsaasPaymentGateway
```

---

## Fluxo de Cobrança em Vendas

```
POST /api/v1/Vendas  (ou PUT ao atualizar forma de pagamento)
  │
  ├── VendaService busca ContaBancaria padrão (ou da venda)
  │       └── Lê GatewayToken
  │
  ├── PaymentGatewayFactory.Create(token) → IPaymentGateway
  │
  ├── gateway.CriarCobrancaAsync(token, pedido, cliente)
  │       └── Retorna GatewayBillingResult
  │
  └── Persiste resultado no PedidoVenda:
        - LinhaDigitavel / PixCopiaECola / QrCodeBase64
        - ChargeId (ID externo do provedor)
        - ProviderName
```

---

## Webhooks de Confirmação

### Rota Universal
```
POST /api/v1/pagamentos/webhook/gateway
```
Aceita qualquer provedor que envie payload com:
- `externalReference` ou `referenceId`: número do pedido SGPF.
- `status`: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `approved`, `authorized`.

### Rotas de Retrocompatibilidade
```
POST /api/v1/pagamentos/webhook/asaas        → Asaas (campo: externalReference)
POST /api/v1/pagamentos/webhook/mercadopago  → Mercado Pago (campo: data.id)
```

### Fluxo de Processamento do Webhook
```
Webhook recebido
  │
  ├── Identifica pedido pelo referenceId / externalReference
  ├── Atualiza PedidoVenda.Status = "Pago"
  ├── Calcula: ValorLiquido = ValorBruto - Taxa (NetValue / Fee)
  ├── Credita ValorLiquido na ContaBancaria do pedido
  │       └── Fallback: se conta inativa → primeira conta ativa disponível
  ├── Grava DataPagamentoReal (ClientPaymentDate do provedor)
  └── Registra MovimentacaoBancaria com ID de transação externo na descrição
```

---

## DTO de Resultado (`GatewayBillingResult`)

```csharp
public class GatewayBillingResult
{
    public bool Success { get; set; }
    public string BillingType { get; set; }    // "PIX", "BOLETO", "OFFLINE"
    public string? ChargeId { get; set; }      // ID externo no provedor
    public string? LinhaDigitavel { get; set; }
    public string? PixCopiaECola { get; set; }
    public string? QrCodeBase64 { get; set; }
    public string? ErrorMessage { get; set; }
    public string ProviderName { get; set; }
}
```

---

## Configuração do Token (Contas Bancárias)

O campo `GatewayToken` em **Contas Bancárias e Saldos** deve ser preenchido no formato:

| Provedor | Formato do Token |
|----------|-----------------|
| Asaas (Produção) | `$aact_SuaChaveReal...` |
| Asaas (Sandbox) | `sandbox:$aact_SuaChaveTeste...` |
| Mercado Pago (Produção) | `APP_USR-sua-chave...` |
| Mercado Pago (Sandbox) | `TEST-sua-chave-de-teste...` |
| Simulador Offline | `generic:qualquer_valor` |

---

## Como Adicionar um Novo Provedor

1. Criar classe `MeuBancoPaymentGateway : IPaymentGateway` em `SGPF.Application/Services/`.
2. Implementar `CriarCobrancaAsync` e `ProviderName`.
3. Adicionar o prefixo de token e a instanciação correspondente em `PaymentGatewayFactory.cs`.
4. Criar rota de webhook em `PagamentosController.cs` (se o banco exigir rota dedicada).
5. Documentar o prefixo neste arquivo.
