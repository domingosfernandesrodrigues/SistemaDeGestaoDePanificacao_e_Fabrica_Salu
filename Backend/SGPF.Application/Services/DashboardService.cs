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
    private readonly IRepository<Abastecimento> _abastecimentoRepo;
    private readonly IRepository<Cliente> _clienteRepo;

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
        IRepository<ManutencaoVeiculo> manutencaoRepo,
        IRepository<Abastecimento> abastecimentoRepo,
        IRepository<Cliente> clienteRepo)
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
        _abastecimentoRepo = abastecimentoRepo;
        _clienteRepo = clienteRepo;
    }

    public async Task<DashboardData> GetDashboardDataAsync(int year, int month, int? day = null, Guid? clienteId = null, Guid? motoristaId = null)
    {
        var data = new DashboardData();

        // --- VENDAS ---
        var queryVendas = await _vendaRepo.FindAsync(v => 
            v.DataPedido.Year == year && 
            (month == 0 || v.DataPedido.Month == month) && 
            (!day.HasValue || v.DataPedido.Day == day.Value), 
            asNoTracking: true);

        if (clienteId.HasValue && clienteId.Value != Guid.Empty) 
            queryVendas = queryVendas.Where(v => v.ClienteId == clienteId.Value);
        
        if (motoristaId.HasValue && motoristaId.Value != Guid.Empty)
            queryVendas = queryVendas.Where(v => v.MotoristaId == motoristaId.Value);
        
        var vendas = queryVendas.ToList();
        var vendaIds = vendas.Select(v => v.Id).ToList();

        data.Sales.TotalSales = vendas.Where(v => v.Status != StatusPedidoVenda.Cancelado).Sum(v => v.ValorTotal);
        data.Sales.OrderCount = vendas.Count;
        data.Sales.ByPaymentMethod = vendas
            .GroupBy(v => v.FormaPagamento)
            .Select(g => new MetricItem { Label = g.Key.ToString(), Value = g.Sum(v => v.ValorTotal) })
            .ToList();

        // Crescimento MoM e YoY
        if (month > 0)
        {
            var prevMonth = month == 1 ? 12 : month - 1;
            var prevMonthYear = month == 1 ? year - 1 : year;
            
            var prevMonthSales = (await _vendaRepo.FindAsync(v => 
                v.DataPedido.Year == prevMonthYear && 
                v.DataPedido.Month == prevMonth && 
                v.Status != StatusPedidoVenda.Cancelado, 
                asNoTracking: true))
                .Sum(v => v.ValorTotal);

            data.Sales.GrowthMoM = prevMonthSales > 0 ? ((data.Sales.TotalSales - prevMonthSales) / prevMonthSales) * 100 : 0;

            var prevYearSales = (await _vendaRepo.FindAsync(v => 
                v.DataPedido.Year == year - 1 && 
                v.DataPedido.Month == month && 
                v.Status != StatusPedidoVenda.Cancelado, 
                asNoTracking: true))
                .Sum(v => v.ValorTotal);

            data.Sales.GrowthYoY = prevYearSales > 0 ? ((data.Sales.TotalSales - prevYearSales) / prevYearSales) * 100 : 0;
        }

        // Ranking de Produtos
        var todosItens = (await _itemRepo.FindAsync(i => vendaIds.Contains(i.PedidoVendaId), asNoTracking: true)).ToList();
        var todosProdutos = (await _produtoRepo.GetAllAsync(asNoTracking: true)).ToList();

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
        var ops = (await _opRepo.FindAsync(o => 
            o.DataAbertura.Year == year && 
            (month == 0 || o.DataAbertura.Month == month) && 
            (!day.HasValue || o.DataAbertura.Day == day.Value), 
            asNoTracking: true)).ToList();

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
        data.Inventory.LowStockProducts = todosProdutos
            .Where(p => p.QuantidadeEstoque <= 10)
            .Select(p => new MetricItem { Label = p.Nome, Value = p.QuantidadeEstoque })
            .OrderBy(p => p.Value)
            .ToList();
        
        data.Inventory.ProductsForSaleStock = todosProdutos
            .Where(p => p.Tipo == TipoProduto.ProdutoAcabado || p.Tipo == TipoProduto.Revenda)
            .Select(p => new MetricItem { Label = p.Nome, Value = p.QuantidadeEstoque })
            .OrderBy(p => p.Label)
            .ToList();
        
        var compras = (await _compraRepo.FindAsync(c => 
            c.DataCompra.Year == year && 
            (month == 0 || c.DataCompra.Month == month) && 
            (!day.HasValue || c.DataCompra.Day == day.Value), 
            asNoTracking: true)).ToList();

        data.Inventory.TotalPurchases = compras.Sum(c => c.ValorTotal);

        // --- FROTA ---
        data.Fleet.TotalVehicles = (await _veiculoRepo.GetAllAsync(asNoTracking: true)).Count();
        data.Fleet.ActiveDeliveries = (await _vendaRepo.FindAsync(v => v.Status == StatusPedidoVenda.EmRota, asNoTracking: true)).Count();
        
        var manutencoes = await _manutencaoRepo.FindAsync(m => 
            m.Data.Year == year && 
            (month == 0 || m.Data.Month == month) && 
            (!day.HasValue || m.Data.Day == day.Value), 
            asNoTracking: true);

        data.Fleet.MaintenanceCost = manutencoes.Sum(m => m.CustoTotal);
        
        var abastecimentos = await _abastecimentoRepo.FindAsync(a => 
            a.Data.Year == year && 
            (month == 0 || a.Data.Month == month) && 
            (!day.HasValue || a.Data.Day == day.Value), 
            asNoTracking: true);

        data.Fleet.TotalFuelCost = abastecimentos.Sum(a => a.ValorTotal);

        // --- DESPESAS & RH ---
        var despesas = (await _contaPagarRepo.FindAsync(d => 
            d.DataVencimento.HasValue && 
            d.DataVencimento.Value.Year == year && 
            (month == 0 || d.DataVencimento.Value.Month == month) && 
            (!day.HasValue || d.DataVencimento.Value.Day == day.Value), 
            asNoTracking: true)).ToList();

        var queryFolhas = await _folhaRepo.FindAsync(f => 
            f.AnoReferencia == year && 
            (month == 0 || f.MesReferencia == month), 
            asNoTracking: true);

        var folhas = queryFolhas.ToList();
        
        data.Expenses.TotalPayroll = folhas.Sum(f => f.SalarioLiquido);
        data.Expenses.TotalOvertime = 0;
        data.Expenses.TotalExpenses = despesas.Sum(d => d.Valor) + data.Expenses.TotalPayroll;
        
        data.Expenses.ByCategory = despesas
            .GroupBy(d => d.Categoria)
            .Select(g => new MetricItem { Label = g.Key ?? "Geral", Value = g.Sum(d => d.Valor) })
            .ToList();

        // --- TROCAS E AVARIAS ---
        var queryTrocas = await _trocaRepo.FindAsync(t => 
            t.DataTroca.Year == year && 
            (month == 0 || t.DataTroca.Month == month) && 
            (!day.HasValue || t.DataTroca.Day == day.Value), 
            asNoTracking: true);

        if (clienteId.HasValue && clienteId.Value != Guid.Empty) 
            queryTrocas = queryTrocas.Where(t => t.ClienteId == clienteId.Value);
        
        if (motoristaId.HasValue && motoristaId.Value != Guid.Empty)
            queryTrocas = queryTrocas.Where(t => t.MotoristaId == motoristaId.Value);
        
        var trocas = queryTrocas.ToList();
        data.Exchanges.ExchangeCount = trocas.Count;
        
        decimal totalLoss = 0;
        foreach(var t in trocas)
        {
            var p = todosProdutos.FirstOrDefault(prod => prod.Id == t.ProdutoId);
            if (p != null && p.Tipo == TipoProduto.ProdutoAcabado)
            {
                totalLoss += t.Quantidade * p.PrecoVenda;
            }
        }
        data.Exchanges.TotalLoss = totalLoss;

        var todosClientes = (await _clienteRepo.GetAllAsync(asNoTracking: true)).ToList();

        data.Exchanges.TopProducts = trocas
            .GroupBy(t => t.ProdutoId)
            .Select(g => new MetricItem { 
                Label = todosProdutos.FirstOrDefault(p => p.Id == g.Key)?.Nome ?? "Desconhecido", 
                Value = g.Count() 
            })
            .OrderByDescending(x => x.Value).Take(5).ToList();
            
        data.Exchanges.TopClients = trocas
            .GroupBy(t => t.ClienteId)
            .Select(g => new MetricItem { 
                Label = todosClientes.FirstOrDefault(c => c.Id == g.Key)?.NomeFantasia ?? "Desconhecido", 
                Value = g.Count() 
            })
            .OrderByDescending(x => x.Value).Take(5).ToList();

        return data;
    }
}
