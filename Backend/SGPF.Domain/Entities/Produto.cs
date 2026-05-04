namespace SGPF.Domain.Entities;

public enum TipoProduto
{
    Insumo, // Matéria-prima (ex: Farinha, Ovos)
    ProdutoAcabado, // Fabricado pela padaria (ex: Pão Francês)
    Revenda // Comprado pronto (ex: Refrigerante)
}

public class Produto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public TipoProduto Tipo { get; set; }
    public string UnidadeMedida { get; set; } = "Un"; // Kg, L, Un
    public decimal PrecoCusto { get; set; }
    public decimal PrecoVenda { get; set; }
    
    // Saldo atual consolidado. Atualizado via triggers ou no Service após movimentações.
    public decimal QuantidadeEstoque { get; set; } 
    public bool Ativo { get; set; } = true;
}
