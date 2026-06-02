using System;

namespace SGPF.Domain.Entities;

public class LancamentoAlimentacao
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid FuncionarioId { get; set; }
    public Funcionario? Funcionario { get; set; }
    
    public DateTime Data { get; set; }
    public string TipoRefeicao { get; set; } = string.Empty; // "Café", "Almoço", "Jantar"
    public decimal Valor { get; set; }
    public string? Observacao { get; set; }
    
    public Guid? ContaPagarId { get; set; }
    public ContaPagar? ContaPagar { get; set; }
    
    public DateTime DataCriacao { get; set; } = DateTime.Now;
}
