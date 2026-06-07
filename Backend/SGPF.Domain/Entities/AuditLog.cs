using System;

namespace SGPF.Domain.Entities;

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string TableName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // Insert, Update, Delete
    public string KeyValues { get; set; } = string.Empty;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.Now;
    public Guid? UserId { get; set; } // Opcional, caso a alteração seja feita por rotina automática
    public string? UserName { get; set; }
}
