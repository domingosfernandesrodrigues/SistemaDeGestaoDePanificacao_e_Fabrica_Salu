using System.Threading.Tasks;
using SGPF.Application.DTOs;
using SGPF.Domain.Entities;

namespace SGPF.Application.Interfaces;

public interface IPaymentGateway
{
    string ProviderName { get; }
    Task<GatewayBillingResult> CriarCobrancaAsync(string token, PedidoVenda pedido, Cliente cliente);
}
