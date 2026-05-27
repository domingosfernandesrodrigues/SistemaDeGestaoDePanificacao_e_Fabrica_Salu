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

## 📌 Status Atual do Sistema (26/05/2026)
O sistema SGP-F encontra-se em estado de **Produção — Estabilidade Geral, Automação Financeira, Integração com Gateway de Pagamento Asaas, e Otimização de Banco de Dados**.

- **Integração Completa com Gateway Asaas (Outbound & Webhooks):**
  - **Envio Dinâmico Real:** Criação automática de faturamento real de Boleto e Pix diretamente no Asaas ao gerar/editar pedidos de vendas. O sistema faz um cruzamento inteligente por CPF/CNPJ de cliente para reutilizar cadastros existentes no painel do gateway, evitando duplicidades.
  - **Mapeamento de Ambientes (Sandbox vs Produção):** Roteamento nativo baseado no token de API configurado em *Contas Bancárias e Saldos*: se o token for prefixado com `sandbox:`, `test:` ou `$$`, a transação é direcionada ao ambiente de homologação do Asaas; caso contrário, é executada diretamente em Produção.
  - **Resiliência (Simulação Offline Fallback):** Caso o token de API não esteja configurado, seja fictício ou ocorra uma instabilidade de rede, o SGPF aciona automaticamente o simulador offline determinístico de Pix e Boleto, garantindo zero interrupções.
  - **Webhook de Baixa Automática e Conciliação:** Implementado controlador assíncrono público `POST api/v1/pagamentos/webhook/asaas` que escuta e valida eventos de compensação real em tempo real (`PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED`). Identifica o número do pedido no campo `externalReference` e realiza a confirmação de recebimento automática, alterando o status para "Pago" e atualizando o saldo bancário correspondente sem necessidade de digitação ou conferência.
- **Resolução de Escaneabilidade de Pix e Boleto (B2B):**
  - **Boleto Febraban Válido:** Correção na Linha Digitável do boleto para gerar sempre a Linha Digitável válida de 47 dígitos, conversão em tempo real no frontend para o código de barras de 44 dígitos no padrão Febraban Modulo 11 geral (DV) e renderização na simbologia `interleaved2of5` via API do `bwip-js`.
  - **Pix Estático Scaneável:** Correção do Pix de dinâmico para estático (`010211`) e sanitização de chaves Pix (mantendo o sinal `+` nos celulares), eliminando erros de decodificação bancária.
  - **Banner Amber de Alerta:** Inclusão de banner com aviso visual amber no painel de vendas no frontend caso a chave Pix não esteja configurada ou seja uma chave fictícia de teste, prevenindo que o operador exiba um QR Code inválido.
- **Histórico Real e Saldos Retroativos das Contas**: Implementada a tabela física `MovimentacoesBancarias` vinculada às contas, integrando com receitas (ContasReceber), despesas (ContasPagar), faturamentos de vendas (VendaService), custos de frota (FrotaService), e lançamentos manuais.
- **Lógica de Cálculo Reverso Avançado de Saldos**: Algoritmo histórico exato para cálculo de saldo retroativo ao final de qualquer mês anterior selecionado (`SaldoPeriodo = SaldoAtualReal - EntradasFuturas + SaidasFuturas`), garantindo integridade matemática perfeita mesmo antes de implantações antigas.
- **Painel de Extrato, Filtros e Paginação**: Adicionada a seção de Extrato na listagem de contas, com painel completo de filtros de Data (datepicker), select de Origens de transações (Manual, Despesa, Receita, Venda, Combustível, Manutenção e Abertura), botão de limpeza rápida de filtros, feedback para buscas vazias e paginação responsiva de 10 itens por página.
- **Otimização de Performance Extrema (Redução de Latência no Backend)**:
  - **Somas Diretas no Banco (`SumAsync`)**: Queries futuras de receitas/despesas processadas diretamente no SQL Server via EF Core `SumAsync`, eliminando a carga de milhares de registros completos para a memória C#.
  - **Agrupamento Otimizado na Base (`GroupBy`)**: Agrupamento e soma de movimentações futuras agregadas e filtradas por conta e tipo diretamente na base via query SQL, reduzindo a transmissão de dados.
  - **Evitação de Loop Quadrático no Extrato**: Uso de um `HashSet<Guid>` de referência na mesclagem de históricos, reduzindo a complexidade de busca algorítmica de $O(N \times M)$ para $O(N)$ linear.
