using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin,Gestor,Operador,Cliente")]
public class ProdutosController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProdutosController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() 
    {
        return Ok(await _context.Produtos.OrderBy(p => p.Nome).ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var produto = await _context.Produtos.FindAsync(id);
        return produto == null ? NotFound() : Ok(produto);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Gestor,Operador")]
    public async Task<IActionResult> Create([FromBody] Produto produto)
    {
        _context.Produtos.Add(produto);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = produto.Id }, produto);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Gestor,Operador")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Produto produto)
    {
        if (id != produto.Id) return BadRequest();
        
        var existing = await _context.Produtos.FindAsync(id);
        if (existing == null) return NotFound();

        // Verificar mudanças de preço para histórico
        if (existing.PrecoCusto != produto.PrecoCusto)
        {
            _context.HistoricoPrecos.Add(new HistoricoPrecoProduto
            {
                ProdutoId = existing.Id,
                PrecoAntigo = existing.PrecoCusto,
                PrecoNovo = produto.PrecoCusto,
                Tipo = TipoPrecoHistorico.Custo,
                Origem = "Alteração Manual",
                UsuarioNome = User.Identity?.Name
            });
        }

        if (existing.PrecoVenda != produto.PrecoVenda)
        {
            _context.HistoricoPrecos.Add(new HistoricoPrecoProduto
            {
                ProdutoId = existing.Id,
                PrecoAntigo = existing.PrecoVenda,
                PrecoNovo = produto.PrecoVenda,
                Tipo = TipoPrecoHistorico.Venda,
                Origem = "Alteração Manual",
                UsuarioNome = User.Identity?.Name
            });
        }

        // Atualizar campos permitidos
        existing.Nome = produto.Nome;
        existing.Tipo = produto.Tipo;
        existing.UnidadeMedida = produto.UnidadeMedida;
        existing.PrecoCusto = produto.PrecoCusto;
        existing.PrecoVenda = produto.PrecoVenda;
        existing.Ativo = produto.Ativo;
        if (existing.QuantidadeEstoque != produto.QuantidadeEstoque)
        {
            var delta = produto.QuantidadeEstoque - existing.QuantidadeEstoque;
            _context.MovimentacoesEstoque.Add(new MovimentacaoEstoque
            {
                ProdutoId = existing.Id,
                Tipo = delta > 0 ? TipoMovimentacao.Entrada : TipoMovimentacao.Saida,
                Quantidade = Math.Abs(delta),
                Origem = "Ajuste Manual",
                Observacao = $"Ajuste de inventário por {User.Identity?.Name ?? "Usuário"}"
            });
        }
        existing.QuantidadeEstoque = produto.QuantidadeEstoque;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id}/historico-precos")]
    public async Task<IActionResult> GetHistory(Guid id)
    {
        var historico = await _context.HistoricoPrecos
            .Where(h => h.ProdutoId == id)
            .OrderByDescending(h => h.DataAlteracao)
            .ToListAsync();
        return Ok(historico);
    }

    [HttpPatch("{id}/toggle-status")]
    [Authorize(Roles = "Admin,Gestor,Operador")]
    public async Task<IActionResult> ToggleStatus(Guid id)
    {
        var produto = await _context.Produtos.FindAsync(id);
        if (produto == null) return NotFound();

        produto.Ativo = !produto.Ativo;
        await _context.SaveChangesAsync();
        return Ok(new { ativo = produto.Ativo });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var produto = await _context.Produtos.FindAsync(id);
        if (produto == null) return NotFound();

        // Verificar dependências (Histórico)
        bool temHistorico = await _context.MovimentacoesEstoque.AnyAsync(m => m.ProdutoId == id) ||
                            await _context.PedidoVendaItens.AnyAsync(p => p.ProdutoId == id) ||
                            await _context.OrdensProducao.AnyAsync(o => o.ProdutoId == id) ||
                            await _context.FichasTecnicas.AnyAsync(f => f.ProdutoId == id) ||
                            await _context.FichaTecnicaInsumos.AnyAsync(f => f.InsumoId == id) ||
                            await _context.OrdemProducaoInsumos.AnyAsync(o => o.InsumoId == id) ||
                            await _context.TrocasAvaria.AnyAsync(t => t.ProdutoId == id);

        if (temHistorico)
        {
            return BadRequest(new { 
                message = "Não é possível excluir este produto pois ele possui histórico no sistema (vendas, estoque ou produção). Deseja inativá-lo?",
                canInactivate = true
            });
        }

        _context.Produtos.Remove(produto);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
