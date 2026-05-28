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
- **Otimização de Imagens:** Compressão via Canvas API no upload de logos. Imagens redimensionadas para max 400px e comprimidas para 70% de qualidade antes de serem transmitidas via base64.
- **Lazy Loading de PDFs:** Contracheques são gerados no backend sob demanda com indicador visual de progresso e bloqueio anti-cliques múltiplos.
- **Cinética de Alta Performance (Rede Digital):** O componente `<PhysicsCanvas />` realiza toda a simulação matemática vetorial diretamente sob aceleração de hardware (GPU) via Canvas HTML5 2D, com renderização HiDPI (`devicePixelRatio` nativo) e desligamento instantâneo via media query `prefers-reduced-motion` para preservação máxima de CPU e bateria.

## Padrões de Código
- Componentes Funcionais estruturados com interfaces estritas e TypeScript limpo.
- **Mobile First:** Grid flexível baseado em breakpoints Tailwind para responsividade contínua (Mobile até Desktop Ultrawide).
- **Validação Robustecida:** Zod + React Hook Form para tratamento rigoroso de entradas e feedback visual imediato.
- **UX Inovadora e Atmosférica:** Integração de elementos dinâmicos de dados em segundo plano (constelações e conexões de rede lineares) que reagem dinamicamente à movimentação do cursor sem criar concorrência visual ou fadiga de movimento.
- **Isolamento de Camadas (z-index):** Separação rigorosa de camadas interativas (background cinético em `z-[1]`, interface de leitura e botões primários em `z-[10]` e modais/overlays em `z-[200]`).