using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class FichaTecnicaControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly FichaTecnicaController _controller;

    public FichaTecnicaControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _controller = new FichaTecnicaController(_context);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetAll_ShouldReturnAllFichasWithIncludedProductsAndInsumos()
    {
        // Arrange
        var p1 = new Produto { Nome = "Pão Integral" };
        var p2 = new Produto { Nome = "Farinha Integral", Tipo = TipoProduto.Insumo };
        _context.Produtos.AddRange(p1, p2);
        await _context.SaveChangesAsync();

        var ficha = new FichaTecnica
        {
            ProdutoId = p1.Id,
            RendimentoPadrao = 10m,
            Insumos = new List<FichaTecnicaInsumo>
            {
                new() { InsumoId = p2.Id, QuantidadeNecessaria = 5m }
            }
        };
        _context.FichasTecnicas.Add(ficha);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<FichaTecnica>>().Subject.ToList();

        list.Should().HaveCount(1);
        list[0].Produto.Should().NotBeNull();
        list[0].Produto!.Nome.Should().Be("Pão Integral");
        list[0].Insumos.Should().HaveCount(1);
        list[0].Insumos.First().Insumo.Should().NotBeNull();
        list[0].Insumos.First().Insumo!.Nome.Should().Be("Farinha Integral");
    }

    [Fact]
    public async Task GetByProduto_ShouldReturnFicha_WhenFichaExistsForProduct()
    {
        // Arrange
        var p = new Produto { Nome = "Pão de Forma" };
        _context.Produtos.Add(p);
        await _context.SaveChangesAsync();

        var ficha = new FichaTecnica { ProdutoId = p.Id, RendimentoPadrao = 20m };
        _context.FichasTecnicas.Add(ficha);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetByProduto(p.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<FichaTecnica>().Subject;
        returned.ProdutoId.Should().Be(p.Id);
        returned.RendimentoPadrao.Should().Be(20m);
    }

    [Fact]
    public async Task GetByProduto_ShouldReturnNotFound_WhenFichaDoesNotExistForProduct()
    {
        // Act
        var result = await _controller.GetByProduto(Guid.NewGuid());

        // Assert
        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().NotBeNull();
        notFoundResult.Value!.ToString().Should().Contain("Ficha técnica não encontrada para este produto.");
    }

    [Fact]
    public async Task Save_ShouldCreateNewFicha_WhenFichaDoesNotExist()
    {
        // Arrange
        var p = new Produto { Nome = "Pão Leite" };
        var insumo = new Produto { Nome = "Leite Integrado", Tipo = TipoProduto.Insumo };
        _context.Produtos.AddRange(p, insumo);
        await _context.SaveChangesAsync();

        var request = new FichaTecnica
        {
            ProdutoId = p.Id,
            RendimentoPadrao = 15m,
            Insumos = new List<FichaTecnicaInsumo>
            {
                new() { InsumoId = insumo.Id, QuantidadeNecessaria = 2m, PerdaPercentual = 1m }
            }
        };

        // Act
        var result = await _controller.Save(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();
        okResult.Value!.ToString().Should().Contain("Ficha técnica salva com sucesso!");

        var dbFicha = await _context.FichasTecnicas.Include(f => f.Insumos).FirstOrDefaultAsync(f => f.ProdutoId == p.Id);
        dbFicha.Should().NotBeNull();
        dbFicha!.RendimentoPadrao.Should().Be(15m);
        dbFicha.Insumos.Should().HaveCount(1);
    }

    [Fact]
    public async Task Save_ShouldUpdateExistingFichaAndInsumos_WhenFichaAlreadyExists()
    {
        // Arrange
        var p = new Produto { Nome = "Pão Batata" };
        var insumo1 = new Produto { Nome = "Batata", Tipo = TipoProduto.Insumo };
        var insumo2 = new Produto { Nome = "Farinha", Tipo = TipoProduto.Insumo };
        _context.Produtos.AddRange(p, insumo1, insumo2);
        await _context.SaveChangesAsync();

        var ficha = new FichaTecnica
        {
            ProdutoId = p.Id,
            RendimentoPadrao = 5m,
            Insumos = new List<FichaTecnicaInsumo>
            {
                new() { InsumoId = insumo1.Id, QuantidadeNecessaria = 3m }
            }
        };
        _context.FichasTecnicas.Add(ficha);
        await _context.SaveChangesAsync();

        // Detach objects to simulate Web API binding boundary and avoid tracking conflicts
        _context.Entry(ficha).State = EntityState.Detached;

        var request = new FichaTecnica
        {
            ProdutoId = p.Id,
            RendimentoPadrao = 8m, // Changed
            Insumos = new List<FichaTecnicaInsumo>
            {
                new() { InsumoId = insumo2.Id, QuantidadeNecessaria = 4m } // Changed Ingredient
            }
        };

        // Act
        var result = await _controller.Save(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();
        okResult.Value!.ToString().Should().Contain("Ficha técnica salva com sucesso!");

        var dbFicha = await _context.FichasTecnicas.Include(f => f.Insumos).FirstOrDefaultAsync(f => f.ProdutoId == p.Id);
        dbFicha.Should().NotBeNull();
        dbFicha!.RendimentoPadrao.Should().Be(8m);
        dbFicha.Insumos.Should().HaveCount(1);
        dbFicha.Insumos.First().InsumoId.Should().Be(insumo2.Id);
    }

    [Fact]
    public async Task Delete_ShouldRemoveFichaFromDatabase()
    {
        // Arrange
        var ficha = new FichaTecnica { RendimentoPadrao = 12m };
        _context.FichasTecnicas.Add(ficha);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.Delete(ficha.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        var dbFicha = await _context.FichasTecnicas.FindAsync(ficha.Id);
        dbFicha.Should().BeNull();
    }
}
