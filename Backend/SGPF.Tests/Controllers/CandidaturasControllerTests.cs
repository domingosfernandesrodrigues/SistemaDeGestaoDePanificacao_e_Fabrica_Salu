using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;
using SGPF.Infrastructure.Repositories;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class CandidaturasControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<Candidatura> _repository;
    private readonly CandidaturasController _controller;
    private readonly string _testUploadsFolder;

    public CandidaturasControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _repository = new Repository<Candidatura>(_context);
        _controller = new CandidaturasController(_repository);

        _testUploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "Curriculos");
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();

        // Limpa arquivos físicos de teste criados
        if (Directory.Exists(_testUploadsFolder))
        {
            try
            {
                Directory.Delete(_testUploadsFolder, true);
            }
            catch { }
        }
    }

    [Fact]
    public async Task Enviar_ShouldAddCandidatura_WhenRequestIsValid()
    {
        // Arrange
        var fileMock = new Mock<IFormFile>();
        fileMock.Setup(f => f.FileName).Returns("curriculo.pdf");
        fileMock.Setup(f => f.Length).Returns(100);
        fileMock.Setup(f => f.CopyToAsync(It.IsAny<Stream>(), It.IsAny<System.Threading.CancellationToken>()))
            .Returns(Task.CompletedTask);

        var request = new EnviarCandidaturaRequest
        {
            Nome = "Candidato Teste",
            Email = "candidato@test.com",
            Telefone = "11999998888",
            CargoInteresse = "Padeiro",
            Mensagem = "Olá!",
            Curriculo = fileMock.Object
        };

        // Act
        var result = await _controller.Enviar(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.ToString().Should().Contain("sucesso");

        var dbCandidaturas = await _repository.GetAllAsync();
        dbCandidaturas.Should().HaveCount(1);
        dbCandidaturas.First().Nome.Should().Be("Candidato Teste");
    }

    [Fact]
    public async Task Enviar_ShouldReturnBadRequest_WhenRequiredFieldsAreEmpty()
    {
        // Arrange
        var fileMock = new Mock<IFormFile>();
        fileMock.Setup(f => f.FileName).Returns("curriculo.pdf");
        fileMock.Setup(f => f.Length).Returns(100);

        var request = new EnviarCandidaturaRequest
        {
            Nome = "", // Obrigatório vazio
            Email = "candidato@test.com",
            Telefone = "11999998888",
            CargoInteresse = "Padeiro",
            Curriculo = fileMock.Object
        };

        // Act
        var result = await _controller.Enviar(request);

        // Assert
        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.ToString().Should().Contain("Todos os campos obrigatórios");
    }

    [Fact]
    public async Task Enviar_ShouldReturnBadRequest_WhenFileExtensionIsInvalid()
    {
        // Arrange
        var fileMock = new Mock<IFormFile>();
        fileMock.Setup(f => f.FileName).Returns("cv.exe"); // Extensão proibida
        fileMock.Setup(f => f.Length).Returns(100);

        var request = new EnviarCandidaturaRequest
        {
            Nome = "Candidato Teste",
            Email = "candidato@test.com",
            Telefone = "11999998888",
            CargoInteresse = "Padeiro",
            Curriculo = fileMock.Object
        };

        // Act
        var result = await _controller.Enviar(request);

        // Assert
        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.ToString().Should().Contain("Formato de arquivo inválido");
    }

    [Fact]
    public async Task Enviar_ShouldReturnBadRequest_WhenFileSizeExceeds5MB()
    {
        // Arrange
        var fileMock = new Mock<IFormFile>();
        fileMock.Setup(f => f.FileName).Returns("curriculo.pdf");
        fileMock.Setup(f => f.Length).Returns(6 * 1024 * 1024); // 6MB (> 5MB)

        var request = new EnviarCandidaturaRequest
        {
            Nome = "Candidato Teste",
            Email = "candidato@test.com",
            Telefone = "11999998888",
            CargoInteresse = "Padeiro",
            Curriculo = fileMock.Object
        };

        // Act
        var result = await _controller.Enviar(request);

        // Assert
        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.ToString().Should().Contain("não pode ter mais de 5MB");
    }

    [Fact]
    public async Task GetAll_ShouldReturnAllSortedByDate()
    {
        // Arrange
        var c1 = new Candidatura { Nome = "A", Email = "a@a.com", Telefone = "1", CargoInteresse = "P", NomeOriginalArquivo = "1.pdf", NomeArquivoSalvo = "1.pdf", DataEnvio = DateTime.UtcNow.AddMinutes(-10), Status = "Novo" };
        var c2 = new Candidatura { Nome = "B", Email = "b@b.com", Telefone = "2", CargoInteresse = "P", NomeOriginalArquivo = "2.pdf", NomeArquivoSalvo = "2.pdf", DataEnvio = DateTime.UtcNow, Status = "Novo" };
        await _repository.AddAsync(c1);
        await _repository.AddAsync(c2);

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<Candidatura>>().Subject.ToList();
        list.Should().HaveCount(2);
        list[0].Nome.Should().Be("B"); // Mais recente primeiro
    }

    [Fact]
    public async Task Download_ShouldReturnPhysicalFile_WhenExists()
    {
        // Arrange
        var guidName = Guid.NewGuid().ToString() + ".pdf";
        var cand = new Candidatura
        {
            Nome = "A",
            Email = "a@a.com",
            Telefone = "1",
            CargoInteresse = "Padeiro",
            NomeOriginalArquivo = "curriculo_original.pdf",
            NomeArquivoSalvo = guidName,
            Status = "Novo"
        };
        await _repository.AddAsync(cand);

        // Cria o arquivo físico na pasta fake de uploads
        Directory.CreateDirectory(_testUploadsFolder);
        var fakeFilePath = Path.Combine(_testUploadsFolder, guidName);
        await File.WriteAllTextAsync(fakeFilePath, "fake content");

        // Act
        var result = await _controller.Download(cand.Id);

        // Assert
        var physicalFile = result.Should().BeOfType<PhysicalFileResult>().Subject;
        physicalFile.FileName.Should().Be(fakeFilePath);
        physicalFile.ContentType.Should().Be("application/pdf");
        physicalFile.FileDownloadName.Should().Be("curriculo_original.pdf");
    }

    [Fact]
    public async Task UpdateStatus_ShouldChangeStatus_WhenStatusIsValid()
    {
        // Arrange
        var cand = new Candidatura { Nome = "A", Email = "a@a.com", Telefone = "1", CargoInteresse = "Padeiro", NomeOriginalArquivo = "1.pdf", NomeArquivoSalvo = "1.pdf", Status = "Novo" };
        await _repository.AddAsync(cand);

        var request = new UpdateStatusRequest { Status = "Em Análise" };

        // Act
        var result = await _controller.UpdateStatus(cand.Id, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<Candidatura>().Subject;
        returned.Status.Should().Be("Em Análise");
    }

    [Fact]
    public async Task UpdateStatus_ShouldReturnBadRequest_WhenStatusIsInvalid()
    {
        // Arrange
        var cand = new Candidatura { Nome = "A", Email = "a@a.com", Telefone = "1", CargoInteresse = "Padeiro", NomeOriginalArquivo = "1.pdf", NomeArquivoSalvo = "1.pdf", Status = "Novo" };
        await _repository.AddAsync(cand);

        var request = new UpdateStatusRequest { Status = "Super Contratado" }; // Inválido

        // Act
        var result = await _controller.UpdateStatus(cand.Id, request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Delete_ShouldRemoveFromDbAndDisk()
    {
        // Arrange
        var guidName = Guid.NewGuid().ToString() + ".pdf";
        var cand = new Candidatura
        {
            Nome = "A",
            Email = "a@a.com",
            Telefone = "1",
            CargoInteresse = "Padeiro",
            NomeOriginalArquivo = "curriculo_original.pdf",
            NomeArquivoSalvo = guidName,
            Status = "Novo"
        };
        await _repository.AddAsync(cand);

        // Cria o arquivo físico na pasta fake de uploads
        Directory.CreateDirectory(_testUploadsFolder);
        var fakeFilePath = Path.Combine(_testUploadsFolder, guidName);
        await File.WriteAllTextAsync(fakeFilePath, "fake content");

        // Act
        var result = await _controller.Delete(cand.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        var dbCand = await _repository.GetByIdAsync(cand.Id);
        dbCand.Should().BeNull();

        File.Exists(fakeFilePath).Should().BeFalse();
    }
}
