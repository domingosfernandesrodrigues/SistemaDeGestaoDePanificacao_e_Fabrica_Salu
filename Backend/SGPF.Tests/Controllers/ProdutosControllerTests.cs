using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Security.Principal;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class ProdutosControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly ProdutosController _controller;

    public ProdutosControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _controller = new ProdutosController(_context);

        // Setup a mock user context for checking audit names
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new(ClaimTypes.Name, "TestUser"),
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
    public async Task GetAll_ShouldReturnAllProducts_OrderedByNome()
    {
        // Arrange
        var p1 = new Produto { Nome = "Biscoito B", Tipo = TipoProduto.Revenda };
        var p2 = new Produto { Nome = "Biscoito A", Tipo = TipoProduto.ProdutoAcabado };
        _context.Produtos.AddRange(p1, p2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var products = okResult.Value.Should().BeAssignableTo<IEnumerable<Produto>>().Subject.ToList();

        products.Should().HaveCount(2);
        products[0].Nome.Should().Be("Biscoito A");
        products[1].Nome.Should().Be("Biscoito B");
    }

    [Fact]
    public async Task GetById_ShouldReturnProduct_WhenProductExists()
    {
        // Arrange
        var p = new Produto { Nome = "Pão Integral 500g" };
        _context.Produtos.Add(p);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetById(p.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Produto>().Subject;
        returned.Id.Should().Be(p.Id);
        returned.Nome.Should().Be("Pão Integral 500g");
    }

    [Fact]
    public async Task GetById_ShouldReturnNotFound_WhenProductDoesNotExist()
    {
        // Act
        var result = await _controller.GetById(Guid.NewGuid());

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Create_ShouldAddProductToDatabase()
    {
        // Arrange
        var p = new Produto { Nome = "Pão de Hambúrguer", PrecoVenda = 9.99m };

        // Act
        var result = await _controller.Create(p);

        // Assert
        var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var returned = createdResult.Value.Should().BeOfType<Produto>().Subject;
        returned.Nome.Should().Be("Pão de Hambúrguer");

        var dbProduct = await _context.Produtos.FindAsync(p.Id);
        dbProduct.Should().NotBeNull();
        dbProduct!.Nome.Should().Be("Pão de Hambúrguer");
    }

    [Fact]
    public async Task Update_ShouldModifyProductFieldsAndCreatePriceHistory()
    {
        // Arrange
        var p = new Produto { Nome = "Pão de Leite", PrecoCusto = 3.00m, PrecoVenda = 5.00m };
        _context.Produtos.Add(p);
        await _context.SaveChangesAsync();

        // Detach existing to simulate real Web API input mapping and prevent tracking conflicts
        _context.Entry(p).State = EntityState.Detached;

        var updated = new Produto
        {
            Id = p.Id,
            Nome = "Pão de Leite Atualizado",
            PrecoCusto = 4.00m, // Changed
            PrecoVenda = 7.00m, // Changed
            QuantidadeEstoque = 100m,
            Ativo = true
        };

        // Act
        var result = await _controller.Update(p.Id, updated);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        var dbProduct = await _context.Produtos.FindAsync(p.Id);
        dbProduct.Should().NotBeNull();
        dbProduct!.Nome.Should().Be("Pão de Leite Atualizado");
        dbProduct.PrecoCusto.Should().Be(4.00m);
        dbProduct.PrecoVenda.Should().Be(7.00m);

        // Verify Price History creation
        var history = await _context.HistoricoPrecos.Where(h => h.ProdutoId == p.Id).ToListAsync();
        history.Should().HaveCount(2);

        var costHistory = history.First(h => h.Tipo == TipoPrecoHistorico.Custo);
        costHistory.PrecoAntigo.Should().Be(3.00m);
        costHistory.PrecoNovo.Should().Be(4.00m);
        costHistory.UsuarioNome.Should().Be("TestUser");

        var saleHistory = history.First(h => h.Tipo == TipoPrecoHistorico.Venda);
        saleHistory.PrecoAntigo.Should().Be(5.00m);
        saleHistory.PrecoNovo.Should().Be(7.00m);
        saleHistory.UsuarioNome.Should().Be("TestUser");
    }

    [Fact]
    public async Task ToggleStatus_ShouldInvertProductActiveStatus()
    {
        // Arrange
        var p = new Produto { Nome = "Bolo Cenoura", Ativo = true };
        _context.Produtos.Add(p);
        await _context.SaveChangesAsync();

        // Act & Assert 1 (Toggle off)
        var result1 = await _controller.ToggleStatus(p.Id);
        var okResult1 = result1.Should().BeOfType<OkObjectResult>().Subject;
        var val1 = okResult1.Value;
        val1.Should().NotBeNull();
        val1!.GetType().GetProperty("ativo")?.GetValue(val1, null).Should().Be(false);

        var dbProduct1 = await _context.Produtos.FindAsync(p.Id);
        dbProduct1!.Ativo.Should().BeFalse();

        // Act & Assert 2 (Toggle on)
        var result2 = await _controller.ToggleStatus(p.Id);
        var okResult2 = result2.Should().BeOfType<OkObjectResult>().Subject;
        var val2 = okResult2.Value;
        val2.Should().NotBeNull();
        val2!.GetType().GetProperty("ativo")?.GetValue(val2, null).Should().Be(true);

        var dbProduct2 = await _context.Produtos.FindAsync(p.Id);
        dbProduct2!.Ativo.Should().BeTrue();
    }

    [Fact]
    public async Task Delete_ShouldRemoveProduct_WhenProductHasNoHistory()
    {
        // Arrange
        var p = new Produto { Nome = "Doce de Leite" };
        _context.Produtos.Add(p);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.Delete(p.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        var dbProduct = await _context.Produtos.FindAsync(p.Id);
        dbProduct.Should().BeNull();
    }

    [Fact]
    public async Task Delete_ShouldReturnBadRequest_WhenProductHasStockHistory()
    {
        // Arrange
        var p = new Produto { Nome = "Pão de Forma" };
        _context.Produtos.Add(p);
        await _context.SaveChangesAsync();

        // Add dependent Stock Movement
        var movement = new MovimentacaoEstoque
        {
            ProdutoId = p.Id,
            Quantidade = 10m,
            Tipo = TipoMovimentacao.Entrada,
            Origem = "Produção Diária",
            Observacao = "Produção Diária",
            DataMovimentacao = DateTime.UtcNow
        };
        _context.MovimentacoesEstoque.Add(movement);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.Delete(p.Id);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().NotBeNull();
        badRequestResult.Value!.ToString().Should().Contain("Não é possível excluir este produto pois ele possui histórico no sistema");

        var dbProduct = await _context.Produtos.FindAsync(p.Id);
        dbProduct.Should().NotBeNull();
    }
}
