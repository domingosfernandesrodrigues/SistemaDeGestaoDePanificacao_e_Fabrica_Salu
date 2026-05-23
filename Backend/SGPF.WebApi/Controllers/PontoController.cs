using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;
using SGPF.Infrastructure.Data;
using System.Security.Claims;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
// v2 - forced rebuild for recalculate route
public class PontoController : ControllerBase
{
    private readonly IRepository<RegistroPonto> _repository;
    private readonly AppDbContext _context;

    public PontoController(IRepository<RegistroPonto> repository, AppDbContext context)
    {
        _repository = repository;
        _context = context;
    }

    [HttpPost("recalcular")]
    [Authorize] // Removido Roles temporariamente para teste
    public async Task<IActionResult> Recalcular([FromQuery] Guid funcionarioId, [FromQuery] int mes, [FromQuery] int ano)
    {
        Console.WriteLine($"[DEBUG] Recalcular atingido: Func={funcionarioId}, Mes={mes}, Ano={ano}");
        try
        {
            var registros = await _context.RegistrosPonto
                .Where(p => p.FuncionarioId == funcionarioId && 
                            p.DataHoraEntrada.Month == mes && 
                            p.DataHoraEntrada.Year == ano &&
                            p.DataHoraSaida != null)
                .ToListAsync();

            if (!registros.Any())
                return Ok(new { message = "Nenhum registro encontrado para este período." });

            foreach (var g in registros.GroupBy(r => r.DataHoraEntrada.Date))
            {
                var registrosDia = g.OrderBy(r => r.DataHoraEntrada).ToList();
                decimal totalAcumuladoDia = 0;

                foreach (var reg in registrosDia)
                {
                    var duracao = (decimal)(reg.DataHoraSaida!.Value - reg.DataHoraEntrada).TotalHours;
                    reg.TotalHorasTrabalhadas = duracao;
                    
                    var novoTotalDia = totalAcumuladoDia + duracao;
                    
                    if (novoTotalDia > 8)
                    {
                        if (totalAcumuladoDia >= 8)
                            reg.TotalHorasExtras = duracao;
                        else
                            reg.TotalHorasExtras = novoTotalDia - 8;
                    }
                    else
                    {
                        reg.TotalHorasExtras = 0;
                    }

                    totalAcumuladoDia = novoTotalDia;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Sucesso! {registros.Count} registros recalculados." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Erro ao recalcular: " + ex.Message });
        }
    }

