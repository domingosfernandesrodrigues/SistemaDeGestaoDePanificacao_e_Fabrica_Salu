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
- **Fase Atual:** Estabilidade e Performance ✅
- **Progresso Total:** 100% (Todos os módulos, BI, Perfil Motorista e Otimizações de Performance concluídos)
- **Última Atualização:** 14/05/2026

### 🛠️ Refinamentos de Performance & Identidade (14/Mai/2026):
- **Otimização de Downloads (Cache de Logo):** Implementado cache de `byte[]` no backend (`FolhaPagamentoService`) e cache de memória no frontend (`empresaService`) para evitar requisições redundantes de imagens pesadas.
- **Compressão de Logo no Cliente:** Inclusão de algoritmo de compressão via Canvas no upload da logo. Imagens são redimensionadas para 400px e comprimidas para 70% de qualidade antes de serem enviadas ao banco de dados.
- **Latência de Contracheques:** Redução drástica no tempo de geração de PDFs de contracheque (QuestPDF) através da eliminação de chamadas HTTP externas repetitivas para o logo da empresa.

### 🛠️ Refinamentos Recentes (Maio/2026 - Perfil Motorista & Logística Especializada):
- **Novo Perfil "Motorista / Entregador":** Implementação de role específica com isolamento de dados em nível de API. Motoristas visualizam apenas pedidos atribuídos a eles no Dashboard e Kanban.
- **Rastreabilidade de Entregas:** Adição do campo `MotoristaId` em `PedidosVenda` e `TrocasAvaria`. Admin/Gestor agora selecionam o responsável pela entrega no ato do pedido.
- **Segurança via Claims:** Injeção do `FuncionarioId` no token JWT para identificação automática do motorista no backend, garantindo que ele não acesse dados sensíveis de outros departamentos.
- **Interface Otimizada:** Navegação lateral adaptável ao perfil Motorista, focando em: Dashboards de Entrega, Suas Vendas (Rota), Frota (Abastecimento/Manutenção), Trocas e Meus Contracheques.
- **Patches SQL Automatizados:** Implementação de lógica de auto-correção de esquema no startup do sistema para garantir que colunas de logística existam sem intervenção manual.

### 🛠️ Refinamentos Recentes (Maio/2026 - BI & Painel Executivo):
- **Painel Executivo 360°:** Implementação de dashboard gerencial com abas específicas para **Vendas**, **Produção**, **Estoque**, **Logística** e **Financeiro**.
- **Indicadores Estratégicos (KPIs):**
    - **Vendas:** Ticket Médio, Ranking de Produtos (Top-Selling) com rentabilidade, Faturamento por Forma de Pagamento e Crescimento Mensal.
    - **Produção:** OEE (Eficiência Geral), Lead Time Médio de OPs e Volume Produzido.
    - **Financeiro:** Lucratividade Estimada (Margem sobre Faturamento), Folha de Pagamento e controle de Horas Extras.
    - **Logística:** Custos de Manutenção da Frota, Entregas em Tempo Real e Impacto Financeiro de Trocas/Avarias.
- **Filtros Dinâmicos:** Suporte a filtragem por **Ano**, **Mês (incluindo Visão Anual)**, **Dia** e **Cliente Específico**.
- **Arquitetura de Dados:** Desenvolvimento do `DashboardService` com consolidação de 11 repositórios diferentes em uma única resposta otimizada.
- **UX Premium:** Interface responsiva com micro-animações, chips de KPI coloridos por performance e tabelas de ranking de alta densidade de informação.

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

### 🛠️ Refinamentos Recentes (09/Mai/2026 - Financeiro Integrado & Landing Page):

#### 💳 Módulo de Contas Bancárias (`/financeiro/contas`)
- **Entidade `ContaBancaria`:** Implementada com campos `SaldoInicial`, `SaldoAtual`, `Ativa`, `IsPadrao`, `PixChave`, `BancoNome`, `Agencia`, `NumeroConta`, `GatewayToken`.
- **Migração de Dados de Pagamento:** Os campos de Pix/Banco foram removidos de `Empresa` e centralizados em `ContaBancaria`, permitindo múltiplas contas.
- **Conta Padrão:** Lógica de unicidade no backend — apenas uma conta ativa como padrão por vez.
- **Inativação sem Exclusão:** Contas não podem ser excluídas para preservar histórico. Apenas inativação via edição.
- **Movimentação Manual:** Endpoint `POST /{id}/movimentar` para entradas e saídas avulsas (reforços, sangrias).
- **Formulário Responsivo:** Layout com `grid-cols-1 md:grid-cols-2` para mobile e desktop.

