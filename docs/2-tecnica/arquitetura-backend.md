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
- `src/Api`: Controladores e Configuração do Host.
- `src/Domain`: Entidades, Enums, Exceções e Interfaces de Repositórios.
- `src/Application`: Casos de Uso (Handlers) e DTOs.
- `src/Infrastructure`: EF Core, Implementações de Repositórios e Serviços Externos.
- `tests`: Testes Unitários e de Integração.    