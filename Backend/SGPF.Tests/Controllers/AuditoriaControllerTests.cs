using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class AuditoriaControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly AuditoriaController _controller;

    public AuditoriaControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _controller = new AuditoriaController(_context);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task Get_ShouldReturnFilteredLogs_WhenFiltersProvided()
    {
        var log1 = new AuditLog { TableName = "Produtos", Action = "Insert", UserName = "admin", Timestamp = DateTime.UtcNow.AddHours(-2) };
        var log2 = new AuditLog { TableName = "Funcionarios", Action = "Update", UserName = "gestor", Timestamp = DateTime.UtcNow.AddHours(-1) };
        _context.AuditLogs.AddRange(log1, log2);
        await _context.SaveChangesAsync();

        // 1. Filtrar por TableName
        var result1 = await _controller.Get(tableName: "Produtos", action: null, userName: null, startDate: null, endDate: null);
        var ok1 = result1.Should().BeOfType<OkObjectResult>().Subject;
        var body1 = ok1.Value.Should().BeAssignableTo<object>().Subject;
        var items1 = (body1.GetType().GetProperty("Items")?.GetValue(body1) as System.Collections.IEnumerable).Cast<AuditLog>().ToList();
        items1.Should().HaveCount(1);
        items1[0].TableName.Should().Be("Produtos");

        // 2. Filtrar por Action
        var result2 = await _controller.Get(tableName: null, action: "Update", userName: null, startDate: null, endDate: null);
        var ok2 = result2.Should().BeOfType<OkObjectResult>().Subject;
        var body2 = ok2.Value.Should().BeAssignableTo<object>().Subject;
        var items2 = (body2.GetType().GetProperty("Items")?.GetValue(body2) as System.Collections.IEnumerable).Cast<AuditLog>().ToList();
        items2.Should().HaveCount(1);
        items2[0].Action.Should().Be("Update");

        // 3. Filtrar por UserName
        var result3 = await _controller.Get(tableName: null, action: null, userName: "admin", startDate: null, endDate: null);
        var ok3 = result3.Should().BeOfType<OkObjectResult>().Subject;
        var body3 = ok3.Value.Should().BeAssignableTo<object>().Subject;
        var items3 = (body3.GetType().GetProperty("Items")?.GetValue(body3) as System.Collections.IEnumerable).Cast<AuditLog>().ToList();
        items3.Should().HaveCount(1);
        items3[0].UserName.Should().Be("admin");

        // 4. Filtrar por NumeroPedido
        var log3 = new AuditLog { TableName = "PedidosVenda", Action = "Insert", UserName = "admin", KeyValues = "{\"Id\": \"guid\"}", NewValues = "{\"NumeroPedido\": \"PV100\"}", Timestamp = DateTime.UtcNow };
        _context.AuditLogs.Add(log3);
        await _context.SaveChangesAsync();

        var result4 = await _controller.Get(tableName: null, action: null, userName: null, startDate: null, endDate: null, numeroPedido: "PV100");
        var ok4 = result4.Should().BeOfType<OkObjectResult>().Subject;
        var body4 = ok4.Value.Should().BeAssignableTo<object>().Subject;
        var items4 = (body4.GetType().GetProperty("Items")?.GetValue(body4) as System.Collections.IEnumerable).Cast<AuditLog>().ToList();
        items4.Should().HaveCount(1);
        items4[0].TableName.Should().Be("PedidosVenda");
    }

    [Fact]
    public async Task Get_ShouldApplyPaginationSafeguards()
    {
        for (int i = 0; i < 15; i++)
        {
            _context.AuditLogs.Add(new AuditLog { TableName = "Table", Action = "Action", UserName = "User", Timestamp = DateTime.UtcNow });
        }
        await _context.SaveChangesAsync();

        var result = await _controller.Get(tableName: null, action: null, userName: null, startDate: null, endDate: null, page: 1, pageSize: 5);
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var body = okResult.Value.Should().BeAssignableTo<object>().Subject;
        
        var totalItems = (int)body.GetType().GetProperty("TotalItems")?.GetValue(body)!;
        var items = (body.GetType().GetProperty("Items")?.GetValue(body) as System.Collections.IEnumerable).Cast<AuditLog>().ToList();

        totalItems.Should().Be(15);
        items.Should().HaveCount(5);
    }

    [Fact]
    public async Task GetAuditedTables_ShouldReturnDistinctAuditedTableNames()
    {
        var log1 = new AuditLog { TableName = "Produtos", Action = "Insert", Timestamp = DateTime.UtcNow };
        var log2 = new AuditLog { TableName = "Produtos", Action = "Update", Timestamp = DateTime.UtcNow };
        var log3 = new AuditLog { TableName = "Insumos", Action = "Insert", Timestamp = DateTime.UtcNow };
        _context.AuditLogs.AddRange(log1, log2, log3);
        await _context.SaveChangesAsync();

        var result = await _controller.GetAuditedTables();
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<System.Collections.Generic.IEnumerable<string>>().Subject.ToList();

        list.Should().HaveCount(2);
        list.Should().Contain("Produtos");
        list.Should().Contain("Insumos");
    }
}
