# Plano de Testes

## Tipos de Testes
1. **Unitários:** xUnit e NSubstitute para regras de cálculo de folha e custos.
2. **Integração:** Testes de persistência real no banco de dados utilizando `Testcontainers` com imagem do SQL Server no Docker.
3. **Aceitação:** Validação de fluxo de Ordem de Produção (Início -> Fim).
4. **E2E (End-to-End):** Validação de fluxo completo do usuário (login, criação de pedido, checkout, etc.). 