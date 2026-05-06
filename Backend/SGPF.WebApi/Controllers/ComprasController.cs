using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using SGPF.Application.DTOs;
using SGPF.Application.Services;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ComprasController : ControllerBase
{
    private readonly ICompraService _compraService;
    private readonly IRepository<Fornecedor> _fornecedorRepo;
    private readonly IRepository<CompraItem> _itemRepo;
    private readonly IRepository<Produto> _produtoRepo;

    public ComprasController(ICompraService compraService, IRepository<Fornecedor> fornecedorRepo, IRepository<CompraItem> itemRepo, IRepository<Produto> produtoRepo)
    {
        _compraService = compraService;
        _fornecedorRepo = fornecedorRepo;
        _itemRepo = itemRepo;
        _produtoRepo = produtoRepo;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var compras = await _compraService.ListarTodasAsync();
        var response = new List<CompraResponseDto>();

        foreach (var c in compras)
        {
            var forn = await _fornecedorRepo.GetByIdAsync(c.FornecedorId);
            
            // Buscar itens para o resumo
            var itens = await _itemRepo.FindAsync(i => i.CompraId == c.Id);
            var produtosNomes = new List<string>();
            foreach (var item in itens)
            {
                var prod = await _produtoRepo.GetByIdAsync(item.ProdutoId);
                // Formata a quantidade para não mostrar zeros desnecessários (ex: 12,0000 -> 12)
                if (prod != null) produtosNomes.Add($"{prod.Nome} ({item.Quantidade.ToString("0.###")})");
            }

            response.Add(new CompraResponseDto
            {
                Id = c.Id,
                FornecedorNome = forn?.NomeFantasia ?? "Fornecedor Desconhecido",
                DataCompra = c.DataCompra,
                ValorTotal = c.ValorTotal,
                Status = c.Status.ToString(),
                Categoria = c.Categoria.ToString(),
                ProdutosResumo = string.Join(", ", produtosNomes),
                TotalItens = itens.Sum(i => i.Quantidade),
                Observacao = c.Observacao,
                Itens = itens.Select(i => new CompraItemDto
                {
                    ProdutoId = i.ProdutoId,
                    Quantidade = i.Quantidade,
                    PrecoUnitario = i.PrecoUnitario
                }).ToList()
            });
        }

        return Ok(response.OrderByDescending(c => c.DataCompra));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var compra = await _compraService.ObterPorIdAsync(id);
        if (compra == null) return NotFound();
        return Ok(compra);
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] CompraDto dto)
    {
        try
        {
            var compra = await _compraService.CriarRascunhoAsync(dto);
            return Ok(compra);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/confirmar")]
    public async Task<IActionResult> Confirmar(Guid id)
    {
        try
        {
            var compra = await _compraService.ConfirmarCompraAsync(id);
            return Ok(compra);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Put(Guid id, [FromBody] CompraDto dto)
    {
        try
        {
            var compra = await _compraService.AtualizarRascunhoAsync(id, dto);
            return Ok(compra);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _compraService.ExcluirRascunhoAsync(id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
