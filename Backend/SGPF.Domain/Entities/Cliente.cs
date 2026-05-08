using System.Text.Json.Serialization;

namespace SGPF.Domain.Entities;

public class Cliente
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string NomeFantasia { get; set; } = string.Empty;
    public string? RazaoSocial { get; set; }
    public string? InscricaoEstadual { get; set; }
    
    [JsonPropertyName("cnp_j_CPF")]
    public string CNPJ_CPF { get; set; } = string.Empty;
    
    public string Endereco { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
    public bool Ativo { get; set; } = true;
}
