# SGP-F: Sistema de Gestão de Panificação e Fábrica 🥖🏢

[![.NET 10](https://img.shields.io/badge/.NET-10-blueviolet)](https://dotnet.microsoft.com/en-us/download/dotnet/10.0)
[![React 19](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://www.docker.com/)
[![xUnit](https://img.shields.io/badge/Tests-xUnit%20%2B%20Vitest-brightgreen)](docs/4-qualidade/plano-testes.md)
[![Playwright](https://img.shields.io/badge/E2E-Playwright%205%2F5-success)](docs/4-qualidade/plano-testes.md)

O **SGP-F** é um ERP robusto e moderno desenvolvido para atender às necessidades específicas de empresas que operam na revenda de produtos de panificação e na fabricação própria de derivados (como polvilho). O sistema integra todos os processos críticos, desde o chão de fábrica até a inteligência executiva.

---

## 🚀 Módulos e Funcionalidades

### 🏭 Núcleo de Fábrica e Produção
*   **Fichas Técnicas:** Gestão detalhada de insumos, rendimentos e custos.
*   **Ordens de Produção (OP):** Controle total do ciclo de vida da fabricação.
*   **Estoque Inteligente:** Baixa automática de insumos e entrada de produtos acabados.

### 📊 BI e Dashboards 360°
*   **Painel Executivo:** Visão consolidada de vendas, produção, frota e financeiro.
*   **Indicadores em Tempo Real:** KPIs de rentabilidade, giro de estoque e desempenho de vendas.
*   **DRE Automático:** Demonstrativo de Resultados consolidado mensalmente.

### 🚛 Logística e Frota
*   **Gestão de Veículos:** Controle de quilometragem, manutenção preventiva e corretiva.
*   **Monitoramento de Combustível:** Registro de abastecimentos e cálculo de consumo (km/L).
*   **Logística Reversa:** Controle rigoroso de trocas e avarias direto no ponto de entrega.

### 💰 Financeiro e Comercial
*   **Gateway de Pagamento Universal:** Suporte a múltiplos provedores (Asaas, Mercado Pago e qualquer banco) via Strategy Pattern — sem lock-in de fornecedor.
*   **Conciliação Bancária:** Gestão de múltiplas contas com saldo em tempo real e webhooks automáticos.
*   **Vendas B2B:** Painel Kanban para acompanhamento de pedidos e integração logística.
*   **Landing Page:** Portal institucional profissional com autenticação integrada.

### 👤 Gestão de Pessoas (RH)
*   **Folha de Pagamento CLT v2:** Cálculo automático de proventos, descontos, HE 50/100% e Adicional Noturno.
*   **Controle de Ponto:** Registro e auditoria de jornada de trabalho.
*   **Afastamentos:** Gestão de férias, atestados e licenças com fluxo de aprovação.
*   **Lançamento de Alimentação:** Registro de refeições por funcionário com controle de acesso por perfil e integração automática com Contas a Pagar.
*   **Meus Contracheques:** Funcionários visualizam o valor líquido apenas quando o status da folha for `Liberado`.

---

## 🛠️ Tecnologias Utilizadas

### Backend
*   **.NET 10 (C#)**: Performance e escalabilidade.
*   **Domain Driven Design (DDD)**: Arquitetura organizada e focada no negócio.
*   **Strategy Pattern**: Gateway de pagamento multi-provedor sem acoplamento.
*   **EF Core + SQL Server**: Persistência de dados robusta.
*   **JWT Auth + BCrypt**: Segurança com controle de acesso baseado em Roles e senhas hasheadas.

### Frontend
*   **React 19 + TypeScript**: Interface moderna e tipagem estrita.
*   **Vite**: Build rápido e experiência de desenvolvimento otimizada.
*   **Tailwind CSS**: Design responsivo (iPhone 14 Pro Max ready).
*   **TanStack Query**: Gerenciamento de estado e cache de API.

---

## 🏗️ Arquitetura do Projeto

O projeto segue uma estrutura desacoplada para facilitar a manutenção e o deploy:

```
SistemaDeGestaoDePanificacao_e_Fabrica/
├── Backend/               # API em .NET 10 (Domain, Application, Infra, WebApi)
│   ├── SGPF.Domain/       # Entidades, Interfaces, Enums
│   ├── SGPF.Application/  # Casos de uso, Services, IPaymentGateway (Strategy)
│   ├── SGPF.Infrastructure/  # EF Core, AppDbContext, SQL Server
│   └── SGPF.WebApi/       # Controllers REST, Webhooks, Background Services
├── Frontend/              # SPA em React + Vite
├── docs/                  # Documentação completa do sistema (Negócio, Técnica, UX)
└── docker-compose.yml     # Orquestração de containers (DB, API, Web)
```

---

## ⚡ Como Executar

### Pré-requisitos
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/)
*   [.NET 10 SDK](https://dotnet.microsoft.com/download) (para execução local)
*   [Node.js 20+](https://nodejs.org/) (para execução local)

### Via Docker (Recomendado)
Para subir todo o ecossistema (Banco + API + Frontend):
```bash
docker-compose up --build
```
Acesse o sistema em: `http://localhost:5173`

### Execução Local (Desenvolvimento)
1.  **Banco de Dados**: Suba apenas o SQL Server via Docker ou use uma instância local.
2.  **Backend**:
    ```bash
    cd Backend/SGPF.WebApi
    dotnet watch run
    ```
3.  **Frontend**:
    ```bash
    cd Frontend
    npm install
    npm run dev
    ```

---

## 🧪 Testes

O SGP-F possui cobertura de testes em três camadas (pirâmide de testes completa):

| Camada | Framework | Cobertura | Comando |
|--------|-----------|-----------|---------|
| **Integração Backend** | xUnit + EF InMemory | 22 controllers — todos os 23 módulos | `dotnet test Backend/SGPF.Tests` |
| **Unitários Frontend** | Vitest + RTL | 23 módulos de interface | `cd Frontend && npm run test` |
| **E2E** | Playwright + Chromium | Auth, Ponto + Geofencing, Ordens de Produção | `cd Frontend && npx playwright test` |

### E2E — Resultado Atual
```
5 passed (41.4s)
  ✅ Auth Flow › login, navegação e logout
  ✅ Ponto › clock-in dentro do geofencing
  ✅ Ponto › bloqueio fora do geofencing (geofencing)
  ✅ Ponto › bloqueio sem permissão GPS
  ✅ Produção › criar, iniciar e finalizar OP
```

> 📋 Para detalhes completos da estratégia de testes, consulte [docs/4-qualidade/plano-testes.md](docs/4-qualidade/plano-testes.md).

---

## 📑 Documentação Detalhada

O SGP-F possui uma documentação técnica e de negócio exaustiva na pasta `/docs`:

1.  **[Negócio](docs/1-negocio/)**: Requisitos e regras de cada módulo.
2.  **[Técnica](docs/2-tecnica/)**: Detalhes de arquitetura, banco de dados, segurança e gateway de pagamento.
3.  **[Interface](docs/3-interface/)**: Design system e guia de rotas.
4.  **[Qualidade](docs/4-qualidade/)**: Padrões de código e fluxos de CI/CD.
5.  **[Apoio](docs/5-apoio/)**: Manuais operacionais para usuários.
6.  **[Observabilidade](docs/6-observabilidade/)**: Logs, auditoria e KPIs.
7.  **[Gestão](docs/7-gestao/)**: Valuation e manual do administrador.

> 🔑 **Gateway de Pagamento Universal:** Consulte [docs/2-tecnica/gateway-pagamento-universal.md](docs/2-tecnica/gateway-pagamento-universal.md) para adicionar novos provedores de pagamento.

---

## 📄 Licença e Contato

Este projeto é de uso restrito da **SGP-F**. Para mais informações, consulte a [Documentação de Gestão](docs/7-gestao/).

---
*Desenvolvido com foco em eficiência operacional e precisão financeira.*
