using System;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using SGPF.Application.DTOs;
using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;

namespace SGPF.Application.Services;

public class AsaasPaymentGateway : IPaymentGateway
{
    public string ProviderName => "Asaas";

    public async Task<GatewayBillingResult> CriarCobrancaAsync(string token, PedidoVenda pedido, Cliente cliente)
    {
        var result = new GatewayBillingResult();
        try
        {
            bool isSandbox = false;
            string cleanToken = token;

            if (token.StartsWith("sandbox:", StringComparison.OrdinalIgnoreCase))
            {
                isSandbox = true;
                cleanToken = token.Substring("sandbox:".Length);
            }
            else if (token.StartsWith("test:", StringComparison.OrdinalIgnoreCase))
            {
                isSandbox = true;
                cleanToken = token.Substring("test:".Length);
            }
            else if (token.StartsWith("$$"))
            {
                isSandbox = true;
                cleanToken = token.Substring(1);
            }
            else if (token.StartsWith("asaas:", StringComparison.OrdinalIgnoreCase))
            {
                cleanToken = token.Substring("asaas:".Length);
            }
            else if (token.StartsWith("sandbox:asaas:", StringComparison.OrdinalIgnoreCase))
            {
                isSandbox = true;
                cleanToken = token.Substring("sandbox:asaas:".Length);
            }

            string baseUrl = isSandbox ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/api/v3";

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("access_token", cleanToken);
            client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

            var cpfCnpjLimpo = new string(cliente.CNPJ_CPF.Where(char.IsDigit).ToArray());

            // 1. Verificar se o cliente já existe no Asaas
            string? customerId = null;
            var searchUrl = $"{baseUrl}/customers?cpfCnpj={cpfCnpjLimpo}";

            try
            {
                var searchResponse = await client.GetAsync(searchUrl);
                if (searchResponse.IsSuccessStatusCode)
                {
                    var searchResponseStr = await searchResponse.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(searchResponseStr);
                    var dataProp = doc.RootElement.GetProperty("data");
                    if (dataProp.ValueKind == JsonValueKind.Array && dataProp.GetArrayLength() > 0)
                    {
                        customerId = dataProp[0].GetProperty("id").GetString();
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ASAAS CUSTOMER SEARCH ERROR] {ex.Message}");
            }

            // 2. Se não existir, cadastrar o cliente
            if (string.IsNullOrEmpty(customerId))
            {
                var customerPayload = new
                {
                    name = string.IsNullOrWhiteSpace(cliente.RazaoSocial) ? cliente.NomeFantasia : cliente.RazaoSocial,
                    cpfCnpj = cpfCnpjLimpo,
                    phone = new string((cliente.Telefone ?? "").Where(char.IsDigit).ToArray()),
                    notificationDisabled = true
                };

                var customerContent = new StringContent(JsonSerializer.Serialize(customerPayload), Encoding.UTF8, "application/json");
                var createResponse = await client.PostAsync($"{baseUrl}/customers", customerContent);
                if (!createResponse.IsSuccessStatusCode)
                {
                    var errorStr = await createResponse.Content.ReadAsStringAsync();
                    throw new Exception($"Falha ao cadastrar cliente no Asaas. HTTP Status: {createResponse.StatusCode}. Detalhes: {errorStr}");
                }

                var createResponseStr = await createResponse.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(createResponseStr);
                customerId = doc.RootElement.GetProperty("id").GetString();
            }

            if (string.IsNullOrEmpty(customerId))
            {
                throw new Exception("Não foi possível resolver o ID do cliente no Asaas.");
            }

            // 3. Criar a cobrança (BOLETO ou PIX)
            var billingTypeStr = pedido.FormaPagamento == FormaPagamento.Boleto ? "BOLETO" : "PIX";
            var paymentPayload = new
            {
                customer = customerId,
                billingType = billingTypeStr,
                value = pedido.ValorTotal,
                dueDate = DateTime.Now.AddDays(15).ToString("yyyy-MM-dd"),
                externalReference = pedido.NumeroPedido,
                description = $"Pedido {pedido.NumeroPedido} - {cliente.NomeFantasia}"
            };

            var paymentContent = new StringContent(JsonSerializer.Serialize(paymentPayload), Encoding.UTF8, "application/json");
            var paymentResponse = await client.PostAsync($"{baseUrl}/payments", paymentContent);
            if (!paymentResponse.IsSuccessStatusCode)
            {
                var errorStr = await paymentResponse.Content.ReadAsStringAsync();
                throw new Exception($"Falha ao criar pagamento no Asaas. HTTP Status: {paymentResponse.StatusCode}. Detalhes: {errorStr}");
            }

            var paymentResponseStr = await paymentResponse.Content.ReadAsStringAsync();
            using (var doc = JsonDocument.Parse(paymentResponseStr))
            {
                var root = doc.RootElement;
                result.TransacaoId = root.GetProperty("id").GetString();

                if (pedido.FormaPagamento == FormaPagamento.Boleto)
                {
                    if (root.TryGetProperty("identificationField", out var idFieldProp) && idFieldProp.ValueKind == JsonValueKind.String)
                    {
                        result.BoletoCodigoBarras = idFieldProp.GetString();
                    }
                    else if (root.TryGetProperty("barCode", out var barCodeProp) && barCodeProp.ValueKind == JsonValueKind.String)
                    {
                        result.BoletoCodigoBarras = barCodeProp.GetString();
                    }

                    if (string.IsNullOrWhiteSpace(result.BoletoCodigoBarras))
                    {
                        throw new Exception("Não foi retornado código de barras ou linha digitável do Asaas.");
                    }
                }
                else if (pedido.FormaPagamento == FormaPagamento.Pix)
                {
                    var paymentId = result.TransacaoId;
                    if (string.IsNullOrEmpty(paymentId))
                    {
                        throw new Exception("Não foi retornado o ID da transação Pix do Asaas.");
                    }

                    var pixResponse = await client.GetAsync($"{baseUrl}/payments/{paymentId}/pixQrCode");
                    if (!pixResponse.IsSuccessStatusCode)
                    {
                        throw new Exception($"Falha ao recuperar Pix QR Code do Asaas. HTTP Status: {pixResponse.StatusCode}");
                    }

                    var pixResponseStr = await pixResponse.Content.ReadAsStringAsync();
                    using var pixDoc = JsonDocument.Parse(pixResponseStr);
                    var pixRoot = pixDoc.RootElement;
                    if (pixRoot.TryGetProperty("payload", out var payloadProp) && payloadProp.ValueKind == JsonValueKind.String)
                    {
                        result.PixQrCode = payloadProp.GetString();
                    }
                    else
                    {
                        throw new Exception("Resposta do Pix QR Code não contém o payload (copia e cola).");
                    }
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
