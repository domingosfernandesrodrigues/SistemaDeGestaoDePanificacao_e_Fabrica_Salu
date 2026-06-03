# Segurança e Autenticação

## Tecnologia
- **Mecanismo:** JSON Web Token (JWT).
- **Algoritmo:** HMAC SHA256.
- **Hash de Senhas:** BCrypt com 12 salt rounds (via `BCrypt.Net-Next`).

## Níveis de Acesso (Roles)

| Role | Descrição |
|------|-----------|
| `Admin` | Acesso total ao sistema. Pode gerenciar usuários, permissões e todos os módulos. |
| `Gestor` | Acesso gerencial. Aprova OPs, acessa DRE, gerencia frota e seu departamento. |
| `Gestor_Producao` | Acesso à Fábrica e Estoque. |
| `Gestor_RH` | Acesso à Folha e Funcionários. |
| `Operador` | Acesso operacional a Vendas e Entregas; em Alimentação vê e lança apenas os próprios registros. |
| `Motorista` | Acesso restrito às suas próprias entregas, frota e logística; em Alimentação vê e lança apenas os próprios registros. |
| `Cliente` | Acesso restrito aos próprios dados e pedidos (portal B2B). |

## Políticas

### Criptografia Estrita (BCrypt)
- Uso obrigatório de BCrypt (12 salt rounds) em `AuthService.cs` para todas as validações de login e redefinições de senha.
- Qualquer fallback inseguro de comparação em texto simples foi **purgado** definitivamente do sistema.

### Auto-Migrador de Senhas em Segundo Plano
No boot do backend, `DbPatchesInitializer.cs` executa um processo de auditoria transparente:
- Analisa a tabela `Usuarios`.
- Detecta senhas armazenadas em texto simples (legado).
- Computa o hash seguro via BCrypt e atualiza o registro de forma invisível ao usuário.

### Wipe Definitivo de Backdoors de Desenvolvimento
- **Removidos fisicamente:** `DbCompareController.cs`, `DebugController.cs`, `check_db.cs`.
- Todos os controllers protegidos com `[Authorize]` e respectivas roles.
- O endpoint `WebhookConfirmarPagamento` em `VendasController.cs` é protegido com `[Authorize(Roles = "Admin,Gestor")]`.

### Refresh Token
- Sessões seguras com Refresh Token para mitigar interceptações de credenciais.

## Claims Personalizadas

| Claim | Descrição |
|-------|-----------|
| `FuncionarioId` | GUID do funcionário vinculado ao usuário. Essencial para isolamento de dados em perfis `Operador`, `Motorista` e `Gestor_RH`. |
| `ClienteId` | GUID do cliente vinculado (para portal B2B). |

## Políticas de Isolamento (Multi-tenancy Lite)

### Por Módulo

| Módulo | Regra de Isolamento |
|--------|---------------------|
| **Portal B2B** | `ClienteId` do token deve corresponder ao recurso solicitado. |
| **Logística** | `MotoristaId` no endpoint deve corresponder ao `FuncionarioId` do token quando perfil for `Motorista`. |
| **Lançamento de Alimentação** | Admin/Gestor: sem filtro. Operador/Motorista: filtrado pelo `FuncionarioId` do token. |
| **Contracheques (`MeusContracheques`)** | O valor líquido (`SalarioLiquido`) só é exibido/retornado quando o status da folha for `Liberado`; outros status retornam o campo mascarado. |

## Módulo: Contracheques — Regra de Exibição

- **Endpoint:** `GET /api/v1/Contracheques/meus`
- **Regra:** O campo `SalarioLiquido` (ou qualquer valor financeiro detalhado) só é visível quando `Folha.Status == "Liberado"`.
- **Frontend:** A tela "Meus Contracheques" exibe `"—"` ou `"Aguardando Liberação"` para folhas com status `Pendente`, `EmProcessamento` ou `Cancelado`.

---

# Módulo: Gestão de Estoque e Auditoria

## 1. Regras de Entrada (Recebimento)
- Ao receber matéria-prima ou produto, o sistema registra a entrada no estoque.
- **Validação:** O fornecedor deve estar cadastrado e ativo.
- O item recebido deve ser inspecionado (Físico ou Químico) conforme padrões de qualidade.

## 2. Regras de Saída (Consumo/Venda)
- A saída de itens deve ser justificada (OP de produção ou Venda).
- Para produtos químicos, o sistema deve alertar sobre a necessidade de EPI.

## 3. Auditoria (Logs)
Todas as movimentações de estoque devem ser registradas com:
- Data/Hora | Usuário Responsável | Item | Quantidade | Tipo de Movimentação

## 4. Controle de Estoque e Validade
- **Controle de Lote:** Produtos de fabricação interna com controle de lote e validade.
- **Validação:** Bloqueio de saída de produtos vencidos (apenas ajuste manual justificado pelo gestor).
- **Notificação:** Alerta sobre produtos com vencimento em menos de 7 dias.

---

# Módulo: Controle de Acesso — Hierarquia de Permissões

**Ordem de prioridade:** `Cliente` < `Funcionário` < `Gestor` < `Admin`

### Cliente
- **Origem:** Tabela `Clientes` (FK `Usuarios.ClienteId`).
- **Acesso:** Visual / Apenas Consulta.
- **Regra de Ouro:** Um usuário `Cliente` não pode visualizar ou editar dados de outros clientes. O `ClienteId` no token é o único filtro de isolamento.

### Funcionário (Operador / Motorista)
- **Origem:** Tabela `Funcionarios`.
- **Acesso:** Operacional — tarefas de produção, estoque, logística.
- Em módulos com isolamento (Alimentação, Ponto), vê e edita apenas seus próprios dados.

### Gestor
- **Origem:** Tabela `Funcionarios`.
- **Acesso:** Gerencial — aprovação de OPs, relatórios financeiros (DRE), gerenciamento de frota, todos os dados do departamento.

### Admin
- **Origem:** Tabela `Usuarios` (`IsAdmin = true`).
- **Acesso:** Total — gerencia usuários, altera permissões e acessa todos os módulos.