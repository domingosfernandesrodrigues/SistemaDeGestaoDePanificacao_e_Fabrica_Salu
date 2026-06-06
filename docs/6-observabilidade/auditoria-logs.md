# Auditoria e Logs do Sistema

## 1. Conceito e Trilhas de Auditoria
A trilha de auditoria do SGP-F é implementada no nível do Entity Framework Core interceptando operações transacionais de persistência para as entidades de negócio. O sistema registra de forma estruturada:
* **Quem:** O usuário responsável pela operação (se nulo, interpretado como rotina/tarefa automática do sistema).
* **Quando:** Timestamp preciso do servidor.
* **Onde:** Nome da tabela física afetada.
* **O quê:** Ação efetuada (Inclusão/Inclusão (Added), Alteração (Modified), Exclusão (Deleted)) junto ao ID do registro e o delta exato de dados (OldValues e NewValues).

## 2. Eventos Críticos Auditados
1. Alteração de cadastro de Clientes, Fornecedores e Empresas.
2. Alterações de Folhas de Pagamento, Registros de Ponto, Agendamento de Férias e Afastamentos.
3. Exclusão de Ordens de Produção e Lançamentos Financeiros.
4. Ajustes manuais de estoque ou de preços.

## 3. Painel de Auditoria do Sistema (ERP)

O SGP-F disponibiliza um console administrativo centralizado para auditorias de dados.

### A. Acesso e Segurança
* **Rota:** `/auditoria`
* **Restrição:** Acesso bloqueado para operadores, motoristas e clientes. Disponível unicamente para os perfis `Admin` e `Gestor`.

### B. Recursos de Filtro e Busca
* **Filtros Combinados:** Busca por nome de usuário responsável, seleção dropdown por tabela/entidade auditada, seleção por tipo de ação (Inclusão, Alteração, Exclusão) e definição de período de datas (Início e Fim).

### C. Visualizador de Alterações (Modal)
* Ao clicar em "Ver Alterações", um modal exibe o comparativo dos campos alterados:
  * **Inclusão/Exclusão:** Exibe a lista completa de valores adicionados (verde) ou removidos (vermelho).
  * **Alteração:** Exibe uma tabela comparativa contendo: o nome do campo, o valor antigo (riscado), um indicador visual de alteração (`→`) e o valor novo em destaque (amarelo).
* **JSON Bruto:** Um painel retrátil (details) permite aos administradores visualizarem os objetos JSON completos gravados no banco de dados para rastreamento técnico minucioso.

### D. Tema Visual
* Seguindo as diretrizes de design consistente do ERP, a página é puramente em **tema claro** (`bg-white` e bordas suaves).
* Os blocos de códigos e JSONs utilizam fundos cinza claro estruturado (`bg-slate-100` e `border-slate-200`) com texto escuro, eliminando blocos escuros obsoletos.
                                         