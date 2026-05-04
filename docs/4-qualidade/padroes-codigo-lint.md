# Padrões de Código e Qualidade (Lint)

## 1. Nomenclatura
- C# (.NET): PascalCase para Classes e Métodos. camelCase para parâmetros.
- React: PascalCase para Componentes. camelCase para funções e variáveis.

## 2. Regras Clean Code
- Métodos com no máximo 20 linhas.
- Injeção de Dependência obrigatória para serviços.
- Uso de DTOs para entrada/saída da API (nunca expor entidades de banco).
- O padrão de cores é flexível, mas deve seguir a paleta definida no arquivo `index.css` (baseada no Brand Global).

## 3. Convenções do Projeto
- Todos os arquivos devem ser nomeados usando **PascalCase** (ex: `CadastroClientes.tsx`, `UsuarioService.cs`).
- Componentes React devem começar com letra maiúscula.
- Arquivos de serviço (.cs) devem seguir o padrão `NomeEntidadeService.cs`.
- Controle de versão: Pull Requests devem conter no máximo 500 linhas de alteração.

## 4. Padrão de API (.NET)
- Controllers no plural (ex: `ClientesController`).
- Rotas devem seguir o padrão RESTful.
- Uso obrigatório de DTOs (Data Transfer Objects).

## 5. Convenções de UI/UX
- Evitar uso excessivo de tooltips (mostrar informações diretamente quando possível).
- Campos obrigatórios devem ter asterisco (*).