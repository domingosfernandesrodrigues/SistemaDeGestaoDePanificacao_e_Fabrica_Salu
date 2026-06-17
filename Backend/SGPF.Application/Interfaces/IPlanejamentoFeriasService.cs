using SGPF.Domain.Entities;

namespace SGPF.Application.Interfaces;

public interface IPlanejamentoFeriasService
{
    Task<List<PlanejamentoFeriasDto>> GetAllAsync();
    Task<PlanejamentoFeriasDto?> GetByIdAsync(Guid id);
    Task<List<PlanejamentoFeriasDto>> GetByFuncionarioAsync(Guid funcionarioId);
    Task<List<PlanejamentoFeriasDto>> ConsultarPorMesAsync(int mes, int ano);

    /// <summary>
    /// Cria 1 planejamento (Total) ou até 3 (parcelado).
    /// Retorna a lista dos planejamentos criados.
    /// </summary>
    Task<List<PlanejamentoFeriasDto>> CreateAsync(CriarPlanejamentoFeriasRequest request);

    Task<PlanejamentoFeriasDto> UpdateAsync(Guid id, AtualizarPlanejamentoFeriasRequest request);
    Task CancelAsync(Guid id, string? motivo);
    Task ApproveAsync(Guid id);
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

public record PlanejamentoFeriasDto(
    Guid Id,
    Guid FuncionarioId,
    string FuncionarioNome,
    DateTime DataInicio,
    DateTime DataFim,
    int DiasFerias,
    int DiasEfetivosGozo,
    TipoParcelamentoFerias TipoParcelamento,
    bool SolicitaAbono,
    int DiasAbono,
    bool SolicitaAdiantamentoDecimoTerceiro,
    decimal ValorAdiantamentoDecimoTerceiro,
    StatusPlanejamentoFerias Status,
    DateTime PeriodoAquisitivoInicio,
    DateTime PeriodoAquisitivoFim,
    DateTime PeriodoConcessivoFim,
    decimal ValorRemFeriasBruto,
    decimal ValorTercoConstitucional,
    decimal ValorAbonoFeriasVendidas,
    decimal ValorTotalBruto,
    string? Observacao,
    DateTime DataCriacao,
    bool PeriodoConcessivoVencido  // Sinaliza férias em dobro (CLT Art. 146)
);

/// <summary>
/// Request de criação. Ao parcelar, o backend cria até 3 planejamentos automaticamente.
/// </summary>
public record CriarPlanejamentoFeriasRequest(
    Guid FuncionarioId,
    bool Parcelado,                    // true = criar 3 períodos
    // Parcela 1 (ou período integral)
    DateTime DataInicioP1,
    int DiasDuracaoP1,
    // Parcela 2 (se Parcelado = true)
    DateTime? DataInicioP2,
    int? DiasDuracaoP2,
    // Parcela 3 (se Parcelado = true)
    DateTime? DataInicioP3,
    int? DiasDuracaoP3,
    // Abono pecuniário — CLT Art. 143 (apenas na 1ª parcela ou período integral)
    bool SolicitaAbono,
    int DiasAbono,                     // 0–10 dias
    bool SolicitaAdiantamentoDecimoTerceiro,
    string? Observacao
);

public record AtualizarPlanejamentoFeriasRequest(
    DateTime DataInicio,
    int DiasDuracao,
    bool SolicitaAbono,
    int DiasAbono,
    bool SolicitaAdiantamentoDecimoTerceiro,
    string? Observacao
);
