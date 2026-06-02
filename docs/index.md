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

## 📌 Status Atual do Sistema (01/06/2026)
O sistema SGP-F encontra-se em estado de **Produção — Estabilidade Geral, Criptografia de Alta Segurança, Precisão de GPS Calibrada e Integração Completa de Férias/13º Salário (CLT)**.

- **Precisão de Calibração de GPS (Ponto e Empresa):**
  - **Calibração Ativa (`watchPosition`):** O registro de ponto do funcionário (`Ponto.tsx`) e a captura de localização da empresa (`ConfiguracoesEmpresa.tsx`) agora contam com escuta ativa do chip GPS por até 5 segundos ou até atingir precisão <= 20 metros, evitando distorções comuns causadas por geolocalização em cache.
  - **Fallback no Geocodificador:** Busca encadeada no Nominatim (Logradouro/Número -> Logradouro/Cidade -> CEP) eliminando desvios na geolocalização a partir do endereço.
- **Controle de Férias e Gratificação de 13º Salário (CLT):**
  - **Integração de Férias e 13º:** Possibilidade de planejar férias solicitando abono pecuniário (CLT Art. 143) de até 10 dias e o adiantamento de 50% do 13º salário (Lei 4.090/62).
  - **Processamento de Folha Dinâmico:** Nova segmentação de folha por tipo: Mensal Padrão, 1ª Parcela 13º (Adiantamento) e 2ª Parcela 13º (Final).
  - **Prevenção de Duplicidade (Bloqueio):** Bloqueio automático de pagamento duplo da primeira parcela do 13º; o processamento em lote da 1ª parcela ignora funcionários que já solicitaram/receberam o adiantamento nas férias.
  - **Cálculo e Dedução Automática:** Dedução da primeira parcela de 13º (via férias ou folha em lote) na folha de 2ª parcela final (rubrica `920`), com aplicação de INSS de 8% (rubrica `900`) sobre o 13º integral.
  - **Fidelidade no Contracheque PDF:** Correção na persistência e na geração do PDF para exibir detalhadamente todas as rubricas de férias (`810`, `811`, `820`) e de adiantamento de 13º nas férias (`131` - "Adiantamento de 13º Salário (Férias)") de modo que a soma confira exatamente com o salário líquido do funcionário.
- **Integração Financeira e Conciliação Genérica (Inbound & Webhooks):**

  - **Gateway de Pagamento Universal:** Evolução dos endpoints de conciliação para suportar webhooks genéricos (`POST /api/v1/pagamentos/webhook/gateway`), mantendo retrocompatibilidade total com a rota anterior (`/webhook/asaas`).
  - **Cálculo de Liquidez e Tarifas:** Dedução automática de taxas (`NetValue` e `Fee`) informadas pelo processador diretamente na conta bancária durante o faturamento, evitando distorções no faturamento bruto.
  - **Fidelidade Temporal:** Gravação exata da data e hora real em que o cliente realizou o pagamento no gateway (`ClientPaymentDate`), mantendo a precisão cronológica em extratos e balanços.
  - **Resiliência Adaptativa e Fallback:** Roteamento automático de créditos de conciliação para a primeira conta bancária ativa disponível caso a conta padrão esteja inativa ou ausente, garantindo continuidade do fluxo operacional sem falhas. Rastreabilidade reforçada com gravação do ID de transação real na descrição da movimentação.
- **Criptografia Estrita & Auto-Migração de Senhas:**
  - **Segurança BCrypt de Alta Prioridade:** Purga definitiva de métodos de comparação de senha em texto simples no serviço de autenticação (`AuthService.cs`). Todas as credenciais de usuários agora são obrigatoriamente hasheadas e validadas com BCrypt (12 salt rounds).
  - **Auto-Migrador Transparente:** Ao iniciar, o sistema executa um migrador de segundo plano que detecta contas criadas no banco de dados com senhas em texto simples legadas, realiza o hash seguro via BCrypt e atualiza os registros de forma transparente para os usuários.
  - **Desacoplamento de Migrações (Bootstrap Limpo):** Remoção de mais de 300 linhas de comandos SQL brutos e estruturação de remendos do banco de dados de dentro do `Program.cs`, encapsulando a lógica na classe utilitária de injeção de dependência `DbPatchesInitializer.cs` para um boot limpo e modular.
