using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.Application.Services;

/// <summary>
/// Serviço de Planejamento de Férias — regras baseadas na CLT Arts. 129–153 e CF/88 Art. 7º XVII.
/// </summary>
public class PlanejamentoFeriasService : IPlanejamentoFeriasService
{
    private readonly IRepository<PlanejamentoFerias> _repo;
    private readonly IRepository<Funcionario> _funcRepo;
    private readonly IRepository<Afastamento> _afastamentoRepo;

    public PlanejamentoFeriasService(
        IRepository<PlanejamentoFerias> repo,
        IRepository<Funcionario> funcRepo,
        IRepository<Afastamento> afastamentoRepo)
    {
        _repo = repo;
        _funcRepo = funcRepo;
        _afastamentoRepo = afastamentoRepo;
    }

    // ─── Queries ─────────────────────────────────────────────────────────────

    public async Task<List<PlanejamentoFeriasDto>> GetAllAsync()
    {
        var planejamentos = await _repo.GetAllAsync();
        var funcionarios = await _funcRepo.GetAllAsync();
        return planejamentos
            .OrderByDescending(p => p.DataCriacao)
            .Select(p => ToDto(p, funcionarios.FirstOrDefault(f => f.Id == p.FuncionarioId)))
            .ToList();
    }

    public async Task<PlanejamentoFeriasDto?> GetByIdAsync(Guid id)
    {
        var p = await _repo.GetByIdAsync(id);
        if (p == null) return null;
        var func = await _funcRepo.GetByIdAsync(p.FuncionarioId);
        return ToDto(p, func);
    }

    public async Task<List<PlanejamentoFeriasDto>> GetByFuncionarioAsync(Guid funcionarioId)
    {
        var planejamentos = await _repo.FindAsync(p => p.FuncionarioId == funcionarioId);
        var func = await _funcRepo.GetByIdAsync(funcionarioId);
        return planejamentos
            .OrderByDescending(p => p.DataInicio)
            .Select(p => ToDto(p, func))
            .ToList();
    }

    /// <summary>
    /// Retorna planejamentos aprovados/planejados cujo DataInicio cai no mês/ano informado.
    /// Usado pela FolhaPagamento ao processar o mês anterior para incluir financeiro.
    /// </summary>
    public async Task<List<PlanejamentoFeriasDto>> ConsultarPorMesAsync(int mes, int ano)
    {
        var planejamentos = await _repo.FindAsync(p =>
            p.DataInicio.Month == mes &&
            p.DataInicio.Year == ano &&
            p.Status != StatusPlanejamentoFerias.Cancelada);

        var funcionarios = await _funcRepo.GetAllAsync();
        return planejamentos
            .Where(p => p.TipoParcelamento == TipoParcelamentoFerias.Total ||
                        p.TipoParcelamento == TipoParcelamentoFerias.Primeira)
            .Select(p => ToDto(p, funcionarios.FirstOrDefault(f => f.Id == p.FuncionarioId)))
            .ToList();
    }

    // ─── Commands ────────────────────────────────────────────────────────────

