using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;
using SGPF.Infrastructure.Data;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin,Gestor")]
public class FuncionariosController : ControllerBase
{
    private readonly IRepository<Funcionario> _repository;
    private readonly AppDbContext _context;

    public FuncionariosController(IRepository<Funcionario> repository, AppDbContext context)
    {
        _repository = repository;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _repository.GetAllAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var funcionario = await _repository.GetByIdAsync(id);
        if (funcionario == null) return NotFound();
        return Ok(funcionario);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Funcionario funcionario)
    {
        if (funcionario.Id == Guid.Empty) funcionario.Id = Guid.NewGuid();
        funcionario.EmpresaId = null;
        await _repository.AddAsync(funcionario);
        return Ok(funcionario);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Funcionario funcionario)
    {
        if (id != funcionario.Id) return BadRequest();
        funcionario.EmpresaId = null;
        await _repository.UpdateAsync(funcionario);
        return Ok(funcionario);
    }

    [HttpPatch("{id}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(Guid id)
    {
        var funcionario = await _repository.GetByIdAsync(id);
        if (funcionario == null) return NotFound();
        funcionario.Ativo = !funcionario.Ativo;
        await _repository.UpdateAsync(funcionario);
        return Ok(funcionario);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var temPonto = await _context.RegistrosPonto.AnyAsync(r => r.FuncionarioId == id);
        var temFolha = await _context.FolhasPagamento.AnyAsync(f => f.FuncionarioId == id);

        if (temPonto || temFolha)
        {
            return BadRequest(new { message = "Não é possível excluir um funcionário que já possui registros de ponto ou folha de pagamento. Tente inativá-lo." });
        }

        await _repository.DeleteAsync(id);
        return NoContent();
    }
}
