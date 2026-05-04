# Contratos de API e Padronização

## Padrões de Endpoint
- Seguir padrão RESTful: `GET /api/v1/produtos`, `POST /api/v1/ordens-producao`.
- Retornos padronizados com `Result<T>` (Sucesso/Erro).

## Documentação
- Swagger/OpenAPI habilitado em ambiente de desenvolvimento.
- Todos os DTOs devem ser documentados com XML Comments para facilitar o entendimento da IA.


# Contratos de API (Atualizados para Controle de Acesso)

## Rotas de Clientes (Isolamento Total)
- `GET /api/v1/clientes/me`: Endpoint para o cliente buscar **apenas seus próprios dados**.
- `GET /api/v1/clientes/me/pedidos`: Endpoint para o cliente buscar seu histórico de pedidos.
- **Regra de Isolamento:** Nenhuma rota de listagem (`GET /api/v1/clientes`) deve expor dados de outros clientes. O acesso deve ser filtrado estritamente pelo `ClienteId` do usuário logado.
- **Pedidos de Terceiros:** O endpoint de criação de pedidos (`POST /api/v1/pedidos`) deve aceitar um `ClienteId` no corpo da requisição. O sistema deve validar se o usuário solicitante tem permissão (é o próprio cliente ou é Admin/Funcionário).   