namespace SGPF.Domain.Entities;

public class Empresa
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string RazaoSocial { get; set; } = string.Empty;
    public string NomeFantasia { get; set; } = string.Empty;
    public string CNPJ { get; set; } = string.Empty;
    public string InscricaoEstadual { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Endereco { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    
    // Configurações de Pagamento
    public string? PixChave { get; set; }
    public string? BancoNome { get; set; }
    public string? BancoAgencia { get; set; }
    public string? BancoConta { get; set; }
    public string? GatewayToken { get; set; } // Token para Mercado Pago, etc.
    
    public ICollection<Funcionario> Funcionarios { get; set; } = new List<Funcionario>();
}
