using SGPF.Domain.Entities;

namespace SGPF.Application.Interfaces;

public interface IVendaService
{
    Task<PedidoVenda> CriarPedidoAsync(PedidoVenda pedido); // Fluxo antigo, aprovação imediata
    Task<PedidoVenda> CriarPedidoPortalAsync(PedidoVenda pedido); // Novo, pendente
    Task<PedidoVenda> AprovarPedidoAsync(Guid pedidoId); // Aprova o pedido do portal
    Task<PedidoVenda> EntregarPedidoAsync(Guid pedidoId);
    Task<PedidoVenda> AtualizarStatusAsync(Guid id, StatusPedidoVenda novoStatus);
    Task<PedidoVenda> CancelarPedidoAsync(Guid id);
    Task ExcluirPedidoAsync(Guid id);
    Task<PedidoVenda> AtualizarPedidoAsync(Guid id, PedidoVenda pedido);
    Task<PedidoVenda?> GetByIdAsync(Guid id);
    Task<IEnumerable<PedidoVenda>> GetPedidosAsync();
    Task<PedidoVenda> TogglePagamentoAsync(Guid id);
    Task<bool> ConfirmarPagamentoAsync(string numeroPedido);
}
