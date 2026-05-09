using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.Application.Services;

public class DashboardService : IDashboardService
{
    private readonly IRepository<PedidoVenda> _vendaRepo;
    private readonly IRepository<PedidoVendaItem> _itemRepo;
    private readonly IRepository<OrdemProducao> _opRepo;
    private readonly IRepository<Produto> _produtoRepo;
    private readonly IRepository<Veiculo> _veiculoRepo;
    private readonly IRepository<ContaReceber> _receberRepo;
    private readonly IRepository<ContaPagar> _contaPagarRepo;
    private readonly IRepository<MovimentacaoEstoque> _movRepo;
    private readonly IRepository<Compra> _compraRepo;
    private readonly IRepository<FolhaPagamento> _folhaRepo;
    private readonly IRepository<TrocaAvaria> _trocaRepo;
    private readonly IRepository<ManutencaoVeiculo> _manutencaoRepo;

    public DashboardService(
        IRepository<PedidoVenda> vendaRepo,
        IRepository<PedidoVendaItem> itemRepo,
        IRepository<OrdemProducao> opRepo,
        IRepository<Produto> produtoRepo,
        IRepository<Veiculo> veiculoRepo,
        IRepository<ContaReceber> receberRepo,
        IRepository<ContaPagar> contaPagarRepo,
        IRepository<MovimentacaoEstoque> movRepo,
        IRepository<Compra> compraRepo,
        IRepository<FolhaPagamento> folhaRepo,
        IRepository<TrocaAvaria> trocaRepo,
        IRepository<ManutencaoVeiculo> manutencaoRepo)
    {
        _vendaRepo = vendaRepo;
        _itemRepo = itemRepo;
        _opRepo = opRepo;
        _produtoRepo = produtoRepo;
        _veiculoRepo = veiculoRepo;
        _receberRepo = receberRepo;
        _contaPagarRepo = contaPagarRepo;
        _movRepo = movRepo;
        _compraRepo = compraRepo;
        _folhaRepo = folhaRepo;
        _trocaRepo = trocaRepo;
        _manutencaoRepo = manutencaoRepo;
    }

