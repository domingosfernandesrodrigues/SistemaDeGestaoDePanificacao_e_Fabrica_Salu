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
public class PontoController : ControllerBase
{
    private readonly IRepository<RegistroPonto> _repository;
    private readonly AppDbContext _context;

    public PontoController(IRepository<RegistroPonto> repository, AppDbContext context)
    {
        _repository = repository;
        _context = context;
    }

    private async Task<Funcionario?> GetFuncionarioDoUsuario()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
        // Primeiro tenta o ID direto (usuário é o próprio funcionário)
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
                var totalDia = g.Sum(r => r.TotalHorasTrabalhadas);
                var extrasDia = totalDia > 8 ? totalDia - 8 : 0;
                
                // Distribuir as extras do dia proporcionalmente ou apenas na última entrada
                // Para simplificar e bater com a soma, vamos atribuir as extras à última entrada do dia
                var listaOrdenada = g.OrderByDescending(r => r.DataHoraEntrada).ToList();
                return listaOrdenada.Select((r, index) => new {
                    r.Id,
                    r.DataHoraEntrada,
                    r.DataHoraSaida,
                    r.TotalHorasTrabalhadas,
                    TotalHorasExtras = index == 0 ? extrasDia : 0, // Atribui extras apenas à última entrada
                    r.Observacao,
                    Status = r.DataHoraSaida == null ? "Aberto" : "Concluído"
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
            // Limitar a 2 entradas e 2 saídas por dia
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

            // Calcular horas extras baseadas no total do DIA
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
                // Se o que já trabalhou já passou de 8h, toda essa entrada é extra
                if (totalHorasJaTrabalhadasHoje >= 8)
                {
                    aberto.TotalHorasExtras = horasEstaEntrada;
                }
                else
                {
                    // Se passou de 8h agora, apenas a diferença é extra
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
                var totalDia = g.Sum(r => r.TotalHorasTrabalhadas);
                var extrasDia = totalDia > 8 ? totalDia - 8 : 0;
                
                var listaOrdenada = g.OrderByDescending(r => r.DataHoraEntrada).ToList();
                return listaOrdenada.Select((r, index) => new {
                    r.Id,
                    r.DataHoraEntrada,
                    r.DataHoraSaida,
                    r.TotalHorasTrabalhadas,
                    TotalHorasExtras = index == 0 ? extrasDia : 0,
                    r.Observacao,
                    Status = r.DataHoraSaida == null ? "Aberto" : "Concluído"
                });
            })
            .OrderByDescending(r => r.DataHoraEntrada);

        return Ok(result);
    }
}
