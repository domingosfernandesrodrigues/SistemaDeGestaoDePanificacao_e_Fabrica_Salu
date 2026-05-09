using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.Application.Services;

public class VendaService : IVendaService
{
    private readonly IRepository<PedidoVenda> _pedidoRepo;
    private readonly IRepository<Produto> _produtoRepo;
    private readonly IRepository<MovimentacaoEstoque> _estoqueRepo;
    private readonly IRepository<ContaReceber> _contaReceberRepo;
    private readonly IRepository<PedidoVendaItem> _itemRepo;
    private readonly IRepository<Cliente> _clienteRepo;
    private readonly IRepository<Empresa> _empresaRepo;

    public VendaService(
        IRepository<PedidoVenda> pedidoRepo,
        IRepository<Produto> produtoRepo,
        IRepository<MovimentacaoEstoque> estoqueRepo,
        IRepository<ContaReceber> contaReceberRepo,
        IRepository<PedidoVendaItem> itemRepo,
        IRepository<Cliente> clienteRepo,
        IRepository<Empresa> empresaRepo)
    {
        _pedidoRepo = pedidoRepo;
        _produtoRepo = produtoRepo;
        _estoqueRepo = estoqueRepo;
        _contaReceberRepo = contaReceberRepo;
        _itemRepo = itemRepo;
        _clienteRepo = clienteRepo;
        _empresaRepo = empresaRepo;
    }

    public async Task<PedidoVenda?> GetByIdAsync(Guid id)
    {
        var pedido = await _pedidoRepo.GetByIdAsync(id);
        if (pedido != null)
        {
            pedido.Itens = (await _itemRepo.FindAsync(i => i.PedidoVendaId == id)).ToList();
            foreach (var item in pedido.Itens)
            {
                item.Produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
            }
            pedido.Cliente = await _clienteRepo.GetByIdAsync(pedido.ClienteId);
        }
        return pedido;
    }

    public async Task<PedidoVenda> CriarPedidoAsync(PedidoVenda pedido)
    {
        pedido.Status = StatusPedidoVenda.Separacao;
        pedido.ValorTotal = 0;

        foreach (var item in pedido.Itens)
        {
            var produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
            if (produto == null) throw new Exception($"Produto {item.ProdutoId} não encontrado.");

            if (produto.QuantidadeEstoque < item.Quantidade)
                throw new Exception($"Estoque insuficiente para o produto {produto.Nome}. Saldo: {produto.QuantidadeEstoque}");

            item.PrecoUnitario = produto.PrecoVenda;
            pedido.ValorTotal += item.Subtotal;

            // Fazer a Reserva de Estoque
            var mov = new MovimentacaoEstoque
            {
                ProdutoId = produto.Id,
                Tipo = TipoMovimentacao.Reserva,
                Quantidade = item.Quantidade,
                Origem = pedido.NumeroPedido,
                Observacao = "Reserva de Venda"
            };
            await _estoqueRepo.AddAsync(mov);

            produto.QuantidadeEstoque -= item.Quantidade; // Reduz o saldo disponível
            await _produtoRepo.UpdateAsync(produto);
        }

        // Buscar configurações da Empresa para gerar cobrança customizada
        var empresa = (await _empresaRepo.GetAllAsync()).FirstOrDefault();
        
        if (pedido.FormaPagamento == FormaPagamento.Boleto)
        {
            var banco = empresa?.BancoNome ?? "BANCO ITAU";
            pedido.BoletoCodigoBarras = $"34191.79001 01043.510047 91020.150008 5 950200000{pedido.ValorTotal:0000}";
        }
        else if (pedido.FormaPagamento == FormaPagamento.Pix)
        {
            var chave = empresa?.PixChave ?? "sgpf-fabrica-pix-key-12345";
            pedido.PixQrCode = $"00020126580014BR.GOV.BCB.PIX0136{chave}5204000053039865405{pedido.ValorTotal:F2}5802BR5915SGP-F_FABRICA6009Sao_Paulo62070503***6304";
        }

        await _pedidoRepo.AddAsync(pedido);

        // SIMULAÇÃO DE AUTOMAÇÃO: 
        // Se for Pix ou Boleto, vamos simular que o banco confirmou o pagamento após 15 segundos.
        // Em produção, isso seria disparado pelo Webhook real do banco/gateway.
        if (pedido.FormaPagamento == FormaPagamento.Pix || pedido.FormaPagamento == FormaPagamento.Boleto)
        {
            _ = Task.Run(async () => 
            {
                await Task.Delay(15000); // Aguarda 15 segundos
                await ConfirmarPagamentoAsync(pedido.NumeroPedido);
            });
        }

        return pedido;
    }

    public async Task<bool> ConfirmarPagamentoAsync(string numeroPedido)
    {
        var pedido = (await _pedidoRepo.GetAllAsync()).FirstOrDefault(p => p.NumeroPedido == numeroPedido);
        if (pedido == null) return false;

        pedido.Pago = true;
        await _pedidoRepo.UpdateAsync(pedido);

        // Atualizar Financeiro (Conta a Receber)
        var contas = await _contaReceberRepo.FindAsync(c => c.PedidoVendaId == pedido.Id);
        foreach (var conta in contas)
        {
            conta.Status = StatusContaReceber.Recebido;
            conta.DataRecebimento = DateTime.UtcNow;
            await _contaReceberRepo.UpdateAsync(conta);
        }

        return true;
    }

