using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;
using SGPF.Infrastructure.Repositories;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class EmpresasControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<Empresa> _repository;
    private readonly EmpresasController _controller;

    public EmpresasControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _repository = new Repository<Empresa>(_context);
        _controller = new EmpresasController(_repository);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetAll_ShouldReturnAllEmpresas()
    {
        var emp = new Empresa { RazaoSocial = "Fábrica Salu S.A.", NomeFantasia = "Salu", CNPJ = "12.345.678/0001-90" };
        await _repository.AddAsync(emp);

        var result = await _controller.GetAll();

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<Empresa>>().Subject.ToList();
        list.Should().HaveCount(1);
        list[0].CNPJ.Should().Be("12.345.678/0001-90");
    }

    [Fact]
    public async Task GetById_ShouldReturnEmpresa_WhenExists()
    {
        var emp = new Empresa { RazaoSocial = "Fábrica Salu S.A.", NomeFantasia = "Salu", CNPJ = "12.345.678/0001-90" };
        await _repository.AddAsync(emp);

        var result = await _controller.GetById(emp.Id);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Empresa>().Subject;
        returned.Id.Should().Be(emp.Id);
    }

    [Fact]
    public async Task Create_ShouldAddNewEmpresa()
    {
        var emp = new Empresa { RazaoSocial = "Nova Empresa", CNPJ = "00.000.000/0001-00" };

        var result = await _controller.Create(emp);

        var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var returned = createdResult.Value.Should().BeOfType<Empresa>().Subject;
        returned.RazaoSocial.Should().Be("Nova Empresa");
    }

    [Fact]
    public async Task Update_ShouldUpdateFieldsAndReturnOk()
    {
        var emp = new Empresa { RazaoSocial = "Antigo", CNPJ = "00" };
        await _repository.AddAsync(emp);
        _context.Entry(emp).State = EntityState.Detached;

        var updated = new Empresa { Id = emp.Id, RazaoSocial = "Novo", CNPJ = "00" };

        var result = await _controller.Update(emp.Id, updated);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Empresa>().Subject;
        returned.RazaoSocial.Should().Be("Novo");
    }

    [Fact]
    public async Task Delete_ShouldRemoveEmpresa()
    {
        var emp = new Empresa { RazaoSocial = "A ser Deletada", CNPJ = "11" };
        await _repository.AddAsync(emp);

        var result = await _controller.Delete(emp.Id);

        result.Should().BeOfType<NoContentResult>();
        var dbEmp = await _repository.GetByIdAsync(emp.Id);
        dbEmp.Should().BeNull();
    }

    [Fact]
    public void ControllerClass_ShouldHaveAuthorizeAttribute_WithOperadorAndCliente()
    {
        var attr = typeof(EmpresasController).GetCustomAttributes(typeof(AuthorizeAttribute), true)
            .Cast<AuthorizeAttribute>()
            .FirstOrDefault();

        attr.Should().NotBeNull();
        attr!.Roles.Should().Contain("Operador");
        attr.Roles.Should().Contain("Cliente");
        attr.Roles.Should().Contain("Admin");
        attr.Roles.Should().Contain("Gestor");
    }

    [Theory]
    [InlineData("Create")]
    [InlineData("Update")]
    [InlineData("Delete")]
    public void MutationActions_ShouldHaveAuthorizeAttribute_WithAdminOrGestor(string methodName)
    {
        var method = typeof(EmpresasController).GetMethods()
            .FirstOrDefault(m => m.Name == methodName);
        
        method.Should().NotBeNull();

        var attr = method!.GetCustomAttributes(typeof(AuthorizeAttribute), true)
            .Cast<AuthorizeAttribute>()
            .FirstOrDefault();

        attr.Should().NotBeNull();
        attr!.Roles.Should().Contain("Admin");
        attr.Roles.Should().Contain("Gestor");
        attr.Roles.Should().NotContain("Operador");
        attr.Roles.Should().NotContain("Cliente");
    }
}
