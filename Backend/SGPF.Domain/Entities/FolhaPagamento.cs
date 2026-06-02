namespace SGPF.Domain.Entities;

public enum StatusFolha
{
    Aberta,
    Fechada,
    Paga
}

public enum TipoFolha
{
    Mensal = 0,
    Adiantamento13 = 1,
    DecimoTerceiro = 2
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
    
    // Suporte ao banco de dados legado
    public decimal TotalHorasExtras { get; set; }
    public decimal ValorHorasExtras { get; set; }
    
    public decimal TotalDescontos { get; set; } 
    public decimal SalarioLiquido { get; set; }
    
    // Férias no próximo mês — incluídas ao processar (CLT Art. 144 + CF Art. 7º XVII)
    public decimal ValorFerias { get; set; } = 0;
    public decimal ValorTercoConstitucionalFerias { get; set; } = 0;
    public decimal ValorAbonoFeriasVendidas { get; set; } = 0;
    public int DiasFerias { get; set; } = 0;
    public int DiasAbonoFerias { get; set; } = 0;
    public Guid? PlanejamentoFeriasId { get; set; }
    public PlanejamentoFerias? PlanejamentoFerias { get; set; }
    
    public StatusFolha Status { get; set; } = StatusFolha.Aberta;
    
    public TipoFolha Tipo { get; set; } = TipoFolha.Mensal;
    public decimal ValorAdiantamento13Deducao { get; set; } = 0;
    
    public DateTime DataGeracao { get; set; } = DateTime.UtcNow;
}