    public async Task<List<PlanejamentoFeriasDto>> CreateAsync(CriarPlanejamentoFeriasRequest request)
    {
        var func = await _funcRepo.GetByIdAsync(request.FuncionarioId)
            ?? throw new InvalidOperationException("Funcionário não encontrado.");

        // CLT Art. 129 — direito adquirido após 12 meses de trabalho
        var periodoAquisitivoInicio = func.DataAdmissao.Date;
        var periodoAquisitivoFim = func.DataAdmissao.AddYears(1).AddDays(-1).Date;
        var periodoConcessivoFim = func.DataAdmissao.AddYears(2).AddDays(-1).Date;

        // Calcular quantos ciclos já passaram para saber o período aquisitivo atual
        var hoje = DateTime.Today;
        while (periodoConcessivoFim < hoje)
        {
            periodoAquisitivoInicio = periodoAquisitivoFim.AddDays(1);
            periodoAquisitivoFim = periodoAquisitivoInicio.AddYears(1).AddDays(-1);
            periodoConcessivoFim = periodoAquisitivoFim.AddYears(1);
        }

        // Valida que o período aquisitivo já foi completado (Art. 129)
        if (hoje < periodoAquisitivoFim)
        {
            var diasRestantes = (periodoAquisitivoFim - hoje).Days;
            throw new InvalidOperationException(
                $"O funcionário ainda não completou o período aquisitivo. " +
                $"Faltam {diasRestantes} dias para adquirir o direito às férias (CLT Art. 129).");
        }

        // CLT Art. 130 — dias de férias conforme faltas injustificadas no período aquisitivo
        int diasDireito = await CalcularDiasDireitoAsync(func.Id, periodoAquisitivoInicio, periodoAquisitivoFim);

        // Valida abono pecuniário — CLT Art. 143 (máx. 1/3 dos dias = até 10 dias de 30)
        if (request.SolicitaAbono)
        {
            int maxAbono = diasDireito / 3;
            if (request.DiasAbono < 1 || request.DiasAbono > maxAbono)
                throw new InvalidOperationException(
                    $"O abono pecuniário deve ser entre 1 e {maxAbono} dias (1/3 de {diasDireito} dias — CLT Art. 143).");
        }

        var planejamentosCriados = new List<PlanejamentoFerias>();

        if (!request.Parcelado)
        {
            // Período integral
            ValidarAntecedencia(request.DataInicioP1, "Período integral");
            ValidarDuracoesTotal(diasDireito, request.DiasDuracaoP1, 0, 0, request.SolicitaAbono, request.DiasAbono);

            var p = CriarPlanejamento(func, request.DataInicioP1, request.DiasDuracaoP1,
                TipoParcelamentoFerias.Total,
                request.SolicitaAbono, request.DiasAbono,
                request.SolicitaAdiantamentoDecimoTerceiro,
                periodoAquisitivoInicio, periodoAquisitivoFim, periodoConcessivoFim,
                request.Observacao);
            await _repo.AddAsync(p);
            planejamentosCriados.Add(p);
        }
        else
        {
            // CLT Art. 148 — parcelamento em até 3 períodos
            // - 1ª parcela: mínimo 14 dias
            // - 2ª e 3ª parcelas: mínimo 5 dias cada
            if (request.DataInicioP2 == null || request.DiasDuracaoP2 == null)
                throw new InvalidOperationException("Informe a data e duração da 2ª parcela (CLT Art. 148).");

            ValidarAntecedencia(request.DataInicioP1, "1ª parcela");

            if (request.DiasDuracaoP1 < 14)
                throw new InvalidOperationException("A 1ª parcela deve ter no mínimo 14 dias (CLT Art. 148).");

            if (request.DiasDuracaoP2 < 5)
                throw new InvalidOperationException("A 2ª parcela deve ter no mínimo 5 dias (CLT Art. 148).");

            int totalDias = request.DiasDuracaoP1 + request.DiasDuracaoP2.Value;

            int diasP3 = 0;
            if (request.DataInicioP3 != null && request.DiasDuracaoP3 != null)
            {
                if (request.DiasDuracaoP3 < 5)
                    throw new InvalidOperationException("A 3ª parcela deve ter no mínimo 5 dias (CLT Art. 148).");
                diasP3 = request.DiasDuracaoP3.Value;
            }

            totalDias += diasP3;

            ValidarDuracoesTotal(diasDireito, request.DiasDuracaoP1, request.DiasDuracaoP2.Value, diasP3,
                request.SolicitaAbono, request.DiasAbono);

            // Cria 1ª parcela (abono pecuniário e 13º vão aqui — CLT Art. 143)
            var p1 = CriarPlanejamento(func, request.DataInicioP1, request.DiasDuracaoP1,
                TipoParcelamentoFerias.Primeira,
                request.SolicitaAbono, request.DiasAbono,
                request.SolicitaAdiantamentoDecimoTerceiro,
                periodoAquisitivoInicio, periodoAquisitivoFim, periodoConcessivoFim,
                request.Observacao);
            await _repo.AddAsync(p1);
            planejamentosCriados.Add(p1);

            // Cria 2ª parcela (sem abono, sem 13º)
            var p2 = CriarPlanejamento(func, request.DataInicioP2.Value, request.DiasDuracaoP2.Value,
                TipoParcelamentoFerias.Segunda,
                false, 0, false,
                periodoAquisitivoInicio, periodoAquisitivoFim, periodoConcessivoFim,
                request.Observacao);
            await _repo.AddAsync(p2);
            planejamentosCriados.Add(p2);

            // Cria 3ª parcela (opcional, sem abono, sem 13º)
            if (request.DataInicioP3 != null && diasP3 > 0)
            {
                var p3 = CriarPlanejamento(func, request.DataInicioP3.Value, diasP3,
                    TipoParcelamentoFerias.Terceira,
                    false, 0, false,
                    periodoAquisitivoInicio, periodoAquisitivoFim, periodoConcessivoFim,
                    request.Observacao);
                await _repo.AddAsync(p3);
                planejamentosCriados.Add(p3);
            }
        }

        var funcionarios = await _funcRepo.GetAllAsync();
        return planejamentosCriados.Select(p => ToDto(p, func)).ToList();
    }

