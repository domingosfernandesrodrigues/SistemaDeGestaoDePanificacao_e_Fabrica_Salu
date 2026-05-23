using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SGPF.Domain.Entities;

namespace SGPF.Infrastructure.Interceptors;

public class AuditInterceptor : SaveChangesInterceptor
{
    // Em um cenário real, você injetaria um serviço para pegar o Id do usuário logado via HttpContext
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        if (eventData.Context is not null)
        {
            ProcessAudit(eventData.Context);
        }
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not null)
        {
            ProcessAudit(eventData.Context);
        }
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ProcessAudit(DbContext context)
    {
        context.ChangeTracker.DetectChanges();
        var auditEntries = new List<AuditLog>();

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.Entity is AuditLog || entry.State == EntityState.Detached || entry.State == EntityState.Unchanged)
                continue;

            var auditEntry = new AuditLog
            {
                TableName = entry.Metadata.GetTableName() ?? entry.Metadata.Name,
                Action = entry.State.ToString(),
                Timestamp = DateTime.UtcNow
            };

            var keyValues = new Dictionary<string, object?>();
            var oldValues = new Dictionary<string, object?>();
            var newValues = new Dictionary<string, object?>();

            foreach (var property in entry.Properties)
            {
                string propertyName = property.Metadata.Name;
                if (property.Metadata.IsPrimaryKey())
                {
                    keyValues[propertyName] = property.CurrentValue;
                }

                switch (entry.State)
                {
                    case EntityState.Added:
                        newValues[propertyName] = property.CurrentValue;
                        break;
                    case EntityState.Deleted:
                        oldValues[propertyName] = property.OriginalValue;
                        break;
                    case EntityState.Modified:
                        if (property.IsModified)
                        {
                            oldValues[propertyName] = property.OriginalValue;
                            newValues[propertyName] = property.CurrentValue;
                        }
                        break;
                }
            }

            auditEntry.KeyValues = JsonSerializer.Serialize(keyValues);
            auditEntry.OldValues = oldValues.Count == 0 ? null : JsonSerializer.Serialize(oldValues);
            auditEntry.NewValues = newValues.Count == 0 ? null : JsonSerializer.Serialize(newValues);

            auditEntries.Add(auditEntry);
        }

        if (auditEntries.Any())
        {
            // Adiciona as entradas de auditoria no contexto
            // Como estamos no meio do SaveChanges, elas serão incluídas na transação atual
            context.Set<AuditLog>().AddRange(auditEntries);
        }
    }
}
