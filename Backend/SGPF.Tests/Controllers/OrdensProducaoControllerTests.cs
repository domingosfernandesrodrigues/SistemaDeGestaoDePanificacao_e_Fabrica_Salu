using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Application.Interfaces;
using SGPF.Application.Services;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;
using SGPF.Infrastructure.Data;
using SGPF.Infrastructure.Repositories;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class OrdensProducaoControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<OrdemProducao> _repository;
    private readonly Repository<FichaTecnica> _fichaRepository;
    private readonly Repository<MovimentacaoEstoque> _estoqueRepository;
    private readonly Repository<Produto> _produtoRepository;
    private readonly Repository<HistoricoPrecoProduto> _historicoRepository;
    private readonly OrdemProducaoService _opService;
    private readonly OrdensProducaoController _controller;
    private readonly Guid _userId = Guid.NewGuid();

    public OrdensProducaoControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        
        _repository = new Repository<OrdemProducao>(_context);
        _fichaRepository = new Repository<FichaTecnica>(_context);
        _estoqueRepository = new Repository<MovimentacaoEstoque>(_context);
        _produtoRepository = new Repository<Produto>(_context);
        _historicoRepository = new Repository<HistoricoPrecoProduto>(_context);

        _opService = new OrdemProducaoService(
            _repository,
            _fichaRepository,
            _estoqueRepository,
            _produtoRepository,
            _historicoRepository
        );

        _controller = new OrdensProducaoController(_repository, _opService, _context);

        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new(ClaimTypes.Name, "GestorTest"),
            new(ClaimTypes.NameIdentifier, _userId.ToString()),
            new(ClaimTypes.Role, "Gestor")
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
    public async Task GetAll_ShouldReturnAllOps_OrderedByDataAberturaDesc()
    {
        // Arrange
        var prod = new Produto { Nome = "Pão Frances", Tipo = TipoProduto.ProdutoAcabado };
        _context.Produtos.Add(prod);

        var op1 = new OrdemProducao { ProdutoId = prod.Id, QuantidadePlanejada = 100, DataAbertura = DateTime.Now.AddHours(-1) };
        var op2 = new OrdemProducao { ProdutoId = prod.Id, QuantidadePlanejada = 200, DataAbertura = DateTime.Now };
        _context.OrdensProducao.AddRange(op1, op2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<OrdemProducao>>().Subject.ToList();
        list.Should().HaveCount(2);
        list[0].QuantidadePlanejada.Should().Be(200); // Mais recente primeiro
    }

    [Fact]
    public async Task Create_ShouldCreateOpInPlanejadaStatus_WithLoggedUser()
    {
        // Arrange
        var prod = new Produto { Nome = "Bolo Cenoura", Tipo = TipoProduto.ProdutoAcabado };
        _context.Produtos.Add(prod);
        await _context.SaveChangesAsync();

        var op = new OrdemProducao { ProdutoId = prod.Id, QuantidadePlanejada = 10 };

        // Act
        var result = await _controller.Create(op);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<OrdemProducao>().Subject;
        returned.Status.Should().Be(StatusOrdemProducao.Planejada);
        returned.UsuarioPlanejouId.Should().Be(_userId);

        var dbOp = await _repository.GetByIdAsync(returned.Id);
        dbOp.Should().NotBeNull();
        dbOp!.Status.Should().Be(StatusOrdemProducao.Planejada);
    }

    [Fact]
    public async Task Start_ShouldTransitionToEmAndamentoAndReserveStock()
    {
        // Arrange
        var finishedProd = new Produto { Nome = "Pão Sovado", QuantidadeEstoque = 0, PrecoCusto = 2m };
        var rawMaterial = new Produto { Nome = "Farinha Especial", QuantidadeEstoque = 100m, PrecoCusto = 4m };
        _context.Produtos.AddRange(finishedProd, rawMaterial);

        var ft = new FichaTecnica { ProdutoId = finishedProd.Id, RendimentoPadrao = 10 };
        _context.FichasTecnicas.Add(ft);

        var op = new OrdemProducao 
        { 
            ProdutoId = finishedProd.Id, 
            QuantidadePlanejada = 50, 
            Status = StatusOrdemProducao.Planejada 
        };
        var opInsumo = new OrdemProducaoInsumo 
        { 
            OrdemProducaoId = op.Id, 
            InsumoId = rawMaterial.Id, 
            QuantidadePlanejada = 25m 
        };
        op.Insumos.Add(opInsumo);

        _context.OrdensProducao.Add(op);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.Start(op.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<OrdemProducao>().Subject;
        returned.Status.Should().Be(StatusOrdemProducao.EmAndamento);
        returned.UsuarioIniciouId.Should().Be(_userId);

        // Verify stock deducted for the raw material
        var dbMaterial = await _produtoRepository.GetByIdAsync(rawMaterial.Id);
        dbMaterial!.QuantidadeEstoque.Should().Be(75m); // 100 - 25

        // Verify stock reservation move
        var moves = await _estoqueRepository.FindAsync(m => m.ProdutoId == rawMaterial.Id);
        moves.Should().ContainSingle();
        moves.First().Tipo.Should().Be(TipoMovimentacao.Reserva);
        moves.First().Quantidade.Should().Be(25m);
    }

    [Fact]
    public async Task Finish_ShouldTransitionToFinalizadaAndCalculateCustoTotalAndGiveEntrada()
    {
        // Arrange
        var finishedProd = new Produto { Nome = "Brioche", QuantidadeEstoque = 0, PrecoCusto = 0m };
        var rawMaterial = new Produto { Nome = "Manteiga", QuantidadeEstoque = 50m, PrecoCusto = 10m };
        _context.Produtos.AddRange(finishedProd, rawMaterial);

        var op = new OrdemProducao 
        { 
            ProdutoId = finishedProd.Id, 
            QuantidadePlanejada = 10,
            QuantidadeRealizada = 0,
            Status = StatusOrdemProducao.EmAndamento,
            UsuarioIniciouId = _userId
        };
        var opInsumo = new OrdemProducaoInsumo 
        { 
            OrdemProducaoId = op.Id, 
            InsumoId = rawMaterial.Id, 
            QuantidadePlanejada = 5m,
            QuantidadeConsumida = 0m
        };
        op.Insumos.Add(opInsumo);

        _context.OrdensProducao.Add(op);
        await _context.SaveChangesAsync();

        // Simulate real consumption
        var consumidos = new List<OrdemProducaoInsumo>
        {
            new() { InsumoId = rawMaterial.Id, QuantidadePlanejada = 5m, QuantidadeConsumida = 6m } // Consumido 1 extra
        };

        // Act
        var result = await _controller.Finish(op.Id, consumidos);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<OrdemProducao>().Subject;
        returned.Status.Should().Be(StatusOrdemProducao.Finalizada);
        returned.UsuarioFinalizouId.Should().Be(_userId);
        returned.CustoTotalCalculado.Should().Be(60m); // 6kg * 10/kg

        // Verify stock updates
        var dbMaterial = await _produtoRepository.GetByIdAsync(rawMaterial.Id);
        // Em StartOPAsync, o planejado de 5m teria sido deduzido.
        // Em FinishOPAsync, a diferença (6m - 5m = 1m) é deduzida.
        // Como não rodamos StartOPAsync neste teste isolado (criamos diretamente como EmAndamento),
        // o estoque final deve refletir apenas a dedução da diferença: 50m - 1m = 49m
        dbMaterial!.QuantidadeEstoque.Should().Be(49m);

        var dbFinished = await _produtoRepository.GetByIdAsync(finishedProd.Id);
        dbFinished!.QuantidadeEstoque.Should().Be(10m); // Entrada de 10 brioches
        dbFinished.PrecoCusto.Should().Be(6m); // 60 total / 10 unidades

        // Verify finished product price history
        var priceHist = await _historicoRepository.FindAsync(h => h.ProdutoId == finishedProd.Id);
        priceHist.Should().ContainSingle();
        priceHist.First().PrecoNovo.Should().Be(6m);
    }

    [Fact]
    public async Task Update_ShouldSucceedForPlanejada_AndFailForEmAndamento()
    {
        // Arrange
        var prod1 = new Produto { Nome = "Pão Doce" };
        var prod2 = new Produto { Nome = "Pão Salgado" };
        _context.Produtos.AddRange(prod1, prod2);

        var opPlanejada = new OrdemProducao { ProdutoId = prod1.Id, QuantidadePlanejada = 50, Status = StatusOrdemProducao.Planejada };
        var opAndamento = new OrdemProducao { ProdutoId = prod1.Id, QuantidadePlanejada = 50, Status = StatusOrdemProducao.EmAndamento };
        _context.OrdensProducao.AddRange(opPlanejada, opAndamento);
        await _context.SaveChangesAsync();

        _context.Entry(opPlanejada).State = EntityState.Detached;
        _context.Entry(opAndamento).State = EntityState.Detached;

        var updateDto = new OrdemProducao { ProdutoId = prod2.Id, QuantidadePlanejada = 60 };

        // Act 1: Update Planejada
        var result1 = await _controller.Update(opPlanejada.Id, updateDto);
        result1.Should().BeOfType<OkObjectResult>();

        var dbOp1 = await _repository.GetByIdAsync(opPlanejada.Id);
        dbOp1!.QuantidadePlanejada.Should().Be(60);
        dbOp1.ProdutoId.Should().Be(prod2.Id);

        // Act 2: Update EmAndamento
        var result2 = await _controller.Update(opAndamento.Id, updateDto);
        result2.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Delete_ShouldRemovePlanejadaOp_AndFailForEmAndamento()
    {
        // Arrange
        var prod = new Produto { Nome = "Croissant" };
        _context.Produtos.Add(prod);

        var opPlanejada = new OrdemProducao { ProdutoId = prod.Id, Status = StatusOrdemProducao.Planejada };
        var opAndamento = new OrdemProducao { ProdutoId = prod.Id, Status = StatusOrdemProducao.EmAndamento };
        _context.OrdensProducao.AddRange(opPlanejada, opAndamento);
        await _context.SaveChangesAsync();

        // Act 1: Delete Planejada
        var result1 = await _controller.Delete(opPlanejada.Id);
        result1.Should().BeOfType<NoContentResult>();

        var dbOp1 = await _context.OrdensProducao.FindAsync(opPlanejada.Id);
        dbOp1.Should().BeNull();

        // Act 2: Delete EmAndamento
        var result2 = await _controller.Delete(opAndamento.Id);
        result2.Should().BeOfType<BadRequestObjectResult>();

        var dbOp2 = await _context.OrdensProducao.FindAsync(opAndamento.Id);
        dbOp2.Should().NotBeNull();
    }
}
