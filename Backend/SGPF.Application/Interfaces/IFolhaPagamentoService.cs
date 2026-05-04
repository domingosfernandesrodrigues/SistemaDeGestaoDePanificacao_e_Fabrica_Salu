using SGPF.Domain.Entities;

namespace SGPF.Application.Interfaces;

public interface IFolhaPagamentoService
{
    Task<List<FolhaPagamento>> ProcessarFolhaAsync(int mes, int ano);
    Task<FolhaPagamento> FecharFolhaAsync(Guid folhaId);
    Task<byte[]> GerarContrachequePdfAsync(Guid folhaId);
}
