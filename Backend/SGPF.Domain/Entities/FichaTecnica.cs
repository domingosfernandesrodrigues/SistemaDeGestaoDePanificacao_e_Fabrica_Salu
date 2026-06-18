namespace SGPF.Domain.Entities;

public class FichaTecnica
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    // O Produto Acabado que será fabricado
    public Guid ProdutoId { get; set; }
    public Produto? Produto { get; set; }
    
    // Rendimento da receita base (ex: Essa receita rende 10 Kg)
    public decimal RendimentoPadrao { get; set; } 
    
    public ICollection<FichaTecnicaInsumo> Insumos { get; set; } = new List<FichaTecnicaInsumo>();
}

public class FichaTecnicaInsumo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid FichaTecnicaId { get; set; }
    public FichaTecnica? FichaTecnica { get; set; }
    
    // O Insumo que será utilizado
    public Guid InsumoId { get; set; }
    public Produto? Insumo { get; set; }
    
    // Quantidade necessária para atingir o RendimentoPadrao
    public decimal QuantidadeNecessaria { get; set; }
    
    // Margem de perda ao longo da produção (ex: 5%)
    public decimal PerdaPercentual { get; set; }

    // Unidade de medida usada na receita (ex: g, ml, Kg, L)
    public string UnidadeMedida { get; set; } = string.Empty; 
}
