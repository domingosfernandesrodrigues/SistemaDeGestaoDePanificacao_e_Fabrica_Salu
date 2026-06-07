# Plano de Testes — SGPF

## Visão Geral

A suíte de testes do SGPF é organizada em três camadas, seguindo a pirâmide de testes:

```
        /\          E2E — Playwright (Fluxos completos de usuário)
       /  \
      /----\        Integração — xUnit (Backend: Controllers + DB)
     /      \
    /--------\      Unitários — Vitest + RTL (Frontend: Componentes + Hooks)
```

---

## 1. Testes de Integração — Backend (xUnit)

**Framework:** xUnit + EF Core `InMemoryDatabase`  
**Projeto:** `Backend/SGPF.Tests/`  
**Padrão:** Cada teste cria e destrói seus próprios dados (isolamento total)

### Módulos cobertos (22 specs)

| Arquivo de Teste | Módulo |
|---|---|
| `ProdutosControllerTests.cs` | Cadastro de Produtos & Insumos |
| `FichaTecnicaControllerTests.cs` | Fichas Técnicas (BOM) |
| `OrdensProducaoControllerTests.cs` | Ordens de Produção (OP) |
| `ComprasControllerTests.cs` | Módulo de Compras & Entrada de Insumos |
| `ClientesControllerTests.cs` | Gestão de Clientes |
| `FornecedoresControllerTests.cs` | Gestão de Fornecedores |
| `VendasControllerTests.cs` | Painel de Vendas B2B |
| `LogisticaControllerTests.cs` | Controle de Frota & Trocas/Avarias |
| `ReunioesControllerTests.cs` | CRM & Agenda de Reuniões |
| `AgendaEventosControllerTests.cs` | Agenda de Eventos |
| `FuncionariosControllerTests.cs` | Recursos Humanos (Funcionários) |
| `PontoControllerTests.cs` | Controle de Ponto & Geofencing |
| `AfastamentosControllerTests.cs` | Aprovação de Afastamentos |
| `PlanejamentoFeriasControllerTests.cs` | Planejamento de Férias |
| `FolhaPagamentoControllerTests.cs` | Folha de Pagamento |
| `CandidaturasControllerTests.cs` | Currículos Recebidos (Recrutamento) |
| `LancamentosAlimentacaoControllerTests.cs` | Lançamentos de Alimentação |
| `DespesasControllerTests.cs` | Controle de Despesas |
| `ContasBancariasControllerTests.cs` | Contas Bancárias & Saldos |
| `UsuariosControllerTests.cs` | Controle de Usuários |
| `AuditoriaControllerTests.cs` | Auditoria do Sistema |
| `EmpresasControllerTests.cs` | Configurações da Empresa & GPS |

### Executar
```bash
cd Backend
dotnet test SGPF.Tests/SGPF.Tests.csproj --verbosity normal
```

---

## 2. Testes Unitários — Frontend (Vitest)

**Framework:** Vitest + @testing-library/react + jsdom  
**Diretório:** `Frontend/src/test/`  
**Padrão:** Mock de API (`axios`) + renderização de componentes isolada

### Módulos cobertos

Todos os 23 módulos de interface possuem testes de componente correspondentes, cobrindo:
- Renderização inicial e estados de loading
- Preenchimento de formulários e submissão
- Validações de erro (Zod)
- Interações com React Query (mutações e invalidações)

### Executar
```bash
cd Frontend
npm run test
```

---

## 3. Testes E2E — Playwright

**Framework:** @playwright/test (Chromium)  
**Configuração:** `Frontend/playwright.config.ts`  
**Diretório dos specs:** `Frontend/src/test/e2e/`

### Configuração
```typescript
// playwright.config.ts
baseURL: 'http://localhost:5173'
workers: 1           // Sequencial — evita conflitos de banco
timeout: 30000
trace: 'retain-on-failure'
screenshot: 'only-on-failure'
```

### Specs implementadas

| Arquivo | Fluxos testados |
|---|---|
| `auth.spec.ts` | Login Admin, redirect ao dashboard, navegação, logout |
| `ponto.spec.ts` | Clock-in dentro do geofencing ✅, bloqueio fora do perímetro ✅, bloqueio GPS negado ✅ |
| `producao.spec.ts` | Criar OP, Iniciar Produção, Apontar Finalização (status completo) |

### Pré-requisitos
```bash
# Ambos os servidores devem estar rodando:
# Backend: http://localhost:5137
# Frontend: http://localhost:5173
```

### Executar
```bash
cd Frontend
npx playwright test

# Executar spec específico
npx playwright test src/test/e2e/auth.spec.ts

# Visualizar trace de falha
npx playwright show-trace test-results/<pasta>/trace.zip
```

### Resultado atual
```
5 passed (41.4s)
  ✅ Auth Flow › login, navegação e logout
  ✅ Ponto › clock-in dentro do geofencing
  ✅ Ponto › bloqueio fora do geofencing
  ✅ Ponto › bloqueio sem permissão GPS
  ✅ Produção › criar, iniciar e finalizar OP
```

---

## 4. Boas Práticas Adotadas

| Prática | Implementação |
|---|---|
| **Isolamento** | Cada teste cria e limpa seus próprios dados |
| **Dados reais no E2E** | `sqlcmd` no `beforeEach` limpa registros do dia |
| **Waits determinísticos** | `expect(locator).toBeVisible()` — sem `sleep()` |
| **Seletores estáveis** | `.filter({ hasText: '...' })` encadeado no Playwright |
| **Worker único** | E2E roda em 1 worker para evitar deadlocks no banco |
| **Geolocation mock** | `context.setGeolocation()` antes de navegar |