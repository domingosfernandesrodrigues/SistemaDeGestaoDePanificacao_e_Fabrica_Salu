using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Application.Services;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;
using SGPF.Infrastructure.Repositories;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class FolhaPagamentoControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<FolhaPagamento> _repository;
    private readonly Repository<Funcionario> _funcRepo;
    private readonly Repository<RegistroPonto> _pontoRepo;
    private readonly Repository<ContaPagar> _contaPagarRepo;
    private readonly Repository<Afastamento> _afastamentoRepo;
    private readonly Repository<AgendaEvento> _agendaRepo;
    private readonly Repository<Empresa> _empresaRepo;
    private readonly Repository<PlanejamentoFerias> _feriasRepo;
    private readonly FolhaPagamentoService _service;
    private readonly FolhaPagamentoController _controller;
    private readonly Guid _userId;
    private readonly Funcionario _funcionario;

    public FolhaPagamentoControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _repository = new Repository<FolhaPagamento>(_context);
        _funcRepo = new Repository<Funcionario>(_context);
        _pontoRepo = new Repository<RegistroPonto>(_context);
        _contaPagarRepo = new Repository<ContaPagar>(_context);
        _afastamentoRepo = new Repository<Afastamento>(_context);
        _agendaRepo = new Repository<AgendaEvento>(_context);
        _empresaRepo = new Repository<Empresa>(_context);
        _feriasRepo = new Repository<PlanejamentoFerias>(_context);

        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

        var financeiroServiceMock = new Moq.Mock<SGPF.Application.Services.IFinanceiroService>();

        _service = new FolhaPagamentoService(
            _repository, _funcRepo, _pontoRepo, _contaPagarRepo,
            _afastamentoRepo, _agendaRepo, _empresaRepo, _feriasRepo,
            financeiroServiceMock.Object
        );

        _controller = new FolhaPagamentoController(_service, _repository);

        _userId = Guid.NewGuid();
        _funcionario = new Funcionario
        {
            Id = Guid.NewGuid(),
            Nome = "Funcionario Salu",
            CPF = "111",
            Cargo = "Ajudante",
            SalarioBase = 2000m,
            UsuarioId = _userId,
            Ativo = true
        };
        _context.Funcionarios.Add(_funcionario);
        _context.SaveChanges();

        // Configura Claims do usuário logado (Admin por padrão para os testes do gestor)
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new(ClaimTypes.NameIdentifier, _userId.ToString()),
            new(ClaimTypes.Role, "Admin")
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
    public async Task GetAll_ShouldReturnAllFolhas()
    {
        // Arrange
        var f = new FolhaPagamento
        {
            FuncionarioId = _funcionario.Id,
            MesReferencia = 5,
            AnoReferencia = 2026,
            SalarioBaseCalculado = 2000m,
            Status = StatusFolha.Aberta
        };
        _context.FolhasPagamento.Add(f);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAll(5, 2026, TipoFolha.Mensal);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<FolhaPagamento>>().Subject.ToList();
        list.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetComFuncionarios_ShouldReturnFolhasWithEmployeeNames()
    {
        // Arrange
        var f = new FolhaPagamento
        {
            FuncionarioId = _funcionario.Id,
            MesReferencia = 5,
            AnoReferencia = 2026,
            SalarioBaseCalculado = 2000m,
            Status = StatusFolha.Aberta
        };
        _context.FolhasPagamento.Add(f);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetComFuncionarios(_funcRepo, 5, 2026, TipoFolha.Mensal);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();
    }

    [Fact]
    public async Task GetMeusContracheques_ShouldReturnOnlyUserSheets()
    {
        // Arrange - Altera para usuário comum
        var normalUser = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new(ClaimTypes.NameIdentifier, _userId.ToString()),
            new(ClaimTypes.Role, "Funcionario")
        }, "mock"));
        _controller.ControllerContext.HttpContext.User = normalUser;

        var f = new FolhaPagamento
        {
            FuncionarioId = _funcionario.Id,
            MesReferencia = 5,
            AnoReferencia = 2026,
            SalarioBaseCalculado = 2000m,
            Status = StatusFolha.Aberta
        };
        _context.FolhasPagamento.Add(f);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetMeusContracheques(_funcRepo);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<FolhaPagamento>>().Subject.ToList();
        list.Should().HaveCount(1);
    }

    [Fact]
    public async Task Processar_ShouldCalculateAndCreateFolhas()
    {
        // Act
        var result = await _controller.Processar(5, 2026, TipoFolha.Mensal);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<FolhaPagamento>>().Subject.ToList();
        list.Should().HaveCount(1);
        list[0].SalarioBaseCalculado.Should().Be(2000m);
    }

    [Fact]
    public async Task Fechar_ShouldIntegrateWithFinanceiroAndCloseSheet()
    {
        // Arrange
        var f = new FolhaPagamento
        {
            FuncionarioId = _funcionario.Id,
            MesReferencia = 5,
            AnoReferencia = 2026,
            SalarioBaseCalculado = 2000m,
            SalarioLiquido = 1840m,
            Status = StatusFolha.Aberta
        };
        _context.FolhasPagamento.Add(f);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.Fechar(f.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<FolhaPagamento>().Subject;
        returned.Status.Should().Be(StatusFolha.Fechada);

        // Verifica integração com Contas a Pagar
        var contas = await _context.ContasPagar.ToListAsync();
        contas.Should().HaveCount(1);
        contas[0].Valor.Should().Be(1840m);
        contas[0].Categoria.Should().Be("Folha de Pagamento");
    }

    [Fact]
    public async Task GerarContracheque_ShouldReturnPdf_ForAuthorizedUser()
    {
        // Arrange - Folha gerada
        var f = new FolhaPagamento
        {
            FuncionarioId = _funcionario.Id,
            MesReferencia = 5,
            AnoReferencia = 2026,
            SalarioBaseCalculado = 2000m,
            Status = StatusFolha.Aberta
        };
        _context.FolhasPagamento.Add(f);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GerarContracheque(f.Id, _funcRepo);

        // Assert
        var fileResult = result.Should().BeOfType<FileContentResult>().Subject;
        fileResult.ContentType.Should().Be("application/pdf");
    }

    [Fact]
    public async Task GerarContracheque_ShouldReturnForbid_WhenEmployeeTriesToDownloadOthersPdf()
    {
        // Arrange - Folha gerada para outro funcionário
        var outroFuncId = Guid.NewGuid();
        var f = new FolhaPagamento
        {
            FuncionarioId = outroFuncId,
            MesReferencia = 5,
            AnoReferencia = 2026,
            SalarioBaseCalculado = 2000m,
            Status = StatusFolha.Aberta
        };
        _context.FolhasPagamento.Add(f);
        await _context.SaveChangesAsync();

        // Altera login para funcionário comum que não é o dono da folha
        var normalUser = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new(ClaimTypes.NameIdentifier, _userId.ToString()),
            new(ClaimTypes.Role, "Funcionario")
        }, "mock"));
        _controller.ControllerContext.HttpContext.User = normalUser;

        // Act
        var result = await _controller.GerarContracheque(f.Id, _funcRepo);

        // Assert
        result.Should().BeOfType<ForbidResult>();
    }
}
