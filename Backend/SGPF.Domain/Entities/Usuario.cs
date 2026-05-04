namespace SGPF.Domain.Entities;

public class Usuario
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string SenhaHash { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty; // Admin, Gestor, Operador, Cliente
    
    public Guid? ClienteId { get; set; }
    public Cliente? Cliente { get; set; }
    
    public bool Ativo { get; set; } = true;
    public bool PrecisaTrocarSenha { get; set; } = true;
}
