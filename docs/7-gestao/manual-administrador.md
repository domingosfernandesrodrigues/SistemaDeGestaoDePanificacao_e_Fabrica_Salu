# Manual do Administrador SGP-F

Bem-vindo ao Sistema de Gestão de Panificação e Fábrica (SGP-F).
**Última atualização:** 09/05/2026

## 1. Visão Geral
O SGP-F é um ERP completo projetado em 6 módulos integrados:
1. **Engenharia e Produtos**: Cadastros e Fichas Técnicas (BOM).
2. **Produção (Chão de Fábrica)**: Ordens de Produção (OP) e Movimentação de Estoque.
3. **Gestão de Pessoas (RH)**: Controle de Ponto, Horas Extras e Holerites.
4. **Logística e Vendas**: Pedidos B2B, Gestão de Vans e Trocas/Avarias.
5. **Financeiro e DRE**: Contas a Pagar/Receber com conciliação automática e DRE.
6. **Contas Bancárias**: Gestão de saldos, configurações de Pix/Boleto e conciliação automática.

---

## 2. Operação Diária

### 2.1 Iniciando a Produção
- Acesse `/ordens-producao`.
- Crie uma nova OP com o produto desejado.
- **"Iniciar Produção"** → O sistema reserva a matéria-prima no estoque.
- **"Finalizar Produção"** → Converte ao custo real e adiciona ao saldo de venda.

### 2.2 Controle de Ponto
- A página `/rh/ponto` deve ficar aberta num terminal/tablet na entrada da fábrica.
- Ao final do mês, vá em `/rh/folha` → **"Fechar Folha"** para calcular extras, descontos e gerar o Contas a Pagar.

### 2.3 Vendas e Expedição
- Pedidos B2B são gerenciados em `/vendas` (Kanban).
- **"Confirmar Entrega"** baixa o estoque permanentemente e emite título no Contas a Receber.
- **Documentos de Pagamento** (Pix/Boleto) são gerados automaticamente com os dados da conta bancária padrão.

### 2.4 Contas Bancárias e Saldos (`/financeiro/contas`)
- Cadastre todas as suas contas bancárias com o **saldo do momento atual** no campo "Saldo Inicial".
- Marque uma conta como **"Conta Padrão"** — ela será usada automaticamente nos recebimentos de vendas.
- **Conciliação Automática:** Cada baixa de conta a pagar ou receber atualiza o saldo automaticamente.
- **Movimentação Manual:** Use o ícone ⇄ para registrar entradas (reforço) ou saídas (sangria) avulsas.
- Contas não podem ser excluídas — apenas inativadas pela edição da conta.

---

## 3. Configuração Inicial (Implantação)

### Passo a Passo Recomendado:
1. **Configurações da Empresa** (`/configuracoes/empresa`): Preencha razão social, CNPJ, endereço e logo.
2. **Cadastrar Contas Bancárias** (`/financeiro/contas`): Informe todas as contas com seus saldos reais e marque a conta padrão. Configure a chave Pix e dados bancários nesta mesma tela.
3. **Cadastrar Funcionários** (`/rh/funcionarios`): Com salário base, cargo e data de admissão.
4. **Cadastrar Produtos/Insumos** (`/produtos`): Com preços de custo, venda e estoque inicial.
5. **Criar Fichas Técnicas** (`/fichas-tecnicas`): Para produtos fabricados, defina a receita.
6. **Cadastrar Clientes e Fornecedores**.

---

## 4. Gestão Financeira

### 4.1 Fluxo Automático
| Evento | Gera |
|--------|------|
| Pedido de Venda Aprovado | ContaReceber (Pendente) |
| Compra Confirmada | ContaPagar (Pendente) |
| Folha Fechada | ContaPagar (Pendente) |
| Baixa de ContaReceber | +Saldo na Conta Padrão |
| Baixa de ContaPagar | -Saldo na Conta Padrão |
| Toggle Pago em Venda | ±Saldo na Conta Padrão |

### 4.2 Saldo em Caixa (Dashboard)
O "Saldo em Caixa" exibido no Dashboard é a **soma dos `SaldoAtual` de todas as contas ativas**, refletindo o patrimônio financeiro real da empresa.

---

## 5. Segurança e Acessos

| Perfil | Acesso |
|--------|--------|
| **Admin** | Total — todos os módulos e configurações |
| **Gestor** | Operacional — sem gestão de usuários |
| **Operador** | Produção, Ponto e Consultas |
| **Cliente** | Portal B2B externo (`/portal`) |

- Primeiro acesso obriga troca de senha com requisitos de segurança.
- Usuários inativos não conseguem fazer login.

---

## 6. Landing Page Institucional (`/`)
A rota raiz do sistema exibe uma página pública com:
- **Hero** com apresentação do sistema.
- **Quem Somos** — missão e diferenciais.
- **Funcionalidades** — os 6 módulos do ERP.
- **Contato** — informações da empresa.
- **Login via Modal** — sem página separada, integrado à página principal.

---

## 7. Deploy (Docker)
```bash
docker-compose up -d --build
```
- **Frontend:** porta `5173`
- **Backend API:** porta `5137`
- **Banco de Dados:** SQL Server isolado na rede interna Docker.
