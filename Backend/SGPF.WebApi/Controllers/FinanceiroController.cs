using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Application.Services;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin,Gestor")]
public class FinanceiroController : ControllerBase
{
    private readonly IFinanceiroService _finService;

    public FinanceiroController(IFinanceiroService finService)
    {
        _finService = finService;
    }

    [HttpGet("dre")]
    public async Task<IActionResult> GetDre([FromQuery] int mes, [FromQuery] int ano)
    {
        var dre = await _finService.GerarDreAsync(mes, ano);
        return Ok(dre);
    }

    [HttpGet("resumo")]
    public async Task<IActionResult> GetResumo()
    {
        var resumo = await _finService.ObterResumoAsync();
        return Ok(resumo);
    }

    [HttpPost("pagar/{id}/baixa")]
    public async Task<IActionResult> BaixarPagar(Guid id)
    {
        var warning = await _finService.BaixarContaPagarAsync(id);
        return Ok(new { warning });
    }

    [HttpPost("receber/{id}/baixa")]
    public async Task<IActionResult> BaixarReceber(Guid id)
    {
        await _finService.BaixarContaReceberAsync(id);
        return Ok();
    }
}
