using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class AgendaEventosController : ControllerBase
{
    private readonly IRepository<AgendaEvento> _repo;

    public AgendaEventosController(IRepository<AgendaEvento> repo)
    {
        _repo = repo;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var eventos = await _repo.GetAllAsync();
        return Ok(eventos);
    }

    [HttpPost]
    public async Task<IActionResult> Post(AgendaEvento evento)
    {
        if (evento.Id == Guid.Empty) evento.Id = Guid.NewGuid();
        await _repo.AddAsync(evento);
        return Ok(evento);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Put(Guid id, AgendaEvento evento)
    {
        var existente = await _repo.GetByIdAsync(id);
        if (existente == null) return NotFound();

        existente.Titulo = evento.Titulo;
        existente.Tipo = evento.Tipo;
        existente.Descricao = evento.Descricao;
        existente.Data = evento.Data;

        await _repo.UpdateAsync(existente);
        return Ok(existente);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _repo.DeleteAsync(id);
        return NoContent();
    }
}
