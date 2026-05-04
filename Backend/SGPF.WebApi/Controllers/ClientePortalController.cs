using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/portal-cliente")]
[Authorize(Roles = "Cliente")]
public class ClientePortalController : ControllerBase
{
    private readonly IVendaService _vendaService;

    public ClientePortalController(IVendaService vendaService)
    {
        _vendaService = vendaService;
    }

    [HttpPost("pedidos")]
    public async Task<IActionResult> NovoPedido([FromBody] PedidoVenda pedido)
    {
        // Força o ClienteId ser o do token logado (na prática, leríamos dos Claims)
        var result = await _vendaService.CriarPedidoPortalAsync(pedido);
        return Ok(result);
    }
}
