namespace SGPF.Domain.Entities;

public enum StatusContaPagar
{
    Pendente,
    Aprovada,
    Paga,
    Cancelada
}

public class ContaPagar
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid? FornecedorId { get; set; }
    public Fornecedor? Fornecedor { get; set; }

    public string Descricao { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    
    public DateTime DataEmissao { get; set; } = DateTime.UtcNow;
    public DateTime? DataVencimento { get; set; }
    public DateTime? DataPagamento { get; set; }
    
    public string? MesReferencia { get; set; } // Ex: "Janeiro/2026"
    
    public StatusContaPagar Status { get; set; } = StatusContaPagar.Pendente;
    
    public string Categoria { get; set; } = "Operacional"; // Folha de Pagamento, Fornecedor, etc.
}
