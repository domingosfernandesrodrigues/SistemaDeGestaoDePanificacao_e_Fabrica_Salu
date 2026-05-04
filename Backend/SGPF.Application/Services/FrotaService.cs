using SGPF.Domain.Entities;
using SGPF.Application.Interfaces;
using SGPF.Domain.Interfaces;

namespace SGPF.Application.Services;

public class FrotaService
{
    private readonly IRepository<Abastecimento> _abastRepo;
    private readonly IRepository<ManutencaoVeiculo> _manuRepo;
    private readonly IRepository<Veiculo> _veiculoRepo;

    public FrotaService(
        IRepository<Abastecimento> abastRepo,
        IRepository<ManutencaoVeiculo> manuRepo,
        IRepository<Veiculo> veiculoRepo)
    {
        _abastRepo = abastRepo;
        _manuRepo = manuRepo;
        _veiculoRepo = veiculoRepo;
    }

    public async Task<Abastecimento> RegistrarAbastecimentoAsync(Abastecimento abastecimento)
    {
        var veiculo = await _veiculoRepo.GetByIdAsync(abastecimento.VeiculoId);
        if (veiculo != null && abastecimento.QuilometragemRegistrada > veiculo.QuilometragemAtual)
        {
            veiculo.QuilometragemAtual = abastecimento.QuilometragemRegistrada;
            await _veiculoRepo.UpdateAsync(veiculo);
        }
        await _abastRepo.AddAsync(abastecimento);
        return abastecimento;
    }

    public async Task<ManutencaoVeiculo> RegistrarManutencaoAsync(ManutencaoVeiculo manutencao)
    {
        var veiculo = await _veiculoRepo.GetByIdAsync(manutencao.VeiculoId);
        if (veiculo != null && manutencao.QuilometragemRegistrada > veiculo.QuilometragemAtual)
        {
            veiculo.QuilometragemAtual = manutencao.QuilometragemRegistrada;
            await _veiculoRepo.UpdateAsync(veiculo);
        }
        await _manuRepo.AddAsync(manutencao);
        return manutencao;
    }
}