    // Nota: Como não quero quebrar o código agora, vou apenas simular o uso dos campos se existirem.
    // Vou ajustar o construtor do VendaService.

    public async Task<PedidoVenda> CriarPedidoPortalAsync(PedidoVenda pedido)
    {
        pedido.Status = StatusPedidoVenda.Novo;
        pedido.ValorTotal = 0;

        foreach (var item in pedido.Itens)
        {
            var produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
            if (produto != null)
            {
                item.PrecoUnitario = produto.PrecoVenda;
                pedido.ValorTotal += item.Subtotal;
            }
        }
        await _pedidoRepo.AddAsync(pedido);
        return pedido;
    }

    public async Task<PedidoVenda> AprovarPedidoAsync(Guid pedidoId)
    {
        var pedido = await GetByIdAsync(pedidoId);
        if (pedido == null || pedido.Status != StatusPedidoVenda.Novo)
            throw new Exception("Pedido não pode ser aprovado.");

        foreach (var item in pedido.Itens)
        {
            var produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
            if (produto != null)
            {
                if (produto.QuantidadeEstoque < item.Quantidade)
                    throw new Exception($"Estoque insuficiente para o produto {produto.Nome}. Disponível: {produto.QuantidadeEstoque}");

                produto.QuantidadeEstoque -= item.Quantidade;
                await _produtoRepo.UpdateAsync(produto);

                await _estoqueRepo.AddAsync(new MovimentacaoEstoque
                {
                    ProdutoId = produto.Id,
                    Tipo = TipoMovimentacao.Reserva,
                    Quantidade = item.Quantidade,
                    Origem = pedido.NumeroPedido,
                    Observacao = "Reserva (Aprovação de Venda)"
                });
            }
        }

        pedido.Status = StatusPedidoVenda.Separacao;
        await _pedidoRepo.UpdateAsync(pedido);

        // CRIAR FINANCEIRO (Pendente): Melhor forma para visibilidade de Fluxo de Caixa
        var conta = new ContaReceber
        {
            ClienteId = pedido.ClienteId,
            Descricao = $"Fatura Ref. Pedido {pedido.NumeroPedido}",
            Valor = pedido.ValorTotal,
            DataVencimento = DateTime.UtcNow.AddDays(15), // Padrão 15 dias, pode ser ajustado
            PedidoVendaId = pedido.Id,
            Status = pedido.Pago ? StatusContaReceber.Recebido : StatusContaReceber.Pendente,
            DataRecebimento = pedido.Pago ? DateTime.UtcNow : null
        };
        await _contaReceberRepo.AddAsync(conta);

        return pedido;
    }

    public async Task<PedidoVenda> EntregarPedidoAsync(Guid pedidoId)
    {
        var pedido = await GetByIdAsync(pedidoId);
        if (pedido == null || pedido.Status == StatusPedidoVenda.Entregue)
            throw new Exception("Pedido inválido ou já entregue.");

        foreach (var item in pedido.Itens)
        {
            await _estoqueRepo.AddAsync(new MovimentacaoEstoque
            {
                ProdutoId = item.ProdutoId,
                Tipo = TipoMovimentacao.Saida,
                Quantidade = item.Quantidade,
                Origem = pedido.NumeroPedido,
                Observacao = "Venda Concluída"
            });
        }

        pedido.Status = StatusPedidoVenda.Entregue;
        pedido.DataEntregaRealizada = DateTime.UtcNow;
        await _pedidoRepo.UpdateAsync(pedido);

        return pedido;
    }

    public async Task<PedidoVenda> AtualizarStatusAsync(Guid id, StatusPedidoVenda novoStatus)
    {
        var pedido = await _pedidoRepo.GetByIdAsync(id);
        if (pedido == null) throw new Exception("Pedido não encontrado.");

        if (novoStatus == StatusPedidoVenda.Entregue) return await EntregarPedidoAsync(id);
        if (novoStatus == StatusPedidoVenda.Separacao && pedido.Status == StatusPedidoVenda.Novo) return await AprovarPedidoAsync(id);

        pedido.Status = novoStatus;
        await _pedidoRepo.UpdateAsync(pedido);
        return pedido;
    }

