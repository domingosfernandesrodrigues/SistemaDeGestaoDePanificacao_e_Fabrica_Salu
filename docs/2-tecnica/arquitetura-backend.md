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
- **WebApi (`SGPF.WebApi`):** Hospeda os controladores REST (`Controllers/`), as rotas de API, os middleware de autenticação e os Webhooks públicos de integração.
  - *Destaque:* `PagamentosController.cs` implementa o Webhook público `[AllowAnonymous]` `/api/v1/pagamentos/webhook/asaas` para capturar eventos de pagamento do Asaas em tempo real.
- **Application (`SGPF.Application`):** Contém os casos de uso, interfaces e serviços de negócio.
  - *Destaque:* `VendaService.cs` implementa a orquestração de pedidos, incluindo o cálculo dinâmico de DV de Boletos, sanitização de chaves Pix e a integração de chamadas HTTP externas para o gateway de pagamentos Asaas.
- **Domain (`SGPF.Domain`):** Entidades centrais do domínio (`Cliente`, `PedidoVenda`, `ContaBancaria`, `MovimentacaoBancaria`), Enums, Exceções de negócio e interfaces dos repositórios.
- **Infrastructure (`SGPF.Infrastructure`):** Camada de persistência (EF Core, mapeamentos, contextos) e acesso físico a dados.
- **Tests (`SGPF.Tests`):** Testes unitários e de integração organizados pelo padrão AAA (Arrange, Act, Assert).

## Integrações e Serviços Externos
O sistema adota um padrão de **Resiliência Adaptativa** para serviços externos:
- **Orquestração Outbound (Asaas API):** Comunica-se por HTTP Client nativo com autenticação por token seguro cadastrado dinamicamente no banco de dados. Suporta múltiplos ambientes através de mapeamento de prefixos.
- **Fallback Transparent:** Em caso de erros de rede, chaves de teste ou ausência de tokens, a aplicação ativa simuladores determinísticos locais que calculam e renderizam dados de pagamento scaneáveis equivalentes.
- **Automated Webhooks (Inbound):** Expõe endpoints assíncronos desacoplados para recepção de notificações externas que executam alterações de estado de domínio em transações atômicas de banco de dados.    