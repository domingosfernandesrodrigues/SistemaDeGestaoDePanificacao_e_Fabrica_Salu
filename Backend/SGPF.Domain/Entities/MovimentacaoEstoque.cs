namespace SGPF.Domain.Entities;

public enum TipoMovimentacao
{
    Entrada, // Compra, Produção
    Saida, // Venda, Consumo OP, Descarte
    Reserva // Bloqueio temporário (OP Aberta, Pedido pendente)
}

public class MovimentacaoEstoque
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProdutoId { get; set; }
    public Produto Produto { get; set; } = null!;
    
    public TipoMovimentacao Tipo { get; set; }
    public decimal Quantidade { get; set; }
    public DateTime DataMovimentacao { get; set; } = DateTime.Now;
    
    public string Origem { get; set; } = string.Empty; // "OP-1234", "Venda-999"
    public string Observacao { get; set; } = string.Empty;
}
