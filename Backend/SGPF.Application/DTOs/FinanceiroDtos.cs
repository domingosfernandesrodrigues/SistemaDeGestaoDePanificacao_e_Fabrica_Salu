namespace SGPF.Application.DTOs;

public class RelatorioDreDto
{
    public int Mes { get; set; }
    public int Ano { get; set; }
    
    public decimal ReceitaBrutaVendas { get; set; }
    public decimal CustosProducao { get; set; }
    public decimal CustosTrocaAvaria { get; set; }
    
    public decimal LucroBruto => ReceitaBrutaVendas - CustosProducao - CustosTrocaAvaria;

    public decimal DespesasFolhaPagamento { get; set; }
    public decimal DespesasManutencaoFrota { get; set; }
    public decimal DespesasGerais { get; set; }
    
    public decimal LucroLiquidoOperacional => LucroBruto - DespesasFolhaPagamento - DespesasManutencaoFrota - DespesasGerais;
}

public class ResumoFinanceiroDto
{
    public decimal ContasReceberPendentes { get; set; }
    public decimal ContasPagarPendentes { get; set; }
    public decimal SaldoEmCaixa { get; set; }
}
