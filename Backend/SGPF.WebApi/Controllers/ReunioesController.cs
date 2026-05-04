using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Application.Services;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.WebApi.Controllers;

public class AgendarReuniaoDto
{
    public Guid ClienteId { get; set; }
    public DateTime DataHora { get; set; }
    public string Pauta { get; set; } = string.Empty;
}

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ReunioesController : ControllerBase
{
    private readonly ReuniaoService _reuniaoService;
    private readonly IRepository<Reuniao> _repository;

    public ReunioesController(ReuniaoService reuniaoService, IRepository<Reuniao> repository)
    {
        _reuniaoService = reuniaoService;
        _repository = repository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _repository.GetAllAsync());

    [HttpPost]
    public async Task<IActionResult> Agendar([FromBody] AgendarReuniaoDto dto)
    {
        var reuniao = new Reuniao
        {
            ClienteId = dto.ClienteId,
            DataHora = dto.DataHora,
            Pauta = dto.Pauta,
            Status = StatusReuniao.Agendada,
            Ata = string.Empty
        };

        var result = await _reuniaoService.AgendarReuniaoAsync(reuniao);
        return Ok(result);
    }

    [HttpPost("{id}/concluir")]
    public async Task<IActionResult> Concluir(Guid id, [FromBody] string ata)
    {
        var result = await _reuniaoService.ConcluirReuniaoAsync(id, ata);
        return Ok(result);
    }

    [HttpPost("{id}/cancelar")]
    public async Task<IActionResult> Cancelar(Guid id)
    {
        var reuniao = await _repository.GetByIdAsync(id);
        if (reuniao == null) return NotFound();
        
        reuniao.Status = StatusReuniao.Cancelada;
        await _repository.UpdateAsync(reuniao);
        return Ok(reuniao);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] AgendarReuniaoDto dto)
    {
        var reuniao = await _repository.GetByIdAsync(id);
        if (reuniao == null) return NotFound();

        reuniao.ClienteId = dto.ClienteId;
        reuniao.DataHora = dto.DataHora;
        reuniao.Pauta = dto.Pauta;

        await _repository.UpdateAsync(reuniao);
        return Ok(reuniao);
    }
}
