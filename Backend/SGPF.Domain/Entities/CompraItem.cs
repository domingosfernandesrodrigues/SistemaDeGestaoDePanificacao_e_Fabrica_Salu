namespace SGPF.Domain.Entities;

public class CompraItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CompraId { get; set; }
    public Compra Compra { get; set; } = null!;
    
    public Guid ProdutoId { get; set; }
    public Produto Produto { get; set; } = null!;
    
    public decimal Quantidade { get; set; }
    public decimal PrecoUnitario { get; set; }
    public decimal Subtotal => Quantidade * PrecoUnitario;
}
