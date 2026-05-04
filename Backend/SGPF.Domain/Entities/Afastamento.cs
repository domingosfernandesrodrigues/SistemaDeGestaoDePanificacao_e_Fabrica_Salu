namespace SGPF.Domain.Entities;

public class Afastamento
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FuncionarioId { get; set; }
    public Funcionario? Funcionario { get; set; }
    
    public DateTime DataInicio { get; set; }
    public DateTime DataFim { get; set; }
    
    public string Motivo { get; set; } = string.Empty; // Férias, Atestado Médico, Licença Maternidade, etc.
    public string? Observacao { get; set; }
    
    // Status: Pendente, Aprovado, Reprovado
    public string Status { get; set; } = "Pendente";
    
    public string? AnexoNome { get; set; }
    public string? AnexoBase64 { get; set; }
    
    // Legacy column support
    public string Tipo { get; set; } = "Legado";
    
    public DateTime DataCriacao { get; set; } = DateTime.Now;
}
