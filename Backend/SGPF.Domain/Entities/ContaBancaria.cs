namespace SGPF.Domain.Entities;

public enum TipoConta
{
    CaixaFisico,
    ContaCorrente,
    Poupanca,
    Investimento
}

public class ContaBancaria
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty; // ex: Caixa Principal, Banco Itaú, etc.
    public TipoConta Tipo { get; set; }
    public decimal SaldoInicial { get; set; }
    public decimal SaldoAtual { get; set; }
    public DateTime DataAbertura { get; set; } = DateTime.UtcNow;
    public bool Ativa { get; set; } = true;
    public bool IsPadrao { get; set; } = false;

    // Dados para Recebimento
    public string? PixChave { get; set; }
    public string? BancoNome { get; set; }
    public string? Agencia { get; set; }
    public string? NumeroConta { get; set; }
    public string? GatewayToken { get; set; }
}
