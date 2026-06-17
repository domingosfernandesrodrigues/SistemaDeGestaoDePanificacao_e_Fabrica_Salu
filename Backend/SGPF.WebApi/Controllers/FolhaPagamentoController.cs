using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Application.Interfaces;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/folha-pagamento")]
[Authorize]
public class FolhaPagamentoController : ControllerBase
{
    private readonly IFolhaPagamentoService _folhaService;
    private readonly SGPF.Domain.Interfaces.IRepository<SGPF.Domain.Entities.FolhaPagamento> _repository;

    public FolhaPagamentoController(IFolhaPagamentoService folhaService, SGPF.Domain.Interfaces.IRepository<SGPF.Domain.Entities.FolhaPagamento> repository)
    {
        _folhaService = folhaService;
        _repository = repository;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> GetAll([FromQuery] int? mes, [FromQuery] int? ano, [FromQuery] SGPF.Domain.Entities.TipoFolha? tipo)
    {
        if (mes.HasValue && ano.HasValue)
        {
            if (tipo.HasValue)
            {
                return Ok(await _repository.FindAsync(f => f.MesReferencia == mes && f.AnoReferencia == ano && f.Tipo == tipo));
            }
            return Ok(await _repository.FindAsync(f => f.MesReferencia == mes && f.AnoReferencia == ano));
        }
        if (tipo.HasValue)
        {
            return Ok(await _repository.FindAsync(f => f.Tipo == tipo));
        }
        return Ok(await _repository.GetAllAsync());
    }

    [HttpGet("funcionarios")]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> GetComFuncionarios([FromServices] SGPF.Domain.Interfaces.IRepository<SGPF.Domain.Entities.Funcionario> funcRepo, [FromQuery] int? mes, [FromQuery] int? ano, [FromQuery] SGPF.Domain.Entities.TipoFolha? tipo)
    {
        var query = await _repository.GetAllAsync();
        if (mes.HasValue) query = query.Where(f => f.MesReferencia == mes).ToList();
        if (ano.HasValue) query = query.Where(f => f.AnoReferencia == ano).ToList();
        if (tipo.HasValue) query = query.Where(f => f.Tipo == tipo).ToList();
        
        var funcs = await funcRepo.GetAllAsync();
        
        var result = query.Select(f => new {
            f.Id,
            f.MesReferencia,
            f.AnoReferencia,
            f.SalarioBaseCalculado,
            f.TotalHorasExtras50,
            f.ValorHorasExtras50,
            f.TotalHorasExtras100,
            f.ValorHorasExtras100,
            f.ValorAdicionalNoturno,
            f.TotalDescontos,
            f.SalarioLiquido,
            f.Status,
            f.Tipo,
            FuncionarioNome = funcs.FirstOrDefault(func => func.Id == f.FuncionarioId)?.Nome ?? "Desconhecido"
        });

        return Ok(result);
    }

    [HttpGet("meus-contracheques")]
    public async Task<IActionResult> GetMeusContracheques([FromServices] SGPF.Domain.Interfaces.IRepository<SGPF.Domain.Entities.Funcionario> funcRepo)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        
        var userId = Guid.Parse(userIdClaim.Value);
        var func = (await funcRepo.FindAsync(f => f.UsuarioId == userId)).FirstOrDefault();
        
        if (func == null) return Ok(new List<object>()); // Retorna lista vazia se não for funcionário vinculado

        var folhas = await _repository.FindAsync(f => f.FuncionarioId == func.Id);
        return Ok(folhas.OrderByDescending(f => f.AnoReferencia).ThenByDescending(f => f.MesReferencia));
    }

    [HttpPost("processar")]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> Processar([FromQuery] int mes, [FromQuery] int ano, [FromQuery] SGPF.Domain.Entities.TipoFolha tipo = SGPF.Domain.Entities.TipoFolha.Mensal)
    {
        try
        {
            var folhas = await _folhaService.ProcessarFolhaAsync(mes, ano, tipo);
            return Ok(folhas);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/fechar")]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> Fechar(Guid id)
    {
        try
        {
            var folha = await _folhaService.FecharFolhaAsync(id);
            return Ok(folha);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/pagar")]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> Pagar(Guid id)
    {
        try
        {
            var folha = await _folhaService.PagarFolhaAsync(id);
            return Ok(folha);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id}/contracheque")]
    public async Task<IActionResult> GerarContracheque(Guid id, [FromServices] SGPF.Domain.Interfaces.IRepository<SGPF.Domain.Entities.Funcionario> funcRepo)
    {
        try
        {
            var folha = await _repository.GetByIdAsync(id);
            if (folha == null) return NotFound();

            // Segurança: Se não for Admin/Gestor, verificar se a folha pertence ao usuário logado
            if (!User.IsInRole("Admin") && !User.IsInRole("Gestor"))
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
                if (userIdClaim == null) return Unauthorized();

                var userId = Guid.Parse(userIdClaim.Value);
                var func = (await funcRepo.FindAsync(f => f.UsuarioId == userId)).FirstOrDefault();

                if (func == null || folha.FuncionarioId != func.Id)
                    return Forbid();
            }

            var pdfBytes = await _folhaService.GerarContrachequePdfAsync(id);
            return File(pdfBytes, "application/pdf", $"contracheque_{id}.pdf");
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
