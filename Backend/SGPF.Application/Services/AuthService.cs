using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SGPF.Application.DTOs;
using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Logging;

namespace SGPF.Application.Services;

public class AuthService : IAuthService
{
    private readonly IRepository<Usuario> _usuarioRepository;
    private readonly IRepository<Funcionario> _funcionarioRepository;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IRepository<Usuario> usuarioRepository, 
        IRepository<Funcionario> funcionarioRepository,
        IConfiguration configuration, 
        ILogger<AuthService> logger)
    {
        _usuarioRepository = usuarioRepository;
        _funcionarioRepository = funcionarioRepository;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto request)
    {
        var usuarios = await _usuarioRepository.FindAsync(u => u.Email == request.Email);
        var usuario = usuarios.FirstOrDefault();

        if (usuario == null) 
        {
            _logger.LogWarning("Tentativa de login falhou: Usuário não encontrado. Email: {Email}", request.Email);
            return null;
        }
        
        // Validação estrita por hashes criptográficos BCrypt robustos
        bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Senha, usuario.SenhaHash);

        if (!isPasswordValid) 
        {
            _logger.LogWarning("Tentativa de login falhou: Senha inválida para o usuário {Email}", request.Email);
            return null;
        }

        if (!usuario.Ativo) 
        {
            _logger.LogWarning("Tentativa de login falhou: Usuário inativo {Email}", request.Email);
            return null;
        }

        _logger.LogInformation("Usuário {Email} logado com sucesso.", request.Email);

        var funcionario = (await _funcionarioRepository.FindAsync(f => f.UsuarioId == usuario.Id)).FirstOrDefault();

        return new LoginResponseDto
        {
            Token = GenerateJwtToken(usuario, funcionario?.Id),
            Nome = usuario.Nome,
            Email = usuario.Email,
            Role = usuario.Role,
            ClienteId = usuario.ClienteId,
            FuncionarioId = funcionario?.Id,
            PrecisaTrocarSenha = usuario.PrecisaTrocarSenha
        };
    }

    private string GenerateJwtToken(Usuario usuario, Guid? funcionarioId)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_configuration["JwtSettings:Secret"] ?? "MySuperSecretKey_SGPF_2026_Minimum32Chars!!");
        
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(ClaimTypes.Name, usuario.Nome),
            new Claim(ClaimTypes.Email, usuario.Email),
            new Claim(ClaimTypes.Role, usuario.Role)
        };

        if (usuario.ClienteId.HasValue)
        {
            claims.Add(new Claim("ClienteId", usuario.ClienteId.Value.ToString()));
        }

        if (funcionarioId.HasValue)
        {
            claims.Add(new Claim("FuncionarioId", funcionarioId.Value.ToString()));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(8),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };
        
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