- **Expurgo e Segurança de Código (Zero Caches Mortos):**
  - **Wipe Definitivo de Backdoors de Desenvolvimento:** Remoção física dos controladores temporários/inseguros que expunham o schema e as credenciais do banco, como o `DbCompareController.cs`, `DebugController.cs` e scripts locais como `check_db.cs`. Toda a área administrativa do backend está selada sob o atributo de segurança `[Authorize]`.
  - **Rotatividade e Limpeza de Logs:** Reativação e otimização do serviço assíncrono em segundo plano `LogRetentionService` para limpeza e arquivamento diário automático de registros históricos de auditoria.
- **Interface Cinética Futurista ("Wow Factor" Sem Cansaço Visual):**
  - **Rede Digital de Distribuição:** Implementação do componente dinâmico de constelação digital `<PhysicsCanvas />` na seção Hero da Landing Page (`LandingPage.tsx`). Ele simula uma malha geométrica minimalista em tons de âmbar e ouro brilhando sobre o plano de fundo escuro, agindo como uma metáfora viva das rotas de distribuição da Salú.
  - **Visual Confortável e Seguro:** Substituição de elementos pesados rotativos e de gravidade mecânica rápida (que causavam tontura) por uma deriva linear ultra-suave e linear de baixa velocidade (0.3px a 0.5px por quadro), resultando em tranquilidade e modernidade visual absoluta.
  - **Efeito Constelação Tridimensional:** Traçado de linhas finas translúcidas dinâmicas entre nós de dados adjacentes baseado em cálculos de distância vetorial. O cursor do mouse atua como um nó ativo magnético, atraindo suavemente a rede e projetando degradês de luz interativa conforme o usuário navega.
  - **Acessibilidade e Desempenho:** Renderização de alta definição escalada pelo pixel-ratio nativo do monitor, combinada com suporte total a `prefers-reduced-motion` para suspender loops físicos em favor de uma malha estática premium, poupando CPU e bateria.
  - **Logotipo Dinâmico na Comanda:** A comanda agora exibe dinamicamente a logomarca da empresa configurada em "Configurações da Empresa".
  - **Filtro de Motoristas no B2B:** Adicionado select dinâmico e responsivo na barra de filtros do Painel B2B para filtragem instantânea de pedidos por motorista encarregado da rota.
- **Usabilidade Mobile, BI Avançado e Impressão Térmica (28/05/2026):**
  - **Touch Drag-and-Drop no B2B:** Mapeamento completo de eventos de toque (`onTouchStart`, `onTouchMove`, `onTouchEnd`) nos cards de pedidos B2B, permitindo arrastar os cards na simulação de smartphone e em telas touch físicas usando detecção dinâmica de colunas (`document.elementFromPoint`).
  - **Menu de Status Mobile:** Integração de um seletor visual e suspenso de status nos cards para telas compactas (`md:hidden`), estilizado de acordo com o padrão cromático de cada coluna (*Ember*, *Amber*, *Fire*, *Green*, *Red*), facilitando a transição de status com um clique.
  - **Filtros B2B Fluídos e Responsivos:** Reestruturação da barra de filtros em um grid adaptativo (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 items-end`), separando o filtro de pagamento e o botão "Limpar Filtros" em suas próprias colunas para evitar achatamentos e clipping de texto.
  - **Saldos em Tempo Real nas OPs:** Exibição do estoque atual de insumos/produtos inline no dropdown de busca e inclusão de um cartão informativo premium de saldo (🔴 *Esgotado*, 🟡 *Estoque Baixo*, 🟢 *Disponível*) com animação de entrada ao selecionar itens no modal de nova OP.
  - **BI & Saldos de Produtos para Venda:** Nova listagem patrimonial de estoque de mercadorias no Dashboard (aba Estoque), organizando o painel em uma grade de 2 colunas simétricas (`lg:grid-cols-2 gap-8`) com rolagem vertical suave e redesenho das etiquetas de status de ambas as tabelas para fundos sólidos vibrantes de alto contraste e texto branco em negrito (`text-white text-xs font-bold shadow-sm`) para 100% de legibilidade em qualquer tema.
  - **Impressão de Comandas em Negrito e sem Cortes:** Otimização do arquivo de impressão térmica de 80mm (`VendaService.cs`), deslocando todo o conteúdo 35 pontos para baixo contra a guilhotina física do balcão, aumentando a logo para 80px e ativando a renderização global em negrito (`.Bold()`) para queima térmica de alto contraste.

---
## 🚀 Execução do Projeto
- [Cronograma de Execução](cronograma-execucao.md) - Fases e Status.

**Nota para a IA:** Ao implementar qualquer módulo, cruze as informações técnicas da pasta `2-tecnica` com as regras de negócio da pasta `1-negocio`.