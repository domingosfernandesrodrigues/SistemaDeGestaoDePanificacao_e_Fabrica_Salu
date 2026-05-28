using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Application.Interfaces;
using SGPF.Domain.Interfaces;
using SGPF.Domain.Entities;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class PagamentosController : ControllerBase
{
    private readonly IVendaService _vendaService;
    private readonly IRepository<ContaBancaria> _contaBancariaRepo;
    private readonly IRepository<Empresa> _empresaRepo;

    public PagamentosController(
        IVendaService vendaService,
        IRepository<ContaBancaria> contaBancariaRepo,
        IRepository<Empresa> empresaRepo)
    {
        _vendaService = vendaService;
        _contaBancariaRepo = contaBancariaRepo;
        _empresaRepo = empresaRepo;
    }

    /// <summary>
    /// Webhook unificado para receber as notificações de pagamento em tempo real do gateway de pagamentos (Asaas, Mercado Pago, etc.).
    /// Funciona de forma totalmente genérica, realizando a baixa automática do pedido na base de dados.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("webhook/gateway")]
    [HttpPost("webhook/asaas")] // Mantém compatibilidade retroativa absoluta
    public async Task<IActionResult> WebhookGateway([FromBody] GatewayWebhookRequest request)
    {
        // 1. Recupera o token configurado no banco de dados (Conta Bancária Padrão ou Empresa)
        var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault();
        var empresa = (await _empresaRepo.GetAllAsync()).FirstOrDefault();
        var tokenDefinido = contaPadrao?.GatewayToken ?? empresa?.GatewayToken;

        // Limpa os prefixos comuns para comparação uniforme
        string? cleanTokenDefinido = null;
        if (!string.IsNullOrWhiteSpace(tokenDefinido))
        {
            cleanTokenDefinido = tokenDefinido;
            if (tokenDefinido.StartsWith("sandbox:", StringComparison.OrdinalIgnoreCase))
                cleanTokenDefinido = tokenDefinido.Substring("sandbox:".Length);
            else if (tokenDefinido.StartsWith("test:", StringComparison.OrdinalIgnoreCase))
                cleanTokenDefinido = tokenDefinido.Substring("test:".Length);
            else if (tokenDefinido.StartsWith("$$"))
                cleanTokenDefinido = tokenDefinido.Substring(1);
        }

        // 2. Extrai o token recebido da requisição HTTP (suporta múltiplos cabeçalhos possíveis de gateway)
        string? receivedToken = null;
        if (Request.Headers.TryGetValue("x-gateway-token", out var headerVal))
            receivedToken = headerVal.ToString();
        else if (Request.Headers.TryGetValue("asaas-access-token", out headerVal))
            receivedToken = headerVal.ToString();
        else if (Request.Headers.TryGetValue("x-api-token", out headerVal))
            receivedToken = headerVal.ToString();
        else if (Request.Headers.TryGetValue("Authorization", out headerVal))
        {
            var authHeader = headerVal.ToString();
            if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                receivedToken = authHeader.Substring("Bearer ".Length).Trim();
            else
                receivedToken = authHeader.Trim();
        }

        // 3. Validação do Token (Tolerante com Warning se não estiver configurado)
        bool hasValidConfigToken = !string.IsNullOrWhiteSpace(cleanTokenDefinido) &&
                                   cleanTokenDefinido != "SUA-CHAVE-ASAAS" &&
                                   cleanTokenDefinido != "TOKEN-API-GATEWAY-EXEMPLO";

        if (hasValidConfigToken)
        {
            if (string.IsNullOrEmpty(receivedToken) || 
                (receivedToken != tokenDefinido && receivedToken != cleanTokenDefinido))
            {
                Console.WriteLine($"[GATEWAY WEBHOOK] Tentativa de acesso não autorizada. Token inválido.");
                return Unauthorized(new { message = "Token de autenticação inválido para o Gateway." });
            }
        }
        else
        {
            Console.WriteLine($"[GATEWAY WEBHOOK] [WARNING] Validação de token ignorada: Nenhum token de gateway válido configurado no sistema (Conta Bancária Padrão ou Empresa).");
        }

        // 4. Verifica se o evento de pagamento foi concluído com sucesso
        // Suporta eventos do Asaas (PAYMENT_RECEIVED, PAYMENT_CONFIRMED) ou genéricos (success, approved)
        string evt = request.Event.ToUpper();
        if (evt == "PAYMENT_RECEIVED" || evt == "PAYMENT_CONFIRMED" || evt == "SUCCESS" || evt == "APPROVED")
        {
            var externalReference = request.GetExternalReference();

            if (string.IsNullOrEmpty(externalReference))
            {
                return BadRequest(new { message = "Referência externa (externalReference) vazia ou nula." });
            }

            // Captura de dados financeiros enriquecidos do gateway
            decimal? valorLiquido = request.Payment?.NetValue;
            string? transacaoId = request.Payment?.Id;
            DateTime? dataPagamento = request.Payment?.GetPaymentDateTime();

            // 5. Executa a baixa automática do pedido na nossa base de dados com as informações financeiras completas
            var sucesso = await _vendaService.ConfirmarPagamentoAsync(externalReference, valorLiquido, transacaoId, dataPagamento);
            if (sucesso)
            {
                Console.WriteLine($"[GATEWAY WEBHOOK] Pagamento do pedido {externalReference} confirmado automaticamente!");
                return Ok(new { message = "Sucesso", externalReference });
            }
            else
            {
                Console.WriteLine($"[GATEWAY WEBHOOK] Pedido {externalReference} não encontrado para baixa.");
                return NotFound(new { message = "Pedido não encontrado", externalReference });
            }
        }

        // Retorna 200 para eventos que não precisamos processar para evitar que o gateway fique reenviando
        return Ok(new { message = "Evento ignorado ou não processado para baixa", @event = request.Event });
    }
}

#region Classes de Mapeamento do Gateway Webhook

public class GatewayWebhookRequest
{
    public string Event { get; set; } = string.Empty;
    public GatewayPaymentInfo? Payment { get; set; }
    
    // Suporte para referência externa diretamente na raiz se enviado por outro gateway
    public string? ExternalReference { get; set; }

    public string GetExternalReference()
    {
        return !string.IsNullOrEmpty(ExternalReference) 
            ? ExternalReference 
            : (Payment?.ExternalReference ?? string.Empty);
    }
}

public class GatewayPaymentInfo
{
    public string Id { get; set; } = string.Empty;
    public string ExternalReference { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public string Status { get; set; } = string.Empty;

    // Propriedades financeiras avançadas (genéricas e do Asaas)
    public decimal? NetValue { get; set; }
    public decimal? Fee { get; set; }
    public string? PaymentDate { get; set; }
    public string? ClientPaymentDate { get; set; }

    /// <summary>
    /// Converte de forma segura as strings de data do gateway em objetos DateTime utilizáveis
    /// </summary>
    public DateTime? GetPaymentDateTime()
    {
        if (!string.IsNullOrEmpty(ClientPaymentDate) && DateTime.TryParse(ClientPaymentDate, out var dtClient))
            return dtClient;
        if (!string.IsNullOrEmpty(PaymentDate) && DateTime.TryParse(PaymentDate, out var dtPayment))
            return dtPayment;
        return null;
    }
}

#endregion

