using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;
using SGPF.Infrastructure.Repositories;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class AfastamentosControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<Afastamento> _repository;
    private readonly AfastamentosController _controller;
    private readonly Guid _userId;
    private readonly Funcionario _funcionario;

    public AfastamentosControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _repository = new Repository<Afastamento>(_context);
        _controller = new AfastamentosController(_repository, _context);

        _userId = Guid.NewGuid();
        _funcionario = new Funcionario
        {
            Id = Guid.NewGuid(),
            Nome = "Func Teste Afastamento",
            CPF = "111.222.333-44",
            UsuarioId = _userId,
            Ativo = true
        };
        _context.Funcionarios.Add(_funcionario);
        _context.SaveChanges();

        // Configura Claims do usuário logado
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new(ClaimTypes.NameIdentifier, _userId.ToString()),
            new(ClaimTypes.Role, "Funcionario")
        }, "mock"));

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetMeusAfastamentos_ShouldReturnEmployeeAfastamentos()
    {
        // Arrange
        var a = new Afastamento
        {
            FuncionarioId = _funcionario.Id,
            DataInicio = DateTime.Today,
            DataFim = DateTime.Today.AddDays(2),
            Motivo = "Doença",
            Status = "Pendente",
            DataCriacao = DateTime.Now
        };
        _context.Afastamentos.Add(a);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetMeusAfastamentos();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<object>>().Subject.ToList();
        list.Should().HaveCount(1);
    }

    [Fact]
    public async Task RegistrarAfastamento_ShouldSetStatusPendente_ForRegularEmployee()
    {
        // Arrange
        var a = new Afastamento
        {
            DataInicio = DateTime.Today,
            DataFim = DateTime.Today.AddDays(1),
            Motivo = "Particular"
        };

        // Act
        var result = await _controller.RegistrarAfastamento(a);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Afastamento>().Subject;
        returned.Status.Should().Be("Pendente");
        returned.FuncionarioId.Should().Be(_funcionario.Id);
    }

    [Fact]
    public async Task RegistrarAfastamento_ShouldSetStatusAprovado_ForAdminOrGestor()
    {
        // Arrange - Simula usuário como Admin
        var adminUser = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new(ClaimTypes.NameIdentifier, _userId.ToString()),
            new(ClaimTypes.Role, "Admin")
        }, "mock"));
        _controller.ControllerContext.HttpContext.User = adminUser;

        var targetFunc = Guid.NewGuid();
        var a = new Afastamento
        {
            FuncionarioId = targetFunc,
            DataInicio = DateTime.Today,
            DataFim = DateTime.Today.AddDays(2),
            Motivo = "Falta"
        };

        // Act
        var result = await _controller.RegistrarAfastamento(a);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Afastamento>().Subject;
        returned.Status.Should().Be("Aprovado");
        returned.FuncionarioId.Should().Be(targetFunc);
    }

    [Fact]
    public async Task RegistrarAfastamento_ShouldReturnBadRequest_WhenStartDateAfterEndDate()
    {
        // Arrange
        var a = new Afastamento
        {
            DataInicio = DateTime.Today.AddDays(5),
            DataFim = DateTime.Today,
            Motivo = "Erro"
        };

        // Act
        var result = await _controller.RegistrarAfastamento(a);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.ToString().Should().Contain("Data de Início não pode ser maior");
    }

    [Fact]
    public async Task GetAllAfastamentos_ShouldReturnAll_ForAdminOrGestor()
    {
        // Arrange
        var adminUser = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new(ClaimTypes.NameIdentifier, _userId.ToString()),
            new(ClaimTypes.Role, "Admin")
        }, "mock"));
        _controller.ControllerContext.HttpContext.User = adminUser;

        var a = new Afastamento
        {
            FuncionarioId = _funcionario.Id,
            DataInicio = DateTime.Today,
            DataFim = DateTime.Today.AddDays(1),
            Motivo = "Congresso",
            Status = "Pendente",
            DataCriacao = DateTime.Now
        };
        _context.Afastamentos.Add(a);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAllAfastamentos();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<object>>().Subject.ToList();
        list.Should().HaveCount(1);
    }

    [Fact]
    public async Task AprovarAfastamento_ShouldSetStatusAprovado()
    {
        // Arrange
        var a = new Afastamento
        {
            FuncionarioId = _funcionario.Id,
            DataInicio = DateTime.Today,
            DataFim = DateTime.Today.AddDays(1),
            Motivo = "Congresso",
            Status = "Pendente",
            DataCriacao = DateTime.Now
        };
        _context.Afastamentos.Add(a);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.AprovarAfastamento(a.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Afastamento>().Subject;
        returned.Status.Should().Be("Aprovado");
    }

    [Fact]
    public async Task ReprovarAfastamento_ShouldSetStatusReprovado()
    {
        // Arrange
        var a = new Afastamento
        {
            FuncionarioId = _funcionario.Id,
            DataInicio = DateTime.Today,
            DataFim = DateTime.Today.AddDays(1),
            Motivo = "Congresso",
            Status = "Pendente",
            DataCriacao = DateTime.Now
        };
        _context.Afastamentos.Add(a);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.ReprovarAfastamento(a.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Afastamento>().Subject;
        returned.Status.Should().Be("Reprovado");
    }
}
