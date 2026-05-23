using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin,Gestor,Operador,Cliente,Motorista")]
public class VendasController : ControllerBase
{
    private readonly IVendaService _vendaService;

    public VendasController(IVendaService vendaService)
    {
        _vendaService = vendaService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        Guid? motoristaId = null;
        if (User.IsInRole("Motorista"))
        {
            var claim = User.FindFirst("FuncionarioId");
            if (claim != null && Guid.TryParse(claim.Value, out var id))
            {
                motoristaId = id;
            }
            else
            {
                // Se for motorista mas não tiver FuncionarioId vinculado, retorna lista vazia ou erro
                return Ok(new List<PedidoVenda>());
            }
        }

        return Ok(await _vendaService.GetPedidosAsync(motoristaId));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var pedido = await _vendaService.GetByIdAsync(id);
        return pedido == null ? NotFound() : Ok(pedido);
    }

    [HttpPost]
    public async Task<IActionResult> CriarPedido([FromBody] PedidoVenda pedido)
    {
        try
        {
            var p = await _vendaService.CriarPedidoAsync(pedido);
            return Ok(p);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> AtualizarPedido(Guid id, [FromBody] PedidoVenda pedido)
    {
        try
        {
            var p = await _vendaService.AtualizarPedidoAsync(id, pedido);
            return Ok(p);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> AtualizarStatus(Guid id, [FromBody] StatusPedidoVenda novoStatus)
    {
        try { return Ok(await _vendaService.AtualizarStatusAsync(id, novoStatus)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id}/cancelar")]
    public async Task<IActionResult> Cancelar(Guid id)
    {
        try { return Ok(await _vendaService.CancelarPedidoAsync(id)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Excluir(Guid id)
    {
        try { await _vendaService.ExcluirPedidoAsync(id); return NoContent(); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }
    [HttpPatch("{id}/toggle-pagamento")]
    [Authorize(Roles = "Admin,Gestor,Operador")]
    public async Task<IActionResult> TogglePagamento(Guid id)
    {
        try { return Ok(await _vendaService.TogglePagamentoAsync(id)); }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    [AllowAnonymous]
    [HttpPost("webhook/confirmar-pagamento/{numeroPedido}")]
    public async Task<IActionResult> WebhookConfirmarPagamento(string numeroPedido)
    {
        var sucesso = await _vendaService.ConfirmarPagamentoAsync(numeroPedido);
        if (sucesso) return Ok(new { message = "Pagamento confirmado via Webhook" });
        return NotFound(new { message = "Pedido não encontrado" });
    }

    [HttpGet("{id}/nota-fiscal")]
    public async Task<IActionResult> DownloadNotaFiscal(Guid id)
    {
        try
        {
            var pdf = await _vendaService.GerarNotaFiscalAsync(id);
            return File(pdf, "application/pdf", $"NF-{id}.pdf");
        }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("{id}/comanda")]
    public async Task<IActionResult> DownloadComanda(Guid id)
    {
        try
        {
            var pdf = await _vendaService.GerarComandaAsync(id);
            return File(pdf, "application/pdf", $"Comanda-{id}.pdf");
        }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }
}
