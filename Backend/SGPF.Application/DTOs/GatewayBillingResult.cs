using System;

namespace SGPF.Application.DTOs;

public class GatewayBillingResult
{
    public bool Sucesso { get; set; }
    public string? BoletoCodigoBarras { get; set; }
    public string? PixQrCode { get; set; }
    public string? TransacaoId { get; set; }
    public string? ErrorMessage { get; set; }
}