    public async Task<PlanejamentoFeriasDto> UpdateAsync(Guid id, AtualizarPlanejamentoFeriasRequest request)
    {
        var p = await _repo.GetByIdAsync(id)
            ?? throw new InvalidOperationException("Planejamento não encontrado.");

        if (p.Status == StatusPlanejamentoFerias.Cancelada)
            throw new InvalidOperationException("Não é possível alterar um planejamento cancelado.");

        if (p.Status == StatusPlanejamentoFerias.Concluida)
            throw new InvalidOperationException("Não é possível alterar um planejamento concluído.");

        var func = await _funcRepo.GetByIdAsync(p.FuncionarioId)
            ?? throw new InvalidOperationException("Funcionário não encontrado.");

        ValidarAntecedencia(request.DataInicio, "Período");

        if (request.SolicitaAbono)
        {
            int maxAbono = p.DiasFerias / 3;
            if (request.DiasAbono < 1 || request.DiasAbono > maxAbono)
                throw new InvalidOperationException(
                    $"O abono pecuniário deve ser entre 1 e {maxAbono} dias (CLT Art. 143).");
        }

        p.DataInicio = request.DataInicio;
        p.DataFim = request.DataInicio.AddDays(request.DiasDuracao - 1);
        p.DiasFerias = request.DiasDuracao;
        p.SolicitaAbono = request.SolicitaAbono;
        p.DiasAbono = request.SolicitaAbono ? request.DiasAbono : 0;
        p.SolicitaAdiantamentoDecimoTerceiro = request.SolicitaAdiantamentoDecimoTerceiro;
        p.Observacao = request.Observacao;

        RecalcularFinanceiro(p, func.SalarioBase);

        await _repo.UpdateAsync(p);
        return ToDto(p, func);
    }

    public async Task CancelAsync(Guid id, string? motivo)
    {
        var p = await _repo.GetByIdAsync(id)
            ?? throw new InvalidOperationException("Planejamento não encontrado.");

        if (p.Status == StatusPlanejamentoFerias.Cancelada)
            throw new InvalidOperationException("Planejamento já está cancelado.");

        if (p.Status == StatusPlanejamentoFerias.Concluida)
            throw new InvalidOperationException("Não é possível cancelar um planejamento concluído.");

        p.Status = StatusPlanejamentoFerias.Cancelada;
        p.DataCancelamento = DateTime.Now;
        p.MotivoCancelamento = motivo;

        await _repo.UpdateAsync(p);
    }

    // ─── Helpers Privados ─────────────────────────────────────────────────────

    private PlanejamentoFerias CriarPlanejamento(
        Funcionario func,
        DateTime dataInicio,
        int diasDuracao,
        TipoParcelamentoFerias tipo,
        bool solicitaAbono,
        int diasAbono,
        bool solicitaAdiantamento13,
        DateTime periodoAqInicio,
        DateTime periodoAqFim,
        DateTime periodoConcessivoFim,
        string? obs)
    {
        var p = new PlanejamentoFerias
        {
            FuncionarioId = func.Id,
            DataInicio = dataInicio,
            DataFim = dataInicio.AddDays(diasDuracao - 1),
            DiasFerias = diasDuracao,
            TipoParcelamento = tipo,
            SolicitaAbono = solicitaAbono,
            DiasAbono = solicitaAbono ? diasAbono : 0,
            SolicitaAdiantamentoDecimoTerceiro = solicitaAdiantamento13,
            PeriodoAquisitivoInicio = periodoAqInicio,
            PeriodoAquisitivoFim = periodoAqFim,
            PeriodoConcessivoFim = periodoConcessivoFim,
            Status = StatusPlanejamentoFerias.Planejada,
            Observacao = obs
        };

        RecalcularFinanceiro(p, func.SalarioBase);
        return p;
    }

    /// <summary>
    /// CLT Art. 144 + CF Art. 7º XVII.
    /// Remuneração = (Salário / 30) × Dias
    /// 1/3 constitucional = Remuneração × (1/3)
    /// Abono Pecuniário = (Salário / 30) × DiasAbono × (4/3)  [pois inclui o 1/3]
    /// </summary>
    private static void RecalcularFinanceiro(PlanejamentoFerias p, decimal salarioBase)
    {
        decimal valorDiario = salarioBase / 30m;

        // Dias efetivos de gozo (desconta dias vendidos no abono)
        int diasGozo = p.DiasFerias - (p.SolicitaAbono ? p.DiasAbono : 0);

        decimal valorRemFerias = valorDiario * diasGozo;
        decimal valorTerco = valorRemFerias / 3m;

        // Abono pecuniário — CLT Art. 143: valor inclui o 1/3 constitucional
        decimal valorAbono = p.SolicitaAbono ? valorDiario * p.DiasAbono * (4m / 3m) : 0m;

        // Adiantamento 13º Salário (50% do salário base se solicitado)
        decimal valorAdiantamento13 = p.SolicitaAdiantamentoDecimoTerceiro ? Math.Round(salarioBase * 0.50m, 2) : 0m;

        p.ValorAdiantamentoDecimoTerceiro = valorAdiantamento13;
        p.ValorRemFeriasBruto = Math.Round(valorRemFerias, 2);
        p.ValorTercoConstitucional = Math.Round(valorTerco, 2);
        p.ValorAbonoFeriasVendidas = Math.Round(valorAbono, 2);
        p.ValorTotalBruto = Math.Round(valorRemFerias + valorTerco + valorAbono + valorAdiantamento13, 2);
    }

