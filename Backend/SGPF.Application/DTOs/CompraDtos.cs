namespace SGPF.Application.DTOs;

public class CompraDto
{
    public Guid FornecedorId { get; set; }
    public string Categoria { get; set; } = "Mercadoria"; // Mercadoria ou Insumo
    public string? Observacao { get; set; }
    public List<CompraItemDto> Itens { get; set; } = new();
}

public class CompraItemDto
{
    public Guid ProdutoId { get; set; }
    public decimal Quantidade { get; set; }
    public decimal PrecoUnitario { get; set; }
}

public class CompraResponseDto
{
    public Guid Id { get; set; }
    public string FornecedorNome { get; set; } = string.Empty;
    public DateTime DataCompra { get; set; }
    public decimal ValorTotal { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string ProdutosResumo { get; set; } = string.Empty;
    public decimal TotalItens { get; set; }
    public string? Observacao { get; set; }
    public bool IsPago { get; set; }
    public List<CompraItemDto> Itens { get; set; } = new();
}
