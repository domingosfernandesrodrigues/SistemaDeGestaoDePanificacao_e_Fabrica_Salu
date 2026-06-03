# SGP-F - Índice Geral da Documentação

Este documento é o mapa mestre do Sistema de Gestão de Panificação e Fábrica (SGP-F). Ele deve ser consultado pela IA antes de qualquer implementação para garantir a consistência entre negócio, arquitetura e interface.

## 1. Negócio e Requisitos (`/1-negocio`)
- [Visão Geral](1-negocio/negocio-visao-geral.md) - Escopo e objetivos.
- [Módulo Fábrica](1-negocio/modulo-fabrica-producao.md) - Ficha Técnica e Produção.
- [Módulo Financeiro](1-negocio/modulo-financeiro.md) - Contas, Gateway Universal e DRE.
- [Logística e Vendas](1-negocio/modulo-logistica-vendas.md) - Frota e Revenda.
- [Módulo RH e Folha](1-negocio/modulo-rh-folha.md) - Folha, Contracheques, Jornada e Alimentação.
- [Lançamento de Alimentação](1-negocio/lancamento-alimentacao.md) - Regras por perfil e integração financeira.
- [Estimativa de Custos](1-negocio/estimativa-custos-projeto.md) - Custos de infraestrutura.

## 2. Documentação Técnica (`/2-tecnica`)
- [Arquitetura Backend](2-tecnica/arquitetura-backend.md) - .NET 10, DDD e Strategy Pattern de gateways.
- [Arquitetura Frontend](2-tecnica/arquitetura-frontend.md) - React, Vite e TS.
- [Gateway de Pagamento Universal](2-tecnica/gateway-pagamento-universal.md) - Strategy Pattern, provedores, webhooks. **[NOVO]**
- [Banco de Dados](2-tecnica/modelo-dados-dicionario.md) - Dicionário SQL Server.
- [Segurança](2-tecnica/seguranca-autenticacao.md) - JWT, Roles, isolamento por módulo e BCrypt.
- [Contratos de API](2-tecnica/api-contracts-openapi.md) - Swagger e REST.

## 3. Interface e UX/UI (`/3-interface`)
- [Design System](3-interface/design-system-global.md) - Tailwind e Componentes.
- [Mapa de Rotas](3-interface/mapa-rotas-navegacao.md) - URLs e Navegação.
- [Especificação Dashboards](3-interface/especificacao-dashboards-interface.md) - Widgets e KPIs visuais.
- [Protótipos e Fluxos](3-interface/prototipos-fluxos.md) - Comportamento das telas.

## 4. Processos e Qualidade (`/4-qualidade`)
- [Plano de Testes](4-qualidade/plano-testes.md) - xUnit e Cobertura.
- [Padrões de Código](4-qualidade/padroes-codigo-lint.md) - Clean Code e Nomenclatura.
- [Fluxo de Deploy](4-qualidade/fluxo-ci-cd-deploy.md) - Docker e CI/CD.

## 5. Apoio ao Usuário (`/5-apoio`)
- [Guia da Fábrica](5-apoio/guia-operacional-fabrica.md) - Operação de produção.
- [Guia do RH](5-apoio/guia-operacional-rh.md) - Operação de folha.
- [Guia de Implantação e Treinamento](5-apoio/guia-implantacao-treinamento.md) - Roteiro completo.
- [Manual do Administrador](5-apoio/manual-administrador.md) - Configurações globais.

## 6. Observabilidade (`/6-observabilidade`)
- [Auditoria e Logs](6-observabilidade/auditoria-logs.md) - Rastreabilidade.
- [Fórmulas de KPIs](6-observabilidade/kpi-indicadores-metas.md) - Regras de cálculo BI.

## 7. Gestão Estratégica (`/7-gestao`)
- [Valor de Venda (Valuation)](7-gestao/valor-venda-sistema.md) - Precificação e Mercado.
- [Manual do Administrador](7-gestao/manual-administrador.md) - Guia de implantação e operação.

---

## 📌 Status Atual do Sistema (03/06/2026)

O sistema SGP-F encontra-se em estado de **Produção — Estabilidade Geral**.

### ✅ Funcionalidades Consolidadas

#### Gateway de Pagamento Universal (Multi-Provedor)
- **Strategy Pattern:** Implementação de `IPaymentGateway` com três provedores: `AsaasPaymentGateway`, `MercadoPagoPaymentGateway` e `GenericPaymentGateway` (simulador offline).
- **Roteamento Automático:** `PaymentGatewayFactory` seleciona o provedor pelo prefixo do `GatewayToken` da conta bancária.
- **Mercado Pago:** Integração completa com autenticação Bearer, idempotência por UUID, e busca dinâmica do e-mail corporativo em `Configurações da Empresa` (`Empresa.Email`).
- **Asaas:** Pesquisa/cadastro de cliente por CPF/CNPJ, geração de Boleto e Pix, suporte a Sandbox e Produção.
- **Webhooks:** Rota universal `POST /api/v1/pagamentos/webhook/gateway` com retrocompatibilidade para `/webhook/asaas` e rota dedicada `/webhook/mercadopago`. Dedução automática de tarifas (`NetValue`), gravação de data real de pagamento e fallback de conta bancária.
- **Resiliência Total:** Em caso de falha ou token ausente, o `GenericPaymentGateway` assume automaticamente, mantendo o fluxo de vendas sem interrupção.

#### Controle de Acesso por Módulo
- **Lançamento de Alimentação por Perfil:** Admin/Gestor gerenciam alimentação de todos os funcionários; Operador/Motorista lançam e visualizam apenas os próprios registros (isolamento via `FuncionarioId` do token JWT).
- **Meus Contracheques com Status:** O valor líquido (`SalarioLiquido`) é exibido ao funcionário **somente quando** o status da folha for `Liberado`; demais status exibem `"Aguardando Liberação"`.
- **Segurança Reforçada:** `WebhookConfirmarPagamento` em `VendasController.cs` protegido com `[Authorize(Roles = "Admin,Gestor")]`.

#### Segurança e Limpeza de Código
- **BCrypt Obrigatório (12 salt rounds):** Autenticação sem texto plano. Auto-migrador de senhas no boot.
- **Wipe de Backdoors:** `DbCompareController`, `DebugController`, `check_db` removidos fisicamente.
- **Código Morto Removido:** Lógica de turno noturno inativa removida de `FolhaPagamentoService.cs`.
- **Todos os controllers protegidos** com `[Authorize]` e respectivas roles.

#### Funcionalidades Anteriores Consolidadas
- **Precisão de GPS:** Calibração ativa (`watchPosition`) com precisão ≤ 20m e fallback no geocodificador.
- **Férias e 13º Salário (CLT):** Abono pecuniário, adiantamento nas férias, segmentação de folha, anti-duplicidade e PDF detalhado.
- **Conciliação Bancária:** Algoritmo retroativo para saldos históricos, multi-conta com fallback resiliente.
- **Interface Cinética:** `<PhysicsCanvas />` na Landing Page, touch drag-and-drop B2B, impressão térmica otimizada.

---

## 🚀 Execução do Projeto
- [Cronograma de Execução](cronograma-execucao.md) - Fases e Status.

---

**Nota para a IA:** Ao implementar qualquer módulo, cruze as informações técnicas da pasta `2-tecnica` com as regras de negócio da pasta `1-negocio`. Para tudo relacionado a pagamentos, consulte obrigatoriamente [gateway-pagamento-universal.md](2-tecnica/gateway-pagamento-universal.md) antes de qualquer implementação.