namespace SGPF.Domain.Entities;

public enum StatusPedidoVenda
{
    Novo,
    Separacao,
    EmRota,
    Entregue,
    Cancelado
}

public enum FormaPagamento
{
    Dinheiro,
    Pix,
    CartaoCredito,
    CartaoDebito,
    Boleto
}

public class PedidoVenda
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string NumeroPedido { get; set; } = $"PED-{DateTime.Now:yyyyMMddHHmmss}";
    
    public Guid ClienteId { get; set; }
    public Cliente? Cliente { get; set; }
    
    public Guid? VeiculoId { get; set; }
    public Veiculo? Veiculo { get; set; }
    
    public Guid? MotoristaId { get; set; }
    public Funcionario? Motorista { get; set; }
    
    public DateTime DataPedido { get; set; } = DateTime.UtcNow;
    public DateTime? DataEntregaPrevista { get; set; }
    public DateTime? DataEntregaRealizada { get; set; }
    
    public decimal ValorTotal { get; set; }
    
    public StatusPedidoVenda Status { get; set; } = StatusPedidoVenda.Novo;
    
    // Novas propriedades de pagamento
    public FormaPagamento FormaPagamento { get; set; } = FormaPagamento.Dinheiro;
    public bool Pago { get; set; } = false;
    public string? PixQrCode { get; set; } // Simulação de dados do Pix
    public string? BoletoCodigoBarras { get; set; } // Simulação do Boleto
    
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
    public decimal Desconto { get; set; }
    public decimal Subtotal => (Quantidade * PrecoUnitario) - Desconto;
}
