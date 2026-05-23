using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Application.Services;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class LogisticaController : ControllerBase
{
    private readonly FrotaService _frotaService;
    private readonly TrocaService _trocaService;
    private readonly IRepository<Veiculo> _veiculoRepo;
    private readonly IRepository<TrocaAvaria> _trocaRepo;

    public LogisticaController(
        FrotaService frotaService,
        TrocaService trocaService,
        IRepository<Veiculo> veiculoRepo,
        IRepository<TrocaAvaria> trocaRepo)
    {
        _frotaService = frotaService;
        _trocaService = trocaService;
        _veiculoRepo = veiculoRepo;
        _trocaRepo = trocaRepo;
    }

    // Frota
    [HttpGet("veiculos")]
    public async Task<IActionResult> GetVeiculos() => Ok(await _veiculoRepo.GetAllAsync());

    [HttpPost("veiculos")]
    public async Task<IActionResult> CreateVeiculo([FromBody] Veiculo veiculo)
    {
        await _veiculoRepo.AddAsync(veiculo);
        return Ok(veiculo);
    }

    [HttpPatch("veiculos/{id}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(Guid id)
    {
        var veiculo = await _veiculoRepo.GetByIdAsync(id);
        if (veiculo == null) return NotFound();
        
        veiculo.Ativo = !veiculo.Ativo;
        await _veiculoRepo.UpdateAsync(veiculo);
        return Ok(veiculo);
    }

    [HttpDelete("veiculos/{id}")]
    public async Task<IActionResult> DeleteVeiculo(Guid id, [FromServices] IRepository<Abastecimento> abastRepo, [FromServices] IRepository<ManutencaoVeiculo> manuRepo)
    {
        var abasts = await abastRepo.GetAllAsync();
        var manus = await manuRepo.GetAllAsync();

        if (abasts.Any(a => a.VeiculoId == id) || manus.Any(m => m.VeiculoId == id))
        {
            return BadRequest(new { message = "Não é possível excluir um veículo que já possui histórico de abastecimento ou manutenção. Tente inativá-lo." });
        }

        await _veiculoRepo.DeleteAsync(id);
        return NoContent();
    }

    [HttpPost("abastecer")]
    public async Task<IActionResult> Abastecer([FromBody] Abastecimento abast)
    {
        return Ok(await _frotaService.RegistrarAbastecimentoAsync(abast));
    }

    [HttpGet("abastecimentos")]
    public async Task<IActionResult> GetAbastecimentos([FromServices] IRepository<Abastecimento> repo) => Ok(await repo.GetAllAsync());

    [HttpPost("manutencao")]
    public async Task<IActionResult> Manutencao([FromBody] ManutencaoVeiculo manu)
    {
        return Ok(await _frotaService.RegistrarManutencaoAsync(manu));
    }

    [HttpGet("manutencoes")]
    public async Task<IActionResult> GetManutencoes([FromServices] IRepository<ManutencaoVeiculo> repo) => Ok(await repo.GetAllAsync());

    // Trocas
    [HttpGet("trocas")]
    public async Task<IActionResult> GetTrocas() => Ok(await _trocaRepo.GetAllAsync());

    [HttpPost("trocas")]
    public async Task<IActionResult> RegistrarTroca([FromBody] TrocaAvaria troca)
    {
        try
        {
            if (User.IsInRole("Motorista") && !troca.MotoristaId.HasValue)
            {
                var claim = User.FindFirst("FuncionarioId");
                if (claim != null && Guid.TryParse(claim.Value, out var id))
                {
                    troca.MotoristaId = id;
                }
            }
            return Ok(await _trocaService.RegistrarTrocaAsync(troca));
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
