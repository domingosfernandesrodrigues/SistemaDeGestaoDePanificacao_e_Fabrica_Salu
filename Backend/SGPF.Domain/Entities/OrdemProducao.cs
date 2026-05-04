namespace SGPF.Domain.Entities;

public enum StatusOrdemProducao
{
    Planejada,
    EmAndamento,
    Finalizada,
    Cancelada
}

public class OrdemProducao
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string NumeroOP { get; set; } = $"OP-{DateTime.Now:yyyyMMddHHmmss}";
    
    // O que será fabricado
    public Guid ProdutoId { get; set; }
    public Produto? Produto { get; set; }
    
    public decimal QuantidadePlanejada { get; set; }
    public decimal QuantidadeRealizada { get; set; }
    
    public StatusOrdemProducao Status { get; set; } = StatusOrdemProducao.Planejada;
    
    public DateTime DataAbertura { get; set; } = DateTime.UtcNow;
    public DateTime? DataFinalizacao { get; set; }
    
    public decimal CustoTotalCalculado { get; set; }
    
    // Responsabilidade e Histórico (Quem planejou, iniciou e finalizou)
    public Guid? UsuarioPlanejouId { get; set; }
    public Usuario? UsuarioPlanejou { get; set; }
    
    public Guid? UsuarioIniciouId { get; set; }
    public Usuario? UsuarioIniciou { get; set; }
    
    public Guid? UsuarioFinalizouId { get; set; }
    public Usuario? UsuarioFinalizou { get; set; }
    
    public ICollection<OrdemProducaoInsumo> Insumos { get; set; } = new List<OrdemProducaoInsumo>();
}

public class OrdemProducaoInsumo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid OrdemProducaoId { get; set; }
    public OrdemProducao? OrdemProducao { get; set; }
    
    public Guid InsumoId { get; set; }
    public Produto? Insumo { get; set; }
    
    public decimal QuantidadePlanejada { get; set; } // Baseada na OP * BOM
    public decimal QuantidadeConsumida { get; set; } // Real consumido
}
