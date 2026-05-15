using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin,Gestor")]
public class DespesasController : ControllerBase
{
    private readonly IRepository<ContaPagar> _repository;

    public DespesasController(IRepository<ContaPagar> repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var todas = await _repository.GetAllAsync();
        var filtradas = todas.Where(d => 
            !d.Descricao.StartsWith("Compra #") && 
            d.Categoria != "Insumos" && 
            d.Categoria != "Mercadorias" && 
            d.Categoria != "Folha de Pagamento").ToList();
        return Ok(filtradas);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ContaPagar despesa)
    {
        despesa.Status = StatusContaPagar.Pendente;
        await _repository.AddAsync(despesa);
        return Ok(despesa);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ContaPagar despesa)
    {
        if (id != despesa.Id) return BadRequest();
        await _repository.UpdateAsync(despesa);
        return Ok(despesa);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _repository.DeleteAsync(id);
        return NoContent();
    }
}
