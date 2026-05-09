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
            // Se não vierem dados, pega o atual
            if (year == 0) year = DateTime.UtcNow.Year;
            if (month == 0) month = DateTime.UtcNow.Month;

            var data = await _dashboardService.GetDashboardDataAsync(year, month, day, clienteId);
            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message, detail = ex.InnerException?.Message });
        }
    }
}
