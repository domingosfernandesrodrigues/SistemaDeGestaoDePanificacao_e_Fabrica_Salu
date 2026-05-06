namespace SGPF.Domain.Entities;

public enum StatusCompra
{
    Rascunho,
    Confirmada,
    Cancelada
}

public enum CategoriaCompra
{
    Mercadoria, // Produtos Acabados e Revenda
    Insumo      // Matéria-prima
}

public class Compra
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FornecedorId { get; set; }
    public Fornecedor Fornecedor { get; set; } = null!;
    
    public DateTime DataCompra { get; set; } = DateTime.UtcNow;
    public decimal ValorTotal { get; set; }
    public StatusCompra Status { get; set; } = StatusCompra.Rascunho;
    public CategoriaCompra Categoria { get; set; } = CategoriaCompra.Mercadoria;
    public string? Observacao { get; set; }
    
    public List<CompraItem> Itens { get; set; } = new();
}
