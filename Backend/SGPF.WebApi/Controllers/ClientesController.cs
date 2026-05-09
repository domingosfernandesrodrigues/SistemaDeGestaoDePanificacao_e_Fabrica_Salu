using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;
using SGPF.Infrastructure.Data;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin,Gestor,Operador,Cliente")]
public class ClientesController : ControllerBase
{
    private readonly IRepository<Cliente> _repository;
    private readonly AppDbContext _context;

    public ClientesController(IRepository<Cliente> repository, AppDbContext context)
    {
        _repository = repository;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _repository.GetAllAsync());

    [HttpPost]
    [Authorize(Roles = "Admin,Gestor,Operador")]
    public async Task<IActionResult> Create([FromBody] Cliente cliente)
    {
        cliente.Ativo = true;
        await _repository.AddAsync(cliente);
        return Ok(cliente);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Gestor,Operador")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Cliente clienteAtualizado)
    {
        var cliente = await _repository.GetByIdAsync(id);
        if (cliente == null) return NotFound();

        // Mapeamento manual para garantir que não haja confusão de nomes (C# vs JSON)
        cliente.NomeFantasia = clienteAtualizado.NomeFantasia;
        cliente.CNPJ_CPF = clienteAtualizado.CNPJ_CPF;
        cliente.Endereco = clienteAtualizado.Endereco;
        cliente.Telefone = clienteAtualizado.Telefone;
        cliente.Ativo = clienteAtualizado.Ativo;

        await _repository.UpdateAsync(cliente);
        return Ok(cliente);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Gestor,Operador")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var cliente = await _repository.GetByIdAsync(id);
        if (cliente == null) return NotFound();

        // Verificar se existem registros vinculados
        bool possuiPedidos = await _context.PedidosVenda.AnyAsync(p => p.ClienteId == id);
        bool possuiReunioes = await _context.Reunioes.AnyAsync(r => r.ClienteId == id);
        bool possuiUsuarios = await _context.Usuarios.AnyAsync(u => u.ClienteId == id);

        if (possuiPedidos || possuiReunioes || possuiUsuarios)
        {
            return BadRequest(new { message = "Este cliente possui registros vinculados (Pedidos, Reuniões ou Usuários) e não pode ser excluído. Recomenda-se desativá-lo para preservar o histórico." });
        }

        await _repository.DeleteAsync(id);
        return NoContent();
    }

    [HttpPost("{id}/toggle-status")]
    [Authorize(Roles = "Admin,Gestor,Operador")]
    public async Task<IActionResult> ToggleStatus(Guid id)
    {
        var cliente = await _repository.GetByIdAsync(id);
        if (cliente == null) return NotFound();

        cliente.Ativo = !cliente.Ativo;
        await _repository.UpdateAsync(cliente);
        return Ok(cliente);
    }
}
