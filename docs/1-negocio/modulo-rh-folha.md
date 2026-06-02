# Módulo: RH e Folha de Pagamento

## 1. Controle de Jornada
- Registro de horas trabalhadas por funcionário.
- Configuração de Horas Extras: 50%, 100% ou customizado por cargo.

## 2. Processamento de Folha de Pagamento
O processamento da folha é segmentado por tipo para atender às regras legais e tributações isoladas:
- **Folha Mensal Padrão**:
  - **Cálculo de Proventos**: Salário base proporcionalizado aos dias trabalhados (divisor 220h) + Horas Extras + Adicional Noturno.
  - **Férias no Contracheque (CLT Art. 144)**: Proventos de férias gozadas no próximo mês são antecipados e discriminados na folha mensal anterior (incluindo férias brutas, 1/3 constitucional, abono pecuniário e adiantamento do 13º solicitado nas férias).
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
- **Workflow de Aprovação**: Status do agendamento (Planejada, Aprovada, Iniciada, Concluída, Cancelada).

## 4. Gestão de Afastamentos
- Solicitação de afastamentos pelo colaborador (Licenças, Férias, Atestados).
- Upload e gestão de anexos comprobatórios (PDF/Imagens).
- Workflow de Aprovação/Reprovação pelo Gestor/RH.
- Integração com a Folha de Pagamento para geração automática de descontos proporcionais (Ex: Faltas não justificadas, Layoff).

## 5. Integração Financeira
- O fechamento da folha (Mensal, 1ª Parcela ou Parcela Final) gera automaticamente um título de "Contas a Pagar" no módulo Financeiro:
  - Para folha mensal: Título gerado para vencimento no 5º dia útil do mês subsequente.
  - Para 1ª Parcela do 13º: Título gerado com vencimento no final do mês de referência.
  - Para 2ª Parcela do 13º: Título gerado com vencimento obrigatoriamente até **20 de Dezembro**.

## 6. Geração de Documentos e Performance
- **Holerite Detalhado em PDF**: Emissão do contracheque (via QuestPDF) contendo todas as rubricas padrão (Salário Mensal, Horas Extras, Adicional Noturno) bem como rubricas de férias (`810` - Férias, `811` - 1/3 Constitucional, `820` - Abono Pecuniário) e de adiantamento de 13º (`131`).
- **Validade Visual**: Exibição da logomarca da empresa em alta qualidade no topo do recibo.
- **Performance de Geração**: O sistema utiliza cache de imagem para o logo, evitando downloads redundantes de URLs externas.
- **Otimização de Dados**: Logos de empresa devem ser comprimidos no upload para garantir que a geração do PDF (QuestPDF) seja concluída em menos de 500ms.

## 7. Métricas de RH
- **Custo por Funcionário**: Despesas totais (Salário + Encargos + Benefícios) / Número de funcionários.
- **Produtividade por Turno**: (Volume de Produção ou Vendas) / (Horas Trabalhadas no Turno). 
- **Turnover Rate**: (Número de saídas / Média de funcionários) * 100.

      