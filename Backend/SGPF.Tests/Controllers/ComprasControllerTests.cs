using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using SGPF.Application.DTOs;
using SGPF.Application.Interfaces;
using SGPF.Application.Services;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;
using SGPF.Infrastructure.Repositories;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class ComprasControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<Compra> _compraRepo;
    private readonly Repository<CompraItem> _itemRepo;
    private readonly Repository<Produto> _produtoRepo;
    private readonly Repository<Fornecedor> _fornecedorRepo;
    private readonly Repository<MovimentacaoEstoque> _movimentacaoRepo;
    private readonly Repository<ContaPagar> _pagarRepo;
    private readonly Repository<HistoricoPrecoProduto> _historicoRepo;
    private readonly CompraService _compraService;
    private readonly ComprasController _controller;

    public ComprasControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        
        _compraRepo = new Repository<Compra>(_context);
        _itemRepo = new Repository<CompraItem>(_context);
        _produtoRepo = new Repository<Produto>(_context);
        _fornecedorRepo = new Repository<Fornecedor>(_context);
        _movimentacaoRepo = new Repository<MovimentacaoEstoque>(_context);
        _pagarRepo = new Repository<ContaPagar>(_context);
        _historicoRepo = new Repository<HistoricoPrecoProduto>(_context);

        _compraService = new CompraService(
            _compraRepo,
            _itemRepo,
            _produtoRepo,
            _movimentacaoRepo,
            _pagarRepo,
            _historicoRepo
        );

        _controller = new ComprasController(
            _compraService,
            _fornecedorRepo,
            _itemRepo,
            _produtoRepo
        );
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task Get_ShouldReturnAllComprasAsResponseDtos()
    {
        // Arrange
        var forn = new Fornecedor { NomeFantasia = "Fornecedor Teste", RazaoSocial = "F Teste LTDA", CNPJ = "123" };
        await _fornecedorRepo.AddAsync(forn);

        var prod = new Produto { Nome = "Farinha", PrecoCusto = 10m, QuantidadeEstoque = 100m };
        await _produtoRepo.AddAsync(prod);

        var dto = new CompraDto
        {
            FornecedorId = forn.Id,
            Categoria = "Insumo",
            Observacao = "Compra mensal",
            Itens = new List<CompraItemDto>
            {
                new CompraItemDto { ProdutoId = prod.Id, Quantidade = 50, PrecoUnitario = 8.5m }
            }
        };

        var draft = await _compraService.CriarRascunhoAsync(dto);

        // Act
        var result = await _controller.Get(_pagarRepo);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<CompraResponseDto>>().Subject.ToList();
        list.Should().HaveCount(1);
        list[0].FornecedorNome.Should().Be("Fornecedor Teste");
        list[0].ProdutosResumo.Should().Contain("Farinha");
        list[0].TotalItens.Should().Be(50);
        list[0].ValorTotal.Should().Be(50 * 8.5m);
        list[0].IsPago.Should().BeFalse();
    }

    [Fact]
    public async Task GetById_ShouldReturnCompra_WhenExists()
    {
        // Arrange
        var c = new Compra { FornecedorId = Guid.NewGuid(), DataCompra = DateTime.Now, Status = StatusCompra.Rascunho };
        await _compraRepo.AddAsync(c);

        // Act
        var result = await _controller.Get(c.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Compra>().Subject;
        returned.Id.Should().Be(c.Id);
    }

    [Fact]
    public async Task GetById_ShouldReturnNotFound_WhenDoesNotExist()
    {
        // Act
        var result = await _controller.Get(Guid.NewGuid());

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Post_ShouldCreateDraftPurchase()
    {
        // Arrange
        var fornId = Guid.NewGuid();
        var prodId = Guid.NewGuid();
        var dto = new CompraDto
        {
            FornecedorId = fornId,
            Categoria = "Mercadoria",
            Observacao = "Teste Draft",
            Itens = new List<CompraItemDto>
            {
                new CompraItemDto { ProdutoId = prodId, Quantidade = 10, PrecoUnitario = 15m }
            }
        };

        // Act
        var result = await _controller.Post(dto);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Compra>().Subject;
        returned.Status.Should().Be(StatusCompra.Rascunho);
        returned.ValorTotal.Should().Be(150m);

        var dbCompra = await _compraRepo.GetByIdAsync(returned.Id);
        dbCompra.Should().NotBeNull();
        dbCompra!.Status.Should().Be(StatusCompra.Rascunho);
    }

    [Fact]
    public async Task Confirmar_ShouldUpdateEstoqueAndPriceAndCreateContaPagar()
    {
        // Arrange
        var forn = new Fornecedor { NomeFantasia = "Distribuidora", CNPJ = "1" };
        await _fornecedorRepo.AddAsync(forn);

        var prod = new Produto { Nome = "Trigo", PrecoCusto = 10m, QuantidadeEstoque = 100m };
        await _produtoRepo.AddAsync(prod);

        var dto = new CompraDto
        {
            FornecedorId = forn.Id,
            Categoria = "Insumo",
            Itens = new List<CompraItemDto>
            {
                new CompraItemDto { ProdutoId = prod.Id, Quantidade = 20m, PrecoUnitario = 12m } // Novo preço
            }
        };

        var draft = await _compraService.CriarRascunhoAsync(dto);

        // Act
        var result = await _controller.Confirmar(draft.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Compra>().Subject;
        returned.Status.Should().Be(StatusCompra.Confirmada);

        // Verify Product Stock & Cost Price
        var dbProd = await _produtoRepo.GetByIdAsync(prod.Id);
        dbProd!.QuantidadeEstoque.Should().Be(120m);
        dbProd.PrecoCusto.Should().Be(12m);

        // Verify Inventory Move
        var moves = await _movimentacaoRepo.FindAsync(m => m.ProdutoId == prod.Id);
        moves.Should().ContainSingle();
        moves.First().Tipo.Should().Be(TipoMovimentacao.Entrada);
        moves.First().Quantidade.Should().Be(20m);

        // Verify Price History
        var histories = await _historicoRepo.FindAsync(h => h.ProdutoId == prod.Id);
        histories.Should().ContainSingle();
        histories.First().PrecoAntigo.Should().Be(10m);
        histories.First().PrecoNovo.Should().Be(12m);

        // Verify Accounts Payable
        var bills = await _pagarRepo.GetAllAsync();
        bills.Should().ContainSingle();
        bills.First().FornecedorId.Should().Be(forn.Id);
        bills.First().Valor.Should().Be(240m);
        bills.First().Status.Should().Be(StatusContaPagar.Pendente);
    }

    [Fact]
    public async Task Pagar_ShouldInvokeFinanceiroServiceAndSetBillAsPaga()
    {
        // Arrange
        var forn = new Fornecedor { NomeFantasia = "Distribuidora 2", CNPJ = "2" };
        await _fornecedorRepo.AddAsync(forn);

        var prod = new Produto { Nome = "Açúcar", PrecoCusto = 5m, QuantidadeEstoque = 50m };
        await _produtoRepo.AddAsync(prod);

        var dto = new CompraDto
        {
            FornecedorId = forn.Id,
            Categoria = "Mercadoria",
            Itens = new List<CompraItemDto>
            {
                new CompraItemDto { ProdutoId = prod.Id, Quantidade = 10m, PrecoUnitario = 5m }
            }
        };

        var draft = await _compraService.CriarRascunhoAsync(dto);
        var confirmed = await _compraService.ConfirmarCompraAsync(draft.Id);

        var tag = $"Compra #{confirmed.Id.ToString().Substring(0, 8)}";
        var bill = (await _pagarRepo.FindAsync(p => p.Descricao.Contains(tag))).First();

        var mockFinService = new Mock<IFinanceiroService>();
        mockFinService.Setup(f => f.BaixarContaPagarAsync(bill.Id))
            .Callback<Guid>(id => 
            {
                bill.Status = StatusContaPagar.Paga;
                bill.DataPagamento = DateTime.Now;
                _pagarRepo.UpdateAsync(bill).Wait();
            })
            .ReturnsAsync((string?)null);

        // Act
        var result = await _controller.Pagar(confirmed.Id, mockFinService.Object, _pagarRepo);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        mockFinService.Verify(f => f.BaixarContaPagarAsync(bill.Id), Times.Once);

        var dbBill = await _pagarRepo.GetByIdAsync(bill.Id);
        dbBill!.Status.Should().Be(StatusContaPagar.Paga);
    }

    [Fact]
    public async Task Put_ShouldUpdateDraft()
    {
        // Arrange
        var fornId = Guid.NewGuid();
        var prod1 = new Produto { Nome = "P1", PrecoCusto = 10 };
        var prod2 = new Produto { Nome = "P2", PrecoCusto = 20 };
        await _produtoRepo.AddAsync(prod1);
        await _produtoRepo.AddAsync(prod2);

        var dto1 = new CompraDto
        {
            FornecedorId = fornId,
            Itens = new List<CompraItemDto> { new CompraItemDto { ProdutoId = prod1.Id, Quantidade = 5, PrecoUnitario = 10 } }
        };

        var draft = await _compraService.CriarRascunhoAsync(dto1);
        _context.Entry(draft).State = EntityState.Detached;

        var dto2 = new CompraDto
        {
            FornecedorId = fornId,
            Observacao = "Updated note",
            Itens = new List<CompraItemDto> { new CompraItemDto { ProdutoId = prod2.Id, Quantidade = 3, PrecoUnitario = 20 } }
        };

        // Act
        var result = await _controller.Put(draft.Id, dto2);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Compra>().Subject;
        returned.Observacao.Should().Be("Updated note");
        returned.ValorTotal.Should().Be(60m);

        var items = await _itemRepo.FindAsync(i => i.CompraId == draft.Id);
        items.Should().ContainSingle();
        items.First().ProdutoId.Should().Be(prod2.Id);
    }

    [Fact]
    public async Task Delete_ShouldRemoveDraft()
    {
        // Arrange
        var fornId = Guid.NewGuid();
        var dto = new CompraDto
        {
            FornecedorId = fornId,
            Itens = new List<CompraItemDto>()
        };
        var draft = await _compraService.CriarRascunhoAsync(dto);

        // Act
        var result = await _controller.Delete(draft.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();
        var dbCompra = await _compraRepo.GetByIdAsync(draft.Id);
        dbCompra.Should().BeNull();
    }
}
