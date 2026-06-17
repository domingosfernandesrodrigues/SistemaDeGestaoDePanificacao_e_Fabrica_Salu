# Guia Operacional - RH e Folha de Pagamento

## 1. Cadastro de Jornada
- Acesse 'Configurações de RH' e defina o percentual de horas extras por cargo.
- Vincule o funcionário ao seu respectivo cargo e salário base.

## 2. Fechamento de Ciclo Mensal e Recálculo
- **Passo A:** Registre ou verifique as batidas de ponto no módulo de 'Controle de Ponto'.
- **Passo B:** Acesse 'Folha de Pagamento' e clique em **"Processar Mês Atual"**. O sistema identificará automaticamente feriados e jornadas noturnas (22h às 05h), além de puxar as férias aprovadas do mês seguinte.
- **Passo C:** Revise os valores calculados (HE 50%, HE 100%, Adicional Noturno e Descontos).
- **Passo D:** Clique em **"Fechar Folha"** para consolidar o mês e gerar automaticamente o lançamento no Financeiro (Contas a Pagar).
- **Recálculo de Folhas Fechadas:** Se for necessário alterar parâmetros de uma folha que já foi fechada, clique no botão **"Processar"** no topo da tela. O recálculo será executado e o valor pendente no contas a pagar do financeiro será atualizado automaticamente, desde que a folha não tenha sido paga ainda.

## 3. Gestão e Aprovação de Férias
- **Planejamento:** Cadastre as férias do funcionário no módulo de **Planejamento de Férias**. Por padrão, elas serão criadas com o status `Planejada`.
- **Aprovação:** Na listagem de planejamentos, clique no botão **"Aprovar Férias"** (ícone de check verde) para confirmar o período. Férias no status `Planejada` **não** serão integradas ao contracheque do funcionário. Apenas férias com o status `Aprovada` serão puxadas automaticamente no contracheque do mês anterior (conforme CLT Art. 144).
- **Cancelamento:** Se necessário, clique no botão **"Cancelar Férias"** informando o motivo. Férias canceladas perdem a validade e não afetam os cálculos.

## 4. Emissão de Contracheques (Holerites)
- Após o processamento, clique no ícone de **"Baixar Contracheque"** (seta para baixo) na linha do funcionário.
- O sistema gerará um PDF profissional formatado para impressão.
- **Dica de Performance:** O primeiro download do dia pode demorar 1-2 segundos para carregar a identidade visual; os downloads seguintes serão instantâneos devido ao sistema de cache inteligente.
- **Identidade Visual:** Se o logo da empresa não aparecer ou estiver distorcido, atualize a imagem em 'Dados da Empresa' (o sistema fará a otimização automática no upload).

## 5. Liquidação e Pagamento da Folha
- Acesse a aba **"Histórico de Fechadas"** na tela de Folha de Pagamento.
- Localize a folha de pagamento do colaborador correspondente (com status `Fechada`).
- Clique no botão **"Pagar Folha"** (ícone de cifrão verde) e confirme o pagamento.
- O sistema dará baixa automática no contas a pagar do financeiro, atualizará o saldo da conta bancária padrão e gerará a respectiva movimentação bancária. A folha passará a exibir o status `Paga`.

## 6. Gestão de Adiantamentos
- Registre vales ou adiantamentos ao longo do mês; eles serão abatidos automaticamente no processamento final da folha.

## 7. Configuração de Cargos e Salários
- Acesse 'Recursos Humanos > Cargos' para definir faixas salariais e funções.
- Vincule os funcionários aos cargos para garantir a aplicação correta dos custos na folha e na ficha técnica de produtos.
- Utilize a tabela de "Atribuições" para documentar as responsabilidades de cada cargo, facilitando a gestão de desempenho e o enquadramento legal.
- **Importante:** A variação percentual de hora extra deve ser definida por cargo ou por funcionário, conforme a legislação e as políticas da empresa.

## 8. Cadastro de Funcionários
- Acesse 'Recursos Humanos > Funcionários' para cadastrar novos colaboradores.
- Preencha os campos obrigatórios, incluindo dados pessoais, informações de contato, cargo, salário base e data de admissão.
- **Importante:** O campo "Salário Base" é utilizado para calcular os custos na folha de pagamento e na ficha técnica de produtos.
- Vincule os funcionários aos cargos para garantir a aplicação correta dos custos na folha e na ficha técnica de produtos.
- Utilize a tabela de "Atribuições" para documentar as responsabilidades de cada cargo, facilitando a gestão de desempenho e o enquadramento legal.