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
public class AfastamentosController : ControllerBase
{
    private readonly IRepository<Afastamento> _repository;
    private readonly AppDbContext _context;

    public AfastamentosController(IRepository<Afastamento> repository, AppDbContext context)
    {
        _repository = repository;
        _context = context;
    }

    private async Task<Funcionario?> GetFuncionarioDoUsuario()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
        return await _context.Funcionarios.FirstOrDefaultAsync(f => f.UsuarioId == userId);
    }

    [HttpGet("meus")]
    public async Task<IActionResult> GetMeusAfastamentos()
    {
        var funcionario = await GetFuncionarioDoUsuario();
        if (funcionario == null) return Ok(new List<object>());

        var afastamentos = await _context.Afastamentos
            .Include(a => a.Funcionario)
            .Where(a => a.FuncionarioId == funcionario.Id)
            .OrderByDescending(a => a.DataCriacao)
            .Select(a => new {
                a.Id,
                a.FuncionarioId,
                NomeFuncionario = a.Funcionario != null ? a.Funcionario.Nome : "Desconhecido",
                a.DataInicio,
                a.DataFim,
                a.Motivo,
                a.Observacao,
                a.Status,
                a.AnexoNome,
                a.DataCriacao
            })
            .ToListAsync();

        return Ok(afastamentos);
    }

    [HttpPost]
    public async Task<IActionResult> RegistrarAfastamento([FromBody] Afastamento afastamento)
    {
        try 
        {
            var isGestorOrAdmin = User.IsInRole("Admin") || User.IsInRole("Gestor");

            // Se for gestor/admin e enviou o FuncionarioId, usa o enviado.
            if (isGestorOrAdmin && afastamento.FuncionarioId != Guid.Empty)
            {
                afastamento.Status = "Aprovado"; // Lançamento de gestor já entra aprovado (ex: Falta não justificada)
            }
            else
            {
                var funcionario = await GetFuncionarioDoUsuario();
                if (funcionario == null)
                    return BadRequest(new { message = "Seu usuário não está vinculado a um cadastro de funcionário." });
                
                afastamento.FuncionarioId = funcionario.Id;
                afastamento.Status = "Pendente";
            }

            if (afastamento.DataInicio > afastamento.DataFim)
                return BadRequest(new { message = "Data de Início não pode ser maior que a Data Fim." });

            afastamento.DataCriacao = DateTime.Now;

            await _repository.AddAsync(afastamento);
            return Ok(afastamento);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.InnerException?.Message ?? ex.Message });
        }
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> GetAllAfastamentos()
    {
        var afastamentos = await _context.Afastamentos
            .Include(a => a.Funcionario)
            .OrderByDescending(a => a.DataCriacao)
            .Select(a => new
            {
                a.Id,
                a.FuncionarioId,
                NomeFuncionario = a.Funcionario != null ? a.Funcionario.Nome : "N/A",
                a.DataInicio,
                a.DataFim,
                a.Motivo,
                a.Observacao,
                a.Status,
                a.AnexoNome,
                a.AnexoBase64,
                a.DataCriacao
            })
            .ToListAsync();

        return Ok(afastamentos);
    }

    [HttpPatch("{id}/aprovar")]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> AprovarAfastamento(Guid id)
    {
        var afastamento = await _repository.GetByIdAsync(id);
        if (afastamento == null) return NotFound();

        afastamento.Status = "Aprovado";
        await _repository.UpdateAsync(afastamento);
        return Ok(afastamento);
    }

    [HttpPatch("{id}/reprovar")]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> ReprovarAfastamento(Guid id)
    {
        var afastamento = await _repository.GetByIdAsync(id);
        if (afastamento == null) return NotFound();

        afastamento.Status = "Reprovado";
        await _repository.UpdateAsync(afastamento);
        return Ok(afastamento);
    }
    [HttpGet("funcionario/{funcionarioId}")]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> GetAfastamentosFuncionario(Guid funcionarioId)
    {
        var afastamentos = await _context.Afastamentos
            .Include(a => a.Funcionario)
            .Where(a => a.FuncionarioId == funcionarioId)
            .OrderByDescending(a => a.DataCriacao)
            .Select(a => new {
                a.Id,
                a.FuncionarioId,
                NomeFuncionario = a.Funcionario != null ? a.Funcionario.Nome : "Desconhecido",
                a.DataInicio,
                a.DataFim,
                a.Motivo,
                a.Observacao,
                a.Status,
                a.AnexoNome,
                a.DataCriacao
            })
            .ToListAsync();
            
        return Ok(afastamentos);
    }
}
