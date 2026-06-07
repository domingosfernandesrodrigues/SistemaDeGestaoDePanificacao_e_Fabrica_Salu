namespace SGPF.Domain.Entities;

public enum StatusContaReceber
{
    Pendente,
    Recebido,
    Cancelado,
    Inadimplente
}

public class ContaReceber
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid ClienteId { get; set; }
    public Cliente Cliente { get; set; } = null!;
    
    public string Descricao { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    
    public DateTime DataEmissao { get; set; } = DateTime.Now;
    public DateTime DataVencimento { get; set; }
    public DateTime? DataRecebimento { get; set; }
    
    public StatusContaReceber Status { get; set; } = StatusContaReceber.Pendente;
    
    public Guid? PedidoVendaId { get; set; } // Opcional (Link com a origem)
}
