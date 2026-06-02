using SGPF.Domain.Entities;

namespace SGPF.Application.Interfaces;

public interface IFolhaPagamentoService
{
    Task<List<FolhaPagamento>> ProcessarFolhaAsync(int mes, int ano, TipoFolha tipo = TipoFolha.Mensal);
    Task<FolhaPagamento> FecharFolhaAsync(Guid folhaId);
    Task<byte[]> GerarContrachequePdfAsync(Guid folhaId);
    Task<int> ContarFeriasProximoMesAsync(int mesAtual, int anoAtual);
}
