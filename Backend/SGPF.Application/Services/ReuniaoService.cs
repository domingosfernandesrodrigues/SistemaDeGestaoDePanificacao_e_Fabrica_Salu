using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.Application.Services;

public class ReuniaoService
{
    private readonly IRepository<Reuniao> _reuniaoRepo;

    public ReuniaoService(IRepository<Reuniao> reuniaoRepo)
    {
        _reuniaoRepo = reuniaoRepo;
    }

    public async Task<Reuniao> AgendarReuniaoAsync(Reuniao reuniao)
    {
        reuniao.Status = StatusReuniao.Agendada;
        await _reuniaoRepo.AddAsync(reuniao);
        return reuniao;
    }

    public async Task<Reuniao> ConcluirReuniaoAsync(Guid id, string ata)
    {
        var reuniao = await _reuniaoRepo.GetByIdAsync(id);
        if (reuniao == null) throw new Exception("Reunião não encontrada.");
        
        reuniao.Ata = ata;
        reuniao.Status = StatusReuniao.Realizada;
        await _reuniaoRepo.UpdateAsync(reuniao);
        return reuniao;
    }
}
