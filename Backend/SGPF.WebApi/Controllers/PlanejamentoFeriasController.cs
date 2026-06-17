using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/planejamento-ferias")]
public class PlanejamentoFeriasController : ControllerBase
{
    private readonly IPlanejamentoFeriasService _service;
    private readonly ILogger<PlanejamentoFeriasController> _logger;

    public PlanejamentoFeriasController(IPlanejamentoFeriasService service, ILogger<PlanejamentoFeriasController> logger)
    {
        _service = service;
        _logger = logger;
    }

    /// <summary>Listagem geral — RH vê todos os planejamentos.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();
        return Ok(result);
    }

    /// <summary>Detalhes de um planejamento específico.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound(new { message = "Planejamento não encontrado." });
        return Ok(result);
    }

    /// <summary>Planejamentos de um funcionário específico.</summary>
    [HttpGet("funcionario/{funcId:guid}")]
    public async Task<IActionResult> GetByFuncionario(Guid funcId)
    {
        var result = await _service.GetByFuncionarioAsync(funcId);
        return Ok(result);
    }

    /// <summary>
    /// Planejamentos (Total ou 1ª Parcela) com início no mês/ano informado.
    /// Usado pela FolhaPagamento ao verificar férias do próximo mês.
    /// </summary>
    [HttpGet("mes/{mes:int}/ano/{ano:int}")]
    public async Task<IActionResult> ConsultarPorMes(int mes, int ano)
    {
        if (mes < 1 || mes > 12) return BadRequest(new { message = "Mês inválido (1–12)." });
        var result = await _service.ConsultarPorMesAsync(mes, ano);
        return Ok(result);
    }

    /// <summary>
    /// Cria planejamento(s) de férias.
    /// Se Parcelado = true, cria até 3 planejamentos automaticamente (CLT Art. 148).
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CriarPlanejamentoFeriasRequest request)
    {
        try
        {
            _logger.LogInformation("Planejar Férias - POST recebido. FuncionarioId: {FuncionarioId}, SolicitaAdiantamentoDecimoTerceiro: {Solicita13}", 
                request.FuncionarioId, request.SolicitaAdiantamentoDecimoTerceiro);
            var result = await _service.CreateAsync(request);
            return Created(string.Empty, result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Planejar Férias - Falha no processamento (Create): {Error}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Altera data e configurações de um planejamento existente.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] AtualizarPlanejamentoFeriasRequest request)
    {
        try
        {
            _logger.LogInformation("Planejar Férias - PUT recebido. Id: {Id}, SolicitaAdiantamentoDecimoTerceiro: {Solicita13}", 
                id, request.SolicitaAdiantamentoDecimoTerceiro);
            var result = await _service.UpdateAsync(id, request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Planejar Férias - Falha no processamento (Update): {Error}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Cancela um planejamento (não deleta — mantém histórico).</summary>
    [HttpPost("{id:guid}/cancelar")]
    public async Task<IActionResult> Cancelar(Guid id, [FromBody] CancelarRequest? body)
    {
        try
        {
            await _service.CancelAsync(id, body?.Motivo);
            return Ok(new { message = "Planejamento cancelado com sucesso." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Aprova um planejamento de férias.</summary>
    [HttpPost("{id:guid}/aprovar")]
    public async Task<IActionResult> Aprovar(Guid id)
    {
        try
        {
            await _service.ApproveAsync(id);
            return Ok(new { message = "Planejamento de férias aprovado com sucesso." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

public record CancelarRequest(string? Motivo);
