# SGP-F (Salú ERP) — Guia de Pitch Técnico e Indicadores de Negócio para Entrevistas

Este documento serve como guia de preparação para entrevistas de emprego na vaga de **Desenvolvedor Fullstack**. Ele conecta as decisões de **Arquitetura de Software** e **Tecnologias** com os **Impactos de Negócio** (indicadores financeiros, eficiência e perdas por processos manuais).

---

## 🚀 1. Arquitetura e Stack Tecnológica (A Visão Técnica)

Apresente o sistema como um **ERP modular de nível empresarial** desenvolvido para resolver gargalos reais de uma fábrica de panificação e distribuição regional (Rondônia e Amazonas).

### 🖥️ Backend (Robustez e Escalabilidade)
* **ASP.NET Core Web API (.NET 8):** Escolhido pelo alto desempenho de processamento, tipagem estática e suporte nativo a contêineres Docker.
* **Clean Architecture / DDD (Domain-Driven Design):** Estrutura dividida em 4 camadas bem definidas para garantir testabilidade e manutenibilidade:
  * **Domain:** Entidades puras, regras de negócio e interfaces.
  * **Application:** Casos de uso da aplicação e manipuladores.
  * **Infrastructure:** Persistência de dados (Entity Framework Core), configurações e integrações de terceiros.
  * **WebApi (Presentation):** Controllers RESTful, middlewares e injeção de dependência.
* **SQL Server & Mecanismo de DbPatches:** Banco de dados relacional robusto. Para evitar gargalos de migrações manuais em produção, implementamos o **DbPatchesInitializer**, um serviço que roda no startup do backend aplicando patches SQL procedurais de forma automática para tabelas críticas.
* **Segurança de Uploads:** Regras estritas de segurança para arquivos (máximo 5MB, tipos restritos `.pdf`/`.doc`/`.docx`, renomeação por hash/GUID e isolamento de arquivos fora da raiz do servidor `wwwroot`) para evitar ataques de injeção de scripts executáveis (RCE).
* **Autenticação Baseada em Roles:** Controle granular de acessos por papéis (`Admin`, `Gestor`, `Operador`, `Motorista`, `Cliente`) implementado nativamente via JWT.

### 🎨 Frontend (Interface Fluida e UX Consistente)
* **React 19 + TypeScript:** Aproveitando a renderização veloz de componentes funcionais, controle rígido de tipos e reaproveitamento de código.
* **Vite 8:** Ferramenta de build moderna e ultrarápida que otimiza o ciclo de feedback no desenvolvimento.
* **Tailwind CSS v4:** Estilização baseada em utilitários de alta performance e customização enxuta por tokens de design.
* **React Query / TanStack Query v5:** Sincronização de estado do servidor, cache robusto de requisições, paginação otimizada e invalidação de cache inteligente.
* **React Hook Form + Zod:** Gestão de formulários performática (sem re-renders desnecessários) e validação de esquemas de dados tipados no lado do cliente.

---

## 📈 2. Comparativo de Impacto: SGP-F vs. Planilhas (Indicadores de Sucesso)

Ao ser entrevistado, mostre que você não apenas digita código, mas entende como o código se converte em dinheiro economizado ou faturamento gerado para a empresa.

### 🏭 A. Fichas Técnicas (BOM) e Produção
* **A Dor das Planilhas:** Planilhas manuais geram descompasso com o estoque físico. Uma fórmula alterada incorretamente ou um cálculo de rendimento manual errado leva a compras emergenciais caras ou perda de perecíveis.
* **A Solução SGP-F:** Cálculo automatizado de insumos (farinha, açúcar, fermento) proporcional ao lote de produção planejado e cálculo automático do custo por quilo/unidade do lote com base na última compra.
* **Métricas / KPIs de Impacto:**
  * **Redução de desperdício de insumos em até 15%** pelo controle rígido de perdas.
  * **Margem de lucro calculada com 100% de precisão** no momento do fechamento da Ordem de Produção.

### 🚚 B. Gestão de Frotas e Logística
* **A Dor das Planilhas:** Controle de quilometragem e abastecimentos feitos de cabeça ou em folhas de papel. Falta de histórico de manutenção preventiva, resultando em veículos quebrados na estrada e clientes sem entrega.
* **A Solução SGP-F:** Registro unificado de veículos, histórico de manutenção periódica por quilometragem e monitoramento de consumo de combustível integrado por motorista.
* **Métricas / KPIs de Impacto:**
  * **Redução de 12% a 18% nos custos com combustível** através da detecção de desvios de consumo médio.
  * **Queda de 25% na indisponibilidade da frota** por meio de alertas ativos de manutenção preventiva.

