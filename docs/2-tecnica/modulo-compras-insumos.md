# Módulo de Compras e Gestão de Insumos

## Visão Geral

O módulo de compras gerencia todas as entradas de produtos no estoque, divididas em duas categorias operacionais:

| Categoria | Formulário | Produtos Permitidos |
|---|---|---|
| **Mercadoria** | Compras e Entradas | Produto Acabado + Revenda |
| **Insumo** | Entrada de Insumos | Apenas Matéria-Prima |

---

## Entidades Principais

### Compra
| Campo | Tipo | Descrição |
|---|---|---|
| `Id` | `Guid` | Identificador único |
| `FornecedorId` | `Guid` | Fornecedor vinculado |
| `DataCompra` | `DateTime` | Data do registro |
| `ValorTotal` | `decimal(18,2)` | Soma de todos os itens |
| `Status` | `Enum` | `Rascunho` / `Confirmada` / `Cancelada` |
| `Categoria` | `Enum` | `Mercadoria` / `Insumo` |
| `Observacao` | `string?` | Nota livre |
| `Itens` | `List<CompraItem>` | Relação de produtos |

### CompraItem
| Campo | Tipo | Descrição |
|---|---|---|
| `CompraId` | `Guid` | FK para Compra |
| `ProdutoId` | `Guid` | FK para Produto |
| `Quantidade` | `decimal(18,4)` | Volume comprado |
| `PrecoUnitario` | `decimal(18,4)` | Preço pago por unidade |

---

## Regras de Negócio

1. **Rascunho:** Registro inicial sem impacto no estoque ou financeiro. Pode ser editado ou excluído.
2. **Confirmação (atômica):**
   - Soma `Quantidade` ao `QuantidadeEstoque` de cada produto.
   - Atualiza `PrecoCusto` do produto com o `PrecoUnitario` pago.
   - Gera registro em `ContasPagar` com valor total da compra.
3. **Imutabilidade:** Compras `Confirmadas` não podem ser alteradas.
4. **Filtro de Produtos:**
   - Formulário de Compras: exibe apenas `ProdutoAcabado` e `Revenda` (tipo ≠ 0).
   - Formulário de Insumos: exibe apenas `Insumo` (tipo = 0).

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/Compras` | Lista todas com resumo de produtos |
| `GET` | `/api/v1/Compras/{id}` | Detalha uma compra com itens |
| `POST` | `/api/v1/Compras` | Cria rascunho |
| `PUT` | `/api/v1/Compras/{id}` | Atualiza rascunho |
| `DELETE` | `/api/v1/Compras/{id}` | Exclui rascunho |
| `POST` | `/api/v1/Compras/{id}/confirmar` | Confirma e aplica no estoque/financeiro |

---

## Rotas Frontend

| Rota | Componente | Acesso |
|---|---|---|
| `/compras` | `Compras.tsx` | Admin, Gestor |
| `/entrada-insumos` | `EntradaInsumos.tsx` | Admin, Gestor |
