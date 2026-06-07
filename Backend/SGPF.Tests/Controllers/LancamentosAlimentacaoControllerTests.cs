using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using SGPF.Application.Services;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;
using SGPF.Infrastructure.Repositories;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class LancamentosAlimentacaoControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<LancamentoAlimentacao> _alimentacaoRepo;
    private readonly Repository<ContaPagar> _contaPagarRepo;
    private readonly Mock<IFinanceiroService> _financeiroServiceMock;
    private readonly LancamentosAlimentacaoController _controller;
    private readonly Guid _userId;
    private readonly Funcionario _funcionario;

    public LancamentosAlimentacaoControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _alimentacaoRepo = new Repository<LancamentoAlimentacao>(_context);
        _contaPagarRepo = new Repository<ContaPagar>(_context);
        _financeiroServiceMock = new Mock<IFinanceiroService>();

        _controller = new LancamentosAlimentacaoController(
            _alimentacaoRepo,
            _contaPagarRepo,
            _context,
            _financeiroServiceMock.Object
        );

        _userId = Guid.NewGuid();
        _funcionario = new Funcionario
        {
            Id = Guid.NewGuid(),
            Nome = "Funcionario Faminto",
            CPF = "222",
            UsuarioId = _userId,
            Ativo = true
        };
        _context.Funcionarios.Add(_funcionario);
        _context.SaveChanges();

        // Configura Claims do usuário logado (Funcionario por padrão)
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
    public async Task GetMeusLancamentos_ShouldReturnOnlyUserLaunches()
    {
        // Arrange
        var l = new LancamentoAlimentacao
        {
            FuncionarioId = _funcionario.Id,
            Data = DateTime.Today,
            TipoRefeicao = "Almoço",
            Valor = 25m,
            DataCriacao = DateTime.Now
        };
        _context.LancamentosAlimentacao.Add(l);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetMeusLancamentos();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<object>>().Subject.ToList();
        list.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetAll_ShouldReturnAllLaunches_ForAdminOrGestor()
    {
        // Arrange - Simula Admin
        var adminUser = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new(ClaimTypes.NameIdentifier, _userId.ToString()),
            new(ClaimTypes.Role, "Admin")
        }, "mock"));
        _controller.ControllerContext.HttpContext.User = adminUser;

        var l = new LancamentoAlimentacao
        {
            FuncionarioId = _funcionario.Id,
            Data = DateTime.Today,
            TipoRefeicao = "Café da Manhã",
            Valor = 10m,
            DataCriacao = DateTime.Now
        };
        _context.LancamentosAlimentacao.Add(l);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<object>>().Subject.ToList();
        list.Should().HaveCount(1);
    }

    [Fact]
    public async Task Create_ShouldRegisterMeal_AndGeneratePendingContaPagar_WithNoDueDate()
    {
        // Arrange
        var l = new LancamentoAlimentacao
        {
            Data = DateTime.Today,
            TipoRefeicao = "Jantar",
            Valor = 30m
        };

        // Act
        var result = await _controller.Create(l);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<LancamentoAlimentacao>().Subject;
        returned.FuncionarioId.Should().Be(_funcionario.Id);
        returned.ContaPagarId.Should().NotBeNull();

        // Verifica ContaPagar criada
        var conta = await _contaPagarRepo.GetByIdAsync(returned.ContaPagarId!.Value);
        conta.Should().NotBeNull();
        conta!.Valor.Should().Be(30m);
        conta.Status.Should().Be(StatusContaPagar.Pendente);
        conta.DataVencimento.Should().BeNull(); // Sem data de vencimento
        conta.Categoria.Should().Be("Alimentação");
    }

    [Fact]
    public async Task Create_ShouldReturnBadRequest_WhenMealValueIsZeroOrNegative()
    {
        // Arrange
        var l = new LancamentoAlimentacao
        {
            Data = DateTime.Today,
            TipoRefeicao = "Almoço",
            Valor = 0m
        };

        // Act
        var result = await _controller.Create(l);

        // Assert
        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.ToString().Should().Contain("deve ser maior que zero");
    }

    [Fact]
    public async Task Create_ShouldReturnBadRequest_WhenMealTypeIsEmpty()
    {
        // Arrange
        var l = new LancamentoAlimentacao
        {
            Data = DateTime.Today,
            TipoRefeicao = "",
            Valor = 15m
        };

        // Act
        var result = await _controller.Create(l);

        // Assert
        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.ToString().Should().Contain("tipo de refeição deve ser informado");
    }

    [Fact]
    public async Task PagarRefeicao_ShouldCallFinanceiroServiceToPay()
    {
        // Arrange - Simula Admin
        var adminUser = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new(ClaimTypes.NameIdentifier, _userId.ToString()),
            new(ClaimTypes.Role, "Admin")
        }, "mock"));
        _controller.ControllerContext.HttpContext.User = adminUser;

        var conta = new ContaPagar
        {
            Descricao = "Almoço",
            Valor = 20m,
            Status = StatusContaPagar.Pendente
        };
        await _contaPagarRepo.AddAsync(conta);

        var l = new LancamentoAlimentacao
        {
            FuncionarioId = _funcionario.Id,
            Data = DateTime.Today,
            TipoRefeicao = "Almoço",
            Valor = 20m,
            ContaPagarId = conta.Id
        };
        _context.LancamentosAlimentacao.Add(l);
        await _context.SaveChangesAsync();

        _financeiroServiceMock.Setup(f => f.BaixarContaPagarAsync(conta.Id))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _controller.PagarRefeicao(l.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.ToString().Should().Contain("Refeição paga com sucesso");
        _financeiroServiceMock.Verify(f => f.BaixarContaPagarAsync(conta.Id), Times.Once);
    }

    [Fact]
    public async Task Delete_ShouldRemoveMealAndPendingExpense()
    {
        // Arrange - Simula Admin
        var adminUser = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new(ClaimTypes.NameIdentifier, _userId.ToString()),
            new(ClaimTypes.Role, "Admin")
        }, "mock"));
        _controller.ControllerContext.HttpContext.User = adminUser;

        var conta = new ContaPagar
        {
            Descricao = "Refeição",
            Valor = 15m,
            Status = StatusContaPagar.Pendente
        };
        await _contaPagarRepo.AddAsync(conta);

        var l = new LancamentoAlimentacao
        {
            FuncionarioId = _funcionario.Id,
            Data = DateTime.Today,
            TipoRefeicao = "Refeição",
            Valor = 15m,
            ContaPagarId = conta.Id
        };
        _context.LancamentosAlimentacao.Add(l);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.Delete(l.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        var dbLaunch = await _context.LancamentosAlimentacao.FindAsync(l.Id);
        dbLaunch.Should().BeNull();

        var dbConta = await _contaPagarRepo.GetByIdAsync(conta.Id);
        dbConta.Should().BeNull(); // Deletada por estar pendente
    }
}
