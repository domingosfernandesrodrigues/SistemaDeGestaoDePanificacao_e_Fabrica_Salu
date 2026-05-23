# SGP-F - Índice Geral da Documentação

Este documento é o mapa mestre do Sistema de Gestão de Panificação e Fábrica (SGP-F). Ele deve ser consultado pela IA antes de qualquer implementação para garantir a consistência entre negócio, arquitetura e interface.

## 1. Negócio e Requisitos (`/1-negocio`)
- [Visão Geral](1-negocio/negocio-visao-geral.md) - Escopo e objetivos.
- [Módulo Fábrica](1-negocio/modulo-fabrica-producao.md) - Ficha Técnica e Produção.
- [Módulo Financeiro](1-negocio/modulo-financeiro.md) - Contas e DRE.
- [Logística e Vendas](1-negocio/modulo-logistica-vendas.md) - Frota e Revenda.
- [Módulo RH](1-negocio/modulo-rh-folha.md) - Folha e Jornada.
- [Estimativa de Custos](1-negocio/estimativa-custos-projeto.md) - Custos de infraestrutura.

## 2. Documentação Técnica (`/2-tecnica`)
- [Arquitetura Backend](2-tecnica/arquitetura-backend.md) - .NET 10 e DDD.
- [Arquitetura Frontend](2-tecnica/arquitetura-frontend.md) - React, Vite e TS.
- [Banco de Dados](2-tecnica/modelo-dados-dicionario.md) - Dicionário SQL Server.
- [Segurança](2-tecnica/seguranca-autenticacao.md) - JWT e Roles.
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
- [Guia de Implantação e Treinamento](5-apoio/guia-implantacao-treinamento.md) - Roteiro completo de fluxo e benefícios.
- [Manual do Administrador](5-apoio/manual-administrador.md) - Configurações globais.

## 6. Observabilidade (`/6-observabilidade`)
- [Auditoria e Logs](6-observabilidade/auditoria-logs.md) - Rastreabilidade.
- [Fórmulas de KPIs](6-observabilidade/kpi-indicadores-metas.md) - Regras de cálculo BI.

## 7. Gestão Estratégica (`/7-gestao`)
- [Valor de Venda (Valuation)](7-gestao/valor-venda-sistema.md) - Precificação e Mercado.
- [Manual do Administrador](7-gestao/manual-administrador.md) - Guia de implantação e operação.

## 📌 Status Atual do Sistema (23/05/2026)
O sistema SGP-F encontra-se em estado de **Produção — Estabilidade, Segurança Comercial e Geração Dinâmica de Faturamento**.

- **Faturamento Pix 100% Dinâmico (EMV):** Implementado gerador dinâmico de Pix BR Code no frontend com cálculo real de `CRC16-CCITT`, garantindo compatibilidade e leitura instantânea com qualquer banco. A geração é feita na hora usando a chave Pix ativa cadastrada em "Contas Bancárias e Saldos", mesmo para pedidos antigos.
- **Prevenção Automatizada de Inadimplência:** O Painel de Vendas B2B agora bloqueia automaticamente a criação ou gravação de novos pedidos para clientes que possuam 3 ou mais comandas/pedidos com status pendente de pagamento (não pagos e não cancelados), blindando o fluxo de caixa.
- **Logomarca nas Comandas:** A comanda em PDF emitida a partir do Painel de Vendas B2B agora exibe dinamicamente a logomarca da empresa configurada em "Configurações da Empresa".
- **Filtro de Motoristas no B2B:** Adicionado select dinâmico e responsivo na barra de filtros do Painel B2B para filtragem instantânea de pedidos por motorista encarregado da rota.
- **Edição Completa de Pedidos:** Corrigido o processo de sincronização e persistência no backend (`AtualizarPedidoAsync`), mapeando corretamente a Forma de Pagamento e o Motorista selecionados durante a edição do pedido e regenerando as informações de cobrança.
- **Filtro Seguro de Recursos Humanos:** Refatorado defensivamente o filtro de busca de Funcionários para prevenir crashes por campos nulos (`nome`, `cpf`, `cargo`) e buscas vazias em JavaScript.

---
## 🚀 Execução do Projeto
- [Cronograma de Execução](cronograma-execucao.md) - Fases e Status.

**Nota para a IA:** Ao implementar qualquer módulo, cruze as informações técnicas da pasta `2-tecnica` com as regras de negócio da pasta `1-negocio`.