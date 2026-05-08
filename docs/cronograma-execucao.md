# Cronograma de Execução - SGP-F (Versão Atualizada)

Este documento define a sequência lógica de desenvolvimento do Sistema de Gestão de Panificação e Fábrica. O projeto está dividido em 5 Fases integradas.

---

## 🟢 FASE 1: Fundação, Base Técnica e Identidade (Semana 1-2)
**Objetivo:** Estabelecer o alicerce sólido para o crescimento do ERP.
- [x] **Setup de Solução:** Criação da estrutura DDD em .NET 10 (Backend) e Vite/React (Frontend).
- [x] **Core de Segurança:** Implementação do Identity com JWT e Roles (Admin, Gestor, Operador).
- [x] **Design System:** Configuração do Tailwind CSS e componentes base (Inputs, Buttons, Modais).
- [x] **Cadastros Mestres:** CRUDs de Empresas, Funcionários, Clientes e Fornecedores.
- **Docs de Referência:** `2-tecnica/arquitetura-*`, `2-tecnica/seguranca-*`, `3-interface/design-system-*`.

## 🟡 FASE 2: Gestão de Estoque e Coração da Fábrica (Semana 3-4)
**Objetivo:** Controlar a transformação da matéria-prima em produto acabado.
- [x] **Inventário:** Cadastro de Insumos e Produtos (Revenda vs. Fabricado).
- [x] **Engenharia de Produto:** Implementação da Ficha Técnica (BOM).
- [x] **Fluxo de Produção:** Abertura, Reserva de Estoque e Finalização de Ordem de Produção (OP).
- [x] **Cálculo de Custo:** Motor de cálculo automático de custo por KG produzido.
- **Docs de Referência:** `1-negocio/modulo-fabrica-producao.md`, `5-apoio/guia-operacional-fabrica.md`.

## 🔵 FASE 3: RH, Jornada e Folha de Pagamento (Semana 5-6)
**Objetivo:** Automatizar a gestão de pessoas e integração financeira.
- [x] **Controle de Ponto:** Módulo de Registro de Horas e Banco de Horas.
- [x] **Motor de Folha:** Cálculo de DSR, Horas Extras (50%/100%) e descontos.
- [x] **Documentação de RH:** Geração de Contracheques (Holerites) em PDF.
- [x] **Integração:** Lançamento automático no Contas a Pagar ao fechar a folha.
- **Docs de Referência:** `1-negocio/modulo-rh-folha.md`, `5-apoio/guia-operacional-rh.md`.

## 🟠 FASE 4: Vendas, Logística e Operação de Frota (Semana 7-8)
**Objetivo:** Gerenciar a saída de produtos e a saúde da frota de entrega.
- [x] **Comercial:** Fluxo de Pedidos de Venda e módulo de Revenda.
- [x] **Logística de Frota:** Controle de Abastecimento, KM e Manutenções (Preventiva/Corretiva).
- [x] **Módulo de Trocas:** Fluxo de devolução de avarias com abatimento de estoque.
- **Docs de Referência:** `1-negocio/modulo-logistica-vendas.md`, `3-interface/mapa-rotas-navegacao.md`.

## 🔄 FASE 4b: Otimização de Processos e Portal (Semana 8-9)
**Objetivo:** Criar inteligência comercial e integração externa.
- [x] **Portal do Cliente:** Login externo, histórico de pedidos e inserção de pedidos de revenda.
- [x] **Fluxo de Aprovação Comercial:** Interface para o Admin aprovar pedidos do portal.
- [x] **Portais de Venda (PDV):** Implementação de rotas de vendas B2B com sugestão de roteirização.
- [x] **Módulo de Reuniões:** Agendamento e controle de pautas/atas (Gestão de Relacionamento).
- **Docs de Referência:** (A elaborar na fase específica).

## 🔴 FASE 5: BI, Financeiro e Finalização (Semana 9-10)
**Objetivo:** Extrair inteligência dos dados e preparar para o mercado.
- [x] **Financeiro:** Fluxo de Caixa Realizado, Provisões e Relatório DRE.
- [x] **Dashboards:** Implementação dos widgets de KPI (Rendimento, Margem, Ponto de Equilíbrio).
- [x] **Qualidade Final:** Testes de Carga, Auditoria de Logs e Dockerização de Produção.
- [x] **Entrega:** Manual do Administrador e Documentação de Valuation.
- **Docs de Referência:** `1-negocio/modulo-financeiro.md`, `6-observabilidade/*`, `7-gestao/*`.

