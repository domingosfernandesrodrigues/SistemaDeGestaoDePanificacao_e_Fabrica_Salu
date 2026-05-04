using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/fichas-tecnicas")]
[Authorize(Roles = "Admin,Gestor,Operador")]
public class FichaTecnicaController : ControllerBase
{
    private readonly AppDbContext _context;

    public FichaTecnicaController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var fichas = await _context.FichasTecnicas
            .Include(f => f.Produto)
            .Include(f => f.Insumos)
                .ThenInclude(i => i.Insumo)
            .ToListAsync();
        return Ok(fichas);
    }

    [HttpGet("{produtoId}")]
    public async Task<IActionResult> GetByProduto(Guid produtoId)
    {
        var ficha = await _context.FichasTecnicas
            .Include(f => f.Produto)
            .Include(f => f.Insumos)
                .ThenInclude(i => i.Insumo)
            .FirstOrDefaultAsync(f => f.ProdutoId == produtoId);
        
        if (ficha == null) return NotFound(new { message = "Ficha técnica não encontrada para este produto." });
        
        return Ok(ficha);
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] FichaTecnica fichaRequest)
    {
        try 
        {
            var existingFicha = await _context.FichasTecnicas
                .Include(f => f.Insumos)
                .FirstOrDefaultAsync(f => f.ProdutoId == fichaRequest.ProdutoId);

            if (existingFicha != null)
            {
                // Atualizar ficha existente
                existingFicha.RendimentoPadrao = fichaRequest.RendimentoPadrao;
                
                // Limpar insumos antigos removendo do banco e da coleção
                _context.FichaTecnicaInsumos.RemoveRange(existingFicha.Insumos);
                existingFicha.Insumos.Clear();
                
                // Forçar o salvamento das remoções antes de adicionar novos (evita conflitos)
                await _context.SaveChangesAsync();

                foreach (var item in fichaRequest.Insumos)
                {
                    _context.FichaTecnicaInsumos.Add(new FichaTecnicaInsumo
                    {
                        FichaTecnicaId = existingFicha.Id,
                        InsumoId = item.InsumoId,
                        QuantidadeNecessaria = item.QuantidadeNecessaria,
                        PerdaPercentual = item.PerdaPercentual
                    });
                }
                
                _context.FichasTecnicas.Update(existingFicha);
            }
            else
            {
                // Criar nova ficha
                if (fichaRequest.Id == Guid.Empty) fichaRequest.Id = Guid.NewGuid();
                
                foreach(var item in fichaRequest.Insumos)
                {
                    if (item.Id == Guid.Empty) item.Id = Guid.NewGuid();
                    item.FichaTecnicaId = fichaRequest.Id;
                }

                _context.FichasTecnicas.Add(fichaRequest);
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Ficha técnica salva com sucesso!", id = fichaRequest.Id });
        }
        catch (DbUpdateException dbEx)
        {
            return StatusCode(500, new { message = "Erro de banco de dados ao salvar ficha.", details = dbEx.InnerException?.Message ?? dbEx.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Erro interno ao salvar ficha técnica.", details = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ficha = await _context.FichasTecnicas.FindAsync(id);
        if (ficha == null) return NotFound();

        _context.FichasTecnicas.Remove(ficha);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
