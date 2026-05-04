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
    public decimal TotalHorasExtras { get; set; }
    public decimal ValorHorasExtras { get; set; }
    
    public decimal TotalDescontos { get; set; } // Ex: INSS, FGTS simulado
    
    public decimal SalarioLiquido { get; set; }
    
    public StatusFolha Status { get; set; } = StatusFolha.Aberta;
    
    public DateTime DataGeracao { get; set; } = DateTime.UtcNow;
}
