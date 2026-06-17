using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using SGPF.Application.Interfaces;
using SGPF.Application.Services;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;
using SGPF.Infrastructure.Repositories;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class PlanejamentoFeriasControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<PlanejamentoFerias> _repository;
    private readonly Repository<Funcionario> _funcRepository;
    private readonly Repository<Afastamento> _afastamentoRepository;
    private readonly PlanejamentoFeriasService _service;
    private readonly PlanejamentoFeriasController _controller;
    private readonly Funcionario _funcionario;

    public PlanejamentoFeriasControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _repository = new Repository<PlanejamentoFerias>(_context);
        _funcRepository = new Repository<Funcionario>(_context);
        _afastamentoRepository = new Repository<Afastamento>(_context);

        _service = new PlanejamentoFeriasService(_repository, _funcRepository, _afastamentoRepository);
        _controller = new PlanejamentoFeriasController(_service, NullLogger<PlanejamentoFeriasController>.Instance);

        // Funcionario admitido há 2 anos (período aquisitivo completo)
        _funcionario = new Funcionario
        {
            Id = Guid.NewGuid(),
            Nome = "Func Ferias",
            CPF = "123",
            Cargo = "Confeiteiro",
            SalarioBase = 3000m,
            DataAdmissao = DateTime.Today.AddYears(-2),
            Ativo = true
        };
        _context.Funcionarios.Add(_funcionario);
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetAll_ShouldReturnAllVacations()
    {
        // Arrange
        var p = new PlanejamentoFerias
        {
            FuncionarioId = _funcionario.Id,
            DataInicio = DateTime.Today.AddDays(40),
            DataFim = DateTime.Today.AddDays(70),
            DiasFerias = 30,
            Status = StatusPlanejamentoFerias.Planejada,
            DataCriacao = DateTime.Now
        };
        _context.PlanejamentosFerias.Add(p);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<PlanejamentoFeriasDto>>().Subject.ToList();
        list.Should().HaveCount(1);
    }

    [Fact]
    public async Task Create_ShouldCreateVacation_WhenRulesPass()
    {
        // Arrange
        var request = new CriarPlanejamentoFeriasRequest(
            FuncionarioId: _funcionario.Id,
            Parcelado: false,
            DataInicioP1: DateTime.Today.AddDays(35), // > 30 dias antecedência
            DiasDuracaoP1: 30,
            DataInicioP2: null,
            DiasDuracaoP2: null,
            DataInicioP3: null,
            DiasDuracaoP3: null,
            SolicitaAbono: false,
            DiasAbono: 0,
            SolicitaAdiantamentoDecimoTerceiro: false,
            Observacao: "Férias Integral"
        );

        // Act
        var result = await _controller.Create(request);

        // Assert
        var createdResult = result.Should().BeOfType<CreatedResult>().Subject;
        var list = createdResult.Value.Should().BeAssignableTo<IEnumerable<PlanejamentoFeriasDto>>().Subject.ToList();
        list.Should().HaveCount(1);
        list[0].DiasFerias.Should().Be(30);
    }

    [Fact]
    public async Task Create_ShouldReturnBadRequest_WhenAntecedenceFails()
    {
        // Arrange - DataInicio em 10 dias (< 30)
        var request = new CriarPlanejamentoFeriasRequest(
            FuncionarioId: _funcionario.Id,
            Parcelado: false,
            DataInicioP1: DateTime.Today.AddDays(10),
            DiasDuracaoP1: 30,
            DataInicioP2: null,
            DiasDuracaoP2: null,
            DataInicioP3: null,
            DiasDuracaoP3: null,
            SolicitaAbono: false,
            DiasAbono: 0,
            SolicitaAdiantamentoDecimoTerceiro: false,
            Observacao: "Erro Antecedência"
        );

        // Act
        var result = await _controller.Create(request);

        // Assert
        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.ToString().Should().Contain("mínimo 30 dias de antecedência");
    }

    [Fact]
    public async Task Create_ShouldReturnBadRequest_WhenAquisitivoFails()
    {
        // Arrange - Funcionário admitido há apenas 2 meses
        var novoFunc = new Funcionario
        {
            Id = Guid.NewGuid(),
            Nome = "Novo Func",
            CPF = "999",
            DataAdmissao = DateTime.Today.AddMonths(-2),
            Ativo = true
        };
        _context.Funcionarios.Add(novoFunc);
        await _context.SaveChangesAsync();

        var request = new CriarPlanejamentoFeriasRequest(
            FuncionarioId: novoFunc.Id,
            Parcelado: false,
            DataInicioP1: DateTime.Today.AddDays(35),
            DiasDuracaoP1: 30,
            DataInicioP2: null,
            DiasDuracaoP2: null,
            DataInicioP3: null,
            DiasDuracaoP3: null,
            SolicitaAbono: false,
            DiasAbono: 0,
            SolicitaAdiantamentoDecimoTerceiro: false,
            Observacao: "Erro Aquisitivo"
        );

        // Act
        var result = await _controller.Create(request);

        // Assert
        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.ToString().Should().Contain("ainda não completou o período aquisitivo");
    }

    [Fact]
    public async Task Cancelar_ShouldMarkStatusAsCancelada()
    {
        // Arrange
        var p = new PlanejamentoFerias
        {
            FuncionarioId = _funcionario.Id,
            DataInicio = DateTime.Today.AddDays(40),
            DataFim = DateTime.Today.AddDays(70),
            DiasFerias = 30,
            Status = StatusPlanejamentoFerias.Planejada,
            DataCriacao = DateTime.Now
        };
        _context.PlanejamentosFerias.Add(p);
        await _context.SaveChangesAsync();

        var request = new CancelarRequest("Mudança de planos");

        // Act
        var result = await _controller.Cancelar(p.Id, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.ToString().Should().Contain("cancelado com sucesso");

        var updated = await _repository.GetByIdAsync(p.Id);
        updated!.Status.Should().Be(StatusPlanejamentoFerias.Cancelada);
        updated.MotivoCancelamento.Should().Be("Mudança de planos");
    }

    [Fact]
    public async Task Aprovar_ShouldMarkStatusAsAprovada()
    {
        // Arrange
        var p = new PlanejamentoFerias
        {
            FuncionarioId = _funcionario.Id,
            DataInicio = DateTime.Today.AddDays(40),
            DataFim = DateTime.Today.AddDays(70),
            DiasFerias = 30,
            Status = StatusPlanejamentoFerias.Planejada,
            DataCriacao = DateTime.Now
        };
        _context.PlanejamentosFerias.Add(p);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.Aprovar(p.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.ToString().Should().Contain("aprovado com sucesso");

        var updated = await _repository.GetByIdAsync(p.Id);
        updated!.Status.Should().Be(StatusPlanejamentoFerias.Aprovada);
        updated.DataAprovacao.Should().NotBeNull();
    }
}
