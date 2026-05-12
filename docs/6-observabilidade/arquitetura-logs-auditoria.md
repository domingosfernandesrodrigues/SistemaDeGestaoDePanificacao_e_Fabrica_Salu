# Arquitetura e Política de Logs (Auditoria e Operacionais)

Este documento detalha as políticas de retenção, compliance e a arquitetura técnica utilizada no backend (SGPF.WebApi, SGPF.Infrastructure e SGPF.Domain) para gerenciar logs operacionais e trilhas de auditoria.

## 1. Separação de Preocupações e Responsabilidades

*   **Logs Operacionais (Erros, Warnings, Info do Sistema):** Gerenciados pelo **Serilog**. São responsáveis por capturar telemetria técnica, exceções e rastreamento de requisições. Salvos na tabela `SystemLogs` no SQL Server (com fallback em arquivos físicos).
*   **Logs de Auditoria (Trilha de Dados):** Gerenciados nativamente via **Entity Framework Core Interceptors**. Responsáveis por capturar o ciclo de vida da informação (Quem alterou, quando alterou, Valor Antigo vs Valor Novo). Salvos na tabela estruturada `AuditLogs`.

## 2. Política de Retenção e Expiração (Compliance)

A limpeza manual de dados é desencorajada para evitar falhas humanas. A retenção é garantida pelo serviço em background `LogRetentionService`, que é executado diariamente.

### 2.1 Logs Operacionais
*   **Prazo de Retenção Ativo:** 30 dias.
*   **Motivo:** Logs técnicos e exceções perdem relevância rapidamente após a correção das anomalias. Manter o banco de dados enxuto melhora a performance de queries do Serilog.

### 2.2 Logs de Auditoria
*   **Prazo de Retenção Ativo:** 5 anos (1825 dias).
*   **Motivo:** A legislação trabalhista, fiscal e tributária brasileira (ex: Receita Federal, eSocial, LGPD) exige que registros de alterações sistêmicas, transações financeiras e dados de usuários sejam mantidos por até 5 anos para eventuais auditorias externas e comprovações de compliance.

## 3. Arquivamento a Frio (Cold Storage) e Compressão

Quando o limite de expiração é atingido, os logs **não são** simplesmente apagados. O processo segue um fluxo de segurança:
1. O sistema lê os registros expirados (tanto da tabela `SystemLogs` quanto da `AuditLogs`).
2. Converte as entradas estruturadas para o formato `JSON`.
3. Comprime os dados utilizando o algoritmo GZip (`.gz`), reduzindo massivamente o espaço de armazenamento necessário.
4. Salva o arquivo final de forma vitalícia no disco físico/storage em `Logs/Archives/`.
5. Somente após a gravação bem-sucedida do arquivo comprimido, a instrução `DELETE` definitiva é executada no banco de dados.

## 4. Detalhes Técnicos de Implementação

*   **Modelo de Domínio:** A entidade `AuditLog` armazena `TableName`, `Action` (Insert/Update/Delete), `KeyValues` (Chave Primária), `OldValues` (JSON), `NewValues` (JSON), `Timestamp` e `UserId`.
*   **Interceptor:** A classe `AuditInterceptor` (`SaveChangesInterceptor`) varre o `ChangeTracker` do EF Core gerando o delta de alterações de forma transacional junto com a regra de negócio. Se a transação falhar, o log não é gravado, evitando falsos positivos.
*   **Background Worker:** O `LogRetentionService` herda de `BackgroundService` e coordena todo o fluxo de compressão e purga dos dados na madrugada.
