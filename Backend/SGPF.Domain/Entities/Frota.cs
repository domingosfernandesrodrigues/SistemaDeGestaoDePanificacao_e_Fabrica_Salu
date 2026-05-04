namespace SGPF.Domain.Entities;

public class Veiculo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Placa { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public decimal CapacidadeCargaKg { get; set; }
    public decimal QuilometragemAtual { get; set; }
    public bool Ativo { get; set; } = true;
}

public class Abastecimento
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid VeiculoId { get; set; }
    public Veiculo? Veiculo { get; set; }
    
    public DateTime Data { get; set; } = DateTime.UtcNow;
    public decimal QuilometragemRegistrada { get; set; }
    public decimal Litros { get; set; }
    public decimal ValorTotal { get; set; }
}

public enum TipoManutencao
{
    Preventiva,
    Corretiva
}

public class ManutencaoVeiculo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid VeiculoId { get; set; }
    public Veiculo? Veiculo { get; set; }
    
    public DateTime Data { get; set; } = DateTime.UtcNow;
    public TipoManutencao Tipo { get; set; }
    public string Descricao { get; set; } = string.Empty;
    public decimal CustoTotal { get; set; }
    public decimal QuilometragemRegistrada { get; set; }
}
