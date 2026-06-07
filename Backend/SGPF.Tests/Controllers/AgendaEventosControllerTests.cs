using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;
using SGPF.Infrastructure.Repositories;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class AgendaEventosControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<AgendaEvento> _repository;
    private readonly AgendaEventosController _controller;

    public AgendaEventosControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _repository = new Repository<AgendaEvento>(_context);
        _controller = new AgendaEventosController(_repository);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task Get_ShouldReturnAllCalendarEvents()
    {
        // Arrange
        var e1 = new AgendaEvento { Titulo = "Evento A", Tipo = "Feriado", Data = DateTime.UtcNow };
        var e2 = new AgendaEvento { Titulo = "Evento B", Tipo = "Reunião", Data = DateTime.UtcNow };
        await _repository.AddAsync(e1);
        await _repository.AddAsync(e2);

        // Act
        var result = await _controller.Get();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<AgendaEvento>>().Subject.ToList();
        list.Should().HaveCount(2);
    }

    [Fact]
    public async Task Post_ShouldAddCalendarEventToDatabase()
    {
        // Arrange
        var ev = new AgendaEvento { Titulo = "Novo Treinamento", Tipo = "Treinamento", Descricao = "Uso de EPIs", Data = DateTime.UtcNow.AddDays(1) };

        // Act
        var result = await _controller.Post(ev);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<AgendaEvento>().Subject;
        returned.Titulo.Should().Be("Novo Treinamento");

        var dbEvent = await _repository.GetByIdAsync(returned.Id);
        dbEvent.Should().NotBeNull();
        dbEvent!.Titulo.Should().Be("Novo Treinamento");
    }

    [Fact]
    public async Task Put_ShouldModifyCalendarEventFields()
    {
        // Arrange
        var ev = new AgendaEvento { Titulo = "Feriado Antigo", Tipo = "Feriado", Data = DateTime.UtcNow };
        await _repository.AddAsync(ev);
        _context.Entry(ev).State = EntityState.Detached;

        var updated = new AgendaEvento
        {
            Id = ev.Id,
            Titulo = "Feriado Novo",
            Tipo = "Feriado Estadual",
            Descricao = "Novo feriado do estado",
            Data = DateTime.UtcNow.AddDays(1)
        };

        // Act
        var result = await _controller.Put(ev.Id, updated);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<AgendaEvento>().Subject;
        returned.Titulo.Should().Be("Feriado Novo");
        returned.Tipo.Should().Be("Feriado Estadual");

        var dbEvent = await _repository.GetByIdAsync(ev.Id);
        dbEvent!.Titulo.Should().Be("Feriado Novo");
        dbEvent.Tipo.Should().Be("Feriado Estadual");
    }

    [Fact]
    public async Task Put_ShouldReturnNotFound_WhenEventDoesNotExist()
    {
        // Act
        var result = await _controller.Put(Guid.NewGuid(), new AgendaEvento());

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Delete_ShouldRemoveCalendarEventFromDatabase()
    {
        // Arrange
        var ev = new AgendaEvento { Titulo = "Evento Temporario" };
        await _repository.AddAsync(ev);

        // Act
        var result = await _controller.Delete(ev.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        var dbEvent = await _repository.GetByIdAsync(ev.Id);
        dbEvent.Should().BeNull();
    }
}