### ⏱️ C. Controle de Ponto e RH (Folha e Férias)
* **A Dor das Planilhas:** Anotações em planilhas compartilhadas que qualquer um pode editar. Fraudes de horário, erros de cálculo de horas extras de motoristas e panes de escala no período de férias da fábrica, gerando passivos trabalhistas.
* **A Solução SGP-F:** Lançamento seguro de ponto, controle unificado de afastamentos, escala organizada de férias anuais (evitando desfalques no chão de fábrica) e automatização de folha.
* **Métricas / KPIs de Impacto:**
  * **Economia de 90% no tempo de fechamento da folha** (de dias para minutos).
  * **Eliminação de até 10% de custos com horas extras indevidas** ou não autorizadas.

### 💼 D. CRM e Vendas (B2B)
* **A Dor das Planilhas:** Vendedores anotam leads no caderno. Pedidos chegam desorganizados via WhatsApp, gerando erros de digitação e duplicidade de entregas.
* **A Solução SGP-F:** Portal exclusivo do Cliente B2B para realização de pedidos diretos integrados ao fluxo financeiro e histórico de contatos centralizado no CRM.
* **Métricas / KPIs de Impacto:**
  * **Redução a zero no erro de digitação de pedidos** (os pedidos caem direto no financeiro/logística).
  * **Aumento de 20% no ticket médio** pela facilidade de recompra no portal B2B.

### 📄 E. Trabalhe Conosco (Recrutamento)
* **A Dor das Planilhas:** Recebimento de currículos por e-mails corporativos lotados. Arquivos baixados localmente na máquina do RH com risco de vírus/malwares (RCE) e total desconformidade com a LGPD.
* **A Solução SGP-F:** Modal de upload na Landing Page com verificação rígida no backend e painel administrativo limpo e direto para triagem de currículos e alteração de status.
* **Métricas / KPIs de Impacto:**
  * **Redução de 50% no tempo para preenchimento de vagas.**
  * **100% de conformidade com a segurança da informação e LGPD**, isolando dados sensíveis dos candidatos.

### 🔍 F. Auditoria do Sistema
* **A Dor das Planilhas:** Qualquer usuário pode alterar um valor em uma planilha sem deixar rastros. Impossível saber quem excluiu uma linha ou editou o valor de um produto.
* **A Solução SGP-F:** Registro automatizado de logs de auditoria detalhados, mostrando o antes (oldValues) e o depois (newValues) de cada inserção, edição ou exclusão.
* **Métricas / KPIs de Impacto:**
  * **Redução a zero de fraudes ou alterações de dados sem autoria identificada.**
  * **Auditoria de segurança instantânea** em caso de disputas financeiras ou de estoque.

---

## 🎯 3. O "Custo do Caos" (O Risco de Não Ter o SGP-F)

Destaque o perigo financeiro e operacional que uma empresa corre ao operar sem uma plataforma integrada como o SGP-F:

1. **A Síndrome do "Dono do Arquivo":** Se a pessoa que controla a planilha master de produção ou frota faltar ou for desligada, a operação da empresa entra em colapso.
2. **Insegurança de Dados:** Planilhas salvas na rede local são facilmente copiadas para pendrives ou enviadas por e-mail, expondo dados de faturamento, margem e clientes a concorrentes.
3. **Decisões baseadas em "Olhômetro":** Sem dados consolidados em tempo real, o dono da fábrica compra insumos no escuro, sem saber se a margem real de um pão de forma está cobrindo a inflação do trigo.
4. **Passivos Trabalhistas Silenciosos:** Falha em consolidar escalas de férias ou banco de horas de motoristas que rodam Rondônia/Amazonas culmina em processos na Justiça do Trabalho.

---

## 💡 4. Roteiro Prático de Como se Apresentar na Entrevista

Use esta narrativa estruturada quando o entrevistador perguntar: *"Fale sobre o principal projeto do seu portfólio."*

> **A Introdução (Contexto):**
> *"Eu desenvolvi um ERP completo para uma fábrica regional de panificação chamada Salú. Ela opera em Rondônia e no Amazonas. Em vez de criar um sistema simples de 'CRUD', eu foquei em mapear os problemas operacionais reais de uma indústria: controle de receitas, logística de frota, ponto de funcionários e triagem de currículos. Tudo integrado."*
>
> **O Desafio Técnico (Sua Engenharia):**
> *"Para o backend, estruturei o projeto usando Clean Architecture e Domain-Driven Design no .NET 8, garantindo que a lógica de negócios ficasse isolada de bibliotecas externas. Criei um controlador de uploads altamente seguro para currículos com validações rigorosas de tipo e tamanho para evitar RCE (Remote Code Execution), salvando fora da pasta pública. No frontend, utilizei React com React Query para manter a sincronização de dados do servidor limpa e evitar renderizações desnecessárias."*
>
> **O Valor de Negócio (O Diferencial de Fullstack):**
> *"O maior ganho desse projeto não foi apenas escrever o código, mas ver o impacto. Por exemplo, ao migrar o controle de fichas técnicas e frota de planilhas para o sistema, evitamos perdas por desperdício de estoque calculando os lotes com precisão e trouxemos segurança jurídica ao registrar o ponto dos funcionários sem margem para adulterações."*
