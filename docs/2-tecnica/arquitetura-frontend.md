# Arquitetura Frontend

## Stack e Ferramentas
- **Framework:** React 19 (Vite) com TypeScript.
- **Gerenciamento de Estado:** React Query (TanStack Query) para cache de API e Context API para estados globais (Auth).
- **Estilização:** Tailwind CSS (Mobile First).
- **Formulários:** React Hook Form com Zod para validação.
- **Ícones:** Lucide React.

## Estrutura de Pastas
- `src/components`: Componentes reutilizáveis (Inputs, Buttons, Cards).
- `src/hooks`: Custom hooks para consumo de API.
- `src/pages`: Telas principais do sistema.
- `src/services`: Configuração do Axios e interceptors para JWT.

## Padrões de Código
- Componentes Funcionais com Interfaces TS claras.
- **Mobile First:** Uso rigoroso de breakpoints Tailwind para suporte a iPhone 14 Pro Max.
- **Validação:** Zod + React Hook Form para todos os inputs, com sinalização visual de campos obrigatórios (*).
- **UX Consistente:** Modais com sticky headers e scroll interno para formulários densos.
- Tratamento de erro global nos requests (Toast Notifications).