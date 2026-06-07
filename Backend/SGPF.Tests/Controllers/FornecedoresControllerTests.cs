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

public class FornecedoresControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<Fornecedor> _repository;
    private readonly FornecedoresController _controller;

    public FornecedoresControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _repository = new Repository<Fornecedor>(_context);
        _controller = new FornecedoresController(_repository);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetAll_ShouldReturnAllFornecedores()
    {
        // Arrange
        var f1 = new Fornecedor { RazaoSocial = "Distribuidora A", CNPJ = "00000000000100" };
        var f2 = new Fornecedor { RazaoSocial = "Distribuidora B", CNPJ = "00000000000200" };
        await _repository.AddAsync(f1);
        await _repository.AddAsync(f2);

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<Fornecedor>>().Subject.ToList();
        list.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetById_ShouldReturnFornecedor_WhenFornecedorExists()
    {
        // Arrange
        var f = new Fornecedor { RazaoSocial = "Fornecedor X", CNPJ = "123456" };
        await _repository.AddAsync(f);

        // Act
        var result = await _controller.GetById(f.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Fornecedor>().Subject;
        returned.Id.Should().Be(f.Id);
    }

    [Fact]
    public async Task GetById_ShouldReturnNotFound_WhenFornecedorDoesNotExist()
    {
        // Act
        var result = await _controller.GetById(Guid.NewGuid());

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Create_ShouldAddFornecedorToDatabase()
    {
        // Arrange
        var f = new Fornecedor { RazaoSocial = "Fornecedor Novo", CNPJ = "999888" };

        // Act
        var result = await _controller.Create(f);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Fornecedor>().Subject;
        returned.RazaoSocial.Should().Be("Fornecedor Novo");

        var dbFornecedor = await _repository.GetByIdAsync(returned.Id);
        dbFornecedor.Should().NotBeNull();
        dbFornecedor!.RazaoSocial.Should().Be("Fornecedor Novo");
    }

    [Fact]
    public async Task Update_ShouldModifyFornecedorFields()
    {
        // Arrange
        var f = new Fornecedor { RazaoSocial = "Old Supplier", CNPJ = "111" };
        await _repository.AddAsync(f);
        _context.Entry(f).State = EntityState.Detached;

        var updated = new Fornecedor
        {
            Id = f.Id,
            RazaoSocial = "New Supplier",
            CNPJ = "222",
            Ativo = true
        };

        // Act
        var result = await _controller.Update(f.Id, updated);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Fornecedor>().Subject;
        returned.RazaoSocial.Should().Be("New Supplier");

        var dbFornecedor = await _repository.GetByIdAsync(f.Id);
        dbFornecedor!.RazaoSocial.Should().Be("New Supplier");
    }

    [Fact]
    public async Task ToggleStatus_ShouldInvertFornecedorActiveStatus()
    {
        // Arrange
        var f = new Fornecedor { RazaoSocial = "Supplier Status", Ativo = true };
        await _repository.AddAsync(f);

        // Act
        var result = await _controller.ToggleStatus(f.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Fornecedor>().Subject;
        returned.Ativo.Should().BeFalse();
    }

    [Fact]
    public async Task Delete_ShouldRemoveFornecedor_WhenNoDependenciesExist()
    {
        // Arrange
        var f = new Fornecedor { RazaoSocial = "Supplier Solo" };
        await _repository.AddAsync(f);

        // Act
        var result = await _controller.Delete(f.Id, _context);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        var dbFornecedor = await _repository.GetByIdAsync(f.Id);
        dbFornecedor.Should().BeNull();
    }

    [Fact]
    public async Task Delete_ShouldReturnBadRequest_WhenFornecedorHasContasPagarDependency()
    {
        // Arrange
        var f = new Fornecedor { RazaoSocial = "Supplier Billing" };
        await _repository.AddAsync(f);

        var bill = new ContaPagar
        {
            FornecedorId = f.Id,
            Descricao = "Compra Insumo",
            Valor = 150m,
            DataVencimento = DateTime.UtcNow,
            Status = StatusContaPagar.Pendente
        };
        _context.ContasPagar.Add(bill);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.Delete(f.Id, _context);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().NotBeNull();
        badRequestResult.Value!.ToString().Should().Contain("Não é possível excluir um fornecedor que já possui histórico");

        var dbFornecedor = await _repository.GetByIdAsync(f.Id);
        dbFornecedor.Should().NotBeNull();
    }
}
