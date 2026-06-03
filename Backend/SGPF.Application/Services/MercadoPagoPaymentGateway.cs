using System;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using SGPF.Application.DTOs;
using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.Application.Services;

public class MercadoPagoPaymentGateway : IPaymentGateway
{
    private readonly IRepository<Empresa> _empresaRepo;

    public MercadoPagoPaymentGateway(IRepository<Empresa> empresaRepo)
    {
        _empresaRepo = empresaRepo;
    }

    public string ProviderName => "Mercado Pago";

    public async Task<GatewayBillingResult> CriarCobrancaAsync(string token, PedidoVenda pedido, Cliente cliente)
    {
        var result = new GatewayBillingResult();
        try
        {
            string cleanToken = token;
            if (token.StartsWith("mercadopago:", StringComparison.OrdinalIgnoreCase))
            {
                cleanToken = token.Substring("mercadopago:".Length);
            }
            else if (token.StartsWith("mp:", StringComparison.OrdinalIgnoreCase))
            {
                cleanToken = token.Substring("mp:".Length);
            }
            else if (token.StartsWith("sandbox:mp:", StringComparison.OrdinalIgnoreCase))
            {
                cleanToken = token.Substring("sandbox:mp:".Length);
            }
            else if (token.StartsWith("sandbox:mercadopago:", StringComparison.OrdinalIgnoreCase))
            {
                cleanToken = token.Substring("sandbox:mercadopago:".Length);
            }

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", cleanToken);
            client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
            
            // Adiciona chave de idempotência para evitar cobranças duplicadas em caso de retransmissão
            client.DefaultRequestHeaders.Add("X-Idempotency-Key", Guid.NewGuid().ToString());

            var cpfCnpjLimpo = new string(cliente.CNPJ_CPF.Where(char.IsDigit).ToArray());

            // Busca o e-mail corporativo configurado nas Configurações da Empresa
            var empresa = (await _empresaRepo.GetAllAsync()).FirstOrDefault();
            var emailPayer = !string.IsNullOrWhiteSpace(empresa?.Email)
                ? empresa!.Email
                : "vendas@sgpf-salu.com.br";
            
            var nameParts = (cliente.NomeFantasia ?? cliente.RazaoSocial ?? "Cliente").Split(' ');
            var firstName = nameParts[0];
            var lastName = nameParts.Length > 1 ? string.Join(" ", nameParts.Skip(1)) : "Salu";

            // Mercado Pago exige CPF ou CNPJ formatado no tipo correto
            var docType = cpfCnpjLimpo.Length > 11 ? "CNPJ" : "CPF";

            var paymentPayload = new
            {
                transaction_amount = (double)pedido.ValorTotal,
                description = $"Pedido {pedido.NumeroPedido} - {cliente.NomeFantasia}",
                payment_method_id = pedido.FormaPagamento == FormaPagamento.Boleto ? "bolbradesco" : "pix",
                payer = new
                {
                    email = emailPayer,
                    first_name = firstName,
                    last_name = lastName,
                    identification = new
                    {
                        type = docType,
                        number = cpfCnpjLimpo
                    }
                }
            };

            var content = new StringContent(JsonSerializer.Serialize(paymentPayload), Encoding.UTF8, "application/json");
            var response = await client.PostAsync("https://api.mercadopago.com/v1/payments", content);

            var responseStr = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"Falha ao criar cobrança no Mercado Pago. Status: {response.StatusCode}. Detalhes: {responseStr}");
            }

            using var doc = JsonDocument.Parse(responseStr);
            var root = doc.RootElement;

            if (root.TryGetProperty("id", out var idProp))
            {
                // Mapeia o ID da transação
                if (idProp.ValueKind == JsonValueKind.Number)
                    result.TransacaoId = idProp.GetInt64().ToString();
                else if (idProp.ValueKind == JsonValueKind.String)
                    result.TransacaoId = idProp.GetString();
            }

            if (pedido.FormaPagamento == FormaPagamento.Boleto)
            {
                // Extrair código de barras
                if (root.TryGetProperty("barcode", out var barcodeProp) && 
                    barcodeProp.TryGetProperty("content", out var barcodeContentProp) && 
                    barcodeContentProp.ValueKind == JsonValueKind.String)
                {
                    result.BoletoCodigoBarras = barcodeContentProp.GetString();
                }
                else if (root.TryGetProperty("transaction_details", out var detailsProp))
                {
                    if (detailsProp.TryGetProperty("barcode", out var altBarcodeProp) && altBarcodeProp.ValueKind == JsonValueKind.String)
                    {
                        result.BoletoCodigoBarras = altBarcodeProp.GetString();
                    }
                    else if (detailsProp.TryGetProperty("verification_code", out var verifCodeProp) && verifCodeProp.ValueKind == JsonValueKind.String)
                    {
                        result.BoletoCodigoBarras = verifCodeProp.GetString();
                    }
                }

                // Fallback caso não venha código de barras, usamos o link do boleto
                if (string.IsNullOrWhiteSpace(result.BoletoCodigoBarras) && 
                    root.TryGetProperty("transaction_details", out var detProp) &&
                    detProp.TryGetProperty("external_resource_url", out var urlProp) && 
                    urlProp.ValueKind == JsonValueKind.String)
                {
                    result.BoletoCodigoBarras = urlProp.GetString(); // Salva URL para visualização
                }

                if (string.IsNullOrWhiteSpace(result.BoletoCodigoBarras))
                {
                    throw new Exception("Não foi retornado código de barras ou link do boleto do Mercado Pago.");
                }
            }
            else if (pedido.FormaPagamento == FormaPagamento.Pix)
            {
                // Extrair payload do Pix
                if (root.TryGetProperty("point_of_interaction", out var poiProp) &&
                    poiProp.TryGetProperty("transaction_data", out var tdProp) &&
                    tdProp.TryGetProperty("qr_code", out var qrProp) &&
                    qrProp.ValueKind == JsonValueKind.String)
                {
                    result.PixQrCode = qrProp.GetString();
                }
                else
                {
                    throw new Exception("Resposta do Mercado Pago não contém o payload (copia e cola) do PIX.");
                }
            }

            result.Sucesso = true;
        }
        catch (Exception ex)
        {
            result.Sucesso = false;
            result.ErrorMessage = ex.Message;
        }

        return result;
    }
}
