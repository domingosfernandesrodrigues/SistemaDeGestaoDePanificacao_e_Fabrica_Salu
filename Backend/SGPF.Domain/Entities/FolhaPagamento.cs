namespace SGPF.Domain.Entities;

public enum StatusFolha
{
    Aberta,
    Fechada,
    Paga
}

public class FolhaPagamento
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid FuncionarioId { get; set; }
    public Funcionario Funcionario { get; set; } = null!;
    
    public int MesReferencia { get; set; }
    public int AnoReferencia { get; set; }
    
    public decimal SalarioBaseCalculado { get; set; }
    
    public decimal TotalHorasExtras50 { get; set; }
    public decimal ValorHorasExtras50 { get; set; }
    
    public decimal TotalHorasExtras100 { get; set; }
    public decimal ValorHorasExtras100 { get; set; }
    
    public decimal ValorAdicionalNoturno { get; set; }
    
    public decimal TotalDescontos { get; set; } 
    public decimal SalarioLiquido { get; set; }
    
    public StatusFolha Status { get; set; } = StatusFolha.Aberta;
    
    public DateTime DataGeracao { get; set; } = DateTime.UtcNow;
}