    public async Task<DashboardData> GetDashboardDataAsync(int year, int month, int? day = null, Guid? clienteId = null)
    {
        var data = new DashboardData();

        // Filtro de Data comum (Trata nullables e Visão Anual)
        Func<DateTime?, bool> dateFilter = d => 
            d.HasValue &&
            d.Value.Year == year && 
            (month == 0 || d.Value.Month == month) && 
            (!day.HasValue || d.Value.Day == day.Value);

        // --- VENDAS ---
        var queryVendas = (await _vendaRepo.GetAllAsync()).Where(v => dateFilter(v.DataPedido));
        if (clienteId.HasValue && clienteId.Value != Guid.Empty) 
            queryVendas = queryVendas.Where(v => v.ClienteId == clienteId.Value);
        
        var vendas = queryVendas.ToList();
        var vendaIds = vendas.Select(v => v.Id).ToList();

        data.Sales.TotalSales = vendas.Where(v => v.Status != StatusPedidoVenda.Cancelado).Sum(v => v.ValorTotal);
        data.Sales.OrderCount = vendas.Count;
        data.Sales.ByPaymentMethod = vendas
            .GroupBy(v => v.FormaPagamento)
            .Select(g => new MetricItem { Label = g.Key.ToString(), Value = g.Sum(v => v.ValorTotal) })
            .ToList();

        // Ranking de Produtos
        var todosItens = (await _itemRepo.GetAllAsync()).Where(i => vendaIds.Contains(i.PedidoVendaId)).ToList();
        var todosProdutos = await _produtoRepo.GetAllAsync();

        data.Sales.TopProducts = todosItens
            .GroupBy(i => i.ProdutoId)
            .Select(g => {
                var p = todosProdutos.FirstOrDefault(prod => prod.Id == g.Key);
                var totalRev = g.Sum(i => (i.PrecoUnitario - i.Desconto) * i.Quantidade);
                var totalCost = p != null ? g.Sum(i => p.PrecoCusto * i.Quantidade) : 0;
                return new ProductMetric {
                    Name = p?.Nome ?? "Desconhecido",
                    Quantity = g.Sum(i => i.Quantidade),
                    TotalRevenue = totalRev,
                    TotalProfit = totalRev - totalCost
                };
            })
            .OrderByDescending(p => p.Quantity)
            .ToList();

        // --- PRODUÇÃO ---
        var ops = (await _opRepo.GetAllAsync()).Where(o => dateFilter(o.DataAbertura)).ToList();
        data.Production.TotalProduced = ops.Sum(o => o.QuantidadeRealizada);
        data.Production.OpCount = ops.Count;
        var totalPlanejado = ops.Sum(o => o.QuantidadePlanejada);
        data.Production.Efficiency = totalPlanejado > 0 ? (data.Production.TotalProduced / totalPlanejado) * 100 : 0;
        
        var opsFinalizadas = ops.Where(o => o.Status == StatusOrdemProducao.Finalizada && o.DataFinalizacao.HasValue).ToList();
        if (opsFinalizadas.Any())
        {
            data.Production.AverageLeadTimeHours = (decimal)opsFinalizadas.Average(o => (o.DataFinalizacao!.Value - o.DataAbertura).TotalHours);
        }

        data.Production.ByStatus = ops
            .GroupBy(o => o.Status)
            .Select(g => new MetricItem { Label = g.Key.ToString(), Value = g.Count() })
            .ToList();

        // --- PRODUTOS & INSUMOS ---
        data.Inventory.TotalProducts = todosProdutos.Count();
        data.Inventory.LowStockCount = todosProdutos.Count(p => p.QuantidadeEstoque <= 10);
        data.Inventory.InventoryValue = todosProdutos.Sum(p => p.QuantidadeEstoque * p.PrecoVenda);
        
        var compras = (await _compraRepo.GetAllAsync()).Where(c => dateFilter(c.DataCompra)).ToList();
        data.Inventory.TotalPurchases = compras.Sum(c => c.ValorTotal);

        // --- FROTA ---
        data.Fleet.TotalVehicles = (await _veiculoRepo.GetAllAsync()).Count();
        data.Fleet.ActiveDeliveries = (await _vendaRepo.GetAllAsync()).Count(v => v.Status == StatusPedidoVenda.EmRota);
        
        var manutencoes = (await _manutencaoRepo.GetAllAsync()).Where(m => dateFilter(m.Data));
        data.Fleet.MaintenanceCost = manutencoes.Sum(m => m.CustoTotal);

        // --- DESPESAS & RH ---
        var despesas = (await _contaPagarRepo.GetAllAsync()).Where(d => dateFilter(d.DataVencimento)).ToList();
        var folhas = (await _folhaRepo.GetAllAsync()).Where(f => f.MesReferencia == month && f.AnoReferencia == year).ToList();
        
        data.Expenses.TotalPayroll = folhas.Sum(f => f.SalarioLiquido);
        data.Expenses.TotalOvertime = folhas.Sum(f => f.ValorHorasExtras50 + f.ValorHorasExtras100);
        data.Expenses.TotalExpenses = despesas.Sum(d => d.Valor) + data.Expenses.TotalPayroll;
        
        data.Expenses.ByCategory = despesas
            .GroupBy(d => d.Categoria)
            .Select(g => new MetricItem { Label = g.Key ?? "Geral", Value = g.Sum(d => d.Valor) })
            .ToList();

        // --- TROCAS E AVARIAS ---
        var queryTrocas = (await _trocaRepo.GetAllAsync()).Where(t => dateFilter(t.DataTroca));
        if (clienteId.HasValue && clienteId.Value != Guid.Empty) 
            queryTrocas = queryTrocas.Where(t => t.ClienteId == clienteId.Value);
        
        var trocas = queryTrocas.ToList();
        data.Exchanges.ExchangeCount = trocas.Count;
        
        decimal totalLoss = 0;
        foreach(var t in trocas)
        {
            var p = todosProdutos.FirstOrDefault(prod => prod.Id == t.ProdutoId);
            if (p != null) totalLoss += t.Quantidade * p.PrecoVenda;
        }
        data.Exchanges.TotalLoss = totalLoss;

        return data;
    }
}
