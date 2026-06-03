using System;
using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.Application.Services;

public class PaymentGatewayFactory
{
    private readonly IRepository<ContaBancaria> _contaBancariaRepo;
    private readonly IRepository<Empresa> _empresaRepo;

    public PaymentGatewayFactory(
        IRepository<ContaBancaria> contaBancariaRepo,
        IRepository<Empresa> empresaRepo)
    {
        _contaBancariaRepo = contaBancariaRepo;
        _empresaRepo = empresaRepo;
    }

    public IPaymentGateway ObterGateway(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return new GenericPaymentGateway(_contaBancariaRepo, _empresaRepo);
        }

        // Mercado Pago check
        if (token.StartsWith("mp:", StringComparison.OrdinalIgnoreCase) ||
            token.StartsWith("mercadopago:", StringComparison.OrdinalIgnoreCase) ||
            token.StartsWith("sandbox:mp:", StringComparison.OrdinalIgnoreCase) ||
            token.StartsWith("sandbox:mercadopago:", StringComparison.OrdinalIgnoreCase) ||
            token.StartsWith("APP_USR-", StringComparison.OrdinalIgnoreCase) ||
            token.StartsWith("TEST-", StringComparison.OrdinalIgnoreCase))
        {
            return new MercadoPagoPaymentGateway(_empresaRepo);
        }

        // Generic / Mock check
        if (token.StartsWith("generic:", StringComparison.OrdinalIgnoreCase) ||
            token.StartsWith("mock:", StringComparison.OrdinalIgnoreCase) ||
            token == "TOKEN-API-GATEWAY-EXEMPLO" ||
            token == "SUA-CHAVE-ASAAS")
        {
            return new GenericPaymentGateway(_contaBancariaRepo, _empresaRepo);
        }

        // Default / Asaas
        return new AsaasPaymentGateway();
    }
}
