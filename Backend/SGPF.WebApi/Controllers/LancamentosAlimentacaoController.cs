using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;
using SGPF.Infrastructure.Data;
using SGPF.Application.Services;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class LancamentosAlimentacaoController : ControllerBase
{
    private readonly IRepository<LancamentoAlimentacao> _alimentacaoRepo;
    private readonly IRepository<ContaPagar> _contaPagarRepo;
    private readonly AppDbContext _context;
    private readonly IFinanceiroService _financeiroService;

    public LancamentosAlimentacaoController(
        IRepository<LancamentoAlimentacao> alimentacaoRepo,
        IRepository<ContaPagar> contaPagarRepo,
        AppDbContext context,
        IFinanceiroService financeiroService)
    {
        _alimentacaoRepo = alimentacaoRepo;
        _contaPagarRepo = contaPagarRepo;
        _context = context;
        _financeiroService = financeiroService;
    }

    private async Task<Funcionario?> GetFuncionarioDoUsuario()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());
        return await _context.Funcionarios.FirstOrDefaultAsync(f => f.UsuarioId == userId);
    }

    [HttpGet("meus")]
    public async Task<IActionResult> GetMeusLancamentos()
    {
        var funcionario = await GetFuncionarioDoUsuario();
        if (funcionario == null) return Ok(new List<object>());

        var lancamentos = await _context.LancamentosAlimentacao
            .Include(la => la.Funcionario)
            .Where(la => la.FuncionarioId == funcionario.Id)
            .OrderByDescending(la => la.Data)
            .Select(la => new
            {
                la.Id,
                la.FuncionarioId,
                NomeFuncionario = la.Funcionario != null ? la.Funcionario.Nome : "Desconhecido",
                la.Data,
                la.TipoRefeicao,
                la.Valor,
                la.Observacao,
                la.DataCriacao,
                la.ContaPagarId,
                StatusFinanceiro = _context.ContasPagar
                    .Where(c => c.Id == la.ContaPagarId)
                    .Select(c => c.Status.ToString())
                    .FirstOrDefault() ?? "Pendente"
            })
            .ToListAsync();

        return Ok(lancamentos);
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> GetAll()
    {
        var lancamentos = await _context.LancamentosAlimentacao
            .Include(la => la.Funcionario)
            .OrderByDescending(la => la.Data)
            .Select(la => new
            {
                la.Id,
                la.FuncionarioId,
                NomeFuncionario = la.Funcionario != null ? la.Funcionario.Nome : "N/A",
                la.Data,
                la.TipoRefeicao,
                la.Valor,
                la.Observacao,
                la.DataCriacao,
                la.ContaPagarId,
                StatusFinanceiro = _context.ContasPagar
                    .Where(c => c.Id == la.ContaPagarId)
                    .Select(c => c.Status.ToString())
                    .FirstOrDefault() ?? "Pendente"
            })
            .ToListAsync();

        return Ok(lancamentos);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> Create([FromBody] LancamentoAlimentacao lancamento)
    {
        try
        {
            if (lancamento.FuncionarioId == Guid.Empty)
                return BadRequest(new { message = "O funcionário deve ser informado." });

            var funcionario = await _context.Funcionarios.FindAsync(lancamento.FuncionarioId);
            if (funcionario == null)
                return BadRequest(new { message = "Funcionário não encontrado." });

            if (lancamento.Valor <= 0)
                return BadRequest(new { message = "O valor da refeição deve ser maior que zero." });

            if (string.IsNullOrWhiteSpace(lancamento.TipoRefeicao))
                return BadRequest(new { message = "O tipo de refeição deve ser informado." });

            // 1. Integração Financeira: Gerar ContaPagar correspondente sem data de vencimento
            var contaPagar = new ContaPagar
            {
                Descricao = $"Alimentação ({lancamento.TipoRefeicao}) - {funcionario.Nome}",
                Valor = lancamento.Valor,
                DataEmissao = DateTime.UtcNow,
                DataVencimento = null, // Sem data de vencimento (conforme solicitação)
                Status = StatusContaPagar.Pendente,
                Categoria = "Alimentação"
            };

            await _contaPagarRepo.AddAsync(contaPagar);

            // 2. Vincular a ContaPagarId gerada e salvar o lançamento de alimentação
            lancamento.ContaPagarId = contaPagar.Id;
            lancamento.DataCriacao = DateTime.Now;

            await _alimentacaoRepo.AddAsync(lancamento);

            return Ok(lancamento);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.InnerException?.Message ?? ex.Message });
        }
    }

    [HttpPost("{id}/pagar")]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> PagarRefeicao(Guid id)
    {
        try
        {
            var lancamento = await _context.LancamentosAlimentacao.FindAsync(id);
            if (lancamento == null) return NotFound();

            if (!lancamento.ContaPagarId.HasValue)
                return BadRequest(new { message = "Lançamento de refeição sem conta a pagar associada." });

            var conta = await _contaPagarRepo.GetByIdAsync(lancamento.ContaPagarId.Value);
            if (conta == null)
                return BadRequest(new { message = "Conta a pagar associada não encontrada." });

            if (conta.Status == StatusContaPagar.Paga)
                return BadRequest(new { message = "Esta refeição já foi paga." });

            // Baixar a conta no contas a pagar usando o FinanceiroService (deduz da conta bancária padrão e faz conciliação)
            await _financeiroService.BaixarContaPagarAsync(lancamento.ContaPagarId.Value);

            return Ok(new { message = "Refeição paga com sucesso e integrada ao caixa bancário." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.InnerException?.Message ?? ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Gestor")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var lancamento = await _context.LancamentosAlimentacao.FindAsync(id);
            if (lancamento == null) return NotFound();

            // 1. Excluir o lançamento de alimentação
            await _alimentacaoRepo.DeleteAsync(id);

            // 2. Tentar encontrar a ContaPagar associada e removê-la para manter consistência financeira
            if (lancamento.ContaPagarId.HasValue)
            {
                var conta = await _contaPagarRepo.GetByIdAsync(lancamento.ContaPagarId.Value);
                if (conta != null && conta.Status == StatusContaPagar.Pendente)
                {
                    await _contaPagarRepo.DeleteAsync(conta.Id);
                }
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.InnerException?.Message ?? ex.Message });
        }
    }
}
