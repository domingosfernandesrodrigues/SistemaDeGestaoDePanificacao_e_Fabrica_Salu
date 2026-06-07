using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SGPF.Application.Interfaces;
using SGPF.Application.Services;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;
using SGPF.Infrastructure.Data;
using SGPF.Infrastructure.Repositories;
using SGPF.WebApi.Controllers;
using Xunit;

namespace SGPF.Tests.Controllers;

public class VendasControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<PedidoVenda> _pedidoRepo;
    private readonly Repository<Produto> _produtoRepo;
    private readonly Repository<MovimentacaoEstoque> _estoqueRepo;
    private readonly Repository<ContaReceber> _contaReceberRepo;
    private readonly Repository<PedidoVendaItem> _itemRepo;
    private readonly Repository<Cliente> _clienteRepo;
    private readonly Repository<Empresa> _empresaRepo;
    private readonly Repository<ContaBancaria> _contaBancariaRepo;
    private readonly Repository<MovimentacaoBancaria> _movimentacaoRepo;
    private readonly VendaService _vendaService;
    private readonly VendasController _controller;
    private readonly Guid _clientId = Guid.NewGuid();
    private readonly Guid _motoristaId = Guid.NewGuid();

    public VendasControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);

        _pedidoRepo = new Repository<PedidoVenda>(_context);
        _produtoRepo = new Repository<Produto>(_context);
        _estoqueRepo = new Repository<MovimentacaoEstoque>(_context);
        _contaReceberRepo = new Repository<ContaReceber>(_context);
        _itemRepo = new Repository<PedidoVendaItem>(_context);
        _clienteRepo = new Repository<Cliente>(_context);
        _empresaRepo = new Repository<Empresa>(_context);
        _contaBancariaRepo = new Repository<ContaBancaria>(_context);
        _movimentacaoRepo = new Repository<MovimentacaoBancaria>(_context);

        _vendaService = new VendaService(
            _pedidoRepo,
            _produtoRepo,
            _estoqueRepo,
            _contaReceberRepo,
            _itemRepo,
            _clienteRepo,
            _empresaRepo,
            _contaBancariaRepo,
            _movimentacaoRepo
        );

        _controller = new VendasController(_vendaService);

        // Standard user claim
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new(ClaimTypes.Name, "VendedorTest"),
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
    public async Task GetAll_ShouldReturnAllOrders_WhenNotMotorista()
    {
        // Arrange
        var p1 = new PedidoVenda { ClienteId = _clientId, ValorTotal = 100m };
        var p2 = new PedidoVenda { ClienteId = _clientId, ValorTotal = 200m };
        await _pedidoRepo.AddAsync(p1);
        await _pedidoRepo.AddAsync(p2);

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<PedidoVenda>>().Subject.ToList();
        list.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAll_ShouldReturnOnlyMotoristaOrders_WhenUserIsMotorista()
    {
        // Arrange
        var motoristaClaimUser = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new(ClaimTypes.Name, "MotoristaTest"),
            new(ClaimTypes.Role, "Motorista"),
            new("FuncionarioId", _motoristaId.ToString())
        }, "mock"));

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = motoristaClaimUser }
        };

        var p1 = new PedidoVenda { ClienteId = _clientId, MotoristaId = _motoristaId, ValorTotal = 100m };
        var p2 = new PedidoVenda { ClienteId = _clientId, MotoristaId = Guid.NewGuid(), ValorTotal = 200m }; // Outro motorista
        await _pedidoRepo.AddAsync(p1);
        await _pedidoRepo.AddAsync(p2);

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value.Should().BeAssignableTo<IEnumerable<PedidoVenda>>().Subject.ToList();
        list.Should().ContainSingle();
        list.First().MotoristaId.Should().Be(_motoristaId);
    }

    [Fact]
    public async Task CriarPedido_ShouldBlock_WhenClienteHasThreeOrMorePendingBills()
    {
        // Arrange
        var client = new Cliente { NomeFantasia = "Devedor", CNPJ_CPF = "123" };
        await _clienteRepo.AddAsync(client);

        // Seed 3 pending bills
        for (int i = 0; i < 3; i++)
        {
            await _contaReceberRepo.AddAsync(new ContaReceber 
            { 
                ClienteId = client.Id, 
                Status = StatusContaReceber.Pendente, 
                Valor = 50m, 
                Descricao = $"Fatura {i}" 
            });
        }

        var newOrder = new PedidoVenda { ClienteId = client.Id };

        // Act
        var result = await _controller.CriarPedido(newOrder);

        // Assert
        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().NotBeNull();
        badRequest.Value!.ToString().Should().Contain("INADIMPLÊNCIA");
    }

    [Fact]
    public async Task CriarPedido_ShouldReserveStockAndCreateContaReceber_WhenEstoqueIsSufficient()
    {
        // Arrange
        var client = new Cliente { NomeFantasia = "Cliente Bom", CNPJ_CPF = "1234" };
        await _clienteRepo.AddAsync(client);

        var product = new Produto { Nome = "Pão Integral", QuantidadeEstoque = 100m, PrecoVenda = 5m };
        await _produtoRepo.AddAsync(product);

        var item = new PedidoVendaItem { ProdutoId = product.Id, Quantidade = 10m };
        var newOrder = new PedidoVenda { ClienteId = client.Id, FormaPagamento = FormaPagamento.Pix };
        newOrder.Itens.Add(item);

        // Seed target bank account for fallback pix generation
        var bankAcc = new ContaBancaria { Nome = "Caixa Geral", Ativa = true, IsPadrao = true, PixChave = "pixkey" };
        await _contaBancariaRepo.AddAsync(bankAcc);

        // Act
        var result = await _controller.CriarPedido(newOrder);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<PedidoVenda>().Subject;
        returned.Status.Should().Be(StatusPedidoVenda.Separacao);
        returned.ValorTotal.Should().Be(50m);
        returned.PixQrCode.Should().NotBeNullOrEmpty();

        // Verify stock reservation
        var dbProd = await _produtoRepo.GetByIdAsync(product.Id);
        dbProd!.QuantidadeEstoque.Should().Be(90m); // 100 - 10

        var move = (await _estoqueRepo.FindAsync(m => m.ProdutoId == product.Id)).First();
        move.Tipo.Should().Be(TipoMovimentacao.Reserva);
        move.Quantidade.Should().Be(10m);
    }

    [Fact]
    public async Task Cancelar_ShouldEstornarEstoqueAndContasReceber()
    {
        // Arrange
        var client = new Cliente { NomeFantasia = "Cliente", CNPJ_CPF = "123" };
        await _clienteRepo.AddAsync(client);

        var prod = new Produto { Nome = "Bolo de Milho", QuantidadeEstoque = 100m, PrecoVenda = 10m };
        await _produtoRepo.AddAsync(prod);

        var order = new PedidoVenda { ClienteId = client.Id, Status = StatusPedidoVenda.Separacao, NumeroPedido = "PED-TEST" };
        var item = new PedidoVendaItem { PedidoVendaId = order.Id, ProdutoId = prod.Id, Quantidade = 5m, PrecoUnitario = 10m };
        order.Itens.Add(item);

        await _pedidoRepo.AddAsync(order);

        // Detach seeded entities to avoid tracking collisions
        _context.Entry(order).State = EntityState.Detached;
        foreach (var it in order.Itens)
        {
            _context.Entry(it).State = EntityState.Detached;
        }

        // Seed a pending Account Receivable for this order
        var bill = new ContaReceber { ClienteId = client.Id, PedidoVendaId = order.Id, Status = StatusContaReceber.Pendente, Valor = 50m };
        await _contaReceberRepo.AddAsync(bill);
        _context.Entry(bill).State = EntityState.Detached;

        // Act
        var result = await _controller.Cancelar(order.Id);

        // Assert
        if (result is BadRequestObjectResult badRequest)
        {
            var json = System.Text.Json.JsonSerializer.Serialize(badRequest.Value);
            badRequest.Value.Should().BeNull($"because the cancellation failed with message: {json}");
        }

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returned = okResult.Value.Should().BeOfType<PedidoVenda>().Subject;
        returned.Status.Should().Be(StatusPedidoVenda.Cancelado);

        // Verify stock estorno
        var dbProd = await _produtoRepo.GetByIdAsync(prod.Id);
        dbProd!.QuantidadeEstoque.Should().Be(105m); // 100 + 5 returned

        // Verify bill is cancelled
        var dbBill = await _contaReceberRepo.GetByIdAsync(bill.Id);
        dbBill!.Status.Should().Be(StatusContaReceber.Cancelado);
    }

    [Fact]
    public async Task WebhookConfirmarPagamento_ShouldSetOrderAsPaidAndReconcileBankBalance()
    {
        // Arrange
        var client = new Cliente { NomeFantasia = "Cliente", CNPJ_CPF = "123" };
        await _clienteRepo.AddAsync(client);

        var order = new PedidoVenda { ClienteId = client.Id, NumeroPedido = "PED-WEBHOOK", ValorTotal = 150m, Pago = false };
        await _pedidoRepo.AddAsync(order);

        var bill = new ContaReceber { ClienteId = client.Id, PedidoVendaId = order.Id, Status = StatusContaReceber.Pendente, Valor = 150m };
        await _contaReceberRepo.AddAsync(bill);

        var bankAcc = new ContaBancaria { Nome = "Banco do Brasil", SaldoAtual = 1000m, Ativa = true, IsPadrao = true };
        await _contaBancariaRepo.AddAsync(bankAcc);

        // Act
        var result = await _controller.WebhookConfirmarPagamento("PED-WEBHOOK");

        // Assert
        result.Should().BeOfType<OkObjectResult>();

        var dbOrder = await _pedidoRepo.GetByIdAsync(order.Id);
        dbOrder!.Pago.Should().BeTrue();

        var dbBill = await _contaReceberRepo.GetByIdAsync(bill.Id);
        dbBill!.Status.Should().Be(StatusContaReceber.Recebido);

        // Verify bank balance
        var dbBank = await _contaBancariaRepo.GetByIdAsync(bankAcc.Id);
        dbBank!.SaldoAtual.Should().Be(1150m); // 1000 + 150

        // Verify banking transaction history
        var moves = await _movimentacaoRepo.FindAsync(m => m.ContaBancariaId == bankAcc.Id);
        moves.Should().ContainSingle();
        moves.First().Tipo.Should().Be("entrada");
        moves.First().Valor.Should().Be(150m);
    }

    [Fact]
    public async Task DownloadNotaFiscal_ShouldReturnPdfFile()
    {
        // Arrange
        var client = new Cliente { NomeFantasia = "Supermercado Delta", CNPJ_CPF = "0000" };
        await _clienteRepo.AddAsync(client);

        var order = new PedidoVenda { ClienteId = client.Id, NumeroPedido = "PED-NF-999", ValorTotal = 80m };
        await _pedidoRepo.AddAsync(order);

        // Act
        var result = await _controller.DownloadNotaFiscal(order.Id);

        // Assert
        var fileResult = result.Should().BeOfType<FileContentResult>().Subject;
        fileResult.ContentType.Should().Be("application/pdf");
        fileResult.FileDownloadName.Should().Contain($"NF-{order.Id}");
        fileResult.FileContents.Should().NotBeNullOrEmpty();
    }
}
