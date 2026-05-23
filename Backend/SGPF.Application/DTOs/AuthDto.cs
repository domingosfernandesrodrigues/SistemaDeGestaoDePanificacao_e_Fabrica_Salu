namespace SGPF.Application.DTOs;

public class LoginRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Senha { get; set; } = string.Empty;
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public Guid? ClienteId { get; set; }
    public Guid? FuncionarioId { get; set; }
    public bool PrecisaTrocarSenha { get; set; }
}

public class TrocarSenhaDto
{
    public string NovaSenha { get; set; } = string.Empty;
}
