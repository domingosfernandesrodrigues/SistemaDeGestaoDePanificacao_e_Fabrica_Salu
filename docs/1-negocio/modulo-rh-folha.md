# Módulo: RH e Folha de Pagamento

## 1. Controle de Jornada
- Registro de horas trabalhadas por funcionário.
- Configuração de Horas Extras: 50%, 100% ou customizado por cargo.

## 2. Processamento de Folha de Pagamento
O processamento da folha é segmentado por tipo para atender às regras legais e tributações isoladas:
- **Folha Mensal Padrão**:
  - **Cálculo de Proventos**: Salário base proporcionalizado aos dias trabalhados (divisor 220h) + Horas Extras + Adicional Noturno.
  - **Férias no Contracheque (CLT Art. 144)**: Proventos de férias gozadas no próximo mês são antecipados e discriminados na folha mensal anterior (incluindo férias brutas, 1/3 constitucional, abono pecuniário e adiantamento do 13º solicitado nas férias).
  - **Recálculo de Folha Fechada**: O sistema permite recalcular e reprocessar folhas com o status `Fechada` (desde que ainda não estejam com o status `Paga`). Ao reprocessar, o salário líquido e todas as rubricas correspondentes são atualizados, refletindo-se automaticamente no valor pendente da Conta a Pagar associada no módulo financeiro.
- **1ª Parcela do 13º Salário (Adiantamento)**:
  - Provento fixado em 50% do salário nominal.
  - Sem incidência de impostos (INSS/FGTS) ou descontos na primeira parcela, conforme a legislação brasileira.
  - **Regra de Bloqueio (Anti-Duplicidade)**: Se o funcionário solicitou e recebeu o adiantamento do 13º diretamente nas férias durante o ano corrente, ele é automaticamente desconsiderado do lote de processamento da folha de adiantamento em lote.
- **2ª Parcela do 13º Salário (Final)**:
  - Provento de 100% do salário nominal do funcionário.
  - **Dedução do Adiantamento**: Desconto automático da 1ª parcela paga anteriormente (via folha de adiantamento ou via adiantamento em férias) por meio da rubrica `920`.
  - **INSS sobre 13º**: Alíquota simplificada de 8% (rubrica `900`) calculada sobre o valor bruto integral.
  - O valor líquido corresponde ao saldo final devido após as deduções.

## 3. Gestão e Planejamento de Férias
- **Planejamento Anual (CLT Art. 129/130)**:
  - Validação do direito após a conclusão do período aquisitivo de 12 meses.
  - Cálculo de dias adquiridos com base nas faltas injustificadas registradas (30, 24, 18, 12 ou 0 dias).
- **Abono Pecuniário (CLT Art. 143)**: Opção de conversão de 1/3 do período de férias adquirido em dinheiro (abono pecuniário) a ser quitado junto com o adiantamento de férias.
- **Adiantamento do 13º nas Férias (Lei 4.090/62)**: Opção de adiantar 50% da gratificação natalina na folha mensal do mês anterior ao início das férias.
- **Workflow e Regra de Integração na Folha**:
  - Quando um planejamento de férias é cadastrado, ele inicia com o status `Planejada` (aguardando aprovação).
  - **Bloqueio de Férias Planejadas**: Férias no status `Planejada` não são computadas ou exibidas no processamento ou recálculo da folha de pagamento de nenhum funcionário.
  - **Aprovação de Férias**: O RH ou Gestor deve aprovar formalmente o planejamento de férias (status passa a `Aprovada`). 
  - **Integração no Contracheque**: Somente após a aprovação das férias (status `Aprovada`, `Iniciada` ou `Concluída`) os valores serão incluídos automaticamente no contracheque correspondente (CLT Art. 144) e integrados ao processamento da folha.

## 4. Gestão de Afastamentos
- Solicitação de afastamentos pelo colaborador (Licenças, Férias, Atestados).
- Upload e gestão de anexos comprobatórios (PDF/Imagens).
- Workflow de Aprovação/Reprovação pelo Gestor/RH.
- Integração com a Folha de Pagamento para geração automática de descontos proporcionais (Ex: Faltas não justificadas, Layoff).

## 5. Integração Financeira
- **Geração de Contas a Pagar**: O fechamento da folha (Mensal, 1ª Parcela ou Parcela Final) gera automaticamente um título de "Contas a Pagar" pendente no módulo Financeiro:
  - Para folha mensal: Título gerado para vencimento no 5º dia útil do mês subsequente.
  - Para 1ª Parcela do 13º: Título gerado com vencimento no final do mês de referência.
  - Para 2ª Parcela do 13º: Título gerado com vencimento de forma obrigatória até **20 de Dezembro**.
