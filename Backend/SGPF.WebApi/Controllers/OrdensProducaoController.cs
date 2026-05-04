using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;
using SGPF.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/ordens-producao")]
[Authorize(Roles = "Admin,Gestor,Operador")]
public class OrdensProducaoController : ControllerBase
{
    private readonly IRepository<OrdemProducao> _repository;
    private readonly IOrdemProducaoService _opService;
    private readonly AppDbContext _context;

    public OrdensProducaoController(IRepository<OrdemProducao> repository, IOrdemProducaoService opService, AppDbContext context)
    {
        _repository = repository;
        _opService = opService;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try 
        {
            var ops = await _context.OrdensProducao
                .Include(o => o.Produto)
                .Include(o => o.UsuarioPlanejou)
                .Include(o => o.UsuarioIniciou)
                .Include(o => o.UsuarioFinalizou)
                .OrderByDescending(o => o.DataAbertura)
                .ToListAsync();
            return Ok(ops);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Erro ao buscar ordens de produção.", details = ex.Message, inner = ex.InnerException?.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] OrdemProducao op)
    {
        var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userIdStr) && Guid.TryParse(userIdStr, out var userId))
        {
            op.UsuarioPlanejouId = userId;
        }

        op.Status = StatusOrdemProducao.Planejada;
        await _repository.AddAsync(op);
        
        // Recarregar com Includes para o frontend
        var createdOp = await _context.OrdensProducao
            .Include(o => o.Produto)
            .Include(o => o.UsuarioPlanejou)
            .FirstOrDefaultAsync(o => o.Id == op.Id);

        return Ok(createdOp);
    }

    [HttpPost("{id}/start")]
    public async Task<IActionResult> Start(Guid id)
    {
        try
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            await _opService.StartOPAsync(id, userId);
            
            // Recarregar com Includes
            var op = await _context.OrdensProducao
                .Include(o => o.Produto)
                .Include(o => o.UsuarioPlanejou)
                .Include(o => o.UsuarioIniciou)
                .FirstOrDefaultAsync(o => o.Id == id);
                
            return Ok(op);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/finish")]
    public async Task<IActionResult> Finish(Guid id, [FromBody] List<OrdemProducaoInsumo> insumosConsumidos)
    {
        try
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            await _opService.FinishOPAsync(id, insumosConsumidos, userId);
            
            // Recarregar com Includes
            var op = await _context.OrdensProducao
                .Include(o => o.Produto)
                .Include(o => o.UsuarioPlanejou)
                .Include(o => o.UsuarioIniciou)
                .Include(o => o.UsuarioFinalizou)
                .FirstOrDefaultAsync(o => o.Id == id);
                
            return Ok(op);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] OrdemProducao opAtualizada)
    {
        var op = await _repository.GetByIdAsync(id);
        if (op == null) return NotFound();

        if (op.Status != StatusOrdemProducao.Planejada)
        {
            return BadRequest(new { message = "Não é possível editar uma ordem de produção que já foi iniciada ou finalizada." });
        }

        op.ProdutoId = opAtualizada.ProdutoId;
        op.QuantidadePlanejada = opAtualizada.QuantidadePlanejada;

        await _repository.UpdateAsync(op);
        return Ok(op);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try 
        {
            var op = await _context.OrdensProducao
                .Include(o => o.Insumos)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (op == null) return NotFound();

            if (op.Status != StatusOrdemProducao.Planejada)
            {
                return BadRequest(new { message = "Somente ordens de produção com status 'Planejada' podem ser excluídas." });
            }

            // Remove todos os insumos vinculados primeiro (exclusão em cascata manual)
            if (op.Insumos.Any())
            {
                _context.OrdemProducaoInsumos.RemoveRange(op.Insumos);
            }
            
            _context.OrdensProducao.Remove(op);
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Erro ao excluir ordem de produção.", details = ex.Message });
        }
    }
}