    /// <summary>
    /// CLT Art. 130 — dias de férias conforme faltas injustificadas no período aquisitivo.
    /// </summary>
    private async Task<int> CalcularDiasDireitoAsync(Guid funcId, DateTime periodoInicio, DateTime periodoFim)
    {
        var afastamentos = await _afastamentoRepo.FindAsync(a =>
            a.FuncionarioId == funcId &&
            a.Status == "Aprovado" &&
            a.DataInicio >= periodoInicio &&
            a.DataFim <= periodoFim);

        // Conta faltas injustificadas
        int faltasInjustificadas = afastamentos
            .Where(a => a.Motivo == "Falta não justificada")
            .Sum(a => (a.DataFim - a.DataInicio).Days + 1);

        return faltasInjustificadas switch
        {
            <= 5 => 30,
            <= 14 => 24,
            <= 23 => 18,
            <= 32 => 12,
            _ => 0  // Perde o direito às férias (Art. 133, IV — raro, para fins de segurança)
        };
    }

    private static void ValidarAntecedencia(DateTime dataInicio, string parcela)
    {
        // CLT Art. 136 §1 — comunicação com 30 dias de antecedência
        int diasAntecedencia = (dataInicio.Date - DateTime.Today).Days;
        if (diasAntecedencia < 30)
            throw new InvalidOperationException(
                $"{parcela}: o início das férias deve ser comunicado com no mínimo 30 dias de antecedência " +
                $"(CLT Art. 136 §1). Data mínima permitida: {DateTime.Today.AddDays(30):dd/MM/yyyy}.");
    }

    private static void ValidarDuracoesTotal(int diasDireito, int diasP1, int diasP2, int diasP3, bool solicitaAbono, int diasAbono)
    {
        int totalPlanejado = diasP1 + diasP2 + diasP3;
        int maxPermitido = diasDireito; // diasAbono já foram validados e fazem parte dos dias

        if (totalPlanejado > maxPermitido)
            throw new InvalidOperationException(
                $"Total de dias planejados ({totalPlanejado}) excede o direito do funcionário ({maxPermitido} dias — CLT Art. 130).");
    }

    // ─── Mapeamento para DTO ──────────────────────────────────────────────────

    private static PlanejamentoFeriasDto ToDto(PlanejamentoFerias p, Funcionario? func)
    {
        bool periodoConcessivoVencido = DateTime.Today > p.PeriodoConcessivoFim &&
                                        p.Status == StatusPlanejamentoFerias.Planejada;

        return new PlanejamentoFeriasDto(
            Id: p.Id,
            FuncionarioId: p.FuncionarioId,
            FuncionarioNome: func?.Nome ?? "Desconhecido",
            DataInicio: p.DataInicio,
            DataFim: p.DataFim,
            DiasFerias: p.DiasFerias,
            DiasEfetivosGozo: p.DiasEfetivosGozo,
            TipoParcelamento: p.TipoParcelamento,
            SolicitaAbono: p.SolicitaAbono,
            DiasAbono: p.DiasAbono,
            SolicitaAdiantamentoDecimoTerceiro: p.SolicitaAdiantamentoDecimoTerceiro,
            ValorAdiantamentoDecimoTerceiro: p.ValorAdiantamentoDecimoTerceiro,
            Status: p.Status,
            PeriodoAquisitivoInicio: p.PeriodoAquisitivoInicio,
            PeriodoAquisitivoFim: p.PeriodoAquisitivoFim,
            PeriodoConcessivoFim: p.PeriodoConcessivoFim,
            ValorRemFeriasBruto: p.ValorRemFeriasBruto,
            ValorTercoConstitucional: p.ValorTercoConstitucional,
            ValorAbonoFeriasVendidas: p.ValorAbonoFeriasVendidas,
            ValorTotalBruto: p.ValorTotalBruto,
            Observacao: p.Observacao,
            DataCriacao: p.DataCriacao,
            PeriodoConcessivoVencido: periodoConcessivoVencido
        );
    }
}
