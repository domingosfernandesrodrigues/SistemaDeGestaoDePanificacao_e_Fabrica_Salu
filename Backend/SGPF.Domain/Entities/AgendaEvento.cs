using System;

namespace SGPF.Domain.Entities;

public class AgendaEvento
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Titulo { get; set; } = string.Empty;
    public DateTime Data { get; set; }
    public string Tipo { get; set; } = "Feriado"; // Feriado, Lembrete, Aviso
    public string Descricao { get; set; } = string.Empty;
}
