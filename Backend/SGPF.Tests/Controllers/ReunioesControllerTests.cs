using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Application.Services;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;
using SGPF.Infrastructure.Repositories;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class ReunioesControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<Reuniao> _repository;
    private readonly ReuniaoService _service;
    private readonly ReunioesController _controller;

    public ReunioesControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _repository = new Repository<Reuniao>(_context);
        _service = new ReuniaoService(_repository);
        _controller = new ReunioesController(_service, _repository);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetAll_ShouldReturnAllMeetings()
    {
        // Arrange
        var r1 = new Reuniao { ClienteId = Guid.NewGuid(), Pauta = "Vendas Mensais", Status = StatusReuniao.Agendada };
        var r2 = new Reuniao { ClienteId = Guid.NewGuid(), Pauta = "Novas Embalagens", Status = StatusReuniao.Agendada };
        await _repository.AddAsync(r1);
        await _repository.AddAsync(r2);

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<Reuniao>>().Subject.ToList();
        list.Should().HaveCount(2);
    }

    [Fact]
    public async Task Agendar_ShouldCreateNewMeetingWithStatusAgendada()
    {
        // Arrange
        var dto = new AgendarReuniaoDto
        {
            ClienteId = Guid.NewGuid(),
            DataHora = DateTime.UtcNow.AddDays(2),
            Pauta = "Alinhamento Geral"
        };

        // Act
        var result = await _controller.Agendar(dto);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Reuniao>().Subject;
        returned.Pauta.Should().Be("Alinhamento Geral");
        returned.Status.Should().Be(StatusReuniao.Agendada);

        var dbMeeting = await _repository.GetByIdAsync(returned.Id);
        dbMeeting.Should().NotBeNull();
        dbMeeting!.Pauta.Should().Be("Alinhamento Geral");
        dbMeeting.Status.Should().Be(StatusReuniao.Agendada);
    }

    [Fact]
    public async Task Concluir_ShouldSetAtaAndStatusRealizada()
    {
        // Arrange
        var meeting = new Reuniao
        {
            ClienteId = Guid.NewGuid(),
            Pauta = "Negociação",
            Status = StatusReuniao.Agendada
        };
        await _repository.AddAsync(meeting);

        // Act
        var result = await _controller.Concluir(meeting.Id, "Preços ajustados em 5%.");

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Reuniao>().Subject;
        returned.Status.Should().Be(StatusReuniao.Realizada);
        returned.Ata.Should().Be("Preços ajustados em 5%.");

        var dbMeeting = await _repository.GetByIdAsync(meeting.Id);
        dbMeeting!.Status.Should().Be(StatusReuniao.Realizada);
        dbMeeting.Ata.Should().Be("Preços ajustados em 5%.");
    }

    [Fact]
    public async Task Cancelar_ShouldSetStatusCancelada()
    {
        // Arrange
        var meeting = new Reuniao
        {
            ClienteId = Guid.NewGuid(),
            Pauta = "Reunião de Alinhamento",
            Status = StatusReuniao.Agendada
        };
        await _repository.AddAsync(meeting);

        // Act
        var result = await _controller.Cancelar(meeting.Id);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Reuniao>().Subject;
        returned.Status.Should().Be(StatusReuniao.Cancelada);

        var dbMeeting = await _repository.GetByIdAsync(meeting.Id);
        dbMeeting!.Status.Should().Be(StatusReuniao.Cancelada);
    }

    [Fact]
    public async Task Update_ShouldModifyMeetingFields()
    {
        // Arrange
        var meeting = new Reuniao
        {
            ClienteId = Guid.NewGuid(),
            Pauta = "Old Topic",
            Status = StatusReuniao.Agendada
        };
        await _repository.AddAsync(meeting);
        _context.Entry(meeting).State = EntityState.Detached;

        var newClienteId = Guid.NewGuid();
        var dto = new AgendarReuniaoDto
        {
            ClienteId = newClienteId,
            DataHora = DateTime.UtcNow.AddDays(5),
            Pauta = "New Topic"
        };

        // Act
        var result = await _controller.Update(meeting.Id, dto);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Reuniao>().Subject;
        returned.Pauta.Should().Be("New Topic");
        returned.ClienteId.Should().Be(newClienteId);

        var dbMeeting = await _repository.GetByIdAsync(meeting.Id);
        dbMeeting!.Pauta.Should().Be("New Topic");
        dbMeeting.ClienteId.Should().Be(newClienteId);
    }
}
