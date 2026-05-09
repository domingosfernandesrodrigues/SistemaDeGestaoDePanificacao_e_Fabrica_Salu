using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin,Gestor")]
public class ContasBancariasController : ControllerBase
{
    private readonly IRepository<ContaBancaria> _repository;

    public ContasBancariasController(IRepository<ContaBancaria> repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _repository.GetAllAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var conta = await _repository.GetByIdAsync(id);
        return conta == null ? NotFound() : Ok(conta);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ContaBancaria conta)
    {
        // Se for a primeira conta ou marcada como padrão, desmarca as outras
        if (conta.IsPadrao)
        {
            await DesmarcarOutrasContasPadrao(Guid.Empty);
        }

        conta.SaldoAtual = conta.SaldoInicial;
        await _repository.AddAsync(conta);
        return CreatedAtAction(nameof(GetById), new { id = conta.Id }, conta);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ContaBancaria conta)
    {
        if (id != conta.Id) return BadRequest();
        
        var existing = await _repository.GetByIdAsync(id);
        if (existing == null) return NotFound();

        if (conta.IsPadrao && !existing.IsPadrao)
        {
            await DesmarcarOutrasContasPadrao(id);
        }

        existing.Nome = conta.Nome;
        existing.Tipo = conta.Tipo;
        existing.Ativa = conta.Ativa;
        existing.IsPadrao = conta.IsPadrao;
        existing.SaldoInicial = conta.SaldoInicial;
        existing.PixChave = conta.PixChave;
        existing.BancoNome = conta.BancoNome;
        existing.Agencia = conta.Agencia;
        existing.NumeroConta = conta.NumeroConta;
        existing.GatewayToken = conta.GatewayToken;

        if (existing.SaldoAtual == existing.SaldoInicial)
        {
            existing.SaldoAtual = conta.SaldoInicial;
        }

        await _repository.UpdateAsync(existing);
        return NoContent();
    }

    [HttpPost("{id}/movimentar")]
    public async Task<IActionResult> Movimentar(Guid id, [FromBody] MovimentacaoManual request)
    {
        var conta = await _repository.GetByIdAsync(id);
        if (conta == null) return NotFound();

        if (request.Tipo == "entrada")
        {
            conta.SaldoAtual += request.Valor;
        }
        else
        {
            conta.SaldoAtual -= request.Valor;
        }

        await _repository.UpdateAsync(conta);
        return Ok(conta);
    }

    private async Task DesmarcarOutrasContasPadrao(Guid exceptId)
    {
        var todas = await _repository.GetAllAsync();
        foreach (var c in todas.Where(x => x.Id != exceptId && x.IsPadrao))
        {
            c.IsPadrao = false;
            await _repository.UpdateAsync(c);
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _repository.DeleteAsync(id);
        return NoContent();
    }
}

public class MovimentacaoManual
{
    public string Tipo { get; set; } = "entrada";
    public decimal Valor { get; set; }
    public string Descricao { get; set; } = string.Empty;
}
