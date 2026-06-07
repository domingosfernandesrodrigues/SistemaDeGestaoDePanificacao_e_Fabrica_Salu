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

public class ClientesControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<Cliente> _repository;
    private readonly ClientesController _controller;

    public ClientesControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _repository = new Repository<Cliente>(_context);
        _controller = new ClientesController(_repository, _context);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetAll_ShouldReturnAllClients()
    {
        // Arrange
        var c1 = new Cliente { NomeFantasia = "Supermercado A" };
        var c2 = new Cliente { NomeFantasia = "Supermercado B" };
        await _repository.AddAsync(c1);
        await _repository.AddAsync(c2);

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var clients = okResult.Value.Should().BeAssignableTo<IEnumerable<Cliente>>().Subject.ToList();
        clients.Should().HaveCount(2);
    }

    [Fact]
    public async Task Create_ShouldAddClientAndSetAtivoToTrue()
    {
        // Arrange
        var newClient = new Cliente { NomeFantasia = "Supermercado Novo", Ativo = false };

        // Act
        var result = await _controller.Create(newClient);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Cliente>().Subject;
        returned.Ativo.Should().BeTrue();

        var dbClient = await _repository.GetByIdAsync(returned.Id);
        dbClient.Should().NotBeNull();
        dbClient!.NomeFantasia.Should().Be("Supermercado Novo");
        dbClient.Ativo.Should().BeTrue();
    }

    [Fact]
    public async Task Update_ShouldModifyClientFields_WhenClientExists()
    {
        // Arrange
        var c = new Cliente { NomeFantasia = "Cliente Old", Telefone = "1111" };
        await _repository.AddAsync(c);
        _context.Entry(c).State = EntityState.Detached;

        var updated = new Cliente
        {
            Id = c.Id,
            NomeFantasia = "Cliente New",
            Telefone = "2222",
            Ativo = true
        };

        // Act
        var result = await _controller.Update(c.Id, updated);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Cliente>().Subject;
        returned.NomeFantasia.Should().Be("Cliente New");

        var dbClient = await _repository.GetByIdAsync(c.Id);
        dbClient!.NomeFantasia.Should().Be("Cliente New");
        dbClient.Telefone.Should().Be("2222");
    }

    [Fact]
    public async Task Update_ShouldReturnNotFound_WhenClientDoesNotExist()
    {
        // Act
        var result = await _controller.Update(Guid.NewGuid(), new Cliente());

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Delete_ShouldRemoveClient_WhenNoDependenciesExist()
    {
        // Arrange
        var c = new Cliente { NomeFantasia = "Cliente Sem Vinculo" };
        await _repository.AddAsync(c);

        // Act
        var result = await _controller.Delete(c.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        var dbClient = await _repository.GetByIdAsync(c.Id);
        dbClient.Should().BeNull();
    }

    [Fact]
    public async Task Delete_ShouldReturnBadRequest_WhenClientHasPedidosVendaDependency()
    {
        // Arrange
        var c = new Cliente { NomeFantasia = "Cliente Com Pedido" };
        await _repository.AddAsync(c);

        var order = new PedidoVenda
        {
            ClienteId = c.Id,
            DataPedido = DateTime.UtcNow,
            Status = StatusPedidoVenda.Novo,
            ValorTotal = 100m
        };
        _context.PedidosVenda.Add(order);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.Delete(c.Id);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().NotBeNull();
        badRequestResult.Value!.ToString().Should().Contain("Este cliente possui registros vinculados");

        var dbClient = await _repository.GetByIdAsync(c.Id);
        dbClient.Should().NotBeNull();
    }

    [Fact]
    public async Task ToggleStatus_ShouldInvertClientActiveStatus()
    {
        // Arrange
        var c = new Cliente { NomeFantasia = "Ativo/Inativo", Ativo = true };
        await _repository.AddAsync(c);

        // Act & Assert 1 (Toggle to False)
        var result1 = await _controller.ToggleStatus(c.Id);
        var okResult1 = result1.Should().BeOfType<OkObjectResult>().Subject;
        var returned1 = okResult1.Value.Should().BeOfType<Cliente>().Subject;
        returned1.Ativo.Should().BeFalse();

        // Act & Assert 2 (Toggle to True)
        var result2 = await _controller.ToggleStatus(c.Id);
        var okResult2 = result2.Should().BeOfType<OkObjectResult>().Subject;
        var returned2 = okResult2.Value.Should().BeOfType<Cliente>().Subject;
        returned2.Ativo.Should().BeTrue();
    }
}
