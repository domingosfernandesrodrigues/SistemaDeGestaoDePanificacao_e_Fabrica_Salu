# SGP-F: Sistema de Gestão de Panificação e Fábrica 🥖🏢

[![.NET 10](https://img.shields.io/badge/.NET-10-blueviolet)](https://dotnet.microsoft.com/en-us/download/dotnet/10.0)
[![React 19](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://www.docker.com/)

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
*   **Conciliação Bancária:** Gestão de múltiplas contas com saldo em tempo real.
*   **Vendas B2B:** Painel Kanban para acompanhamento de pedidos e integração logística.
*   **Landing Page:** Portal institucional profissional com autenticação integrada.

### 👤 Gestão de Pessoas (RH)
*   **Folha de Pagamento CLT v2:** Cálculo automático de proventos, descontos, HE 50/100% e Adicional Noturno.
*   **Controle de Ponto:** Registro e auditoria de jornada de trabalho.
*   **Afastamentos:** Gestão de férias, atestados e licenças com fluxo de aprovação.

---

## 🛠️ Tecnologias Utilizadas

### Backend
*   **.NET 10 (C#)**: Performance e escalabilidade.
*   **Domain Driven Design (DDD)**: Arquitetura organizada e focada no negócio.
*   **EF Core + SQL Server**: Persistência de dados robusta.
*   **JWT Auth**: Segurança e controle de acesso baseado em Roles.

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

## 📑 Documentação Detalhada

O SGP-F possui uma documentação técnica e de negócio exaustiva na pasta `/docs`:

1.  **[Negócio](docs/1-negocio/)**: Requisitos e regras de cada módulo.
2.  **[Técnica](docs/2-tecnica/)**: Detalhes de arquitetura, banco de dados e segurança.
3.  **[Interface](docs/3-interface/)**: Design system e guia de rotas.
4.  **[Qualidade](docs/4-qualidade/)**: Padrões de código e fluxos de CI/CD.
5.  **[Apoio](docs/5-apoio/)**: Manuais operacionais para usuários.

---

## 📄 Licença e Contato

Este projeto é de uso restrito da **SGP-F**. Para mais informações, consulte a [Documentação de Gestão](docs/7-gestao/).

---
*Desenvolvido com foco em eficiência operacional e precisão financeira.*
