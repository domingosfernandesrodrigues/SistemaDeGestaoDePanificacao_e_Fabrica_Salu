using SGPF.Domain.Entities;
using SGPF.Application.Interfaces;
using SGPF.Domain.Interfaces;
using System.Linq;

namespace SGPF.Application.Services;

public class FrotaService
{
    private readonly IRepository<Abastecimento> _abastRepo;
    private readonly IRepository<ManutencaoVeiculo> _manuRepo;
    private readonly IRepository<Veiculo> _veiculoRepo;
    private readonly IRepository<ContaPagar> _pagarRepo;
    private readonly IRepository<ContaBancaria> _contaBancariaRepo;
    private readonly IRepository<MovimentacaoBancaria> _movimentacaoRepo;

    public FrotaService(
        IRepository<Abastecimento> abastRepo,
        IRepository<ManutencaoVeiculo> manuRepo,
        IRepository<Veiculo> veiculoRepo,
        IRepository<ContaPagar> pagarRepo,
        IRepository<ContaBancaria> contaBancariaRepo,
        IRepository<MovimentacaoBancaria> movimentacaoRepo)
    {
        _abastRepo = abastRepo;
        _manuRepo = manuRepo;
        _veiculoRepo = veiculoRepo;
        _pagarRepo = pagarRepo;
        _contaBancariaRepo = contaBancariaRepo;
        _movimentacaoRepo = movimentacaoRepo;
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

        // Integração Financeira: Abastecimento gera uma ContaPagar automática já PAGA
        var contaPagar = new ContaPagar
        {
            Descricao = $"Abastecimento Veículo: {veiculo?.Modelo ?? "Frota"} ({veiculo?.Placa ?? "N/A"}) - {abastecimento.Litros:N2}L",
            Valor = abastecimento.ValorTotal,
            DataEmissao = DateTime.UtcNow,
            DataVencimento = DateTime.UtcNow,
            DataPagamento = DateTime.UtcNow,
            Status = StatusContaPagar.Paga,
            Categoria = "Operacional (Frota)"
        };
        await _pagarRepo.AddAsync(contaPagar);

        // Conciliação automática: Debita o valor do saldo da conta bancária padrão (ou primeira ativa como fallback)
        var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                        ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
        if (contaPadrao != null)
        {
            contaPadrao.SaldoAtual -= abastecimento.ValorTotal;
            await _contaBancariaRepo.UpdateAsync(contaPadrao);

            // Gravar movimentação histórica
            await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
            {
                ContaBancariaId = contaPadrao.Id,
                Tipo = "saida",
                Valor = abastecimento.ValorTotal,
                Descricao = $"Abastecimento Veículo - {veiculo?.Placa ?? "N/A"}",
                DataMovimentacao = DateTime.UtcNow,
                Origem = OrigemMovimentacao.FrotaAbastecimento,
                ReferenciaId = abastecimento.Id
            });
        }

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

        // Integração Financeira: Manutenção gera uma ContaPagar automática já PAGA
        var contaPagar = new ContaPagar
        {
            Descricao = $"Manutenção {manutencao.Tipo} Veículo: {veiculo?.Modelo ?? "Frota"} ({veiculo?.Placa ?? "N/A"})",
            Valor = manutencao.CustoTotal,
            DataEmissao = DateTime.UtcNow,
            DataVencimento = DateTime.UtcNow,
            DataPagamento = DateTime.UtcNow,
            Status = StatusContaPagar.Paga,
            Categoria = "Operacional (Frota)"
        };
        await _pagarRepo.AddAsync(contaPagar);

        // Conciliação automática: Debita o valor do saldo da conta bancária padrão (ou primeira ativa como fallback)
        var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                        ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
        if (contaPadrao != null)
        {
            contaPadrao.SaldoAtual -= manutencao.CustoTotal;
            await _contaBancariaRepo.UpdateAsync(contaPadrao);

            // Gravar movimentação histórica
            await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
            {
                ContaBancariaId = contaPadrao.Id,
                Tipo = "saida",
                Valor = manutencao.CustoTotal,
                Descricao = $"Manutenção Veículo {manutencao.Tipo} - {veiculo?.Placa ?? "N/A"}",
                DataMovimentacao = DateTime.UtcNow,
                Origem = OrigemMovimentacao.FrotaManutencao,
                ReferenciaId = manutencao.Id
            });
        }

        return manutencao;
    }
}
