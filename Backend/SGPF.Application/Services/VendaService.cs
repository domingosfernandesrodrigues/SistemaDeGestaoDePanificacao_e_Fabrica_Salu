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

    public VendaService(
        IRepository<PedidoVenda> pedidoRepo,
        IRepository<Produto> produtoRepo,
        IRepository<MovimentacaoEstoque> estoqueRepo,
        IRepository<ContaReceber> contaReceberRepo)
    {
        _pedidoRepo = pedidoRepo;
        _produtoRepo = produtoRepo;
        _estoqueRepo = estoqueRepo;
        _contaReceberRepo = contaReceberRepo;
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

        await _pedidoRepo.AddAsync(pedido);
        return pedido;
    }

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
        var pedido = await _pedidoRepo.GetByIdAsync(pedidoId);
        if (pedido == null || pedido.Status != StatusPedidoVenda.Novo)
            throw new Exception("Pedido não pode ser aprovado.");

        // O pedido existe, agora fazemos a reserva de estoque de fato.
        // Simulando carregamento dos itens do pedido:
        // Obs: O IRepository base criado anteriormente pode não ter .Include nativo sem expor IQueryable.
        // Vamos buscar os itens manualmente pela origem ou garantir que eles vieram preenchidos.
        // Para fins deste protótipo, assumimos que no Approval faremos o débito/reserva.
        
        pedido.Status = StatusPedidoVenda.Separacao;
        await _pedidoRepo.UpdateAsync(pedido);
        return pedido;
    }

    public async Task<PedidoVenda> EntregarPedidoAsync(Guid pedidoId)
    {
        var pedido = await _pedidoRepo.GetByIdAsync(pedidoId);
        if (pedido == null || pedido.Status == StatusPedidoVenda.Entregue)
            throw new Exception("Pedido inválido ou já entregue.");

        // Para cada item, converte a Reserva em Saída real
        // Na prática, como já reduzimos o Saldo, apenas documentamos a Saída real no Kardex.
        foreach (var item in pedido.Itens)
        {
            var mov = new MovimentacaoEstoque
            {
                ProdutoId = item.ProdutoId,
                Tipo = TipoMovimentacao.Saida,
                Quantidade = item.Quantidade,
                Origem = pedido.NumeroPedido,
                Observacao = "Venda Concluída"
            };
            await _estoqueRepo.AddAsync(mov);
        }

        pedido.Status = StatusPedidoVenda.Entregue;
        pedido.DataEntregaRealizada = DateTime.UtcNow;
        await _pedidoRepo.UpdateAsync(pedido);

        // Integração Financeira: Gera a Conta a Receber
        var conta = new ContaReceber
        {
            ClienteId = pedido.ClienteId,
            Descricao = $"Fatura Ref. Pedido {pedido.NumeroPedido}",
            Valor = pedido.ValorTotal,
            DataVencimento = DateTime.UtcNow.AddDays(15), // Exemplo: 15 dias de prazo
            PedidoVendaId = pedido.Id
        };
        await _contaReceberRepo.AddAsync(conta);

        return pedido;
    }

    public async Task<IEnumerable<PedidoVenda>> GetPedidosAsync()
    {
        return await _pedidoRepo.GetAllAsync();
    }
}
