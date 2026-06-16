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
using SGPF.Application.Services;
using Xunit;

namespace SGPF.Tests.Controllers;

public class DespesasControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<ContaPagar> _repository;
    private readonly Repository<ContaBancaria> _contaBancariaRepo;
    private readonly Repository<MovimentacaoBancaria> _movimentacaoRepo;
    private readonly FinanceiroService _financeiroService;
    private readonly DespesasController _controller;

    public DespesasControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
        
        _repository = new Repository<ContaPagar>(_context);
        _contaBancariaRepo = new Repository<ContaBancaria>(_context);
        _movimentacaoRepo = new Repository<MovimentacaoBancaria>(_context);

        var receberRepo = new Repository<ContaReceber>(_context);
        var opRepo = new Repository<OrdemProducao>(_context);
        var folhaRepo = new Repository<FolhaPagamento>(_context);
        var manuRepo = new Repository<ManutencaoVeiculo>(_context);
        var trocaRepo = new Repository<TrocaAvaria>(_context);
        var produtoRepo = new Repository<Produto>(_context);

        _financeiroService = new FinanceiroService(
            receberRepo,
            _repository,
            opRepo,
            folhaRepo,
            manuRepo,
            trocaRepo,
            produtoRepo,
            _contaBancariaRepo,
            _movimentacaoRepo
        );

        _controller = new DespesasController(
            _repository,
            _financeiroService,
            _contaBancariaRepo,
            _movimentacaoRepo
        );
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetAll_ShouldReturnOnlyManualExpenses_ExcludingSystemGenerated()
    {
        // Arrange
        var d1 = new ContaPagar { Descricao = "Luz", Valor = 100m, Categoria = "Infraestrutura" };
        var d2 = new ContaPagar { Descricao = "Internet", Valor = 50m, Categoria = "Escritório" };
        
        // System generated (devem ser ignorados)
        var sys1 = new ContaPagar { Descricao = "Compra #123", Valor = 500m, Categoria = "Insumos" };
        var sys2 = new ContaPagar { Descricao = "Folha Pagamento", Valor = 1500m, Categoria = "Folha de Pagamento" };
        var sys3 = new ContaPagar { Descricao = "Almoço", Valor = 20m, Categoria = "Alimentação" };

        await _repository.AddAsync(d1);
        await _repository.AddAsync(d2);
        await _repository.AddAsync(sys1);
        await _repository.AddAsync(sys2);
        await _repository.AddAsync(sys3);

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<ContaPagar>>().Subject.ToList();
        list.Should().HaveCount(2);
        list.Any(x => x.Descricao == "Luz").Should().BeTrue();
        list.Any(x => x.Descricao == "Internet").Should().BeTrue();
    }

    [Fact]
    public async Task Create_ShouldRegisterPendingExpense()
    {
        // Arrange
        var expense = new ContaPagar { Descricao = "Manutenção Ar", Valor = 120m, Categoria = "Infraestrutura" };

        // Act
        var result = await _controller.Create(expense);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<ContaPagar>().Subject;
        returned.Status.Should().Be(StatusContaPagar.Pendente);

        var dbExpense = await _repository.GetByIdAsync(returned.Id);
        dbExpense.Should().NotBeNull();
        dbExpense!.Descricao.Should().Be("Manutenção Ar");
    }

    [Fact]
    public async Task Update_ShouldModifyFields()
    {
        // Arrange
        var expense = new ContaPagar { Descricao = "Seguro", Valor = 300m, Categoria = "Seguros" };
        await _repository.AddAsync(expense);
        _context.Entry(expense).State = EntityState.Detached;

        var updated = new ContaPagar
        {
            Id = expense.Id,
            Descricao = "Seguro Reajustado",
            Valor = 330m,
            Categoria = "Seguros"
        };

        // Act
        var result = await _controller.Update(expense.Id, updated);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<ContaPagar>().Subject;
        returned.Descricao.Should().Be("Seguro Reajustado");

        var dbExpense = await _repository.GetByIdAsync(expense.Id);
        dbExpense!.Valor.Should().Be(330m);
    }

    [Fact]
    public async Task Delete_ShouldRemoveExpense()
    {
        // Arrange
        var expense = new ContaPagar { Descricao = "Consultoria", Valor = 1000m, Categoria = "Serviços" };
        await _repository.AddAsync(expense);

        // Act
        var result = await _controller.Delete(expense.Id);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        var dbExpense = await _repository.GetByIdAsync(expense.Id);
        dbExpense.Should().BeNull();
    }

    [Fact]
    public async Task Create_ShouldDebitBankAccount_WhenExpenseIsCreatedAsPaid()
    {
        // Arrange
        var bankAcc = new ContaBancaria { Nome = "Caixa Principal", SaldoInicial = 1000m, SaldoAtual = 1000m, Ativa = true, IsPadrao = true };
        await _contaBancariaRepo.AddAsync(bankAcc);

        var expense = new ContaPagar 
        { 
            Descricao = "Energia", 
            Valor = 150m, 
            Categoria = "Infraestrutura",
            Status = StatusContaPagar.Paga 
        };

        // Act
        var result = await _controller.Create(expense);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<ContaPagar>().Subject;
        returned.Status.Should().Be(StatusContaPagar.Paga);

        // Clear tracker to get fresh data from database
        _context.ChangeTracker.Clear();

        // Verify database state of expense
        var dbExpense = await _repository.GetByIdAsync(returned.Id);
        dbExpense.Should().NotBeNull();
        dbExpense!.Status.Should().Be(StatusContaPagar.Paga);

        // Verify bank balance is decremented
        var dbBank = await _contaBancariaRepo.GetByIdAsync(bankAcc.Id);
        dbBank!.SaldoAtual.Should().Be(850m); // 1000 - 150

        // Verify bank transaction is recorded
        var dbMovs = await _movimentacaoRepo.FindAsync(m => m.ContaBancariaId == bankAcc.Id);
        dbMovs.Should().ContainSingle();
        dbMovs.First().Tipo.Should().Be("saida");
        dbMovs.First().Valor.Should().Be(150m);
    }

    [Fact]
    public async Task Update_ShouldAdjustBankAccountBalanceAndTransaction_WhenPaidExpenseAmountChanges()
    {
        // Arrange
        var bankAcc = new ContaBancaria { Nome = "Caixa Principal", SaldoInicial = 1000m, SaldoAtual = 850m, Ativa = true, IsPadrao = true };
        await _contaBancariaRepo.AddAsync(bankAcc);

        var expense = new ContaPagar 
        { 
            Descricao = "Energia", 
            Valor = 150m, 
            Categoria = "Infraestrutura",
            Status = StatusContaPagar.Paga 
        };
        await _repository.AddAsync(expense);

        var transaction = new MovimentacaoBancaria
        {
            ContaBancariaId = bankAcc.Id,
            Tipo = "saida",
            Valor = 150m,
            Descricao = "Baixa de Conta a Pagar: Energia",
            DataMovimentacao = DateTime.Now,
            Origem = OrigemMovimentacao.BaixaPagar,
            ReferenciaId = expense.Id
        };
        await _movimentacaoRepo.AddAsync(transaction);

        _context.ChangeTracker.Clear();

        // Act - Update value to 200m (should debit extra 50m) and change description
        var updatedExpense = new ContaPagar 
        { 
            Id = expense.Id,
            Descricao = "Energia Reajustada", 
            Valor = 200m, 
            Categoria = "Infraestrutura",
            Status = StatusContaPagar.Paga 
        };
        var result = await _controller.Update(expense.Id, updatedExpense);

        // Assert
        result.Should().BeOfType<OkObjectResult>();

        _context.ChangeTracker.Clear();

        // Verify database state of expense
        var dbExpense = await _repository.GetByIdAsync(expense.Id);
        dbExpense!.Valor.Should().Be(200m);
        dbExpense.Descricao.Should().Be("Energia Reajustada");

        // Verify bank balance is decremented by 50m extra
        var dbBank = await _contaBancariaRepo.GetByIdAsync(bankAcc.Id);
        dbBank!.SaldoAtual.Should().Be(800m); // 850 - 50

        // Verify bank transaction is updated
        var dbMovs = await _movimentacaoRepo.FindAsync(m => m.ReferenciaId == expense.Id && m.Tipo == "saida");
        dbMovs.Should().ContainSingle();
        dbMovs.First().Valor.Should().Be(200m);
        dbMovs.First().Descricao.Should().Be("Baixa de Conta a Pagar: Energia Reajustada");
    }

    [Fact]
    public async Task Update_ShouldEstornOldValue_WhenPaidExpenseTransitionsToPending()
    {
        // Arrange
        var bankAcc = new ContaBancaria { Nome = "Caixa Principal", SaldoInicial = 1000m, SaldoAtual = 850m, Ativa = true, IsPadrao = true };
        await _contaBancariaRepo.AddAsync(bankAcc);

        var expense = new ContaPagar 
        { 
            Descricao = "Energia", 
            Valor = 150m, 
            Categoria = "Infraestrutura",
            Status = StatusContaPagar.Paga 
        };
        await _repository.AddAsync(expense);

        var transaction = new MovimentacaoBancaria
        {
            ContaBancariaId = bankAcc.Id,
            Tipo = "saida",
            Valor = 150m,
            Descricao = "Baixa de Conta a Pagar: Energia",
            DataMovimentacao = DateTime.Now,
            Origem = OrigemMovimentacao.BaixaPagar,
            ReferenciaId = expense.Id
        };
        await _movimentacaoRepo.AddAsync(transaction);

        _context.ChangeTracker.Clear();

        // Act - Edit value to 200m but also change status to Pendente
        var updatedExpense = new ContaPagar 
        { 
            Id = expense.Id,
            Descricao = "Energia Reajustada", 
            Valor = 200m, 
            Categoria = "Infraestrutura",
            Status = StatusContaPagar.Pendente
        };
        var result = await _controller.Update(expense.Id, updatedExpense);

        // Assert
        result.Should().BeOfType<OkObjectResult>();

        _context.ChangeTracker.Clear();

        // Verify database state of expense
        var dbExpense = await _repository.GetByIdAsync(expense.Id);
        dbExpense!.Valor.Should().Be(200m);
        dbExpense.Status.Should().Be(StatusContaPagar.Pendente);

        // Verify bank balance is incremented by old value (150m) instead of new value (200m)
        var dbBank = await _contaBancariaRepo.GetByIdAsync(bankAcc.Id);
        dbBank!.SaldoAtual.Should().Be(1000m); // 850 + 150

        // Verify estorno transaction is registered with the old value (150m)
        var estornoMov = (await _movimentacaoRepo.FindAsync(m => m.ReferenciaId == expense.Id && m.Tipo == "entrada")).FirstOrDefault();
        estornoMov.Should().NotBeNull();
        estornoMov!.Valor.Should().Be(150m);
        estornoMov.Descricao.Should().Contain("Estorno");
    }
}
