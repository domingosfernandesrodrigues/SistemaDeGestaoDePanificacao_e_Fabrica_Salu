# Plano de Implementação - Lançamento de Alimentação e Integração Financeira

Este plano descreve o design e as etapas de implementação para adicionar um novo formulário de **Lançamento de Alimentação** no sistema SGPF, integrado automaticamente com o módulo de contas a pagar (**Integração Financeira**).

---

## User Review Required

> [!IMPORTANT]
> **Modelo de Lançamento:** O fluxo assume que um usuário administrativo (Admin ou Gestor) faz os lançamentos de alimentação para os funcionários. Quando um lançamento é efetuado, o sistema cria automaticamente uma conta a pagar (`ContaPagar`) pendente sob a categoria `"Alimentação"`.
> 
> **Exclusão/Estorno:** Ao excluir um lançamento de alimentação, o sistema automaticamente removerá a correspondente `ContaPagar` caso ela ainda esteja com status `Pendente`, para manter a integridade dos dados e evitar duplicidades ou pagamentos indevidos.

---

## Open Questions

Para garantir que a implementação atenda perfeitamente à sua necessidade, por favor revise as seguintes questões:

1. **Permissões de Acesso:** Apenas administradores e gestores poderão fazer e visualizar os lançamentos de alimentação, ou o funcionário também deve poder ver um histórico simplificado das suas próprias refeições?
2. **Definição de Valores:** O valor de cada refeição (Café, Almoço, Jantar) é fixo por tipo de refeição ou o usuário deve digitar o valor manualmente a cada lançamento?
3. **Data de Vencimento:** Qual deve ser o vencimento padrão da conta a pagar gerada? Definiremos por padrão a mesma data do consumo da refeição (vencimento à vista) ou há outro prazo padrão (ex: 30 dias, fim do mês corrente)?

---

## Proposed Changes

### Backend (.NET API)

#### [NEW] [LancamentoAlimentacao.cs](file:///c:/Users/Domingos/source/repos/SistemaDeGestaoDePanificacao_e_Fabrica_Salu/Backend/SGPF.Domain/Entities/LancamentoAlimentacao.cs)
- Nova entidade do domínio representando o lançamento da refeição de um funcionário.
- Propriedades: `Id`, `FuncionarioId`, `Funcionario`, `Data`, `TipoRefeicao` ("Café", "Almoço", "Jantar"), `Valor`, `Observacao`, `DataCriacao`.

#### [MODIFY] [AppDbContext.cs](file:///c:/Users/Domingos/source/repos/SistemaDeGestaoDePanificacao_e_Fabrica_Salu/Backend/SGPF.Infrastructure/Data/AppDbContext.cs)
- Adicionar `public DbSet<LancamentoAlimentacao> LancamentosAlimentacao { get; set; }`.
- Configurar relacionamento no método `OnModelCreating` com `DeleteBehavior.Restrict` para manter a integridade dos funcionários e configurar a precisão de `Valor` com `HasPrecision(18, 2)`.

#### [MODIFY] [Program.cs](file:///c:/Users/Domingos/source/repos/SistemaDeGestaoDePanificacao_e_Fabrica_Salu/Backend/SGPF.WebApi/Program.cs)
- Adicionar o script SQL autogerido na inicialização para criar a tabela `LancamentosAlimentacao` caso ela não exista, incluindo a foreign key de funcionário.

#### [NEW] [LancamentosAlimentacaoController.cs](file:///c:/Users/Domingos/source/repos/SistemaDeGestaoDePanificacao_e_Fabrica_Salu/Backend/SGPF.WebApi/Controllers/LancamentosAlimentacaoController.cs)
- Novo controller REST expondo os seguintes endpoints:
  - `GET /api/v1/LancamentosAlimentacao` (retorna todos os lançamentos ordenados por data decrescente, incluindo nome do funcionário).
  - `POST /api/v1/LancamentosAlimentacao` (cria o lançamento e gera a `ContaPagar` pendente associada).
  - `DELETE /api/v1/LancamentosAlimentacao/{id}` (exclui o lançamento e estorna a `ContaPagar` pendente correspondente).

---

### Frontend (React & TypeScript)

#### [NEW] [Alimentacao.tsx](file:///c:/Users/Domingos/source/repos/SistemaDeGestaoDePanificacao_e_Fabrica_Salu/Frontend/src/pages/Alimentacao.tsx)
- Nova página premium com visual moderno seguindo a paleta de cores aconchegantes da panificadora (tons terra, ember, fire, cream).
- Contém:
  - Formulário para registrar refeição com seleção de Funcionário (busca assíncrona/select), Tipo de Refeição (Café, Almoço, Jantar), Data do consumo, Valor e campo de Observações opcional.
  - Tabela com histórico detalhado e paginação eficiente.
  - Filtros por funcionário, tipo de refeição e intervalo de datas.
  - Botão de exclusão (estorno automático).

#### [MODIFY] [Layout.tsx](file:///c:/Users/Domingos/source/repos/SistemaDeGestaoDePanificacao_e_Fabrica_Salu/Frontend/src/components/ui/Layout.tsx)
- Adicionar no menu de navegação lateral (Sidebar) o link para a nova tela: `"Lançamento de Alimentação"`, sob a rota `/rh/alimentacao`, visível para os papéis `Admin` e `Gestor`.

#### [MODIFY] [App.tsx](file:///c:/Users/Domingos/source/repos/SistemaDeGestaoDePanificacao_e_Fabrica_Salu/Frontend/src/App.tsx)
- Registrar a rota `/rh/alimentacao` direcionando para a nova página `Alimentacao`.

---

## Verification Plan

### Automated Tests & Compilação
- Compilação do Backend com `dotnet build` na pasta `Backend` para atestar a correção sintática.
- Validação estrita de tipos com `npx tsc --noEmit` no frontend.
- Build do frontend com `npm run build`.

### Manual Verification
1. Acessar a tela com usuário gestor e verificar o carregamento de funcionários no formulário.
2. Efetuar lançamentos de Café, Almoço e Jantar para diferentes funcionários e datas.
3. Verificar na página de **Despesas Gerais** se as respectivas contas a pagar foram criadas com o valor correto, categoria `"Alimentação"` e status `"Pendente"`.
4. Excluir um lançamento e certificar-se de que a despesa associada foi estornada e removida das contas pendentes.
