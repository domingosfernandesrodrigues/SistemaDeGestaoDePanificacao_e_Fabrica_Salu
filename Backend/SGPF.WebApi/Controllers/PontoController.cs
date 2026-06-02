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

                foreach (var reg in registrosDia)
                {
                    var duracao = (decimal)(reg.DataHoraSaida!.Value - reg.DataHoraEntrada).TotalHours;
                    reg.TotalHorasTrabalhadas = duracao;
                    reg.TotalHorasExtras = 0;
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

                var listaOrdenada = listaComHoras.OrderByDescending(x => x.Registro.DataHoraEntrada).ToList();
                return listaOrdenada.Select((x, index) => new {
                    x.Registro.Id,
                    x.Registro.DataHoraEntrada,
                    x.Registro.DataHoraSaida,
                    TotalHorasTrabalhadas = x.HorasTrabalhadas,
                    TotalHorasExtras = 0m,
                    x.Registro.Observacao,
                    Status = x.Registro.DataHoraSaida == null ? "Aberto" : "Concluído"
                });
            })
            .OrderByDescending(r => r.DataHoraEntrada);

        return Ok(result);
    }

    [HttpPost("registrar")]
    public async Task<IActionResult> Registrar([FromBody] PontoRegistroDto? dto)
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

            // Validação de Geofencing para o primeiro ponto do dia
            if (!registrosHoje.Any())
            {
                var empresa = funcionario.EmpresaId.HasValue 
                    ? await _context.Empresas.FirstOrDefaultAsync(e => e.Id == funcionario.EmpresaId.Value)
                    : await _context.Empresas.FirstOrDefaultAsync();

                if (empresa != null && empresa.Latitude.HasValue && empresa.Longitude.HasValue)
                {
                    if (dto == null || !dto.Latitude.HasValue || !dto.Longitude.HasValue)
                    {
                        return BadRequest(new { message = "Para registrar o primeiro ponto do dia, as coordenadas de localização (GPS) são obrigatórias. Por favor, ative a localização do seu dispositivo." });
                    }

                    // === DIAGNÓSTICO: log das coordenadas antes do cálculo ===
                    Console.WriteLine($"[GEOFENCE] Empresa salva  → Lat={empresa.Latitude.Value:F8}, Lng={empresa.Longitude.Value:F8}");
                    Console.WriteLine($"[GEOFENCE] Funcionário GPS → Lat={dto.Latitude.Value:F8}, Lng={dto.Longitude.Value:F8}");

                    var distancia = CalcularDistancia(dto.Latitude.Value, dto.Longitude.Value, empresa.Latitude.Value, empresa.Longitude.Value);
                    Console.WriteLine($"[GEOFENCE] Distância calculada: {distancia:F2} metros");

                    if (distancia > 100) // Limite de 100 metros
                    {
                        return BadRequest(new { message = $"Você está fora do perímetro autorizado da empresa. Distância calculada: {distancia:F0} metros (máximo permitido: 100 metros)." });
                    }
                }
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

            aberto.TotalHorasExtras = 0;

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

                var listaOrdenada = listaComHoras.OrderByDescending(x => x.Registro.DataHoraEntrada).ToList();
                return listaOrdenada.Select((x, index) => new {
                    x.Registro.Id,
                    x.Registro.DataHoraEntrada,
                    x.Registro.DataHoraSaida,
                    TotalHorasTrabalhadas = x.HorasTrabalhadas,
                    TotalHorasExtras = 0m,
                    x.Registro.Observacao,
                    Status = x.Registro.DataHoraSaida == null ? "Aberto" : "Concluído"
                });
            })
            .OrderByDescending(r => r.DataHoraEntrada);

        return Ok(result);
    }

    private double CalcularDistancia(double lat1, double lon1, double lat2, double lon2)
    {
        var R = 6371e3; // Metros
        var phi1 = lat1 * Math.PI / 180;
        var phi2 = lat2 * Math.PI / 180;
        var deltaPhi = (lat2 - lat1) * Math.PI / 180;
        var deltaLambda = (lon2 - lon1) * Math.PI / 180;

        var a = Math.Sin(deltaPhi / 2) * Math.Sin(deltaPhi / 2) +
                Math.Cos(phi1) * Math.Cos(phi2) *
                Math.Sin(deltaLambda / 2) * Math.Sin(deltaLambda / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return R * c;
    }
}

public class PontoRegistroDto
{
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}
