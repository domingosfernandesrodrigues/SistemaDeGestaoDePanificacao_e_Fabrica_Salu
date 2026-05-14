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

## Estratégias de Performance
- **Cache em Memória:** Dados de configuração da empresa são cacheados em nível de serviço (`empresaService`) para evitar refetching em cada transição de página no Layout.
- **Otimização de Imagens:** Implementada compressão via Canvas API no upload de logos. Imagens são redimensionadas para max 400px e comprimidas para 70% de qualidade (JPEG) antes de serem enviadas como base64 via API.
- **Lazy Loading de PDFs:** Contracheques são gerados on-demand no backend, com estado de carregamento (`Loader2`) no frontend e bloqueio de cliques múltiplos.

## Padrões de Código
- Componentes Funcionais com Interfaces TS claras.
- **Mobile First:** Uso rigoroso de breakpoints Tailwind para suporte a iPhone 14 Pro Max.
- **Validação:** Zod + React Hook Form para todos os inputs, com sinalização visual de campos obrigatórios (*).
- **UX Consistente:** Modais com sticky headers e scroll interno para formulários densos.
- Tratamento de erro global nos requests (Toast Notifications).