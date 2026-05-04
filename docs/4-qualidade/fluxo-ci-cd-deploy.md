# Fluxo de CI/CD e Deploy

## 1. Containerização
- Docker multi-stage para .NET 10.
- Docker para React (Nginx para servir os arquivos estáticos).

## 2. Orquestração
- Docker Compose para ambiente local incluindo SQL Server.
- Configuração de HealthChecks para garantir que a API só receba tráfego quando o banco estiver pronto.