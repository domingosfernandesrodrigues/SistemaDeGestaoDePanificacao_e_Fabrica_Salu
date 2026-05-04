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
- **Fase Atual:** Refinamento e Estabilização Operacional ✅
- **Progresso Total:** 100% (Funcionalidades principais e refinamentos de integridade concluídos)
- **Última Atualização:** 04/05/2026

### 🛠️ Refinamentos Recentes (Maio/2026):
- **Controle de Ponto Profissional:** Implementado limite diário de 2 entradas e 2 saídas por funcionário para garantir integridade da jornada e evitar fragmentação excessiva.
- **Motor de Horas Extras:** Refatorado motor de cálculo de ponto e folha de pagamento para considerar o total acumulado do dia (acima de 8h diárias), garantindo precisão absoluta em turnos com pausas.
- **Afastamentos & UX:** Redesenho completo da interface de afastamentos no Controle de Ponto com layout em cards modernos, responsividade mobile (iPhone 14) e filtros de gestão por colaborador.
- **Segurança e Conformidade:** Implementado bloqueio de acesso para usuários inativos com mensagens de erro seguras e reforço na autorização de documentos privados (Contracheques).
- **Self-Service de RH:** Lançamento da aba "Meus Contracheques" com visual premium, remoção de assinaturas manuais e inclusão de autenticação digital por hash único.
- **Estabilidade de API:** Correção de bugs críticos em seletores de dados nulos e otimização de consultas agrupadas para dashboards de ponto.

**Instrução para IA:** Manter foco em testes de usabilidade e suporte aos refinamentos solicitados pelo usuário.