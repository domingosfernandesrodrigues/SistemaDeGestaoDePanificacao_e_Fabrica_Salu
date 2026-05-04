using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin,Gestor,Operador")]
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
        return Ok(await _vendaService.GetPedidosAsync());
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

    [HttpPost("{id}/entregar")]
    public async Task<IActionResult> Entregar(Guid id)
    {
        try
        {
            var p = await _vendaService.EntregarPedidoAsync(id);
            return Ok(p);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
