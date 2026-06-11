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
        var veiculos = (await _veiculoRepo.GetAllAsync(asNoTracking: true)).ToList();
        data.Fleet.TotalVehicles = veiculos.Count(v => v.Ativo);
        data.Fleet.ActiveDeliveries = (await _vendaRepo.FindAsync(v => v.Status == StatusPedidoVenda.EmRota, asNoTracking: true)).Count();
        
        var manutencoes = (await _manutencaoRepo.FindAsync(m => 
            m.Data.Year == year && 
            (month == 0 || m.Data.Month == month) && 
            (!day.HasValue || m.Data.Day == day.Value), 
            asNoTracking: true)).ToList();

        data.Fleet.MaintenanceCost = manutencoes.Sum(m => m.CustoTotal);
        
        var abastecimentos = (await _abastecimentoRepo.FindAsync(a => 
            a.Data.Year == year && 
            (month == 0 || a.Data.Month == month) && 
            (!day.HasValue || a.Data.Day == day.Value), 
            asNoTracking: true)).ToList();

        data.Fleet.TotalFuelCost = abastecimentos.Sum(a => a.ValorTotal);

        var todosAbastecimentos = (await _abastecimentoRepo.GetAllAsync(asNoTracking: true)).ToList();
        var todasManutencoes = (await _manutencaoRepo.GetAllAsync(asNoTracking: true)).ToList();

        foreach (var v in veiculos)
        {
            var vAbastecimentos = todosAbastecimentos.Where(a => a.VeiculoId == v.Id).OrderBy(a => a.QuilometragemRegistrada).ToList();
            var vManutencoes = todasManutencoes.Where(m => m.VeiculoId == v.Id).OrderBy(m => m.QuilometragemRegistrada).ToList();

            // 1. Média de KM/L no período
            decimal totalKmPeriod = 0;
            decimal totalLitersPeriod = 0;

            for (int i = 1; i < vAbastecimentos.Count; i++)
            {
                var prev = vAbastecimentos[i - 1];
                var curr = vAbastecimentos[i];

                if (curr.Data.Year == year && (month == 0 || curr.Data.Month == month) && (!day.HasValue || curr.Data.Day == day.Value))
                {
                    var diff = curr.QuilometragemRegistrada - prev.QuilometragemRegistrada;
                    if (diff > 0 && curr.Litros > 0)
                    {
                        totalKmPeriod += diff;
                        totalLitersPeriod += curr.Litros;
                    }
                }
            }

            decimal mediaKmLitro = 0;
            if (totalLitersPeriod > 0)
            {
                mediaKmLitro = totalKmPeriod / totalLitersPeriod;
            }
            else
            {
                // Fallback: Média de KM/L histórica (toda a vida do veículo)
                decimal totalKmLifetime = 0;
                decimal totalLitersLifetime = 0;

                for (int i = 1; i < vAbastecimentos.Count; i++)
                {
                    var prev = vAbastecimentos[i - 1];
                    var curr = vAbastecimentos[i];
                    var diff = curr.QuilometragemRegistrada - prev.QuilometragemRegistrada;
                    if (diff > 0 && curr.Litros > 0)
                    {
                        totalKmLifetime += diff;
                        totalLitersLifetime += curr.Litros;
                    }
                }

                if (totalLitersLifetime > 0)
                {
                    mediaKmLitro = totalKmLifetime / totalLitersLifetime;
                }
            }

            // 2. Média de Manutenção por KM Rodado (Preventiva vs Corretiva)
            // Filtros de manutenções no período
            var prevManutencoesPeriod = vManutencoes.Where(m => m.Tipo == TipoManutencao.Preventiva && m.Data.Year == year && (month == 0 || m.Data.Month == month) && (!day.HasValue || m.Data.Day == day.Value)).ToList();
            var corrManutencoesPeriod = vManutencoes.Where(m => m.Tipo == TipoManutencao.Corretiva && m.Data.Year == year && (month == 0 || m.Data.Month == month) && (!day.HasValue || m.Data.Day == day.Value)).ToList();

            decimal custoPrevPeriod = prevManutencoesPeriod.Sum(m => m.CustoTotal);
            decimal custoCorrPeriod = corrManutencoesPeriod.Sum(m => m.CustoTotal);

            // Odômetros no período
            var odometrosPeriod = vAbastecimentos.Where(a => a.Data.Year == year && (month == 0 || a.Data.Month == month) && (!day.HasValue || a.Data.Day == day.Value)).Select(a => a.QuilometragemRegistrada)
                .Concat(vManutencoes.Where(m => m.Data.Year == year && (month == 0 || m.Data.Month == month) && (!day.HasValue || m.Data.Day == day.Value)).Select(m => m.QuilometragemRegistrada))
                .OrderBy(x => x).ToList();

            decimal kmRodadoPeriod = odometrosPeriod.Count >= 2 ? odometrosPeriod.Last() - odometrosPeriod.First() : 0;

            decimal mediaCustoPreventivaKm = 0;
            decimal mediaCustoCorretivaKm = 0;

            if (kmRodadoPeriod > 0)
            {
                mediaCustoPreventivaKm = custoPrevPeriod / kmRodadoPeriod;
                mediaCustoCorretivaKm = custoCorrPeriod / kmRodadoPeriod;
            }
            else
            {
                // Fallback: Histórico (toda a vida do veículo)
                decimal custoPrevLifetime = vManutencoes.Where(m => m.Tipo == TipoManutencao.Preventiva).Sum(m => m.CustoTotal);
                decimal custoCorrLifetime = vManutencoes.Where(m => m.Tipo == TipoManutencao.Corretiva).Sum(m => m.CustoTotal);

                var odometrosLifetime = vAbastecimentos.Select(a => a.QuilometragemRegistrada)
                    .Concat(vManutencoes.Select(m => m.QuilometragemRegistrada))
                    .OrderBy(x => x).ToList();

                decimal kmRodadoLifetime = odometrosLifetime.Count >= 2 ? odometrosLifetime.Last() - odometrosLifetime.First() : 0;

                if (kmRodadoLifetime > 0)
                {
                    mediaCustoPreventivaKm = custoPrevLifetime / kmRodadoLifetime;
                    mediaCustoCorretivaKm = custoCorrLifetime / kmRodadoLifetime;
                }
            }

            data.Fleet.VehicleMetrics.Add(new VehicleFleetMetric
            {
                Placa = v.Placa,
                Modelo = v.Modelo,
                MediaKmLitro = mediaKmLitro,
                MediaCustoPreventivaKm = mediaCustoPreventivaKm,
                MediaCustoCorretivaKm = mediaCustoCorretivaKm
            });
        }

        // --- DESPESAS & RH ---
        var despesas = (await _contaPagarRepo.FindAsync(d => 
            (d.DataVencimento ?? d.DataEmissao).Year == year && 
            (month == 0 || (d.DataVencimento ?? d.DataEmissao).Month == month) && 
            (!day.HasValue || (d.DataVencimento ?? d.DataEmissao).Day == day.Value), 
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
