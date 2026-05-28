# Arquitetura Backend

## Stack
- **Runtime:** .NET 10 (C#)
- **Padrão:** Domain Driven Design (DDD)
- **Camadas:** Domain, Application, Infrastructure, WebApi.

## Princípios
- SOLID e Clean Code.
- Repository Pattern e Unit of Work.
- Injeção de Dependência nativa.

## Diretórios do Projeto
- **WebApi (`SGPF.WebApi`):** Hospeda os controladores REST (`Controllers/`), as rotas de API, middlewares de autenticação, inicializadores de patches e trabalhadores de segundo plano.
  - *Destaques:*
    - `PagamentosController.cs` implementa o Webhook universal `/api/v1/pagamentos/webhook/gateway` (com suporte retrocompatível para `/webhook/asaas`) que escuta eventos de recebimento, gerencia dedução de tarifas (`NetValue` vs `Valor Bruto`), e data e hora exatas de faturamento de forma assíncrona.
    - `DbPatchesInitializer.cs` desacopla a inicialização do banco de dados do `Program.cs`, gerenciando migrações SQL cruas e a migração automática de senhas para BCrypt na inicialização.
    - `LogRetentionService` implementa um `BackgroundService` hospedado para rotação, limpeza e arquivamento diário de logs de auditoria.
- **Application (`SGPF.Application`):** Contém casos de uso, interfaces e serviços de negócio.
  - *Destaque:* `VendaService.cs` gerencia a orquestração financeira de conciliação. Em caso de contas bancárias ausentes ou inativas, executa um fallback resiliente direcionando o crédito automático do faturamento para a primeira conta ativa encontrada na base de dados.
- **Domain (`SGPF.Domain`):** Entidades centrais do domínio (`Cliente`, `PedidoVenda`, `ContaBancaria`, `MovimentacaoBancaria`), Enums, Exceções de negócio e interfaces de repositórios.
- **Infrastructure (`SGPF.Infrastructure`):** Camada de persistência física (EF Core, mapeamentos, contextos).
- **Tests (`SGPF.Tests`):** Testes unitários e de integração (AAA - Arrange, Act, Assert).

## Integrações e Serviços Externos
O sistema adota um padrão de **Resiliência Adaptativa** para serviços externos:
- **Orquestração Outbound (Asaas & Gateways):** Comunicação por HTTP Client seguro com chaves dinâmicas lidas da tabela de Contas Bancárias.
- **Resiliência de Gateway & Conciliação:** Processamento flexível capaz de registrar dados adicionais de transação (taxas, datas reais de processamento de clientes) e fallback ágil para contas ativas para que nenhuma notificação de conciliação de venda seja perdida.
- **Automated Webhooks (Inbound):** Controlador de webhook universal desacoplado de processadores específicos, pronto para qualquer gateway padrão B2B.    