- **Segurança de Código & Expurgo de Arquivos Obsoletos:** Realizada varredura de sistema com a desativação e remoção lógica definitiva de endpoints inseguros ou de desenvolvimento, como o `DbCompareController.cs` (que expunha schemas e connection strings), `DebugController.cs`, `check_db.cs` (script com chaves hardcoded) e `compare_result.txt` (log temporário). Todos os outros controllers do backend agora contam com proteção robusta baseada em Roles JWT via `[Authorize]`.
- **Faturamento Pix 100% Estruturado no B2B:** O modal de Documentos de Pagamento de Pix foi aprimorado para apresentar de forma estruturada e em alto contraste os dados do pagamento (Beneficiário, Banco de Destino, Chave Pix cadastrada, Valor do Pedido e QR Code), harmonizando perfeitamente com o layout do boleto bancário.
- **Automação Financeira (Baixa Automática):** O webhook de faturamento de venda (`ConfirmarPagamentoAsync`) agora realiza o crédito automático imediato do valor faturado no saldo real da conta padrão cadastrada no módulo de Contas Bancárias.
- **Dedução e Devolução Automatizada de Estoque B2B:** Implementada baixa automática do estoque ao criar/aprovar pedidos de venda B2B e devolução integral ao estoque em caso de cancelamento ou exclusão do pedido no painel, garantindo rastreabilidade do estoque físico com exclusão em cascata financeira e de itens associados.
- **Prevenção de Conflito de EF Core (Tracking Conflict):** Saneado o bug de tracking circular (`another instance is already being tracked`) no `VendaService.cs` através do desligamento da navegação circular dos produtos.
- **Invalidação de Cache deDropdowns:** Invalidação imediata do cache do react-query para `['produtos']` e `['vendas']` nas mutações de criação/exclusão/atualização de pedidos B2B, garantindo a sincronia instantânea de quantidades de estoque no frontend sem refresh de tela.
- **Cerca Virtual do Ponto (Geolocalização):** Cerca virtual expandida de 50 metros para **100 metros** no backend (`PontoController.cs`) e frontend (`ConfiguracoesEmpresa.tsx`).
- **Otimização de Bateria e Ponto Dinâmico:** A geolocalização por GPS do dispositivo agora é solicitada e validada **apenas na primeira batida do dia (entrada)**. Para as demais 3 marcações (intervalo e saída), a geolocalização é ignorada, agilizando o fluxo operacional e prevenindo erros de GPS no decorrer da jornada.
- **Dashboards Executivos de BI (Estoque Crítico):** Inclusão do monitor de estoque crítico (quantidade <= 10) na aba "Estoque" do Painel Executivo do Dashboard.
- **Correção de Geolocalização (Configurações da Empresa):** Correção na geração de endereços e na lógica do interpretador `parseEndereco` nas Configurações da Empresa. Agora usa o delimitador consistente ` - `, tratando de forma 100% retrocompatível endereços legados com vírgula para que a Cidade e o Estado não fiquem desatualizados ou invertidos.
- **Acessibilidade e Ajuste na Folha de Pagamento:** Ajuste nas fontes do `LandingPage.tsx` para garantir máximo contraste visual e atualização do subcabeçalho da Folha de Pagamento para "Gestão de salários e contracheques.".
- **Logomarca nas Comandas:** A comanda em PDF emitida a partir do Painel de Vendas B2B agora exibe dinamicamente a logomarca da empresa configurada em "Configurações da Empresa".
- **Filtro de Motoristas no B2B:** Adicionado select dinâmico e responsivo na barra de filtros do Painel B2B para filtragem instantânea de pedidos por motorista encarregado da rota.

---
## 🚀 Execução do Projeto
- [Cronograma de Execução](cronograma-execucao.md) - Fases e Status.

**Nota para a IA:** Ao implementar qualquer módulo, cruze as informações técnicas da pasta `2-tecnica` com as regras de negócio da pasta `1-negocio`.