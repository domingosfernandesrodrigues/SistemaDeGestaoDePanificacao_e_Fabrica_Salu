namespace SGPF.Domain.Entities;

public class TrocaAvaria
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid ClienteId { get; set; }
    public Cliente? Cliente { get; set; }
    
    public Guid ProdutoId { get; set; }
    public Produto? Produto { get; set; }
    
    public decimal Quantidade { get; set; }
    public DateTime DataTroca { get; set; } = DateTime.UtcNow;
    
    public Guid? MotoristaId { get; set; }
    public Funcionario? Motorista { get; set; }

    public string Motivo { get; set; } = string.Empty; // Vencido, Quebrado, etc.
}
