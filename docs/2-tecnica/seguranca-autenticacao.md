# Segurança e Autenticação

## Tecnologia
- **Mecanismo:** JSON Web Token (JWT).
- **Algoritmo:** HMAC SHA256.

## Níveis de Acesso (Roles)
- **Admin:** Acesso total ao sistema.
- **Gestor_Producao:** Acesso à Fábrica e Estoque.
- **Gestor_RH:** Acesso à Folha e Funcionários.
- **Operador:** Acesso a Vendas e Entregas (Nível Geral).
- **Motorista:** Acesso restrito apenas às suas próprias entregas, frota e logística atribuída.
- **Cliente:** Acesso restrito apenas aos seus próprios dados e pedidos.

## Políticas
- **Refresh Token:** Para manter sessões seguras e mitigar interceptações de credenciais.
- **Criptografia Estrita (BCrypt):** Uso obrigatório do algoritmo BCrypt (com custo de 12 salt rounds) no serviço `AuthService.cs` para todas as validações de login e redefinições de senha. Qualquer fallback inseguro de comparação em texto simples foi purgado do sistema.
- **Auto-Migrador de Senhas em Segundo Plano:** No boot do backend (`DbPatchesInitializer.cs`), um processo de auditoria transparente analisa a tabela `Usuarios`. Caso existam senhas antigas armazenadas em texto simples, o sistema computa o hash seguro via BCrypt e atualiza o registro na base de dados de forma completamente invisível ao usuário final.
- **Wipe Definitivo de Backdoors:** Remoção física de todos os endpoints inseguros e scripts de desenvolvimento (`DbCompareController`, `DebugController`, `check_db`). Acesso aos controllers restrito rigorosamente pelo atributo `[Authorize]` e respectivas roles.

## Políticas de Isolamento (Multi-tenancy Lite)
- Todo endpoint de cliente deve validar se o `ClienteId` do recurso solicitado pertence ao `UsuarioId` autenticado no token JWT.
- Todo endpoint de logística deve validar o `MotoristaId` contra o `FuncionarioId` presente no token JWT quando o perfil for `Motorista`.

## Claims Personalizadas
- `FuncionarioId`: Armazena o GUID do funcionário vinculado ao usuário. Essencial para isolamento de dados do perfil `Motorista`.
- `ClienteId`: Armazena o GUID do cliente vinculado (para portal B2B).

# Módulo: Gestão de Estoque e Auditoria

## 1. Regras de Entrada (Recebimento)
- Ao receber matéria-prima ou produto, o sistema deve registrar a entrada no estoque.
- **Validação:** O fornecedor deve estar cadastrado e ativo.
- O item recebido deve ser inspecionado (Físico ou Químico) conforme padrões de qualidade.

## 2. Regras de Saída (Consumo/Venda)
- A saída de itens deve ser justificada (OP de produção ou Venda);
- Para produtos químicos, o sistema deve alertar sobre a necessidade de Equipamento de Proteção Individual (EPI).

## 3. Auditoria (Logs)
- Todas as movimentações de estoque (Entrada, Saída, Transferência, Ajuste) devem ser registradas em uma tabela de log com:
  - Data/Hora
  - Usuário Responsável
  - Item
  - Quantidade
  - Tipo de Movimentação

## 4. Controle de Estoque e Validade
- **Controle de Lote:** Todos os produtos de fabricação interna devem ter controle de lote e validade.
- **Regra de Validação:** O sistema deve impedir a saída (baixa) de produtos vencidos, permitindo apenas ajustes manuais justificados pelo gestor.
- **Notificação:** Alertar sobre produtos próximos ao vencimento (ex: vencimento em menos de 7 dias).

# Módulo: Controle de Acesso

## Hierarquia de Permissões (Ordem de Prioridade)
O sistema deve respeitar a seguinte ordem de prioridade ao conceder acesso: `Cliente` > `Funcionário` > `Gestor` > `Admin`.

### 1. Cliente
- **Origem:** Tabela `Clientes` (FK em `Usuarios.ClienteId`).
- **Acesso:** **Visual/Apenas Consulta**.
- **Regra de Ouro:** Um usuário com perfil `Cliente` **NÃO PODE** visualizar ou editar dados de outros clientes. O `ClienteId` no token deve ser o único filtro de isolamento.
- **Exceção (Pedido de Troca):** Clientes podem criar registros de `Devolucao` ou `Troca`, mas a ação final (aprovação e saída de produto) deve ser processada por um usuário `Funcionario` ou `Admin`.

### 2. Funcionário
- **Origem:** Tabela `Funcionarios`.
- **Acesso:** **Operacional**.
- Pode executar tarefas de produção, estoque e logística (incluindo aprovação de pedidos de troca).    

### 3. Gestor (Produção / RH / Logística)
- **Origem:** Tabela `Funcionarios` ( FK `GestorId` apontando para si mesmo ou tabela `Gestores`).
- **Acesso:** **Gerencial**.
- Pode aprovar Ordens de Produção, acessar relatórios financeiros (DRE), gerenciar frota e visualizar todas as operações do seu respectivo departamento.

### 4. Admin
- **Origem:** Tabela `Usuarios` (Coluna `IsAdmin = true`).
- **Acesso:** **Total**.
- Pode gerenciar usuários, alterar permissões e acessar todos os módulos do sistema.      