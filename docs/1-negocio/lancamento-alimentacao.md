# Lançamento de Alimentação

## Descrição
Módulo que permite o registro individual de refeições consumidas pelos funcionários (Café da Manhã, Almoço, Jantar). Cada lançamento gera automaticamente uma **Conta a Pagar** (`ContaPagar`) pendente sob a categoria `"Alimentação"`, integrando-se ao fluxo de caixa.

---

## Regras de Acesso por Perfil

| Perfil | Pode Lançar | Pode Visualizar | Pode Excluir |
|--------|------------|-----------------|--------------|
| **Admin** | ✅ Para qualquer funcionário | ✅ Todos os lançamentos | ✅ |
| **Gestor** | ✅ Para qualquer funcionário | ✅ Todos os lançamentos | ✅ |
| **Operador** | ✅ Apenas o próprio | ✅ Apenas os próprios | ❌ |
| **Motorista** | ✅ Apenas o próprio | ✅ Apenas os próprios | ❌ |

> **Regra de Isolamento (Operador / Motorista):** O backend filtra automaticamente os lançamentos pelo `FuncionarioId` extraído do token JWT quando o perfil for `Operador` ou `Motorista`. O frontend exibe apenas o formulário simplificado (sem seleção de funcionário), preenchendo o `FuncionarioId` automaticamente a partir do contexto de autenticação.

---

## Entidade `LancamentoAlimentacao`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `Id` | Guid | Identificador único |
| `FuncionarioId` | Guid | FK para `Funcionarios` |
| `Funcionario` | nav | Propriedade de navegação |
| `Data` | DateTime | Data e hora do consumo |
| `TipoRefeicao` | string | "Café da Manhã", "Almoço" ou "Jantar" |
| `Valor` | decimal | Valor da refeição (precisão 18,2) |
| `Observacao` | string? | Campo opcional |
| `DataCriacao` | DateTime | Timestamp de criação do registro |

---

## Fluxo de Integração Financeira

```
POST /api/v1/LancamentosAlimentacao
         │
         ├── Cria LancamentoAlimentacao
         │
         └── Cria ContaPagar
               - Descricao: "Alimentação - [Nome] - [TipoRefeicao]"
               - Valor: igual ao lançamento
               - Vencimento: data do consumo (à vista)
               - Categoria: "Alimentação"
               - Status: Pendente
               - ReferenciaId: Id do lançamento
```

**Exclusão / Estorno:**
- Ao excluir um lançamento, o sistema cancela a `ContaPagar` correspondente **somente se** o status ainda for `Pendente`.
- Se a conta já foi liquidada, o lançamento é excluído mas a movimentação bancária permanece como histórico.

---

## Endpoints da API (`/api/v1/LancamentosAlimentacao`)

| Método | Rota | Função | Autorização |
|--------|------|--------|-------------|
| GET | `/` | Lista todos os lançamentos (Admin/Gestor) ou apenas os próprios (Operador/Motorista) | Autenticado |
| POST | `/` | Cria lançamento e gera ContaPagar | Autenticado |
| DELETE | `/{id}` | Exclui lançamento e estorna ContaPagar pendente | Admin, Gestor |

---

## Interface (Frontend)

### Tela para Admin / Gestor
- Seleção de funcionário (dropdown com busca assíncrona).
- Campos: Tipo de Refeição, Data, Valor, Observação.
- Tabela com histórico completo, filtros por funcionário/tipo/data.
- Botão de exclusão por linha.

### Tela para Operador / Motorista
- Sem seleção de funcionário — funcionário fixo ao usuário logado.
- Formulário simplificado: Tipo de Refeição, Data, Valor, Observação.
- Histórico pessoal apenas (sem coluna "Excluir").
