using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;
using SGPF.Application.Services;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin,Gestor")]
public class DespesasController : ControllerBase
{
    private readonly IRepository<ContaPagar> _repository;
    private readonly IFinanceiroService _financeiroService;
    private readonly IRepository<ContaBancaria> _contaBancariaRepo;
    private readonly IRepository<MovimentacaoBancaria> _movimentacaoRepo;

    public DespesasController(
        IRepository<ContaPagar> repository,
        IFinanceiroService financeiroService,
        IRepository<ContaBancaria> contaBancariaRepo,
        IRepository<MovimentacaoBancaria> movimentacaoRepo)
    {
        _repository = repository;
        _financeiroService = financeiroService;
        _contaBancariaRepo = contaBancariaRepo;
        _movimentacaoRepo = movimentacaoRepo;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var todas = await _repository.GetAllAsync();
        var filtradas = todas.Where(d => 
            !d.Descricao.StartsWith("Compra #") && 
            d.Categoria != "Insumos" && 
            d.Categoria != "Mercadorias" && 
            d.Categoria != "Alimentação" && 
            d.Categoria != "Folha de Pagamento" &&
            d.Categoria != "Operacional (Frota)").ToList();
        return Ok(filtradas);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ContaPagar despesa)
    {
        var isPaidInitially = despesa.Status == StatusContaPagar.Paga;

        if (isPaidInitially)
        {
            despesa.Status = StatusContaPagar.Aprovada;
        }
        else if (despesa.Status != StatusContaPagar.Aprovada)
        {
            despesa.Status = StatusContaPagar.Pendente;
        }

        await _repository.AddAsync(despesa);

        if (isPaidInitially)
        {
            await _financeiroService.BaixarContaPagarAsync(despesa.Id);
            despesa.Status = StatusContaPagar.Paga;
        }

        return Ok(despesa);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ContaPagar despesa)
    {
        if (id != despesa.Id) return BadRequest();

        var existing = await _repository.GetByIdAsync(id);
        if (existing == null) return NotFound();

        var wasPaid = existing.Status == StatusContaPagar.Paga;
        var isPaidNow = despesa.Status == StatusContaPagar.Paga;

        var oldValor = existing.Valor;
        var oldDescricao = existing.Descricao;

        // Atualiza campos cadastrais
        existing.Descricao = despesa.Descricao;
        existing.Valor = despesa.Valor;
        existing.Categoria = despesa.Categoria;
        existing.DataEmissao = despesa.DataEmissao;
        existing.DataVencimento = despesa.DataVencimento;
        existing.FornecedorId = despesa.FornecedorId;
        existing.MesReferencia = despesa.MesReferencia;

        if (isPaidNow && !wasPaid)
        {
            // Transição para Pago: Salva o estado e executa a baixa
            await _repository.UpdateAsync(existing);
            await _financeiroService.BaixarContaPagarAsync(existing.Id);
        }
        else if (!isPaidNow && wasPaid)
        {
            // Transição de Pago para Pendente/Outro (Estorno)
            existing.Status = despesa.Status;
            existing.DataPagamento = null;
            await _repository.UpdateAsync(existing);

            var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                            ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
            if (contaPadrao != null)
            {
                contaPadrao.SaldoAtual += oldValor;
                await _contaBancariaRepo.UpdateAsync(contaPadrao);

                await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
                {
                    ContaBancariaId = contaPadrao.Id,
                    Tipo = "entrada",
                    Valor = oldValor,
                    Descricao = $"Estorno de Conta a Pagar: {existing.Descricao}",
                    DataMovimentacao = DateTime.Now,
                    Origem = OrigemMovimentacao.Manual,
                    ReferenciaId = existing.Id
                });
            }
        }
        else if (isPaidNow && wasPaid)
        {
            existing.Status = despesa.Status;
            await _repository.UpdateAsync(existing);

            if (oldValor != despesa.Valor || oldDescricao != despesa.Descricao)
            {
                var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                                ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
                if (contaPadrao != null)
                {
                    var diferenca = despesa.Valor - oldValor;
                    contaPadrao.SaldoAtual -= diferenca;
                    await _contaBancariaRepo.UpdateAsync(contaPadrao);

                    var movimentacao = (await _movimentacaoRepo.FindAsync(m => m.ReferenciaId == existing.Id && m.Tipo == "saida")).FirstOrDefault();
                    if (movimentacao != null)
                    {
                        movimentacao.Valor = despesa.Valor;
                        movimentacao.Descricao = $"Baixa de Conta a Pagar: {existing.Descricao}";
                        await _movimentacaoRepo.UpdateAsync(movimentacao);
                    }
                    else
                    {
                        await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
                        {
                            ContaBancariaId = contaPadrao.Id,
                            Tipo = "saida",
                            Valor = despesa.Valor,
                            Descricao = $"Baixa de Conta a Pagar: {existing.Descricao}",
                            DataMovimentacao = DateTime.Now,
                            Origem = OrigemMovimentacao.BaixaPagar,
                            ReferenciaId = existing.Id
                        });
                    }
                }
            }
        }
        else
        {
            // Atualização cadastral padrão sem mudança de status de pagamento
            existing.Status = despesa.Status;
            await _repository.UpdateAsync(existing);
        }

        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var despesa = await _repository.GetByIdAsync(id);
        if (despesa == null) return NotFound();

        // Se deletar uma conta que já estava paga, estorna o valor na conta bancária
        if (despesa.Status == StatusContaPagar.Paga)
        {
            var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                            ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
            if (contaPadrao != null)
            {
                contaPadrao.SaldoAtual += despesa.Valor;
                await _contaBancariaRepo.UpdateAsync(contaPadrao);

                await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
                {
                    ContaBancariaId = contaPadrao.Id,
                    Tipo = "entrada",
                    Valor = despesa.Valor,
                    Descricao = $"Estorno (Exclusão) de Conta a Pagar: {despesa.Descricao}",
                    DataMovimentacao = DateTime.Now,
                    Origem = OrigemMovimentacao.Manual,
                    ReferenciaId = despesa.Id
                });
            }
        }

        await _repository.DeleteAsync(id);
        return NoContent();
    }
}
