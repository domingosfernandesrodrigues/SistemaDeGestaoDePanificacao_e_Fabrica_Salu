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

public class PontoControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<RegistroPonto> _repository;
    private readonly PontoController _controller;
    private readonly Guid _userId;
    private readonly Funcionario _funcionario;
    private readonly Empresa _empresa;

    public PontoControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _repository = new Repository<RegistroPonto>(_context);
        _controller = new PontoController(_repository, _context);

        _userId = Guid.NewGuid();

        // Configuração de Empresa Padrão (Latitude/Longitude para Geofencing)
        _empresa = new Empresa
        {
            Id = Guid.NewGuid(),
            NomeFantasia = "Panificadora Salu",
            CNPJ = "12345678000199",
            Latitude = -23.550520, // São Paulo - SP
            Longitude = -46.633308
        };
        _context.Empresas.Add(_empresa);

        // Configuração de Funcionário vinculado ao Usuário
        _funcionario = new Funcionario
        {
            Id = _userId, // Id igual ao do usuário simulado para corresponder à lógica do controller
            Nome = "Func Teste Ponto",
            CPF = "123.456.789-00",
            Cargo = "Auxiliar",
            UsuarioId = _userId,
            EmpresaId = _empresa.Id,
            Ativo = true
        };
        _context.Funcionarios.Add(_funcionario);
        _context.SaveChanges();

        // Configura Claims do usuário logado
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
    public async Task GetHoje_ShouldReturnEmptyList_WhenNoPointsToday()
    {
        // Act
        var result = await _controller.GetHoje();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<RegistroPonto>>().Subject;
        list.Should().BeEmpty();
    }

    [Fact]
    public async Task GetHoje_ShouldReturnTodayPoints_WhenTheyExist()
    {
        // Arrange
        var p1 = new RegistroPonto
        {
            FuncionarioId = _funcionario.Id,
            DataHoraEntrada = DateTime.Today.AddHours(8),
            DataHoraSaida = DateTime.Today.AddHours(12)
        };
        await _repository.AddAsync(p1);

        // Act
        var result = await _controller.GetHoje();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<RegistroPonto>>().Subject.ToList();
        list.Should().HaveCount(1);
        list[0].Id.Should().Be(p1.Id);
    }

    [Fact]
    public async Task GetHistorico_ShouldReturnGroupedRecords()
    {
        // Arrange
        var p1 = new RegistroPonto
        {
            FuncionarioId = _funcionario.Id,
            DataHoraEntrada = new DateTime(2026, 5, 10, 8, 0, 0),
            DataHoraSaida = new DateTime(2026, 5, 10, 12, 0, 0)
        };
        await _repository.AddAsync(p1);

        // Act
        var result = await _controller.GetHistorico(5, 2026);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();
    }

    [Fact]
    public async Task Registrar_ShouldReturnBadRequest_WhenUserNotLinkedToFuncionario()
    {
        // Arrange - Altera o contexto para um usuário sem funcionário vinculado
        var unknownUserId = Guid.NewGuid();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new(ClaimTypes.NameIdentifier, unknownUserId.ToString())
        }, "mock"));

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        // Act
        var result = await _controller.Registrar(new PontoRegistroDto());

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().NotBeNull();
        badRequestResult.Value!.ToString().Should().Contain("não está vinculado a um cadastro de funcionário");
    }

    [Fact]
    public async Task Registrar_ShouldCreateEntry_WhenGPSIsWithinRange()
    {
        // Arrange
        var dto = new PontoRegistroDto
        {
            Latitude = -23.550600, // Pertinho da empresa
            Longitude = -46.633400
        };

        // Act
        var result = await _controller.Registrar(dto);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.ToString().Should().Contain("entrada");

        var registros = await _repository.FindAsync(p => p.FuncionarioId == _funcionario.Id);
        registros.Should().HaveCount(1);
        registros.First().DataHoraSaida.Should().BeNull();
    }

    [Fact]
    public async Task Registrar_ShouldBlockFirstEntry_WhenGPSIsMissing()
    {
        // Arrange
        var dto = new PontoRegistroDto { Latitude = null, Longitude = null };

        // Act
        var result = await _controller.Registrar(dto);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.ToString().Should().Contain("coordenadas de localização (GPS) são obrigatórias");
    }

    [Fact]
    public async Task Registrar_ShouldBlockFirstEntry_WhenGPSIsOutsideRange()
    {
        // Arrange
        var dto = new PontoRegistroDto
        {
            Latitude = -23.600000, // Cerca de 5.5 km de distância
            Longitude = -46.650000
        };

        // Act
        var result = await _controller.Registrar(dto);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.ToString().Should().Contain("Você está fora do perímetro autorizado da empresa");
    }

    [Fact]
    public async Task Registrar_ShouldCloseEntry_WhenPointIsOpen()
    {
        // Arrange
        var aberto = new RegistroPonto
        {
            FuncionarioId = _funcionario.Id,
            DataHoraEntrada = DateTime.Now.AddHours(-4)
        };
        await _repository.AddAsync(aberto);

        // Act
        var result = await _controller.Registrar(new PontoRegistroDto());

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.ToString().Should().Contain("saída");

        var updated = await _repository.GetByIdAsync(aberto.Id);
        updated!.DataHoraSaida.Should().NotBeNull();
        updated.TotalHorasTrabalhadas.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task Registrar_ShouldBlock_WhenDailyLimitReached()
    {
        // Arrange - Cria 2 pontos completos de hoje
        var p1 = new RegistroPonto { FuncionarioId = _funcionario.Id, DataHoraEntrada = DateTime.Today.AddHours(8), DataHoraSaida = DateTime.Today.AddHours(12) };
        var p2 = new RegistroPonto { FuncionarioId = _funcionario.Id, DataHoraEntrada = DateTime.Today.AddHours(13), DataHoraSaida = DateTime.Today.AddHours(17) };
        await _repository.AddAsync(p1);
        await _repository.AddAsync(p2);

        var dto = new PontoRegistroDto
        {
            Latitude = -23.550520,
            Longitude = -46.633308
        };

        // Act
        var result = await _controller.Registrar(dto);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.ToString().Should().Contain("Limite diário atingido");
    }

    [Fact]
    public async Task Recalcular_ShouldComputeHoursSuccessfully()
    {
        // Arrange
        var p = new RegistroPonto
        {
            FuncionarioId = _funcionario.Id,
            DataHoraEntrada = new DateTime(2026, 5, 2, 8, 0, 0),
            DataHoraSaida = new DateTime(2026, 5, 2, 16, 0, 0),
            TotalHorasTrabalhadas = 0 // Força o recálculo
        };
        await _repository.AddAsync(p);

        // Act
        var result = await _controller.Recalcular(_funcionario.Id, 5, 2026);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.ToString().Should().Contain("registros recalculados");

        var updated = await _repository.GetByIdAsync(p.Id);
        updated!.TotalHorasTrabalhadas.Should().Be(8.0m);
    }

    [Fact]
    public async Task GetHistoricoFuncionario_ShouldReturnHistoricalRecords()
    {
        // Act
        var result = await _controller.GetHistoricoFuncionario(_funcionario.Id, 5, 2026);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();
    }
}
