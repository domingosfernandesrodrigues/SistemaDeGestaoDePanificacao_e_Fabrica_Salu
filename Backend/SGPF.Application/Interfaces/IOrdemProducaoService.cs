using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.Application.Interfaces;

public interface IOrdemProducaoService
{
    Task<OrdemProducao> StartOPAsync(Guid opId, Guid usuarioId);
    Task<OrdemProducao> FinishOPAsync(Guid opId, List<OrdemProducaoInsumo> insumosConsumidosReais, Guid usuarioId);
}
