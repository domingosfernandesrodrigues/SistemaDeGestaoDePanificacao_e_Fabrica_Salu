using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin,Gestor")]
public class AuditoriaController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuditoriaController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string? tableName,
        [FromQuery] string? action,
        [FromQuery] string? userName,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;
        if (pageSize > 100) pageSize = 100; // Limite de segurança

        var query = _context.AuditLogs.AsNoTracking();

        if (!string.IsNullOrEmpty(tableName))
        {
            query = query.Where(l => l.TableName == tableName);
        }

        if (!string.IsNullOrEmpty(action))
        {
            query = query.Where(l => l.Action == action);
        }

        if (!string.IsNullOrEmpty(userName))
        {
            query = query.Where(l => l.UserName != null && l.UserName.Contains(userName));
        }

        if (startDate.HasValue)
        {
            var utcStart = DateTime.SpecifyKind(startDate.Value, DateTimeKind.Utc);
            query = query.Where(l => l.Timestamp >= utcStart);
        }

        if (endDate.HasValue)
        {
            // Ajusta o fim do dia para incluir tudo do dia selecionado
            var utcEnd = DateTime.SpecifyKind(endDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            query = query.Where(l => l.Timestamp <= utcEnd);
        }

        var totalItems = await query.CountAsync();
        var items = await query
            .OrderByDescending(l => l.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new
        {
            TotalItems = totalItems,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling((double)totalItems / pageSize),
            Items = items
        });
    }

    [HttpGet("tables")]
    public async Task<IActionResult> GetAuditedTables()
    {
        var tables = await _context.AuditLogs
            .AsNoTracking()
            .Select(l => l.TableName)
            .Distinct()
            .OrderBy(t => t)
            .ToListAsync();

        return Ok(tables);
    }
}
