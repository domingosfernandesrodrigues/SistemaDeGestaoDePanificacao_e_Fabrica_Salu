namespace SGPF.Domain.Entities;

/// <summary>
/// Planejamento de férias celetistas — CLT Arts. 129–153 e CF/88 Art. 7º XVII.
/// </summary>
public enum StatusPlanejamentoFerias
{
    Planejada,   // Cadastrada, aguardando aprovação
    Aprovada,    // Aprovada pelo RH
    Iniciada,    // Período de gozo em andamento
    Concluida,   // Período encerrado
    Cancelada    // Cancelada antes do início
}

/// <summary>
/// Tipo do parcelamento — CLT Art. 148 (até 3 períodos: mín. 14d, mín. 5d, mín. 5d).
/// </summary>
public enum TipoParcelamentoFerias
{
    Total,       // 30 dias integrais (ou dias conforme Art. 130)
    Primeira,    // 1ª parcela (mín. 14 dias)
    Segunda,     // 2ª parcela (mín. 5 dias)
    Terceira     // 3ª parcela (mín. 5 dias)
}

public class PlanejamentoFerias
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid FuncionarioId { get; set; }
    public Funcionario? Funcionario { get; set; }

    // Período de gozo (Art. 134)
    public DateTime DataInicio { get; set; }
    public DateTime DataFim { get; set; }

    // Duração calculada pela CLT Art. 130 (30/24/18/12 dias, conforme faltas)
    public int DiasFerias { get; set; }

    // Parcelamento — CLT Art. 148
    public TipoParcelamentoFerias TipoParcelamento { get; set; } = TipoParcelamentoFerias.Total;

    // Abono Pecuniário — CLT Art. 143 (converter até 1/3 = até 10 dias em dinheiro)
    public bool SolicitaAbono { get; set; } = false;
    public int DiasAbono { get; set; } = 0; // 0 a 10 dias

    // Adiantamento de 13º nas Férias — Lei 4.090/62, Art. 2º, § 2º
    public bool SolicitaAdiantamentoDecimoTerceiro { get; set; } = false;
    public decimal ValorAdiantamentoDecimoTerceiro { get; set; } = 0;

    // Dias efetivos de gozo = DiasFerias - DiasAbono
    public int DiasEfetivosGozo => DiasFerias - DiasAbono;

    // Período aquisitivo (Art. 129 — 12 meses de trabalho)
    public DateTime PeriodoAquisitivoInicio { get; set; }
    public DateTime PeriodoAquisitivoFim { get; set; }

    // Período concessivo (Art. 134 — 12 meses após o aquisitivo)
    public DateTime PeriodoConcessivoFim { get; set; }

    // Status
    public StatusPlanejamentoFerias Status { get; set; } = StatusPlanejamentoFerias.Planejada;

    // Cálculo financeiro — CLT Art. 144 + CF Art. 7º XVII
    // Valor = (SalárioMensal / 30) × DiasFerias
    // Abono de 1/3 constitucional = Valor × (1/3)
    // Abono pecuniário (Art. 143) = (SalárioMensal / 30) × DiasAbono × (4/3)
    public decimal ValorRemFeriasBruto { get; set; }    // Remuneração bruta
    public decimal ValorTercoConstitucional { get; set; } // 1/3 constitucional (CF Art. 7º XVII)
    public decimal ValorAbonoFeriasVendidas { get; set; } // Abono pecuniário (Art. 143)
    public decimal ValorTotalBruto { get; set; }          // Total a receber

    public string? Observacao { get; set; }
    public DateTime DataCriacao { get; set; } = DateTime.Now;
    public DateTime? DataAprovacao { get; set; }
    public DateTime? DataCancelamento { get; set; }
    public string? MotivoCancelamento { get; set; }
}
