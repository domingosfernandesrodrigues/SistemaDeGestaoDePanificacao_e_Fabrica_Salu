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

public class UsuariosControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<Usuario> _repository;
    private readonly UsuariosController _controller;

    public UsuariosControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _repository = new Repository<Usuario>(_context);
        _controller = new UsuariosController(_repository, _context);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetAll_ShouldReturnAllUsuarios()
    {
        var u1 = new Usuario { Nome = "User One", Email = "u1@salu.com", Role = "Admin", Ativo = true };
        var u2 = new Usuario { Nome = "User Two", Email = "u2@salu.com", Role = "Operador", Ativo = true };
        await _repository.AddAsync(u1);
        await _repository.AddAsync(u2);

        var result = await _controller.GetAll();

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<Usuario>>().Subject.ToList();
        list.Should().HaveCount(2);
    }

    [Fact]
    public async Task Create_ShouldHashPassword_WhenCalled()
    {
        var u = new Usuario { Nome = "New User", Email = "new@salu.com", Role = "Gestor" };

        var result = await _controller.Create(u);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Usuario>().Subject;
        returned.SenhaHash.Should().NotBeNullOrEmpty();
        BCrypt.Net.BCrypt.Verify("12345678", returned.SenhaHash).Should().BeTrue();
    }

    [Fact]
    public async Task Update_ShouldModifyAllowedFields()
    {
        var u = new Usuario { Nome = "Old Name", Email = "old@salu.com", Role = "Operador", Ativo = true };
        await _repository.AddAsync(u);
        _context.Entry(u).State = EntityState.Detached;

        var updated = new Usuario
        {
            Id = u.Id,
            Nome = "New Name",
            Email = "new@salu.com",
            Role = "Admin",
            Ativo = false
        };

        var result = await _controller.Update(u.Id, updated);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Usuario>().Subject;
        returned.Nome.Should().Be("New Name");
        returned.Email.Should().Be("new@salu.com");
        returned.Role.Should().Be("Admin");
        returned.Ativo.Should().BeFalse();
    }

    [Fact]
    public async Task ResetPassword_ShouldSetDefaultPasswordAndRequireReset()
    {
        var u = new Usuario { Nome = "User", Email = "u@salu.com", SenhaHash = "somehash", PrecisaTrocarSenha = false };
        await _repository.AddAsync(u);

        var result = await _controller.ResetPassword(u.Id);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var dbUser = await _repository.GetByIdAsync(u.Id);
        dbUser!.PrecisaTrocarSenha.Should().BeTrue();
        BCrypt.Net.BCrypt.Verify("12345678", dbUser.SenhaHash).Should().BeTrue();
    }

    [Fact]
    public async Task ToggleStatus_ShouldFlippedActiveFlag()
    {
        var u = new Usuario { Nome = "User", Email = "u@salu.com", Ativo = true };
        await _repository.AddAsync(u);

        var result = await _controller.ToggleStatus(u.Id);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Usuario>().Subject;
        returned.Ativo.Should().BeFalse();
    }

    [Fact]
    public async Task Delete_ShouldRemoveUsuario_WhenNoDependencyExists()
    {
        var u = new Usuario { Nome = "Solo" };
        await _repository.AddAsync(u);

        var result = await _controller.Delete(u.Id);

        result.Should().BeOfType<NoContentResult>();
        var dbUser = await _repository.GetByIdAsync(u.Id);
        dbUser.Should().BeNull();
    }

    [Fact]
    public async Task Delete_ShouldBlock_WhenLinkedToFuncionario()
    {
        var u = new Usuario { Nome = "User" };
        await _repository.AddAsync(u);

        var f = new Funcionario { Nome = "Func", CPF = "123", UsuarioId = u.Id };
        _context.Funcionarios.Add(f);
        await _context.SaveChangesAsync();

        var result = await _controller.Delete(u.Id);

        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().NotBeNull();
        badRequestResult.Value!.ToString().Should().Contain("preservar a integridade dos dados");
    }

    [Fact]
    public async Task Delete_ShouldBlock_WhenLinkedToClienteWithHistory()
    {
        var u = new Usuario { Nome = "User", ClienteId = Guid.NewGuid() };
        await _repository.AddAsync(u);

        var p = new PedidoVenda { ClienteId = u.ClienteId.Value, DataPedido = DateTime.Now, ValorTotal = 10m };
        _context.PedidosVenda.Add(p);
        await _context.SaveChangesAsync();

        var result = await _controller.Delete(u.Id);

        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().NotBeNull();
        badRequestResult.Value!.ToString().Should().Contain("preservar a integridade dos dados");
    }

    [Fact]
    public async Task Delete_ShouldBlock_WhenLinkedToIndustrialHistory()
    {
        var u = new Usuario { Nome = "User" };
        await _repository.AddAsync(u);

        var op = new OrdemProducao { UsuarioPlanejouId = u.Id, Status = StatusOrdemProducao.Planejada, DataAbertura = DateTime.Now };
        _context.OrdensProducao.Add(op);
        await _context.SaveChangesAsync();

        var result = await _controller.Delete(u.Id);

        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value!.ToString().Should().Contain("preservar a integridade dos dados");
    }
}
