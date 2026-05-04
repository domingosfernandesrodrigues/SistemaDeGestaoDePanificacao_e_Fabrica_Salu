using Microsoft.AspNetCore.Mvc;
using SGPF.Application.DTOs;
using SGPF.Application.Interfaces;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request, [FromServices] SGPF.Domain.Interfaces.IRepository<SGPF.Domain.Entities.Usuario> repository)
    {
        var usuarios = await repository.FindAsync(u => u.Email == request.Email);
        var usuario = usuarios.FirstOrDefault();

        if (usuario != null && !usuario.Ativo)
            return Unauthorized(new { message = "E-mail ou senha inválidos. Entre em contato com o administrador." });

        var response = await _authService.LoginAsync(request);
        if (response == null)
            return Unauthorized(new { message = "E-mail ou senha inválidos." });

        return Ok(response);
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpPost("trocar-senha")]
    public async Task<IActionResult> TrocarSenha([FromBody] TrocarSenhaDto dto, [FromServices] SGPF.Domain.Interfaces.IRepository<SGPF.Domain.Entities.Usuario> repository)
    {
        if (!ValidatePasswordComplexity(dto.NovaSenha))
        {
            return BadRequest(new { message = "A senha deve ter no mínimo 8 caracteres e conter letras maiúsculas, minúsculas, números e caracteres especiais." });
        }

        var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

        var usuario = await repository.GetByIdAsync(userId);
        if (usuario == null) return NotFound();

        usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(dto.NovaSenha);
        usuario.PrecisaTrocarSenha = false;

        await repository.UpdateAsync(usuario);
        return Ok(new { message = "Senha alterada com sucesso." });
    }

    private bool ValidatePasswordComplexity(string password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < 8) return false;

        bool hasUpper = password.Any(char.IsUpper);
        bool hasLower = password.Any(char.IsLower);
        bool hasDigit = password.Any(char.IsDigit);
        bool hasSpecial = password.Any(ch => !char.IsLetterOrDigit(ch));

        return hasUpper && hasLower && hasDigit && hasSpecial;
    }
}
