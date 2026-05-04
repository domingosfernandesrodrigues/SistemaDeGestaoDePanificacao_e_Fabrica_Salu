# Auditoria e Logs do Sistema

## Eventos Críticos para Log (Auditoria)
1. Alteração de Salário ou Cargo no RH.
2. Exclusão de Ordens de Produção finalizadas.
3. Ajustes manuais de estoque (Inventário).
4. Login e tentativas falhas de acesso.

## Implementação
- Uso de Serilog para gravação de logs em arquivo ou banco de dados.
- Structured Logging para facilitar buscas por `UsuarioId` ou `TipoEvento`.                                         