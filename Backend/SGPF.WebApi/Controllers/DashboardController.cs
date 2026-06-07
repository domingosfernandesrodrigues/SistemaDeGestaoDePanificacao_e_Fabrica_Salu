using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Application.Interfaces;

namespace SGPF.WebApi.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet]
    public async Task<IActionResult> GetDashboard([FromQuery] int year, [FromQuery] int month, [FromQuery] int? day = null, [FromQuery] Guid? clienteId = null)
    {
        try
        {
            Guid? motoristaId = null;
            if (User.IsInRole("Motorista"))
            {
                var claim = User.FindFirst("FuncionarioId");
                if (claim != null && Guid.TryParse(claim.Value, out var id))
                {
                    motoristaId = id;
                }
            }

            // Se não vierem dados, pega o atual
            if (year == 0) year = DateTime.Now.Year;
            // Se month for 0, o Service já trata como "todos os meses" do ano.
            // Só vamos setar o mês atual se o usuário não enviou nada (nem ano nem mês)
            if (month == 0 && !Request.Query.ContainsKey("month")) month = DateTime.Now.Month;

            var data = await _dashboardService.GetDashboardDataAsync(year, month, day, clienteId, motoristaId);
            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message, detail = ex.InnerException?.Message });
        }
    }
}
