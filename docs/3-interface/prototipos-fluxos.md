# Protótipos e Fluxos de Usuário

## 1. Fluxo de Venda e Logística
- O sistema deve permitir que o vendedor visualize o estoque em tempo real.
- Após a venda, o fluxo deve seguir para a triagem de entrega e escolha do veículo.

## 2. Fluxo de Produção
- O mestre de obras inicia a Ordem de Produção (OP) via tablet.
- O sistema bloqueia a finalização se houver divergência maior que 10% no rendimento esperado.

## 3. Fluxo de Confirmação de Pagamento — Controle de Despesas

O formulário de Controle de Despesas adota o mesmo modelo de ciclo de vida de pagamento do módulo de Alimentação.

### Criação de Despesa
1. O usuário clica em **"Nova Despesa"**.
2. Preenche o formulário: descrição, categoria, mês/ano, valor, data de vencimento.
3. Seleciona o **Status**: `Pendente` ou `Paga`.
4. Clica em **"Salvar"**.
   - Se `Pendente` → despesa é registrada, sem débito bancário.
   - Se `Paga` → débito imediato no saldo da conta bancária padrão e inserção no extrato histórico.

### Baixa Rápida (Pendente → Pago)
1. Na listagem, a despesa pendente exibe um badge **amarelo** "Pendente" e um botão `✓`.
2. O usuário clica no `✓` e confirma o diálogo.
3. O sistema chama `POST /api/v1/Financeiro/pagar/{id}/baixa`.
4. O status da despesa muda para **verde** "Pago" e o botão `✓` desaparece.
5. O saldo da conta bancária padrão é debitado e o extrato é atualizado em tempo real.

### Edição de Despesa Paga
- **Mudança de Valor:** O sistema calcula a diferença (`novoValor - valorAnterior`) e aplica o ajuste incremental no saldo bancário. O registro do extrato existente é atualizado.
- **Mudança de Descrição:** O registro do extrato correspondente é atualizado com a nova descrição.
- **Mudança de Status: Pago → Pendente (Estorno):** O valor **original** debitado é devolvido ao saldo bancário, mesmo que o valor da despesa tenha sido alterado no mesmo formulário. Um lançamento de "Estorno" é inserido no extrato.