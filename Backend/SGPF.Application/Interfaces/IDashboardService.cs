using SGPF.Domain.Entities;

namespace SGPF.Application.Interfaces;

public interface IDashboardService
{
    Task<DashboardData> GetDashboardDataAsync(int year, int month, int? day = null, Guid? clienteId = null);
}

public class DashboardData
{
    public SalesMetrics Sales { get; set; } = new();
    public ProductionMetrics Production { get; set; } = new();
    public InventoryMetrics Inventory { get; set; } = new();
    public FleetMetrics Fleet { get; set; } = new();
    public ExpenseMetrics Expenses { get; set; } = new();
    public ExchangeMetrics Exchanges { get; set; } = new();
}

public class SalesMetrics
{
    public decimal TotalSales { get; set; }
    public int OrderCount { get; set; }
    public decimal AverageTicket => OrderCount > 0 ? TotalSales / OrderCount : 0;
    public List<MetricItem> ByPaymentMethod { get; set; } = new();
    public List<ProductMetric> TopProducts { get; set; } = new();
    public decimal GrowthMoM { get; set; }
    public decimal GrowthYoY { get; set; }
}

public class ProductMetric
{
    public string Name { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal TotalProfit { get; set; }
}

public class ProductionMetrics
{
    public decimal TotalProduced { get; set; }
    public int OpCount { get; set; }
    public decimal Efficiency { get; set; }
    public decimal AverageLeadTimeHours { get; set; } // Em horas
    public List<MetricItem> ByStatus { get; set; } = new();
}

public class InventoryMetrics
{
    public int TotalProducts { get; set; }
    public int LowStockCount { get; set; }
    public decimal InventoryValue { get; set; }
    public decimal TotalPurchases { get; set; } // Compras do período
    public decimal InputCost { get; set; } // Custo de insumos recebidos
}

public class FleetMetrics
{
    public int TotalVehicles { get; set; }
    public int ActiveDeliveries { get; set; }
    public decimal MaintenanceCost { get; set; }
    public decimal TotalFuelCost { get; set; }
}

public class ExpenseMetrics
{
    public decimal TotalExpenses { get; set; }
    public decimal TotalPayroll { get; set; }
    public decimal TotalOvertime { get; set; }
    public List<MetricItem> ByCategory { get; set; } = new();
}

public class ExchangeMetrics
{
    public decimal TotalLoss { get; set; }
    public int ExchangeCount { get; set; }
    public List<MetricItem> TopProducts { get; set; } = new();
    public List<MetricItem> TopClients { get; set; } = new();
}

public class MetricItem
{
    public string Label { get; set; } = string.Empty;
    public decimal Value { get; set; }
}
