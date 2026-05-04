namespace SGPF.Domain.Entities;

public enum StatusPedidoVenda
{
    Novo,
    Separacao, // Reservou no estoque
    EmRota,
    Entregue,  // Saiu do estoque de fato e gerou Conta a Receber
    Cancelado
}

public class PedidoVenda
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string NumeroPedido { get; set; } = $"PED-{DateTime.Now:yyyyMMddHHmmss}";
    
    public Guid ClienteId { get; set; }
    public Cliente? Cliente { get; set; }
    
    public Guid? VeiculoId { get; set; } // Opcional, atrelado quando for "Em Rota"
    public Veiculo? Veiculo { get; set; }
    
    public DateTime DataPedido { get; set; } = DateTime.UtcNow;
    public DateTime? DataEntregaPrevista { get; set; }
    public DateTime? DataEntregaRealizada { get; set; }
    
    public decimal ValorTotal { get; set; }
    
    public StatusPedidoVenda Status { get; set; } = StatusPedidoVenda.Novo;
    
    public ICollection<PedidoVendaItem> Itens { get; set; } = new List<PedidoVendaItem>();
}

public class PedidoVendaItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid PedidoVendaId { get; set; }
    public PedidoVenda? PedidoVenda { get; set; }
    
    public Guid ProdutoId { get; set; }
    public Produto? Produto { get; set; }
    
    public decimal Quantidade { get; set; }
    public decimal PrecoUnitario { get; set; }
    public decimal Subtotal => Quantidade * PrecoUnitario;
}
