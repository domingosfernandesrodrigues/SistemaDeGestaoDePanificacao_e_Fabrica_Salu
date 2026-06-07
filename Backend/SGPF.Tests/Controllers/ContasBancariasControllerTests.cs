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

public class ContasBancariasControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<ContaBancaria> _repository;
    private readonly Repository<MovimentacaoBancaria> _movimentacaoRepo;
    private readonly Repository<ContaReceber> _receberRepo;
    private readonly Repository<ContaPagar> _pagarRepo;
    private readonly ContasBancariasController _controller;

    public ContasBancariasControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        _repository = new Repository<ContaBancaria>(_context);
        _movimentacaoRepo = new Repository<MovimentacaoBancaria>(_context);
        _receberRepo = new Repository<ContaReceber>(_context);
        _pagarRepo = new Repository<ContaPagar>(_context);

        _controller = new ContasBancariasController(
            _repository,
            _movimentacaoRepo,
            _receberRepo,
            _pagarRepo,
            _context
        );
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetAll_ShouldReturnAllAccounts()
    {
        // Arrange
        var c1 = new ContaBancaria { Nome = "Conta A", SaldoInicial = 100m, Ativa = true };
        var c2 = new ContaBancaria { Nome = "Conta B", SaldoInicial = 200m, Ativa = true };
        await _repository.AddAsync(c1);
        await _repository.AddAsync(c2);

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<ContaBancaria>>().Subject.ToList();
        list.Should().HaveCount(2);
    }

    [Fact]
    public async Task Create_ShouldEstablishAccount_AndUnmarkOthersIfDefault()
    {
        // Arrange - Conta padrão existente
        var existingPadrao = new ContaBancaria { Nome = "Antiga Padrão", IsPadrao = true, Ativa = true };
        await _repository.AddAsync(existingPadrao);

        var newConta = new ContaBancaria
        {
            Nome = "Nova Padrão",
            IsPadrao = true,
            SaldoInicial = 1000m,
            Ativa = true
        };

        // Act
        var result = await _controller.Create(newConta);

        // Assert
        var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var returned = createdResult.Value.Should().BeOfType<ContaBancaria>().Subject;
        returned.SaldoAtual.Should().Be(1000m);
        returned.IsPadrao.Should().BeTrue();

        // Verifica se a outra conta foi desmarcada como padrão
        var oldDb = await _repository.GetByIdAsync(existingPadrao.Id);
        oldDb!.IsPadrao.Should().BeFalse();

        // Verifica se criou a movimentação inicial
        var movs = await _movimentacaoRepo.GetAllAsync();
        movs.Should().HaveCount(1);
        movs.First().Valor.Should().Be(1000m);
        movs.First().Origem.Should().Be(OrigemMovimentacao.AberturaConta);
    }

    [Fact]
    public async Task Movimentar_ShouldPerformManualTransaction_AndLogIt()
    {
        // Arrange
        var c = new ContaBancaria { Nome = "Caixa", SaldoInicial = 500m, SaldoAtual = 500m, Ativa = true };
        await _repository.AddAsync(c);

        var request = new MovimentacaoManual
        {
            Tipo = "saida",
            Valor = 100m,
            Descricao = "Saque para troco"
        };

        // Act
        var result = await _controller.Movimentar(c.Id, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<ContaBancaria>().Subject;
        returned.SaldoAtual.Should().Be(400m);

        var movs = await _movimentacaoRepo.FindAsync(m => m.ContaBancariaId == c.Id);
        movs.Should().HaveCount(1);
        movs.First().Tipo.Should().Be("saida");
        movs.First().Valor.Should().Be(100m);
        movs.First().Descricao.Should().Be("Saque para troco");
        movs.First().Origem.Should().Be(OrigemMovimentacao.Manual);
    }

    [Fact]
    public async Task GetExtrato_ShouldCombineManual_Receitas_AndDespesas()
    {
        // Arrange - Conta padrão
        var c = new ContaBancaria { Nome = "Banco", IsPadrao = true, Ativa = true };
        await _repository.AddAsync(c);

        var mes = DateTime.Today.Month;
        var ano = DateTime.Today.Year;

        // 1. Movimentação manual
        var m = new MovimentacaoBancaria
        {
            ContaBancariaId = c.Id,
            Tipo = "entrada",
            Valor = 50m,
            Descricao = "Manual Entry",
            DataMovimentacao = DateTime.Now,
            Origem = OrigemMovimentacao.Manual
        };
        await _movimentacaoRepo.AddAsync(m);

        // 2. Receita Recebida
        var receita = new ContaReceber
        {
            Descricao = "Venda Pão",
            Valor = 100m,
            Status = StatusContaReceber.Recebido,
            DataRecebimento = DateTime.Now,
            DataEmissao = DateTime.Now
        };
        _context.ContasReceber.Add(receita);

        // 3. Despesa Paga
        var despesa = new ContaPagar
        {
            Descricao = "Luz",
            Valor = 80m,
            Status = StatusContaPagar.Paga,
            DataPagamento = DateTime.Now,
            DataEmissao = DateTime.Now,
            Categoria = "Infraestrutura"
        };
        _context.ContasPagar.Add(despesa);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetExtrato(mes, ano);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<object>>().Subject.ToList();
        list.Should().HaveCount(3); // Deve ter a movimentação manual, a receita e a despesa
    }

    [Fact]
    public async Task GetSaldosPeriodo_ShouldCalculateRetroactiveBalances()
    {
        // Arrange - Conta padrão com saldo atual de 1000m
        var c = new ContaBancaria
        {
            Nome = "Principal",
            IsPadrao = true,
            Ativa = true,
            SaldoInicial = 500m,
            SaldoAtual = 1000m,
            DataAbertura = DateTime.Today.AddMonths(-3)
        };
        await _repository.AddAsync(c);

        // Transação futura (ex: próximo mês)
        var dataFutura = DateTime.Now.AddMonths(1);
        var receitaFutura = new ContaReceber
        {
            Descricao = "Receita Futura",
            Valor = 200m,
            Status = StatusContaReceber.Recebido,
            DataRecebimento = dataFutura,
            DataEmissao = dataFutura
        };
        _context.ContasReceber.Add(receitaFutura);
        await _context.SaveChangesAsync();

        // Act - Consulta saldo para o mês atual
        var result = await _controller.GetSaldosPeriodo(DateTime.Today.Month, DateTime.Today.Year);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();
    }
}
