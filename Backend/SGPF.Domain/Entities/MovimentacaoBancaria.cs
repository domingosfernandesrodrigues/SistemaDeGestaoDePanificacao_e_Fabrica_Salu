using System;

namespace SGPF.Domain.Entities
{
    public enum OrigemMovimentacao
    {
        Manual,
        BaixaPagar,
        BaixaReceber,
        Venda,
        FrotaAbastecimento,
        FrotaManutencao,
        AberturaConta
    }

    public class MovimentacaoBancaria
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        public Guid ContaBancariaId { get; set; }
        public ContaBancaria ContaBancaria { get; set; } = null!;
        
        public string Tipo { get; set; } = "entrada"; // "entrada" ou "saida"
        public decimal Valor { get; set; }
        public string Descricao { get; set; } = string.Empty;
        public DateTime DataMovimentacao { get; set; } = DateTime.Now;
        public OrigemMovimentacao Origem { get; set; }
        public Guid? ReferenciaId { get; set; } // Id associado (Venda, Despesa, Abastecimento, etc.)
    }
}
