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
using SGPF.Domain.Interfaces;
using SGPF.Infrastructure.Data;
using SGPF.Infrastructure.Repositories;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class LogisticaControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<Veiculo> _veiculoRepo;
    private readonly Repository<TrocaAvaria> _trocaRepo;
    private readonly Repository<Abastecimento> _abastRepo;
    private readonly Repository<ManutencaoVeiculo> _manuRepo;
    private readonly Repository<Produto> _produtoRepo;
    private readonly Repository<MovimentacaoEstoque> _estoqueRepo;
    private readonly Repository<ContaPagar> _pagarRepo;
    private readonly Repository<ContaBancaria> _contaBancariaRepo;
    private readonly Repository<MovimentacaoBancaria> _movimentacaoRepo;
    private readonly FrotaService _frotaService;
    private readonly TrocaService _trocaService;
    private readonly LogisticaController _controller;
    private readonly Guid _motoristaId = Guid.NewGuid();

    public LogisticaControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);

        _veiculoRepo = new Repository<Veiculo>(_context);
        _trocaRepo = new Repository<TrocaAvaria>(_context);
        _abastRepo = new Repository<Abastecimento>(_context);
        _manuRepo = new Repository<ManutencaoVeiculo>(_context);
        _produtoRepo = new Repository<Produto>(_context);
        _estoqueRepo = new Repository<MovimentacaoEstoque>(_context);
        _pagarRepo = new Repository<ContaPagar>(_context);
        _contaBancariaRepo = new Repository<ContaBancaria>(_context);
        _movimentacaoRepo = new Repository<MovimentacaoBancaria>(_context);

        _frotaService = new FrotaService(
            _abastRepo,
            _manuRepo,
            _veiculoRepo,
            _pagarRepo,
            _contaBancariaRepo,
            _movimentacaoRepo
        );

        _trocaService = new TrocaService(
            _trocaRepo,
            _produtoRepo,
            _estoqueRepo
        );

        _controller = new LogisticaController(
            _frotaService,
            _trocaService,
            _veiculoRepo,
            _trocaRepo
        );

        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new(ClaimTypes.Name, "MotoristaTest"),
            new(ClaimTypes.Role, "Motorista"),
            new("FuncionarioId", _motoristaId.ToString())
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
    public async Task GetVeiculos_ShouldReturnAllVeiculos()
    {
        // Arrange
        var v1 = new Veiculo { Placa = "AAA1234", Modelo = "Fiorino", CapacidadeCargaKg = 600m };
        var v2 = new Veiculo { Placa = "BBB5678", Modelo = "Ducato", CapacidadeCargaKg = 1500m };
        await _veiculoRepo.AddAsync(v1);
        await _veiculoRepo.AddAsync(v2);

        // Act
        var result = await _controller.GetVeiculos();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<Veiculo>>().Subject.ToList();
        list.Should().HaveCount(2);
    }

    [Fact]
    public async Task CreateVeiculo_ShouldAddNewVeiculo()
    {
        // Arrange
        var v = new Veiculo { Placa = "CCC9999", Modelo = "Strada", CapacidadeCargaKg = 700m };

        // Act
        var result = await _controller.CreateVeiculo(v);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Veiculo>().Subject;
        returned.Placa.Should().Be("CCC9999");

        var dbVeiculo = await _veiculoRepo.GetByIdAsync(returned.Id);
        dbVeiculo.Should().NotBeNull();
        dbVeiculo!.Modelo.Should().Be("Strada");
    }

    [Fact]
    public async Task ToggleStatus_ShouldInvertActiveFlag()
    {
        // Arrange
        var v = new Veiculo { Placa = "TST0001", Ativo = true };
        await _veiculoRepo.AddAsync(v);

        // Act
        var result = await _controller.ToggleStatus(v.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Veiculo>().Subject;
        returned.Ativo.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteVeiculo_ShouldRemove_WhenNoDependenciesExist()
    {
        // Arrange
        var v = new Veiculo { Placa = "SOL0001" };
        await _veiculoRepo.AddAsync(v);

        // Act
        var result = await _controller.DeleteVeiculo(v.Id, _abastRepo, _manuRepo);

        // Assert
        result.Should().BeOfType<NoContentResult>();
        var db = await _veiculoRepo.GetByIdAsync(v.Id);
        db.Should().BeNull();
    }

    [Fact]
    public async Task DeleteVeiculo_ShouldFail_WhenHasRefuelingHistory()
    {
        // Arrange
        var v = new Veiculo { Placa = "DEP0001" };
        await _veiculoRepo.AddAsync(v);

        var abast = new Abastecimento { VeiculoId = v.Id, Litros = 30m, ValorTotal = 150m };
        await _abastRepo.AddAsync(abast);

        // Act
        var result = await _controller.DeleteVeiculo(v.Id, _abastRepo, _manuRepo);

        // Assert
        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().NotBeNull();
        badRequest.Value!.ToString().Should().Contain("Não é possível excluir um veículo que já possui histórico");
    }

    [Fact]
    public async Task Abastecer_ShouldUpdateMileageAndDeductCash()
    {
        // Arrange
        var v = new Veiculo { Placa = "FRO0001", QuilometragemAtual = 1000m, Modelo = "Uno" };
        await _veiculoRepo.AddAsync(v);

        var bankAcc = new ContaBancaria { Nome = "Banco", SaldoAtual = 500m, Ativa = true, IsPadrao = true };
        await _contaBancariaRepo.AddAsync(bankAcc);

        var abast = new Abastecimento { VeiculoId = v.Id, QuilometragemRegistrada = 1200m, Litros = 40m, ValorTotal = 200m };

        // Act
        var result = await _controller.Abastecer(abast);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Abastecimento>().Subject;
        returned.Litros.Should().Be(40m);

        // Verify updated vehicle mileage
        var dbV = await _veiculoRepo.GetByIdAsync(v.Id);
        dbV!.QuilometragemAtual.Should().Be(1200m);

        // Verify bank balance is decremented
        var dbBank = await _contaBancariaRepo.GetByIdAsync(bankAcc.Id);
        dbBank!.SaldoAtual.Should().Be(300m); // 500 - 200

        // Verify financial accounts payable created as already Paid
        var bills = await _pagarRepo.GetAllAsync();
        bills.Should().ContainSingle();
        bills.First().Status.Should().Be(StatusContaPagar.Paga);
        bills.First().Valor.Should().Be(200m);
    }

    [Fact]
    public async Task RegistrarTroca_ShouldDeductProductStockAndCreateEntry()
    {
        // Arrange
        var prod = new Produto { Nome = "Biscoito Cebola 55g", QuantidadeEstoque = 50m, PrecoCusto = 3m };
        await _produtoRepo.AddAsync(prod);

        var client = new Cliente { NomeFantasia = "Supermercado X" };
        await _context.Clientes.AddAsync(client);
        await _context.SaveChangesAsync();

        var troca = new TrocaAvaria
        {
            ClienteId = client.Id,
            ProdutoId = prod.Id,
            Quantidade = 5m,
            Motivo = "Vencido"
        };

        // Act
        var result = await _controller.RegistrarTroca(troca);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<TrocaAvaria>().Subject;
        returned.MotoristaId.Should().Be(_motoristaId); // Preenchido automaticamente via claim do HttpContext

        // Verify stock is decremented
        var dbProd = await _produtoRepo.GetByIdAsync(prod.Id);
        dbProd!.QuantidadeEstoque.Should().Be(45m); // 50 - 5

        // Verify stock movement
        var moves = await _estoqueRepo.FindAsync(m => m.ProdutoId == prod.Id);
        moves.Should().ContainSingle();
        moves.First().Tipo.Should().Be(TipoMovimentacao.Saida);
        moves.First().Quantidade.Should().Be(5m);
        moves.First().Observacao.Should().Contain("Motivo: Vencido");
    }
}
