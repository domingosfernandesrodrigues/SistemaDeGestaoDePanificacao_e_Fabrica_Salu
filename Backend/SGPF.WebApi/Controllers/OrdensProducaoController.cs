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

        // Buscar a ficha técnica do produto se existir
        var ficha = await _context.FichasTecnicas
            .Include(f => f.Insumos)
            .FirstOrDefaultAsync(f => f.ProdutoId == op.ProdutoId);

        var insumosNovos = new List<OrdemProducaoInsumo>();

        if (ficha != null)
        {
            var multiplicador = op.QuantidadePlanejada / ficha.RendimentoPadrao;

            foreach (var insumoFicha in ficha.Insumos)
            {
                var quantidadeNecessariaComPerda = insumoFicha.QuantidadeNecessaria * (1 + insumoFicha.PerdaPercentual / 100);
                var quantidadePlanejada = quantidadeNecessariaComPerda * multiplicador;

                var insumo = await _context.Produtos.FindAsync(insumoFicha.InsumoId);
                if (insumo == null) return BadRequest(new { message = $"Insumo de ID {insumoFicha.InsumoId} não encontrado." });

                // Calcular o consumo em outras OPs Planejadas
                var consumidoEmOutrasPlanejadas = await _context.OrdemProducaoInsumos
                    .Where(opi => opi.InsumoId == insumoFicha.InsumoId && opi.OrdemProducao!.Status == StatusOrdemProducao.Planejada)
                    .SumAsync(opi => opi.QuantidadePlanejada);

                var disponivelProjetado = insumo.QuantidadeEstoque - consumidoEmOutrasPlanejadas;

                if (disponivelProjetado < quantidadePlanejada)
                {
                    return BadRequest(new { message = $"Estoque insuficiente de insumos para planejamento. O insumo '{insumo.Nome}' necessita de {quantidadePlanejada:N2}, mas possui apenas {disponivelProjetado:N2} disponível projetado (Estoque físico: {insumo.QuantidadeEstoque:N2}, comprometido em outras OPs Planejadas: {consumidoEmOutrasPlanejadas:N2})." });
                }

                insumosNovos.Add(new OrdemProducaoInsumo
                {
                    InsumoId = insumoFicha.InsumoId,
                    QuantidadePlanejada = quantidadePlanejada,
                    QuantidadeConsumida = 0
                });
            }
        }

        op.Status = StatusOrdemProducao.Planejada;
        op.Insumos = insumosNovos;

        await _repository.AddAsync(op);
        
        // Recarregar com Includes para o frontend
        var createdOp = await _context.OrdensProducao
            .Include(o => o.Produto)
            .Include(o => o.UsuarioPlanejou)
            .Include(o => o.Insumos)
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

        // Buscar a ficha técnica do produto atualizado se existir
        var ficha = await _context.FichasTecnicas
            .Include(f => f.Insumos)
            .FirstOrDefaultAsync(f => f.ProdutoId == opAtualizada.ProdutoId);

        if (ficha != null)
        {
            var insumosNovos = new List<OrdemProducaoInsumo>();
            var multiplicador = opAtualizada.QuantidadePlanejada / ficha.RendimentoPadrao;

            foreach (var insumoFicha in ficha.Insumos)
            {
                var quantidadeNecessariaComPerda = insumoFicha.QuantidadeNecessaria * (1 + insumoFicha.PerdaPercentual / 100);
                var quantidadePlanejada = quantidadeNecessariaComPerda * multiplicador;

                var insumo = await _context.Produtos.FindAsync(insumoFicha.InsumoId);
                if (insumo == null) return BadRequest(new { message = $"Insumo de ID {insumoFicha.InsumoId} não encontrado." });

                // Calcular o consumo em outras OPs Planejadas (excluindo a OP atual)
                var consumidoEmOutrasPlanejadas = await _context.OrdemProducaoInsumos
                    .Where(opi => opi.InsumoId == insumoFicha.InsumoId && opi.OrdemProducao!.Status == StatusOrdemProducao.Planejada && opi.OrdemProducaoId != op.Id)
                    .SumAsync(opi => opi.QuantidadePlanejada);

                var disponivelProjetado = insumo.QuantidadeEstoque - consumidoEmOutrasPlanejadas;

                if (disponivelProjetado < quantidadePlanejada)
                {
                    return BadRequest(new { message = $"Estoque insuficiente de insumos para planejamento. O insumo '{insumo.Nome}' necessita de {quantidadePlanejada:N2}, mas possui apenas {disponivelProjetado:N2} disponível projetado (Estoque físico: {insumo.QuantidadeEstoque:N2}, comprometido em outras OPs Planejadas: {consumidoEmOutrasPlanejadas:N2})." });
                }

                insumosNovos.Add(new OrdemProducaoInsumo
                {
                    OrdemProducaoId = op.Id,
                    InsumoId = insumoFicha.InsumoId,
                    QuantidadePlanejada = quantidadePlanejada,
                    QuantidadeConsumida = 0
                });
            }

            // Deletar os insumos antigos da OP
            var insumosAntigos = await _context.OrdemProducaoInsumos
                .Where(i => i.OrdemProducaoId == op.Id)
                .ToListAsync();

            if (insumosAntigos.Any())
            {
                _context.OrdemProducaoInsumos.RemoveRange(insumosAntigos);
            }

            // Adicionar novos insumos
            if (insumosNovos.Any())
            {
                _context.OrdemProducaoInsumos.AddRange(insumosNovos);
            }
        }

        op.ProdutoId = opAtualizada.ProdutoId;
        op.QuantidadePlanejada = opAtualizada.QuantidadePlanejada;

        await _context.SaveChangesAsync();
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
