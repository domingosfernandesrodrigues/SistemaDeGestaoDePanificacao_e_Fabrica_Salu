using System;

namespace SGPF.Domain.Entities;

public class Candidatura
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
    public string CargoInteresse { get; set; } = string.Empty;
    public string? Mensagem { get; set; }
    public string NomeOriginalArquivo { get; set; } = string.Empty;
    public string NomeArquivoSalvo { get; set; } = string.Empty; // Guid + Extensão
    public DateTime DataEnvio { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Novo"; // Novo, Em Análise, Entrevista, Contratado, Recusado
}