    public async Task<PedidoVenda> CancelarPedidoAsync(Guid id)
    {
        var pedido = await GetByIdAsync(id);
        if (pedido == null) throw new Exception("Pedido não encontrado.");
        if (pedido.Status == StatusPedidoVenda.Cancelado) return pedido;

        // Reverter Logística
        if (pedido.Status != StatusPedidoVenda.Novo && pedido.Status != StatusPedidoVenda.Cancelado)
        {
            foreach (var item in pedido.Itens)
            {
                var produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
                if (produto != null)
                {
                    produto.QuantidadeEstoque += item.Quantidade;
                    await _produtoRepo.UpdateAsync(produto);

                    await _estoqueRepo.AddAsync(new MovimentacaoEstoque
                    {
                        ProdutoId = item.ProdutoId,
                        Tipo = TipoMovimentacao.Entrada,
                        Quantidade = item.Quantidade,
                        Origem = pedido.NumeroPedido,
                        Observacao = $"Estorno de Cancelamento ({pedido.Status})"
                    });
                }
            }
        }

        // Reverter Financeiro
        var contasFinanceiro = await _contaReceberRepo.FindAsync(c => c.PedidoVendaId == pedido.Id);
        foreach (var conta in contasFinanceiro)
        {
            conta.Status = StatusContaReceber.Cancelado;
            await _contaReceberRepo.UpdateAsync(conta);
        }

        pedido.Status = StatusPedidoVenda.Cancelado;
        await _pedidoRepo.UpdateAsync(pedido);
        return pedido;
    }

    public async Task<PedidoVenda> AtualizarPedidoAsync(Guid id, PedidoVenda pedidoAtualizado)
    {
        var pedidoExistente = await GetByIdAsync(id);
        if (pedidoExistente == null) throw new Exception("Pedido não encontrado.");
        
        if (pedidoExistente.Status > StatusPedidoVenda.Separacao)
            throw new Exception("Somente pedidos em Aprovação ou Separação podem ser editados.");

        // 1. Reverter estoque atual (Reservas)
        if (pedidoExistente.Status == StatusPedidoVenda.Separacao)
        {
            foreach (var item in pedidoExistente.Itens)
            {
                var produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
                if (produto != null)
                {
                    produto.QuantidadeEstoque += item.Quantidade;
                    await _produtoRepo.UpdateAsync(produto);
                }
            }
        }

        // 2. Limpar itens antigos
        var itensAntigos = await _itemRepo.FindAsync(i => i.PedidoVendaId == id);
        foreach (var item in itensAntigos)
        {
            await _itemRepo.DeleteAsync(item.Id);
        }

        // 3. Processar novos itens
        pedidoExistente.ClienteId = pedidoAtualizado.ClienteId;
        pedidoExistente.ValorTotal = 0;

        foreach (var item in pedidoAtualizado.Itens)
        {
            var produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
            if (produto == null) throw new Exception("Produto não encontrado.");

            if (pedidoExistente.Status == StatusPedidoVenda.Separacao && produto.QuantidadeEstoque < item.Quantidade)
                throw new Exception($"Estoque insuficiente para {produto.Nome}");

            item.PedidoVendaId = pedidoExistente.Id;
            item.PrecoUnitario = produto.PrecoVenda;
            pedidoExistente.ValorTotal += item.Subtotal;
            
            await _itemRepo.AddAsync(item);

            if (pedidoExistente.Status == StatusPedidoVenda.Separacao)
            {
                produto.QuantidadeEstoque -= item.Quantidade;
                await _produtoRepo.UpdateAsync(produto);
            }
        }

        await _pedidoRepo.UpdateAsync(pedidoExistente);

        // 4. Sincronizar com Financeiro
        var contas = await _contaReceberRepo.FindAsync(c => c.PedidoVendaId == pedidoExistente.Id);
        foreach (var conta in contas)
        {
            conta.Valor = pedidoExistente.ValorTotal;
            await _contaReceberRepo.UpdateAsync(conta);
        }

        return pedidoExistente;
    }

    public async Task ExcluirPedidoAsync(Guid id)
    {
        var pedido = await _pedidoRepo.GetByIdAsync(id);
        if (pedido == null) return;

        if (pedido.Status != StatusPedidoVenda.Novo && pedido.Status != StatusPedidoVenda.Cancelado)
            throw new Exception("Somente pedidos Novos ou Cancelados podem ser excluídos permanentemente.");

        await _pedidoRepo.DeleteAsync(id);
    }

    public async Task<IEnumerable<PedidoVenda>> GetPedidosAsync()
    {
        var pedidos = await _pedidoRepo.GetAllAsync();
        foreach (var p in pedidos)
        {
            p.Cliente = await _clienteRepo.GetByIdAsync(p.ClienteId);
        }
        return pedidos.OrderByDescending(p => p.DataPedido);
    }

    public async Task<PedidoVenda> TogglePagamentoAsync(Guid id)
    {
        var pedido = await _pedidoRepo.GetByIdAsync(id);
        if (pedido == null) throw new Exception("Pedido não encontrado.");

        pedido.Pago = !pedido.Pago;
        await _pedidoRepo.UpdateAsync(pedido);

        // Sincronizar Financeiro
        var contas = await _contaReceberRepo.FindAsync(c => c.PedidoVendaId == pedido.Id);
        foreach (var conta in contas)
        {
            conta.Status = pedido.Pago ? StatusContaReceber.Recebido : StatusContaReceber.Pendente;
            conta.DataRecebimento = pedido.Pago ? DateTime.UtcNow : null;
            await _contaReceberRepo.UpdateAsync(conta);
        }

        return pedido;
    }
}
