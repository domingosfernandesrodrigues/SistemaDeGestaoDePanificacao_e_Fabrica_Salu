using SGPF.Application.DTOs;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.Application.Services;

public interface IFinanceiroService
{
    Task<RelatorioDreDto> GerarDreAsync(int mes, int ano);
    Task<ResumoFinanceiroDto> ObterResumoAsync();
    Task BaixarContaPagarAsync(Guid id);
    Task BaixarContaReceberAsync(Guid id);
}

public class FinanceiroService : IFinanceiroService
{
    private readonly IRepository<ContaReceber> _receberRepo;
    private readonly IRepository<ContaPagar> _pagarRepo;
    private readonly IRepository<OrdemProducao> _opRepo;
    private readonly IRepository<FolhaPagamento> _folhaRepo;
    private readonly IRepository<ManutencaoVeiculo> _manutencaoRepo;
    private readonly IRepository<TrocaAvaria> _trocaRepo;
    private readonly IRepository<Produto> _produtoRepo;
    private readonly IRepository<ContaBancaria> _contaBancariaRepo;

    public FinanceiroService(
        IRepository<ContaReceber> receberRepo,
        IRepository<ContaPagar> pagarRepo,
        IRepository<OrdemProducao> opRepo,
        IRepository<FolhaPagamento> folhaRepo,
        IRepository<ManutencaoVeiculo> manutencaoRepo,
        IRepository<TrocaAvaria> trocaRepo,
        IRepository<Produto> produtoRepo,
        IRepository<ContaBancaria> contaBancariaRepo)
    {
        _receberRepo = receberRepo;
        _pagarRepo = pagarRepo;
        _opRepo = opRepo;
        _folhaRepo = folhaRepo;
        _manutencaoRepo = manutencaoRepo;
        _trocaRepo = trocaRepo;
        _produtoRepo = produtoRepo;
        _contaBancariaRepo = contaBancariaRepo;
    }

    public async Task<RelatorioDreDto> GerarDreAsync(int mes, int ano)
    {
        var dre = new RelatorioDreDto { Mes = mes, Ano = ano };

        // 1. Receita Bruta (Vendas Concluídas/Entregues e faturadas via Contas a Receber)
        var receitas = await _receberRepo.FindAsync(r => r.DataEmissao.Month == mes && r.DataEmissao.Year == ano);
        dre.ReceitaBrutaVendas = receitas.Sum(r => r.Valor);

        // 2. Custos de Produção (Soma de CustoTotalCalculado das OPs finalizadas no mês)
        var ops = await _opRepo.FindAsync(o => o.Status == StatusOrdemProducao.Finalizada && o.DataFinalizacao.HasValue && o.DataFinalizacao.Value.Month == mes && o.DataFinalizacao.Value.Year == ano);
        dre.CustosProducao = ops.Sum(o => o.CustoTotalCalculado);

        // 3. Custos com Avarias (Logística Reversa) - Apenas produtos fabricados influenciam o financeiro/DRE
        var avarias = await _trocaRepo.FindAsync(t => t.DataTroca.Month == mes && t.DataTroca.Year == ano);
        decimal custoAvarias = 0;
        foreach (var avaria in avarias)
        {
            var p = await _produtoRepo.GetByIdAsync(avaria.ProdutoId);
            if (p != null && p.Tipo == TipoProduto.ProdutoAcabado)
            {
                custoAvarias += (p.PrecoCusto * avaria.Quantidade);
            }
        }
        dre.CustosTrocaAvaria = custoAvarias;

        // 4. Despesas RH (Folhas Pagamento)
        var folhas = await _folhaRepo.FindAsync(f => f.MesReferencia == mes && f.AnoReferencia == ano);
        dre.DespesasFolhaPagamento = folhas.Sum(f => f.SalarioLiquido + f.TotalDescontos); // Custo total da empresa (líquido + impostos retidos)

        // 5. Despesas Manutenção Frota
        var manutencoes = await _manutencaoRepo.FindAsync(m => m.Data.Month == mes && m.Data.Year == ano);
        dre.DespesasManutencaoFrota = manutencoes.Sum(m => m.CustoTotal);

        return dre;
    }

    public async Task<ResumoFinanceiroDto> ObterResumoAsync()
    {
        var receber = await _receberRepo.FindAsync(r => r.Status == StatusContaReceber.Pendente);
        var pagar = await _pagarRepo.FindAsync(p => p.Status == StatusContaPagar.Pendente);

        // Saldo real: soma dos SaldoAtual das contas bancárias ativas
        var contas = await _contaBancariaRepo.FindAsync(c => c.Ativa);
        var saldoReal = contas.Sum(c => c.SaldoAtual);

        return new ResumoFinanceiroDto
        {
            ContasReceberPendentes = receber.Sum(r => r.Valor),
            ContasPagarPendentes = pagar.Sum(p => p.Valor),
            SaldoEmCaixa = saldoReal
        };
    }

    public async Task BaixarContaPagarAsync(Guid id)
    {
        var conta = await _pagarRepo.GetByIdAsync(id);
        if (conta != null)
        {
            conta.Status = StatusContaPagar.Paga;
            conta.DataPagamento = DateTime.UtcNow;
            await _pagarRepo.UpdateAsync(conta);

            // Conciliação automática: desconta da conta padrão
            var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault();
            if (contaPadrao != null)
            {
                contaPadrao.SaldoAtual -= conta.Valor;
                await _contaBancariaRepo.UpdateAsync(contaPadrao);
            }
        }
    }

    public async Task BaixarContaReceberAsync(Guid id)
    {
        var conta = await _receberRepo.GetByIdAsync(id);
        if (conta != null)
        {
            conta.Status = StatusContaReceber.Recebido;
            conta.DataRecebimento = DateTime.UtcNow;
            await _receberRepo.UpdateAsync(conta);

            // Conciliação automática: credita na conta padrão
            var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault();
            if (contaPadrao != null)
            {
                contaPadrao.SaldoAtual += conta.Valor;
                await _contaBancariaRepo.UpdateAsync(contaPadrao);
            }
        }
    }
}