---

## 📊 Status de Progresso Geral
- **Fase Atual:** Refinamento e Expansão Operacional ✅
- **Progresso Total:** 100% (Funcionalidades principais, refinamentos e módulos de compras concluídos)
- **Última Atualização:** 08/05/2026

### 🛠️ Refinamentos Recentes (Maio/2026 - Gestão de Vendas B2B):
- **Painel Kanban de Vendas:** Implementação de dashboard interativo com colunas de status (Aprovação, Separação, Rota, Entregue). Suporte completo a **Drag-and-Drop** para movimentação de pedidos entre etapas.
- **Automação Logística & Estoque:** Integração do fluxo de status com o inventário. Mover para "Separação" reserva o estoque; mover para "Entregue" efetiva a saída e gera automaticamente o **Contas a Receber**.
- **Gestão de Pedidos (Ações Críticas):** Implementação de lógica de **Cancelamento com Reversão**, que devolve produtos ao estoque e estorna o financeiro. Edição de pedidos permitida em fases iniciais com recalculo automático de reservas.
- **UX Mobile Pro Max:** Interface otimizada para iPhone 14 Pro Max, com botões de ação (Editar, Excluir, Cancelar) sempre visíveis em dispositivos touch e cartões detalhados com indicadores visuais de tempo e valor.
- **Estabilidade de API:** Refatoração do `VendaService` para arquitetura desacoplada (Repositórios), garantindo 100% de integridade em operações complexas de banco de dados.

### 🛠️ Refinamentos Anteriores (Maio/2026 - Sessão de Compras):
- **Módulo de Compras e Entradas (Mercadoria):** Implementação completa do CRUD de compras de produtos acabados e revenda. Inclui fluxo de Rascunho → Confirmada, que atualiza automaticamente o estoque e gera conta a pagar.
- **Entrada de Insumos (Matéria-Prima):** Criação de formulário exclusivo para registrar a compra de insumos (Farinha, Ovos, etc.), separado do módulo de mercadorias para maior clareza operacional.
- **Categorização de Compras:** Adição do campo `Categoria` (`Mercadoria` / `Insumo`) na entidade de compra, permitindo filtragem e segmentação por tipo de entrada.
- **Interface de Listagem Avançada:** Tabela de compras com linhas expansíveis (Master-Detail) mostrando os itens detalhados (produto, quantidade, preço unitário e subtotal). Layout responsivo com Cards para mobile (iPhone 14 Pro Max).
- **Filtros Multicritério:** Filtros por fornecedor, produto, data e status com limpeza rápida em ambos os módulos.
- **Paginação:** Sistema de paginação com 10 registros por página e reset automático ao aplicar filtros.
- **Formatação de Quantidades:** Exibição inteligente de quantidades sem zeros desnecessários (ex: `12` ao invés de `12,0000`).

### 🛠️ Refinamentos Anteriores (Abril-Maio/2026):
- **Agenda Comercial Inteligente (CRM):** Transformação do módulo de reuniões em uma agenda interativa completa com persistência em banco de dados, suporte a feriados nacionais e lembretes personalizados.
- **Motor de Folha CLT v2:** Integração nativa entre a Agenda de Feriados e o processamento de salários. O sistema agora identifica automaticamente feriados para aplicação de HE 100% e calcula o Adicional Noturno (22h-05h) com precisão.
- **UX de Folha de Pagamento:** Redesenho da interface de listagem de contracheques com suporte a responsividade mobile, botões de ação em alto contraste e legenda técnica de metodologia de cálculo.
- **Integridade de Dados (Ponto):** Refinamento da lógica de turnos para garantir que o adicional noturno e as horas extras sejam calculados corretamente mesmo em jornadas que cruzam a meia-noite.
- **Segurança da Agenda:** Implementada proteção de escrita para feriados nacionais, garantindo que o calendário base do ERP permaneça íntegro para cálculos fiscais e trabalhistas.

**Instrução para IA:** Manter foco em testes de usabilidade e suporte aos refinamentos solicitados pelo usuário.