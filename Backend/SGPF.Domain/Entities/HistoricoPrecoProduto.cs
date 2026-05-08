using System.ComponentModel.DataAnnotations;

namespace SGPF.Domain.Entities;

public enum TipoPrecoHistorico
{
    Custo,
    Venda
}

public class HistoricoPrecoProduto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid ProdutoId { get; set; }
    public Produto? Produto { get; set; }
    
    public decimal PrecoAntigo { get; set; }
    public decimal PrecoNovo { get; set; }
    
    public DateTime DataAlteracao { get; set; } = DateTime.UtcNow;
    
    public TipoPrecoHistorico Tipo { get; set; }
    
    public string Origem { get; set; } = string.Empty; // Ex: Compra #123, OP #456, Alteração Manual
    public string? UsuarioNome { get; set; }
}