#### 🏦 Conciliação Financeira Automática
- **`FinanceiroService.BaixarContaReceberAsync`:** Ao baixar, credita o valor no `SaldoAtual` da conta padrão.
- **`FinanceiroService.BaixarContaPagarAsync`:** Ao pagar, debita o valor no `SaldoAtual` da conta padrão.
- **`VendaService.TogglePagamentoAsync`:** Ao marcar/desmarcar venda como paga, credita/reverte na conta padrão.
- **`FinanceiroService.ObterResumoAsync`:** Saldo em caixa agora soma os `SaldoAtual` reais das contas ativas (não mais cálculo histórico).

#### 🐛 Bug Crítico Corrigido
- **Simulação Automática de Pagamento Removida:** `VendaService.CriarPedidoAsync` tinha um `Task.Run` com `Task.Delay(15000)` que confirmava pagamentos automaticamente após 15 segundos em produção. Removido.
- **VendaService usa ContaBancaria:** Pix/Boleto agora buscam dados da conta padrão, não mais de `Empresa`.

#### 🌐 Landing Page Institucional (`/`)
- **Nova rota pública** na raiz do sistema com apresentação institucional completa.
- **Seções:** Hero, Quem Somos, Funcionalidades (6 módulos), CTA e Rodapé com contato.
- **Login Integrado via Modal:** Sem página separada — autenticação inline com troca de senha no primeiro acesso.
- **Fluxo de Autenticação Corrigido:** Login redireciona para `/dashboard`. AuthGuard redireciona para `/`. Rota `/login` redireciona usuários já logados para `/dashboard`.

#### 📚 Documentação Atualizada
- `1-negocio/modulo-financeiro.md` — reescrito com ContaBancaria, conciliação e endpoints.
- `2-tecnica/modelo-dados-dicionario.md` — todas as entidades atualizadas e novas colunas documentadas.
- `7-gestao/manual-administrador.md` — reescrito com passo a passo de implantação e novos módulos.

**Instrução para IA:** Ao modificar qualquer fluxo financeiro, garantir que as baixas de contas atualizem o `SaldoAtual` da `ContaBancaria` padrão. O saldo do dashboard vem da soma das contas ativas, não de cálculo histórico.

### 🛠️ Refinamentos Finais (10/Mai/2026 - Painel Executivo e Operações)
- **Painel Executivo (Novos KPIs API):** 
  - Cálculo inteligente de **Crescimento Mensal** comparativo (MoM e YoY) em Vendas.
  - Adição do **Lucro Estimado Monetário** para complementar o percentual.
  - Novos cards de **Logística** calculando **Custo Total com Abastecimento** em tempo real.
  - Gráficos de barra integrados para **Top Produtos com Trocas/Avarias** e **Top Clientes com Ocorrências**.
- **Usabilidade em Formulários Complexos (Modais):**
  - Remoção das limitações de _overflow_ em listas (`max-h-64`) nos formulários de **Entrada de Insumos** e **Nova Compra Geral**, permitindo que menus _dropdown_ de busca sobreponham os componentes corretamente.
- **Auditoria Logística (Hodômetro):**
  - Ajuste no módulo de `Frota`: Remoção do preenchimento padrão automático da quilometragem nos modais de Abastecimento e Manutenção, forçando o operador a preencher manualmente a quilometragem atual do veículo no ato, prevenindo erros de digitação e histórico incorreto.
- **Filtros e Relatórios Ponto:** 
  - Padronização de horas na visualização decimal (`hh:mm`) e filtros precisos de mês e ano para a aba de Afastamentos de funcionários.

### 📱 Padronização UI/UX e Responsividade Mobile (11/Mai/2026)
- **Responsividade Pro Max (iPhone 14 Pro Max):**
  - Auditoria completa e refatoração de layouts para suporte a telas de 430px de largura.
  - Implementação do padrão **Card View** em tabelas densas (Controle de Ponto e Listagens) para visualização mobile verticalizada.
  - Correção de visibilidade de botões de ação em dispositivos touch (removida opacidade zero em hover).
- **Acessibilidade em Modais:**
  - Refatoração do componente base de **Modal** com `Sticky Header` (título e fechar sempre visíveis) e `Scroll Vertical` inteligente.
  - Botões de ação em modais agora ocupam 100% da largura no mobile, facilitando a interação por toque.
- **Sinalização Visual de Regras de Negócio:**
  - Padronização de **Campos Obrigatórios** com asterisco vermelho (`*`) e validação nativa em 100% dos formulários do sistema.
- **Melhorias em Módulos Críticos:**
  - **Financeiro:** Redesign dos modais de "Nova Conta" e "Movimentação" com foco em inputs de alta visibilidade e controles touch-friendly.
  - **Dashboard:** Tabelas de BI agora possuem scroll horizontal protegido para não quebrar o layout global do painel.
- **Documentação de Onboarding:**
  - Criação do **Guia de Implantação e Treinamento** (`docs/5-apoio/guia-implantacao-treinamento.md`) focado no fluxo operacional ponta a ponta e apresentação de benefícios para o dono da empresa.