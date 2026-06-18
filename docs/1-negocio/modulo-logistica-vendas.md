# Módulo: Logística, Vendas, Compras e Revenda

## 1. Fluxo de Revenda
- **Compra:** Entrada de produtos prontos (terceirizados) no estoque via **Módulo de Compras e Entradas**.
- **Venda:** Saída de produtos via pedidos de clientes.
- **Entrega:** Atribuição de pedidos a veículos e motoristas (entregadores) da frota própria.
- **Isolamento:** Motoristas possuem perfil restrito que exibe apenas as entregas sob sua responsabilidade.

## 2. Painel de Vendas B2B (Kanban)
- **Interface Visual:** Dashboard dividido em colunas de status: `Aprovação (Portal)`, `Em Separação`, `Em Rota de Entrega` e `Entregues`.
- **Fluxo de Estoque de Fase Única (Baixa Imediata):** 
  - Ao criar um pedido (seja pelo cliente no Portal B2B ou pelo operador/gestor no administrativo), o sistema realiza a **baixa física imediata** dos produtos do estoque.
  - Se um pedido for cancelado, excluído, ou caso o gestor rejeite o pedido (não o aprove na fila de aprovação do Portal B2B), o sistema realiza o **estorno imediato e incondicional** das quantidades debitadas de volta ao estoque físico.
  - Ao mover o pedido para `Entregues` no fluxo Kanban, a baixa física (já realizada) é validada e o título correspondente no **Financeiro (Contas a Receber)** é confirmado.
- **Gestão Ágil e Edição Completa:**
  - **Edição:** Permitida enquanto o pedido não estiver finalizado. Ao alterar itens ou quantidades de um pedido em edição, o sistema recalcula e ajusta de forma transparente o estoque (devolvendo a quantidade antiga e debitando a nova), além de atualizar o motorista encarregado e regenerar as cobranças de faturamento (Pix/Boleto).
  - **Cancelamento e Exclusão:** Reverte integralmente o débito físico de estoque dos produtos associados e remove qualquer lançamento pendente no Contas a Receber.
- **Prevenção Automatizada de Inadimplência:**
  - O sistema realiza um bloqueio comercial automático na tela de Novo Pedido. Se o cliente selecionado possuir **3 ou mais comandas/pedidos pendentes** (não pagos e não cancelados), o formulário é bloqueado contra gravações ou novas compras até a devida quitação do débito.
- **Faturamento Dinâmico (Boleto & Pix EMV):**
  - **Geração de Pix Real-Time:** O QR Code Pix e a chave Copia e Cola são gerados sob demanda diretamente no frontend usando um algoritmo próprio de `CRC16-CCITT`. Isso garante compatibilidade total com os aplicativos bancários reais e garante que qualquer alteração de chave Pix em "Contas Bancárias e Saldos" se reflita instantaneamente no faturamento de todos os pedidos (inclusive os antigos).
  - **Impressão de Comanda:** O PDF de comanda impresso traz de forma dinâmica a logomarca da empresa cadastrada no módulo de Configurações da Empresa, fortalecendo o branding da marca "Salú".
- **Filtros e Logística:**
  - Barra de filtros com limpeza rápida que permite localizar pedidos por Cliente, Data Específica, Mês/Ano, Status de Pagamento e por **Motorista/Entregador** encarregado.
- **Responsividade:** Layout otimizado para iPhone 14 Pro Max, com ações rápidas via botões de acesso direto no cartão do pedido.
 
## 3. Módulo de Compras e Entradas (Mercadoria)

### 3.1 Fluxo de Compra
- **Rascunho:** O usuário registra a compra com fornecedor e itens. Não impacta estoque ou financeiro.
- **Confirmada:** Ao confirmar, o sistema automaticamente:
  1. Soma a quantidade ao estoque de cada produto.
  2. Atualiza o Preço de Custo do produto com o valor pago.
  3. Gera uma entrada em **Contas a Pagar**.
- **Regra de Imutabilidade:** Compras Confirmadas não podem ser editadas ou excluídas.

### 3.2 Categorização
- `Mercadoria` — Para Produtos Acabados (fabricados) e Revenda (comprados prontos).
- `Insumo` — Exclusivo para Matéria-Prima. Gerenciado pelo formulário **Entrada de Insumos**.

### 3.3 Interface
- Listagem com colunas: Data, Fornecedor, Resumo de Produtos, Total Itens, Valor Total, Status.
- Linhas expansíveis (Master-Detail) com tabela de itens detalhados (Produto, Qtd, Preço Unit., Subtotal).
- Filtros por: Fornecedor, Produto, Data, Status. Botão de limpeza rápida.
- Paginação com 10 registros por página.
- Responsivo: Tabela (desktop) e Cards (mobile / iPhone 14 Pro Max).

## 4. Módulo de Entrada de Insumos (Matéria-Prima)
- Formulário dedicado exclusivamente para compras de insumos (Farinha, Ovos, Açúcar, etc.).
- Lista apenas produtos do tipo `Insumo` no formulário.
- Mesmo fluxo Rascunho → Confirmada do módulo de Compras.
- Identidade visual laranja para diferenciação do módulo de Mercadorias.
- Acessível via menu lateral: **"Entrada de Insumos"**.

## 5. Gestão de Trocas e Avarias
- **Registro:** Identificação de itens vencidos ou danificados no cliente.
- **Responsabilidade:** Registro obrigatório ou automático do motorista que realizou a coleta para rastreabilidade de campo.
- **Regra de Negócio:** Entrada do item avariado (perda) e saída imediata de um novo.
- **Financeiro:** A troca não gera nova cobrança, mas deve abater o lucro no relatório de DRE.
- **Filtro Restrito de Tipo:** As opções de produtos para trocas ou avarias são filtradas no frontend para exibir apenas produtos do tipo `1` (Produto Acabado / Fabricado). Isso impede que matérias-primas e insumos (que não possuem fluxo de devolução do cliente) sejam selecionados acidentalmente.

## 6. Gestão de Frota
- **Manutenção:** Registro de manutenções Corretivas, Preventivas e Preditivas.
- **Abastecimento:** Controle de consumo e KM para cálculo de eficiência.
- **Interface Mobile:** Motoristas registram KM e abastecimentos diretamente no ato da operação via perfil restrito.

## 7. Perfil Motorista / Entregador
- **Dashboard Simplificado:** Foco em KPIs de entrega, KM rodado e trocas realizadas.
- **Visão de Rota:** Apenas pedidos com status "Rota" ou "Separação" vinculados ao seu ID são visíveis.
- **Auto-atendimento:** Capacidade de registrar trocas no cliente vinculando automaticamente seu perfil como coletor.