- **Fluxo de Pagamento Direto**: O RH/Gestor pode efetuar o pagamento da folha de pagamento com status `Fechada` diretamente pela tela de folhas no ERP (botão "Pagar Folha"). O sistema liquidará automaticamente a Conta a Pagar pendente associada a ela, atualizando os saldos da respectiva conta bancária e gerando a movimentação bancária e de extrato. A folha passará então ao status `Paga`.
- **Prevenção de Duplicidade no Painel Executivo**: As despesas classificadas na categoria `"Folha de Pagamento"` sob a forma de Contas a Pagar são desconsideradas na listagem geral de contas de competência do Painel Executivo para evitar a duplicidade de valores com a métrica `TotalPayroll`, garantindo indicadores precisos nos gráficos e resumos financeiros.

## 6. Geração de Documentos e Performance
- **Holerite Detalhado em PDF**: Emissão do contracheque (via QuestPDF) contendo todas as rubricas padrão (Salário Mensal, Horas Extras, Adicional Noturno) bem como rubricas de férias (`810` - Férias, `811` - 1/3 Constitucional, `820` - Abono Pecuniário) e de adiantamento de 13º (`131`).
- **Validade Visual**: Exibição da logomarca da empresa em alta qualidade no topo do recibo.
- **Performance de Geração**: O sistema utiliza cache de imagem para o logo, evitando downloads redundantes de URLs externas.
- **Otimização de Dados**: Logos de empresa devem ser comprimidos no upload para garantir que a geração do PDF (QuestPDF) seja concluída em menos de 500ms.

## 7. Métricas de RH
- **Custo por Funcionário**: Despesas totais (Salário + Encargos + Benefícios) / Número de funcionários.
- **Produtividade por Turno**: (Volume de Produção ou Vendas) / (Horas Trabalhadas no Turno).
- **Turnover Rate**: (Número de saídas / Média de funcionários) * 100.

## 8. Meus Contracheques (Acesso do Funcionário)

### Regra de Exibição do Valor Líquido
O campo `SalarioLiquido` e demais valores financeiros detalhados do holerite **só são visíveis** quando o status da folha for `Liberado`. Para qualquer outro status, o sistema exibe `"Aguardando Liberação"`.

| Status da Folha | Valor Líquido Visível? |
|----------------|------------------------|
| `Pendente` | ❌ Oculto |
| `EmProcessamento` | ❌ Oculto |
| `Liberado` | ✅ Exibido |
| `Cancelado` | ❌ Oculto |

**Justificativa:** Evita que o funcionário visualize valores antes da validação e aprovação pelo RH/Gestor, prevenindo questionamentos antecipados sobre valores que ainda podem ser ajustados.

**Endpoint:** `GET /api/v1/Contracheques/meus`
- Retorna a lista de folhas do funcionário autenticado (via `FuncionarioId` do token JWT).
- O campo `SalarioLiquido` é retornado como `null` ou omitido no DTO quando o status for diferente de `Liberado`.

## 9. Lançamento de Alimentação — Acesso por Perfil

Consulte a documentação detalhada em [lancamento-alimentacao.md](lancamento-alimentacao.md).

**Resumo de Regras:**

| Perfil | Pode Lançar | Visualiza | Pode Excluir |
|--------|------------|-----------|--------------|
| Admin / Gestor | Para qualquer funcionário | Todos os lançamentos | ✅ |
| Operador / Motorista | Apenas o próprio | Apenas os próprios | ❌ |

## 10. Módulo: Trabalhe Conosco (Recrutamento e Seleção)

Este submódulo gerencia o processo de recrutamento de talentos da Salú, conectando o público externo ao setor de RH da empresa.

### A. Fluxo de Candidatura (Público)
* **Envio na Landing Page:** Candidatos informam Nome Completo, E-mail, Telefone, Cargo de Interesse e Mensagem Opcional, anexando o arquivo do currículo.
* **Máscara e Validação de Inputs:** O campo de telefone possui máscara dinâmica para formatos brasileiros fixos ou móveis `(99) 9999-9999` ou `(99) 99999-9999` em tempo real. O formulário é validado via Zod e enviado de forma transacional.
* **Segurança do Arquivo (Upload Seguro):**
  * O tamanho máximo do currículo é de **5MB**.
  * Extensões aceitas no backend e frontend: apenas `.pdf`, `.doc` e `.docx`.
  * Os currículos são renomeados para GUIDs aleatórios para mitigar ataques de spoofing.
  * O armazenamento é feito fora do diretório público `wwwroot` (na pasta física `/Uploads/Curriculos`), inviabilizando a execução de scripts executáveis remotos (RCE).

### B. Painel do Recrutador (Restrito)
* **Acesso Administrativo:** Somente usuários com as roles de `Admin` ou `Gestor` visualizam a aba "Currículos Recebidos" no ERP.
* **Recursos do Painel:**
  * Busca em tempo real de candidatos e filtros rápidos por cargo de interesse ou status.
  * Download seguro do arquivo do currículo e modal para leitura de mensagem de apresentação.
  * Atualização de status da candidatura (`Novo`, `Em Análise`, `Entrevista`, `Contratado`, `Recusado`).
  * Exclusão definitiva de candidaturas obsoletas.
* **Tema Visual:** O painel segue estritamente o padrão de **tema claro** unificado do ERP (com fundo `bg-white` e inputs claros) para máxima ergonomia e consistência com os demais cadastros.
