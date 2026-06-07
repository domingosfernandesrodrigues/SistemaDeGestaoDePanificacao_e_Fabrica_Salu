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
- [Plano de Testes](4-qualidade/plano-testes.md) - xUnit, Vitest e Playwright E2E (5/5 ✅).
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

## 📌 Status Atual do Sistema (07/06/2026)

O sistema SGP-F encontra-se em estado de **Produção — Estabilidade Geral com Cobertura de Testes Completa**.

### 🧪 Cobertura de Testes (07/06/2026) **[NOVO]**
- **Backend (xUnit):** 22 specs de integração cobrindo todos os 23 módulos do sistema com EF Core InMemoryDatabase.
- **Frontend (Vitest + RTL):** Testes unitários de componente para todos os 23 módulos de interface.
- **E2E (Playwright):** 5/5 testes passando — Auth, Ponto Eletrônico + Geofencing (3 cenários), Ordens de Produção (ciclo completo).

### ✅ Funcionalidades Consolidadas

#### Recrutamento & Seleção (Trabalhe Conosco) **[NOVO]**
- **Formulário Público:** Integrado na Landing Page com validação Zod, envio `multipart/form-data` e máscara de telefone dinâmica adaptativa.
- **Upload Seguro:** Limite de 5MB, tipos restritos (`.pdf`, `.doc`, `.docx`), GUID de segurança e pasta física isolada fora do diretório público `wwwroot` (mitigação de RCE).
- **Painel Administrativo:** Listagem sob `/rh/candidaturas` restrita a `Admin` e `Gestor` em **tema claro** com filtros de cargo/status, visualização de apresentação e download seguro.

#### Auditoria do Sistema e Logs **[NOVO]**
- **Trilha de Dados:** Interceptor transacional do EF Core gerando logs estruturados de Inclusão, Alteração (comparativo old/new) e Exclusão.
- **Painel de Auditoria:** Tela sob `/auditoria` restrita a `Admin` e `Gestor` em **tema claro** com filtros combinados e modal de comparação visual de dados (de-para) e JSON estruturado.

#### Gateway de Pagamento Universal (Multi-Provedor)
- **Strategy Pattern:** Implementação de `IPaymentGateway` com provedores `AsaasPaymentGateway`, `MercadoPagoPaymentGateway` e `GenericPaymentGateway` (simulador offline).
- **Roteamento Automático:** `PaymentGatewayFactory` seleciona o provedor pelo prefixo do `GatewayToken`.
- **Mercado Pago & Asaas:** Integração completa com webhooks, tratamento de tarifas líquidas (`NetValue`) e conciliação direta.

#### Controle de Acesso por Módulo
- **Lançamento de Alimentação por Perfil:** Isolamento via token JWT (Operador/Motorista lançam/visualizam somente o próprio; Admin/Gestor controlam tudo).
- **Meus Contracheques com Status:** O valor líquido (`SalarioLiquido`) é visível **somente** se a folha estiver `Liberado`.

#### Segurança e Limpeza de Código
- **BCrypt Obrigatório (12 salt rounds):** Autenticação segura sem texto plano.
- **Wipe de Backdoors:** Remoção de controladores e arquivos de depuração.

---

## 🚀 Execução do Projeto
- [Cronograma de Execução](cronograma-execucao.md) - Fases e Status.

---

**Nota para a IA:** Ao implementar qualquer módulo, cruze as informações técnicas da pasta `2-tecnica` com as regras de negócio da pasta `1-negocio`. Para tudo relacionado a pagamentos, consulte obrigatoriamente [gateway-pagamento-universal.md](2-tecnica/gateway-pagamento-universal.md) antes de qualquer implementação.