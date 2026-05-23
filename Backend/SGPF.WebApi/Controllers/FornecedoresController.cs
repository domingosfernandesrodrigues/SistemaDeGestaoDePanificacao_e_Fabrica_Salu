using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin,Gestor")]
public class FornecedoresController : ControllerBase
{
    private readonly IRepository<Fornecedor> _repository;

    public FornecedoresController(IRepository<Fornecedor> repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _repository.GetAllAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var fornecedor = await _repository.GetByIdAsync(id);
        if (fornecedor == null) return NotFound();
        return Ok(fornecedor);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Fornecedor fornecedor)
    {
        try 
        {
            if (fornecedor.Id == Guid.Empty) fornecedor.Id = Guid.NewGuid();
            await _repository.AddAsync(fornecedor);
            return Ok(fornecedor);
        }
        catch (Exception ex)
        {
            // Log detalhado para o console do dotnet run
            Console.WriteLine($"Erro ao criar fornecedor: {ex.Message}");
            if (ex.InnerException != null) Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
            return StatusCode(500, new { message = "Erro interno ao salvar fornecedor.", details = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Fornecedor fornecedor)
    {
        if (id != fornecedor.Id) return BadRequest();
        await _repository.UpdateAsync(fornecedor);
        return Ok(fornecedor);
    }

    [HttpPatch("{id}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(Guid id)
    {
        var fornecedor = await _repository.GetByIdAsync(id);
        if (fornecedor == null) return NotFound();
        fornecedor.Ativo = !fornecedor.Ativo;
        await _repository.UpdateAsync(fornecedor);
        return Ok(fornecedor);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, [FromServices] SGPF.Infrastructure.Data.AppDbContext context)
    {
        // Verificar histórico vinculado ao fornecedor em contas a pagar ou compras/entradas
        var temContasPagar = await context.ContasPagar.AnyAsync(c => c.FornecedorId == id);
        var temCompras = await context.Compras.AnyAsync(c => c.FornecedorId == id);
        
        if (temContasPagar || temCompras)
        {
            return BadRequest(new { message = "Não é possível excluir um fornecedor que já possui histórico de movimentações. Tente inativá-lo." });
        }

        await _repository.DeleteAsync(id);
        return NoContent();
    }
}
