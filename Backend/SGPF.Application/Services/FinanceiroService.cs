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
    private readonly IRepository<MovimentacaoBancaria> _movimentacaoRepo;

    public FinanceiroService(
        IRepository<ContaReceber> receberRepo,
        IRepository<ContaPagar> pagarRepo,
        IRepository<OrdemProducao> opRepo,
        IRepository<FolhaPagamento> folhaRepo,
        IRepository<ManutencaoVeiculo> manutencaoRepo,
        IRepository<TrocaAvaria> trocaRepo,
        IRepository<Produto> produtoRepo,
        IRepository<ContaBancaria> contaBancariaRepo,
        IRepository<MovimentacaoBancaria> movimentacaoRepo)
    {
        _receberRepo = receberRepo;
        _pagarRepo = pagarRepo;
        _opRepo = opRepo;
        _folhaRepo = folhaRepo;
        _manutencaoRepo = manutencaoRepo;
        _trocaRepo = trocaRepo;
        _produtoRepo = produtoRepo;
        _contaBancariaRepo = contaBancariaRepo;
        _movimentacaoRepo = movimentacaoRepo;
    }

    public async Task<RelatorioDreDto> GerarDreAsync(int mes, int ano)
    {
        var dre = new RelatorioDreDto { Mes = mes, Ano = ano };

        // 1. Receita Bruta (Vendas Concluídas/Entregues e faturadas via Contas a Receber)
        var receitas = await _receberRepo.FindAsync(r => r.DataEmissao.Month == mes && r.DataEmissao.Year == ano, asNoTracking: true);
        dre.ReceitaBrutaVendas = receitas.Sum(r => r.Valor);

        // 2. Custos de Produção (Soma de CustoTotalCalculado das OPs finalizadas no mês)
        var ops = await _opRepo.FindAsync(o => o.Status == StatusOrdemProducao.Finalizada && o.DataFinalizacao.HasValue && o.DataFinalizacao.Value.Month == mes && o.DataFinalizacao.Value.Year == ano, asNoTracking: true);
        dre.CustosProducao = ops.Sum(o => o.CustoTotalCalculado);

        // 3. Custos com Avarias (Logística Reversa) - Apenas produtos fabricados influenciam o financeiro/DRE
        var avarias = await _trocaRepo.FindAsync(t => t.DataTroca.Month == mes && t.DataTroca.Year == ano, asNoTracking: true);
        decimal custoAvarias = 0;
        
        var avariasList = avarias.ToList();
        if (avariasList.Any())
        {
            var produtoIds = avariasList.Select(a => a.ProdutoId).Distinct().ToList();
            var produtos = (await _produtoRepo.FindAsync(p => produtoIds.Contains(p.Id), asNoTracking: true))
                .ToDictionary(p => p.Id);

            foreach (var avaria in avariasList)
            {
                if (produtos.TryGetValue(avaria.ProdutoId, out var p) && p.Tipo == TipoProduto.ProdutoAcabado)
                {
                    custoAvarias += (p.PrecoCusto * avaria.Quantidade);
                }
            }
        }
        dre.CustosTrocaAvaria = custoAvarias;

        // 4. Despesas RH (Folhas Pagamento + Alimentação)
        var folhas = await _folhaRepo.FindAsync(f => f.MesReferencia == mes && f.AnoReferencia == ano, asNoTracking: true);
        var despesasAlimentacao = await _pagarRepo.FindAsync(p => p.Categoria == "Alimentação" && p.DataEmissao.Month == mes && p.DataEmissao.Year == ano, asNoTracking: true);
        dre.DespesasFolhaPagamento = folhas.Sum(f => f.SalarioLiquido + f.TotalDescontos) + despesasAlimentacao.Sum(p => p.Valor);

        // 5. Despesas Manutenção Frota (Manutenções + Combustíveis)
        var manutencoes = await _manutencaoRepo.FindAsync(m => m.Data.Month == mes && m.Data.Year == ano, asNoTracking: true);
        var despesasCombustivel = await _pagarRepo.FindAsync(p => p.Categoria == "Operacional (Frota)" && p.Descricao.StartsWith("Abastecimento") && p.DataEmissao.Month == mes && p.DataEmissao.Year == ano, asNoTracking: true);
        dre.DespesasManutencaoFrota = manutencoes.Sum(m => m.CustoTotal) + despesasCombustivel.Sum(p => p.Valor);

        // 6. Despesas Gerais (Utilidades, Administração, Outros)
        var despesasGerais = await _pagarRepo.FindAsync(p => 
            p.DataEmissao.Month == mes && p.DataEmissao.Year == ano &&
            !p.Descricao.StartsWith("Compra #") &&
            p.Categoria != "Insumos" &&
            p.Categoria != "Mercadorias" &&
            p.Categoria != "Alimentação" &&
            p.Categoria != "Folha de Pagamento" &&
            p.Categoria != "Operacional (Frota)",
            asNoTracking: true);
        dre.DespesasGerais = despesasGerais.Sum(p => p.Valor);

        return dre;
    }

    public async Task<ResumoFinanceiroDto> ObterResumoAsync()
    {
        var receber = await _receberRepo.FindAsync(r => r.Status == StatusContaReceber.Pendente, asNoTracking: true);
        var pagar = await _pagarRepo.FindAsync(p => p.Status == StatusContaPagar.Pendente, asNoTracking: true);

        // Saldo real: soma dos SaldoAtual das contas bancárias ativas
        var contas = await _contaBancariaRepo.FindAsync(c => c.Ativa, asNoTracking: true);
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

            // Conciliação automática: desconta da conta padrão (ou primeira ativa como fallback)
            var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                            ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
            if (contaPadrao != null)
            {
                contaPadrao.SaldoAtual -= conta.Valor;
                await _contaBancariaRepo.UpdateAsync(contaPadrao);

                // Gravar movimentação histórica
                await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
                {
                    ContaBancariaId = contaPadrao.Id,
                    Tipo = "saida",
                    Valor = conta.Valor,
                    Descricao = $"Baixa de Conta a Pagar: {conta.Descricao}",
                    DataMovimentacao = DateTime.UtcNow,
                    Origem = OrigemMovimentacao.BaixaPagar,
                    ReferenciaId = conta.Id
                });
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

            // Conciliação automática: credita na conta padrão (ou primeira ativa como fallback)
            var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                            ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
            if (contaPadrao != null)
            {
                contaPadrao.SaldoAtual += conta.Valor;
                await _contaBancariaRepo.UpdateAsync(contaPadrao);

                // Gravar movimentação histórica
                await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
                {
                    ContaBancariaId = contaPadrao.Id,
                    Tipo = "entrada",
                    Valor = conta.Valor,
                    Descricao = $"Baixa de Conta a Receber: {conta.Descricao}",
                    DataMovimentacao = DateTime.UtcNow,
                    Origem = OrigemMovimentacao.BaixaReceber,
                    ReferenciaId = conta.Id
                });
            }
        }
    }
}
