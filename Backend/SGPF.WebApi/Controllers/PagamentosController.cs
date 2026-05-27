using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Application.Interfaces;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class PagamentosController : ControllerBase
{
    private readonly IVendaService _vendaService;

    public PagamentosController(IVendaService vendaService)
    {
        _vendaService = vendaService;
    }

    /// <summary>
    /// Webhook para receber as notificações de pagamento em tempo real do Asaas.
    /// Funciona para qualquer banco onde o cliente pagar, pois o Asaas concilia e nos avisa.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("webhook/asaas")]
    public async Task<IActionResult> WebhookAsaas([FromBody] AsaasWebhookRequest request)
    {
        // 1. Opcional: Validar token de segurança configurado no painel do Asaas
        // Para evitar fraudes, você pode cadastrar um token no painel do Asaas e compará-lo aqui.
        if (Request.Headers.TryGetValue("asaas-access-token", out var receivedToken))
        {
            // Exemplo de verificação (descomente quando cadastrar o token real no painel do Asaas):
            // string tokenDefinido = "SEU_TOKEN_DE_SEGURANCA_AQUI";
            // if (receivedToken != tokenDefinido) return Unauthorized(new { message = "Token inválido" });
        }

        // 2. Verifica se o evento de pagamento foi concluído com sucesso
        // O Asaas envia "PAYMENT_RECEIVED" (Pix/Boleto pago) ou "PAYMENT_CONFIRMED" (Boleto compensado)
        if (request.Event == "PAYMENT_RECEIVED" || request.Event == "PAYMENT_CONFIRMED")
        {
            var externalReference = request.Payment?.ExternalReference;

            if (string.IsNullOrEmpty(externalReference))
            {
                return BadRequest(new { message = "Referência externa (externalReference) vazia ou nula." });
            }

            // 3. Executa a baixa automática do pedido na nossa base de dados
            // O externalReference deve conter o Número do Pedido (Ex: PED-20260524171635)
            var sucesso = await _vendaService.ConfirmarPagamentoAsync(externalReference);
            if (sucesso)
            {
                Console.WriteLine($"[ASAAS WEBHOOK] Pagamento do pedido {externalReference} confirmado automaticamente!");
                return Ok(new { message = "Sucesso", externalReference });
            }
            else
            {
                Console.WriteLine($"[ASAAS WEBHOOK] Pedido {externalReference} não encontrado para baixa.");
                return NotFound(new { message = "Pedido não encontrado", externalReference });
            }
        }

        // Retorna 200 para eventos que não precisamos processar (ex: PAYMENT_CREATED, etc.)
        // para que o Asaas não fique reenviando a mesma notificação repetidamente
        return Ok(new { message = "Evento ignorado", @event = request.Event });
    }
}

#region Classes de Mapeamento do Asaas Webhook

public class AsaasWebhookRequest
{
    public string Event { get; set; } = string.Empty;
    public AsaasPaymentInfo? Payment { get; set; }
}

public class AsaasPaymentInfo
{
    public string Id { get; set; } = string.Empty;
    public string ExternalReference { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public string Status { get; set; } = string.Empty;
}

#endregion
