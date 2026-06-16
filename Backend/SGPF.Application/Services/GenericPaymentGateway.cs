using System;
using System.Linq;
using System.Threading.Tasks;
using SGPF.Application.DTOs;
using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.Application.Services;

public class GenericPaymentGateway : IPaymentGateway
{
    private readonly IRepository<ContaBancaria> _contaBancariaRepo;
    private readonly IRepository<Empresa> _empresaRepo;

    public string ProviderName => "Genérico";

    public GenericPaymentGateway(
        IRepository<ContaBancaria> contaBancariaRepo,
        IRepository<Empresa> empresaRepo)
    {
        _contaBancariaRepo = contaBancariaRepo;
        _empresaRepo = empresaRepo;
    }

    public async Task<GatewayBillingResult> CriarCobrancaAsync(string token, PedidoVenda pedido, Cliente cliente)
    {
        var result = new GatewayBillingResult();
        try
        {
            result.TransacaoId = $"GEN-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";

            var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                            ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
            var empresa = (await _empresaRepo.GetAllAsync()).FirstOrDefault();

            if (pedido.FormaPagamento == FormaPagamento.Boleto)
            {
                var valorEmCentavos = (long)(pedido.ValorTotal * 100);
                result.BoletoCodigoBarras = $"34191.79001 01043.510047 91020.150008 5 9502{valorEmCentavos:D10}";
            }
            else if (pedido.FormaPagamento == FormaPagamento.Pix)
            {
                var chave = contaPadrao?.PixChave ?? "sgpf-generico-pix-key-12345";
                var nomeRecebedor = (empresa?.NomeFantasia ?? "SGPF FABRICA").ToUpper();
                result.PixQrCode = GerarBrCodePix(chave, pedido.ValorTotal, nomeRecebedor);
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

    private static string GerarBrCodePix(string chavePixUrl, decimal valor, string nomeRecebedor)
    {
        var chaveSanitizada = SanitizarChavePix(chavePixUrl);

        nomeRecebedor = nomeRecebedor.Length > 25 ? nomeRecebedor[..25].Trim() : nomeRecebedor;

        var pixKey = $"0014BR.GOV.BCB.PIX01{chaveSanitizada.Length:00}{chaveSanitizada}";
        var mai = $"26{pixKey.Length:00}{pixKey}";

        var valorStr = valor.ToString("F2", System.Globalization.CultureInfo.InvariantCulture);
        var valorField = $"54{valorStr.Length:00}{valorStr}";

        var payload =
            "000201" +
            "010211" +
            mai +
            "52040000" +
            "5303986" +
            valorField +
            "5802BR" +
            $"59{nomeRecebedor.Length:00}{nomeRecebedor}" +
            "6009SAO PAULO" +
            "62070503***" +
            "6304";

        var crc = Crc16Ccitt(payload);
        return payload + crc.ToString("X4");
    }

    private static string SanitizarChavePix(string clean)
    {
        if (Guid.TryParse(clean, out var parsedGuid))
        {
            return parsedGuid.ToString().ToLower();
        }
        return new string(clean.Where(char.IsDigit).ToArray());
    }

    private static ushort Crc16Ccitt(string str)
    {
        const ushort poly = 0x1021;
        ushort crc = 0xFFFF;
        foreach (var c in System.Text.Encoding.UTF8.GetBytes(str))
        {
            crc ^= (ushort)(c << 8);
            for (var i = 0; i < 8; i++)
                crc = (ushort)((crc & 0x8000) != 0 ? (crc << 1) ^ poly : crc << 1);
        }
        return crc;
    }
}
