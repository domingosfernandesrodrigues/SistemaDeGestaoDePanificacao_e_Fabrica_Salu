using SGPF.Domain.Entities;

namespace SGPF.Application.Interfaces;

public interface IVendaService
{
    Task<PedidoVenda> CriarPedidoAsync(PedidoVenda pedido); // Fluxo antigo, aprovação imediata
    Task<PedidoVenda> CriarPedidoPortalAsync(PedidoVenda pedido); // Novo, pendente
    Task<PedidoVenda> AprovarPedidoAsync(Guid pedidoId); // Aprova o pedido do portal
    Task<PedidoVenda> EntregarPedidoAsync(Guid pedidoId);
    Task<IEnumerable<PedidoVenda>> GetPedidosAsync();
}
