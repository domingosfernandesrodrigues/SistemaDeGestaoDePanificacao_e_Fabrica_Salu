using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SGPF.Application.DTOs;
using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SGPF.Application.Services;

public class AuthService : IAuthService
{
    private readonly IRepository<Usuario> _usuarioRepository;
    private readonly IConfiguration _configuration;

    public AuthService(IRepository<Usuario> usuarioRepository, IConfiguration configuration)
    {
        _usuarioRepository = usuarioRepository;
        _configuration = configuration;
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto request)
    {
        var usuarios = await _usuarioRepository.FindAsync(u => u.Email == request.Email);
        var usuario = usuarios.FirstOrDefault();

        if (usuario == null) return null;
        
        // Backward compatibility: If the hash starts with $2a$, $2b$, $2x$, or $2y$, it's BCrypt. Otherwise, it might be plain text.
        bool isPasswordValid = false;
        if (usuario.SenhaHash.StartsWith("$2a$") || usuario.SenhaHash.StartsWith("$2b$") || usuario.SenhaHash.StartsWith("$2x$") || usuario.SenhaHash.StartsWith("$2y$")) 
        {
            isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Senha, usuario.SenhaHash);
        } 
        else 
        {
            isPasswordValid = (usuario.SenhaHash == request.Senha);
        }

        if (!isPasswordValid) return null;

        if (!usuario.Ativo) return null;

        return new LoginResponseDto
        {
            Token = GenerateJwtToken(usuario),
            Nome = usuario.Nome,
            Email = usuario.Email,
            Role = usuario.Role,
            ClienteId = usuario.ClienteId,
            PrecisaTrocarSenha = usuario.PrecisaTrocarSenha
        };
    }

    private string GenerateJwtToken(Usuario usuario)
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
