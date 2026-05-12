# Design System Global - SGP-F 🎨

Este documento define os padrões visuais e comportamentais da interface do SGP-F, garantindo consistência entre todos os módulos.

---

## 🎨 Identidade Visual (Tailwind CSS)

### Paleta de Cores
*   **Primária:** `slate-900` (Textos principais, headers).
*   **Ação:** `blue-600` (Botões principais, links).
*   **Sucesso:** `emerald-600` (Saldos positivos, aprovações).
*   **Atenção/Financeiro:** `amber-500` (Horas extras, alertas).
*   **Erro/Avaria:** `red-600` (Cancelamentos, avarias, débitos).

### Tipografia
*   **Títulos:** Fontes sem serifa, peso `bold` ou `black`.
*   **Dados Numéricos:** Uso de fontes `font-mono` para valores financeiros e horários de ponto.

---

## 📱 Padrão de Responsividade (Mobile First)

O sistema é otimizado para o **iPhone 14 Pro Max (430px)**.

### 1. Tabelas e Dados Densos
*   **Desktop:** Tabelas tradicionais com `hover` states.
*   **Mobile:** 
    *   Uso de **Card View** para registros individuais.
    *   Se a tabela for mantida, deve possuir `overflow-x-auto` e um `min-width` que preserve a leitura.
    *   Botões de ação devem ser sempre visíveis (removida opacidade zero em mobile).

### 2. Modais e Formulários
*   **Sticky Header:** O título e o botão de fechar do modal devem ser fixos no topo durante a rolagem.
*   **Safe Area:** Uso de `p-4` mínimo em modais para evitar que o conteúdo encoste nas bordas.
*   **Ações:** Botões de formulário devem ocupar 100% da largura em dispositivos móveis (`w-full`).

---

## 📝 Padrões de Formulário

### Campos Obrigatórios
*   **Indicador:** Todo campo obrigatório deve exibir um asterisco vermelho (`*`) ao lado do label.
*   **Validação:** Uso de `required` nativo e validação via Zod/React Hook Form com mensagens claras em vermelho abaixo do campo.

### Inputs e Controles
*   **Altura:** Inputs de formulário padrão devem ter altura `h-11` ou `h-12` para facilitar o toque.
*   **Estados:** Bordas `slate-200` por padrão, mudando para a cor da ação (ex: `emerald-500`) em foco.

---

## 🧩 Componentes Reutilizáveis

*   **Modal:** Localizado em `src/components/ui/Modal.tsx`. Suporta rolagem interna e cabeçalho fixo.
*   **Button:** Localizado em `src/components/ui/Button.tsx`. Variantes: `default`, `secondary`, `outline`, `ghost`.
*   **Input:** Localizado em `src/components/ui/Input.tsx`. Encapsula label, input e mensagem de erro.

---
*Última atualização: 11/05/2026 - Padronização de Responsividade e Formulários.*