namespace SGPF.Domain.Entities;

public class TrocaAvaria
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid ClienteId { get; set; }
    public Cliente Cliente { get; set; } = null!;
    
    public Guid ProdutoId { get; set; }
    public Produto Produto { get; set; } = null!;
    
    public decimal Quantidade { get; set; }
    public DateTime DataTroca { get; set; } = DateTime.UtcNow;
    
    public string Motivo { get; set; } = string.Empty; // Vencido, Quebrado, etc.
}
