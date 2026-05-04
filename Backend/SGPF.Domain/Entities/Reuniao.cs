namespace SGPF.Domain.Entities;

public enum StatusReuniao
{
    Agendada,
    Realizada,
    Cancelada
}

public class Reuniao
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid ClienteId { get; set; }
    public Cliente? Cliente { get; set; }
    
    public DateTime DataHora { get; set; }
    public string Pauta { get; set; } = string.Empty;
    public string Ata { get; set; } = string.Empty;
    
    public StatusReuniao Status { get; set; } = StatusReuniao.Agendada;
}
