# Arquitetura Backend

## Stack
- **Runtime:** .NET 10 (C#)
- **Padrão:** Domain Driven Design (DDD)
- **Camadas:** Domain, Application, Infrastructure, WebApi

## Princípios
- SOLID e Clean Code.
- Repository Pattern e Unit of Work.
- Injeção de Dependência nativa do .NET.
- Strategy Pattern para provedores de pagamento.

## Diretórios do Projeto

### `SGPF.WebApi` — Camada de Apresentação
Hospeda controladores REST, middlewares de autenticação, inicializadores de patches e trabalhadores de segundo plano.

| Arquivo / Classe | Responsabilidade |
|-----------------|-----------------|
| `PagamentosController.cs` | Webhook universal `/api/v1/pagamentos/webhook/gateway` (retrocompatível com `/webhook/asaas`); escuta eventos de recebimento, deduz tarifas (`NetValue`), grava data real de pagamento do cliente (`ClientPaymentDate`) |
| `VendasController.cs` | Orquestra criação de pedidos, cobrança via `PaymentGatewayFactory` e proteção do endpoint de webhook com `[Authorize(Roles = "Admin,Gestor")]` |
| `LancamentosAlimentacaoController.cs` | CRUD de refeições com isolamento por perfil: Admin/Gestor vêem tudo; Operador/Motorista vêem apenas os próprios lançamentos via `FuncionarioId` do token JWT |
| `DbPatchesInitializer.cs` | Desacopla a inicialização do banco de dados do `Program.cs`; gerencia migrações SQL e auto-migração de senhas para BCrypt na inicialização |
| `LogRetentionService.cs` | `BackgroundService` para rotação, limpeza e arquivamento diário de logs de auditoria |

### `SGPF.Application` — Camada de Aplicação
Contém casos de uso, interfaces e serviços de negócio.

| Arquivo / Classe | Responsabilidade |
|-----------------|-----------------|
| `VendaService.cs` | Orquestra a conciliação financeira de vendas; integra com `PaymentGatewayFactory` para geração de cobranças; fallback resiliente para contas bancárias inativas |
| `PaymentGatewayFactory.cs` | **Strategy Factory** — seleciona o provedor de pagamento com base no prefixo do `GatewayToken`; instancia `AsaasPaymentGateway`, `MercadoPagoPaymentGateway` ou `GenericPaymentGateway` |
| `AsaasPaymentGateway.cs` | Implementação `IPaymentGateway` para o provedor Asaas; pesquisa/cadastra clientes por CPF/CNPJ; suporta Sandbox e Produção |
| `MercadoPagoPaymentGateway.cs` | Implementação `IPaymentGateway` para o Mercado Pago; injeta `IRepository<Empresa>` para buscar o e-mail corporativo em **Configurações da Empresa**; usa `X-Idempotency-Key` por requisição |
| `GenericPaymentGateway.cs` | Simulador offline — gera cobranças fictícias sem acesso externo; ativado por prefixo `generic:` / `mock:` ou qualquer falha de gateway |
| `FolhaPagamentoService.cs` | Cálculo de folha CLT (proventos, descontos, HE 50/100%, adicional noturno, 13º salário, férias); lógica de turno noturno legada removida |

### `SGPF.Domain` — Camada de Domínio
Entidades centrais, Enums, Exceções de negócio e interfaces de repositórios.

Entidades principais: `Cliente`, `Funcionario`, `PedidoVenda`, `ContaBancaria`, `MovimentacaoBancaria`, `LancamentoAlimentacao`, `Empresa`, `Folha`.

### `SGPF.Infrastructure` — Camada de Persistência
Camada de persistência física (EF Core, mapeamentos, `AppDbContext`, SQL Server).

### `SGPF.Tests` — Testes
Testes unitários e de integração (padrão AAA — Arrange, Act, Assert).

---

## Padrão de Gateway de Pagamento (Strategy)

```
IPaymentGateway
    ├── CriarCobrancaAsync(token, pedido, cliente) → GatewayBillingResult
    └── ProviderName → string

PaymentGatewayFactory.Create(token, empresaRepo)
    ├── token starts with "mp:" / "APP_USR-" / "TEST-" → MercadoPagoPaymentGateway(empresaRepo)
    ├── token starts with "generic:" / "mock:"        → GenericPaymentGateway()
    └── default / "$$" / "sandbox:"                   → AsaasPaymentGateway()
```

**Adição de novo provedor:** Basta implementar `IPaymentGateway` e adicionar o prefixo correspondente na `PaymentGatewayFactory`. Zero impacto no restante do sistema.

---

## Segurança

- **JWT + BCrypt (12 salt rounds):** Autenticação e senhas.
- **Auto-migrador de senhas:** Detecta e converte senhas em texto plano no boot.
- **Wipe de backdoors:** `DbCompareController`, `DebugController` e `check_db` removidos fisicamente.
- **`[Authorize]` em todos os controllers:** Todos os endpoints protegidos por role. Exceções documentadas (webhooks públicos validam segredos de provedor).

---

## Integrações e Serviços Externos
O sistema adota **Resiliência Adaptativa** para serviços externos:
- **Outbound (Gateways):** HTTP Client com chaves dinâmicas lidas da `ContaBancaria` padrão.
- **Fallback de Gateway:** Se API externa falhar ou token estiver vazio → `GenericPaymentGateway` (offline) é ativado automaticamente.
- **Inbound (Webhooks):** `PagamentosController` desacoplado de provedores específicos, aceita qualquer payload de gateway via rota universal.