    private async Task<Funcionario?> GetFuncionarioDoUsuario()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
        var func = await _context.Funcionarios.FirstOrDefaultAsync(f => f.Id == userId);
        return func;
    }

    [HttpGet("hoje")]
    public async Task<IActionResult> GetHoje()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
        var funcionario = await _context.Funcionarios.FirstOrDefaultAsync(f => f.UsuarioId == userId);
        if (funcionario == null) return Ok(new List<object>());
        var registros = await _repository.FindAsync(p => p.FuncionarioId == funcionario.Id && p.DataHoraEntrada.Date == DateTime.Today);
        return Ok(registros);
    }

    [HttpGet("historico")]
    public async Task<IActionResult> GetHistorico([FromQuery] int? mes, [FromQuery] int? ano)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
        var funcionario = await _context.Funcionarios.FirstOrDefaultAsync(f => f.UsuarioId == userId);
        if (funcionario == null) return Ok(new List<object>());

        var mesRef = mes ?? DateTime.Today.Month;
        var anoRef = ano ?? DateTime.Today.Year;

        var registros = await _repository.FindAsync(p =>
            p.FuncionarioId == funcionario.Id &&
            p.DataHoraEntrada.Month == mesRef &&
            p.DataHoraEntrada.Year == anoRef);

        var result = registros
            .GroupBy(r => r.DataHoraEntrada.Date)
            .SelectMany(g => {
                var listaComHoras = g.Select(r => new {
                    Registro = r,
                    HorasTrabalhadas = r.TotalHorasTrabalhadas > 0 ? r.TotalHorasTrabalhadas : 
                                      (r.DataHoraSaida.HasValue ? (decimal)(r.DataHoraSaida.Value - r.DataHoraEntrada).TotalHours : 0)
                }).ToList();

                var totalDia = listaComHoras.Sum(x => x.HorasTrabalhadas);
                var extrasDia = totalDia > 8 ? totalDia - 8 : 0;
                
                var listaOrdenada = listaComHoras.OrderByDescending(x => x.Registro.DataHoraEntrada).ToList();
                return listaOrdenada.Select((x, index) => new {
                    x.Registro.Id,
                    x.Registro.DataHoraEntrada,
                    x.Registro.DataHoraSaida,
                    TotalHorasTrabalhadas = x.HorasTrabalhadas,
                    TotalHorasExtras = index == 0 ? extrasDia : 0,
                    x.Registro.Observacao,
                    Status = x.Registro.DataHoraSaida == null ? "Aberto" : "Concluído"
                });
            })
            .OrderByDescending(r => r.DataHoraEntrada);

        return Ok(result);
    }

    [HttpPost("registrar")]
    public async Task<IActionResult> Registrar()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

        var funcionario = await _context.Funcionarios.FirstOrDefaultAsync(f => f.UsuarioId == userId);
        if (funcionario == null)
        {
            return BadRequest(new { message = "Seu usuário não está vinculado a um cadastro de funcionário. Solicite ao administrador que defina o vínculo na tela de Funcionários." });
        }

        var aberto = (await _repository.FindAsync(p => p.FuncionarioId == funcionario.Id && p.DataHoraSaida == null)).FirstOrDefault();

        if (aberto == null)
        {
            var registrosHoje = await _repository.FindAsync(p => 
                p.FuncionarioId == funcionario.Id && 
                p.DataHoraEntrada.Date == DateTime.Today.Date);

            if (registrosHoje.Count() >= 2)
            {
                return BadRequest(new { message = "Limite diário atingido. Você já registrou 2 entradas e 2 saídas hoje." });
            }

            var novo = new RegistroPonto
            {
                FuncionarioId = funcionario.Id,
                DataHoraEntrada = DateTime.Now
            };
            await _repository.AddAsync(novo);
            return Ok(new { message = "Entrada registrada com sucesso", tipo = "entrada" });
        }
        else
        {
            aberto.DataHoraSaida = DateTime.Now;
            var horasEstaEntrada = (decimal)(aberto.DataHoraSaida.Value - aberto.DataHoraEntrada).TotalHours;
            aberto.TotalHorasTrabalhadas = horasEstaEntrada;

            var dataHoje = aberto.DataHoraEntrada.Date;
            var outrosRegistrosHoje = await _repository.FindAsync(p => 
                p.FuncionarioId == funcionario.Id && 
                p.DataHoraEntrada.Date == dataHoje && 
                p.Id != aberto.Id && 
                p.DataHoraSaida != null);

            var totalHorasJaTrabalhadasHoje = outrosRegistrosHoje.Sum(p => p.TotalHorasTrabalhadas);
            var totalFinalDia = totalHorasJaTrabalhadasHoje + horasEstaEntrada;

            if (totalFinalDia > 8)
            {
                if (totalHorasJaTrabalhadasHoje >= 8)
                {
                    aberto.TotalHorasExtras = horasEstaEntrada;
                }
                else
                {
                    aberto.TotalHorasExtras = totalFinalDia - 8;
                }
            }
            else
            {
                aberto.TotalHorasExtras = 0;
            }

            await _repository.UpdateAsync(aberto);
            return Ok(new { message = "Saída registrada com sucesso", tipo = "saída" });
        }
    }

    [HttpGet("historico-funcionario/{funcionarioId}")]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> GetHistoricoFuncionario(Guid funcionarioId, [FromQuery] int? mes, [FromQuery] int? ano)
    {
        var mesRef = mes ?? DateTime.Today.Month;
        var anoRef = ano ?? DateTime.Today.Year;

        var registros = await _repository.FindAsync(p =>
            p.FuncionarioId == funcionarioId &&
            p.DataHoraEntrada.Month == mesRef &&
            p.DataHoraEntrada.Year == anoRef);

        var result = registros
            .GroupBy(r => r.DataHoraEntrada.Date)
            .SelectMany(g => {
                var listaComHoras = g.Select(r => new {
                    Registro = r,
                    HorasTrabalhadas = r.TotalHorasTrabalhadas > 0 ? r.TotalHorasTrabalhadas : 
                                      (r.DataHoraSaida.HasValue ? (decimal)(r.DataHoraSaida.Value - r.DataHoraEntrada).TotalHours : 0)
                }).ToList();

                var totalDia = listaComHoras.Sum(x => x.HorasTrabalhadas);
                var extrasDia = totalDia > 8 ? totalDia - 8 : 0;
                
                var listaOrdenada = listaComHoras.OrderByDescending(x => x.Registro.DataHoraEntrada).ToList();
                return listaOrdenada.Select((x, index) => new {
                    x.Registro.Id,
                    x.Registro.DataHoraEntrada,
                    x.Registro.DataHoraSaida,
                    TotalHorasTrabalhadas = x.HorasTrabalhadas,
                    TotalHorasExtras = index == 0 ? extrasDia : 0,
                    x.Registro.Observacao,
                    Status = x.Registro.DataHoraSaida == null ? "Aberto" : "Concluído"
                });
            })
            .OrderByDescending(r => r.DataHoraEntrada);

        return Ok(result);
    }
}
