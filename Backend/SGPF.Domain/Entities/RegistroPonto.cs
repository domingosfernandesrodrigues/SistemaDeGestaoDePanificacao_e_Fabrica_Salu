namespace SGPF.Domain.Entities;

public class RegistroPonto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid FuncionarioId { get; set; }
    public Funcionario Funcionario { get; set; } = null!;
    
    public DateTime DataHoraEntrada { get; set; }
    public DateTime? DataHoraSaida { get; set; }
    
    public decimal TotalHorasTrabalhadas { get; set; }
    public decimal TotalHorasExtras { get; set; }
    
    public string Observacao { get; set; } = string.Empty;
}
