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

public class FuncionariosControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<Funcionario> _repository;
    private readonly FuncionariosController _controller;

    public FuncionariosControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _repository = new Repository<Funcionario>(_context);
        _controller = new FuncionariosController(_repository, _context);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetAll_ShouldReturnAllFuncionarios()
    {
        // Arrange
        var f1 = new Funcionario { Nome = "Maria", CPF = "111", Cargo = "Padeira" };
        var f2 = new Funcionario { Nome = "João", CPF = "222", Cargo = "Confeiteiro" };
        await _repository.AddAsync(f1);
        await _repository.AddAsync(f2);

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<Funcionario>>().Subject.ToList();
        list.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetById_ShouldReturnFuncionario_WhenFuncionarioExists()
    {
        // Arrange
        var f = new Funcionario { Nome = "Ana", CPF = "333" };
        await _repository.AddAsync(f);

        // Act
        var result = await _controller.GetById(f.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Funcionario>().Subject;
        returned.Id.Should().Be(f.Id);
    }

    [Fact]
    public async Task GetById_ShouldReturnNotFound_WhenFuncionarioDoesNotExist()
    {
        // Act
        var result = await _controller.GetById(Guid.NewGuid());

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Create_ShouldAddFuncionarioToDatabase()
    {
        // Arrange
        var f = new Funcionario { Nome = "Carlos", CPF = "444" };

        // Act
        var result = await _controller.Create(f);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Funcionario>().Subject;
        returned.Nome.Should().Be("Carlos");
        returned.EmpresaId.Should().BeNull();

        var dbFunc = await _repository.GetByIdAsync(returned.Id);
        dbFunc.Should().NotBeNull();
        dbFunc!.Nome.Should().Be("Carlos");
    }

    [Fact]
    public async Task Update_ShouldModifyFuncionarioFields()
    {
        // Arrange
        var f = new Funcionario { Nome = "Carlos Antigo", CPF = "444" };
        await _repository.AddAsync(f);
        _context.Entry(f).State = EntityState.Detached;

        var updated = new Funcionario
        {
            Id = f.Id,
            Nome = "Carlos Novo",
            CPF = "444",
            Cargo = "Gerente"
        };

        // Act
        var result = await _controller.Update(f.Id, updated);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Funcionario>().Subject;
        returned.Nome.Should().Be("Carlos Novo");

        var dbFunc = await _repository.GetByIdAsync(f.Id);
        dbFunc!.Nome.Should().Be("Carlos Novo");
    }

    [Fact]
    public async Task Update_ShouldReturnBadRequest_WhenIdMismatch()
    {
        // Arrange
        var updated = new Funcionario { Id = Guid.NewGuid(), Nome = "Carlos Novo" };

        // Act
        var result = await _controller.Update(Guid.NewGuid(), updated);

        // Assert
        result.Should().BeOfType<BadRequestResult>();
    }

    [Fact]
    public async Task ToggleStatus_ShouldInvertFuncionarioActiveStatus()
    {
        // Arrange
        var f = new Funcionario { Nome = "Ativo", Ativo = true };
        await _repository.AddAsync(f);

        // Act
        var result = await _controller.ToggleStatus(f.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Funcionario>().Subject;
        returned.Ativo.Should().BeFalse();
    }

    [Fact]
    public async Task ToggleStatus_ShouldReturnNotFound_WhenFuncDoesNotExist()
    {
        // Act
        var result = await _controller.ToggleStatus(Guid.NewGuid());

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Delete_ShouldRemoveFuncionario_WhenNoDependenciesExist()
    {
        // Arrange
        var f = new Funcionario { Nome = "Solo" };
        await _repository.AddAsync(f);

        // Act
        var result = await _controller.Delete(f.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        var dbFunc = await _repository.GetByIdAsync(f.Id);
        dbFunc.Should().BeNull();
    }

    [Fact]
    public async Task Delete_ShouldReturnBadRequest_WhenFuncionarioHasPontoDependency()
    {
        // Arrange
        var f = new Funcionario { Nome = "Com Ponto" };
        await _repository.AddAsync(f);

        var ponto = new RegistroPonto
        {
            FuncionarioId = f.Id,
            DataHoraEntrada = DateTime.Now
        };
        _context.RegistrosPonto.Add(ponto);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.Delete(f.Id);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().NotBeNull();
        badRequestResult.Value!.ToString().Should().Contain("Não é possível excluir um funcionário que já possui registros de ponto");

        var dbFunc = await _repository.GetByIdAsync(f.Id);
        dbFunc.Should().NotBeNull();
    }

    [Fact]
    public async Task Delete_ShouldReturnBadRequest_WhenFuncionarioHasFolhaDependency()
    {
        // Arrange
        var f = new Funcionario { Nome = "Com Folha" };
        await _repository.AddAsync(f);

        var folha = new FolhaPagamento
        {
            FuncionarioId = f.Id,
            MesReferencia = 5,
            AnoReferencia = 2026,
            SalarioBaseCalculado = 1500m
        };
        _context.FolhasPagamento.Add(folha);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.Delete(f.Id);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().NotBeNull();
        badRequestResult.Value!.ToString().Should().Contain("folha de pagamento");

        var dbFunc = await _repository.GetByIdAsync(f.Id);
        dbFunc.Should().NotBeNull();
    }
}
