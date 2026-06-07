using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;
using SGPF.Infrastructure.Repositories;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class DespesasControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<ContaPagar> _repository;
    private readonly DespesasController _controller;

    public DespesasControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _repository = new Repository<ContaPagar>(_context);
        _controller = new DespesasController(_repository);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetAll_ShouldReturnOnlyManualExpenses_ExcludingSystemGenerated()
    {
        // Arrange
        var d1 = new ContaPagar { Descricao = "Luz", Valor = 100m, Categoria = "Infraestrutura" };
        var d2 = new ContaPagar { Descricao = "Internet", Valor = 50m, Categoria = "Escritório" };
        
        // System generated (devem ser ignorados)
        var sys1 = new ContaPagar { Descricao = "Compra #123", Valor = 500m, Categoria = "Insumos" };
        var sys2 = new ContaPagar { Descricao = "Folha Pagamento", Valor = 1500m, Categoria = "Folha de Pagamento" };
        var sys3 = new ContaPagar { Descricao = "Almoço", Valor = 20m, Categoria = "Alimentação" };

        await _repository.AddAsync(d1);
        await _repository.AddAsync(d2);
        await _repository.AddAsync(sys1);
        await _repository.AddAsync(sys2);
        await _repository.AddAsync(sys3);

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<ContaPagar>>().Subject.ToList();
        list.Should().HaveCount(2);
        list.Any(x => x.Descricao == "Luz").Should().BeTrue();
        list.Any(x => x.Descricao == "Internet").Should().BeTrue();
    }

    [Fact]
    public async Task Create_ShouldRegisterPendingExpense()
    {
        // Arrange
        var expense = new ContaPagar { Descricao = "Manutenção Ar", Valor = 120m, Categoria = "Infraestrutura" };

        // Act
        var result = await _controller.Create(expense);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<ContaPagar>().Subject;
        returned.Status.Should().Be(StatusContaPagar.Pendente);

        var dbExpense = await _repository.GetByIdAsync(returned.Id);
        dbExpense.Should().NotBeNull();
        dbExpense!.Descricao.Should().Be("Manutenção Ar");
    }

    [Fact]
    public async Task Update_ShouldModifyFields()
    {
        // Arrange
        var expense = new ContaPagar { Descricao = "Seguro", Valor = 300m, Categoria = "Seguros" };
        await _repository.AddAsync(expense);
        _context.Entry(expense).State = EntityState.Detached;

        var updated = new ContaPagar
        {
            Id = expense.Id,
            Descricao = "Seguro Reajustado",
            Valor = 330m,
            Categoria = "Seguros"
        };

        // Act
        var result = await _controller.Update(expense.Id, updated);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<ContaPagar>().Subject;
        returned.Descricao.Should().Be("Seguro Reajustado");

        var dbExpense = await _repository.GetByIdAsync(expense.Id);
        dbExpense!.Valor.Should().Be(330m);
    }

    [Fact]
    public async Task Delete_ShouldRemoveExpense()
    {
        // Arrange
        var expense = new ContaPagar { Descricao = "Consultoria", Valor = 1000m, Categoria = "Serviços" };
        await _repository.AddAsync(expense);

        // Act
        var result = await _controller.Delete(expense.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        var dbExpense = await _repository.GetByIdAsync(expense.Id);
        dbExpense.Should().BeNull();
    }
}
