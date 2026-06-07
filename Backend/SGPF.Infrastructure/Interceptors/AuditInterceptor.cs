using System.Text.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SGPF.Domain.Entities;

namespace SGPF.Infrastructure.Interceptors;

public class AuditInterceptor : SaveChangesInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditInterceptor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

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

        // Captura o usuário atual do token JWT através do HttpContext
        Guid? userId = null;
        string? userName = null;

        try
        {
            var httpContext = _httpContextAccessor?.HttpContext;
            Console.WriteLine($"[AuditInterceptor DEBUG] HttpContext is null? {httpContext == null}");
            if (httpContext != null)
            {
                Console.WriteLine($"[AuditInterceptor DEBUG] User is null? {httpContext.User == null}");
                Console.WriteLine($"[AuditInterceptor DEBUG] User.Identity is null? {httpContext.User?.Identity == null}");
                Console.WriteLine($"[AuditInterceptor DEBUG] Identity.IsAuthenticated: {httpContext.User?.Identity?.IsAuthenticated}");
                Console.WriteLine($"[AuditInterceptor DEBUG] Identity.Name: {httpContext.User?.Identity?.Name}");

                if (httpContext.User?.Claims != null)
                {
                    foreach (var claim in httpContext.User.Claims)
                    {
                        Console.WriteLine($"[AuditInterceptor DEBUG] Claim: {claim.Type} = {claim.Value}");
                    }
                }
            }

            if (httpContext?.User?.Identity?.IsAuthenticated == true || httpContext?.User?.Claims?.Any() == true)
            {
                var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                                  ?? httpContext.User.FindFirst("nameid")?.Value 
                                  ?? httpContext.User.FindFirst("sub")?.Value;
                if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var parsedGuid))
                {
                    userId = parsedGuid;
                }

                userName = httpContext.User.FindFirst(ClaimTypes.Name)?.Value 
                           ?? httpContext.User.FindFirst("unique_name")?.Value 
                           ?? httpContext.User.FindFirst("name")?.Value 
                           ?? httpContext.User.FindFirst(ClaimTypes.Email)?.Value;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AuditInterceptor DEBUG ERROR] {ex.Message}");
            // Silencioso em caso de operações executadas fora de escopo HTTP (ex: rotinas de background)
        }

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.Entity is AuditLog || entry.State == EntityState.Detached || entry.State == EntityState.Unchanged)
                continue;

            var auditEntry = new AuditLog
            {
                TableName = entry.Metadata.GetTableName() ?? entry.Metadata.Name,
                Action = entry.State.ToString(),
                Timestamp = DateTime.Now,
                UserId = userId,
                UserName = userName
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
