using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin,Gestor,Operador,Cliente")]
public class EmpresasController : ControllerBase
{
    private readonly IRepository<Empresa> _repository;

    public EmpresasController(IRepository<Empresa> repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _repository.GetAllAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var empresa = await _repository.GetByIdAsync(id);
        return empresa == null ? NotFound() : Ok(empresa);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> Create([FromBody] Empresa empresa)
    {
        await _repository.AddAsync(empresa);
        return CreatedAtAction(nameof(GetById), new { id = empresa.Id }, empresa);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Empresa empresa)
    {
        if (id != empresa.Id) return BadRequest();
        await _repository.UpdateAsync(empresa);
        return Ok(empresa); // Retorna a empresa atualizada para o frontend atualizar o cache
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _repository.DeleteAsync(id);
        return NoContent();
    }
}
