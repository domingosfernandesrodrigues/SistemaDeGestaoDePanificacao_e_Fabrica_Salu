using Microsoft.EntityFrameworkCore;
using SGPF.Domain.Entities;
// Context for SGPF - Recrutamento / Candidaturas registered

namespace SGPF.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Empresa> Empresas { get; set; }
    public DbSet<Funcionario> Funcionarios { get; set; }
    public DbSet<Cliente> Clientes { get; set; }
    public DbSet<Fornecedor> Fornecedores { get; set; }
    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<Candidatura> Candidaturas { get; set; }

    public DbSet<Produto> Produtos { get; set; }
    public DbSet<MovimentacaoEstoque> MovimentacoesEstoque { get; set; }
    public DbSet<FichaTecnica> FichasTecnicas { get; set; }
    public DbSet<FichaTecnicaInsumo> FichaTecnicaInsumos { get; set; }
    public DbSet<OrdemProducao> OrdensProducao { get; set; }
    public DbSet<OrdemProducaoInsumo> OrdemProducaoInsumos { get; set; }

    // Fase 3 - RH e Financeiro
    public DbSet<RegistroPonto> RegistrosPonto { get; set; }
    public DbSet<FolhaPagamento> FolhasPagamento { get; set; }
    public DbSet<ContaPagar> ContasPagar { get; set; }
    public DbSet<Afastamento> Afastamentos { get; set; }
    public DbSet<LancamentoAlimentacao> LancamentosAlimentacao { get; set; }
    
    // Fase 4 - Vendas e Frota
    public DbSet<ContaReceber> ContasReceber { get; set; }
    public DbSet<PedidoVenda> PedidosVenda { get; set; }
    public DbSet<PedidoVendaItem> PedidoVendaItens { get; set; }
    public DbSet<Veiculo> Veiculos { get; set; }
    public DbSet<Abastecimento> Abastecimentos { get; set; }
    public DbSet<ManutencaoVeiculo> ManutencoesVeiculo { get; set; }
    public DbSet<TrocaAvaria> TrocasAvaria { get; set; }

    // Fase 4b - CRM
    public DbSet<Reuniao> Reunioes { get; set; }
    public DbSet<AgendaEvento> AgendaEventos { get; set; }

    // Fase 5 - Planejamento de Férias (CLT Arts. 129-153)
    public DbSet<PlanejamentoFerias> PlanejamentosFerias { get; set; }

    // Fase Complementar - Compras
    public DbSet<Compra> Compras { get; set; }
    public DbSet<CompraItem> CompraItems { get; set; }
    public DbSet<HistoricoPrecoProduto> HistoricoPrecos { get; set; }
    public DbSet<ContaBancaria> ContasBancarias { get; set; }
    public DbSet<MovimentacaoBancaria> MovimentacoesBancarias { get; set; }

    // Auditoria
    public DbSet<AuditLog> AuditLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Map relationships - Fase 1
        modelBuilder.Entity<Empresa>()
            .HasMany(e => e.Funcionarios)
            .WithOne(f => f.Empresa)
            .HasForeignKey(f => f.EmpresaId);

        modelBuilder.Entity<Usuario>()
            .HasOne(u => u.Cliente)
            .WithMany()
            .HasForeignKey(u => u.ClienteId);
            
        // Map relationships - Fase 2
        modelBuilder.Entity<FichaTecnicaInsumo>()
            .HasOne(fi => fi.Insumo)
            .WithMany()
            .HasForeignKey(fi => fi.InsumoId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<OrdemProducaoInsumo>()
            .HasOne(opi => opi.Insumo)
            .WithMany()
            .HasForeignKey(opi => opi.InsumoId)
            .OnDelete(DeleteBehavior.Restrict);

        // Precision configurations
        modelBuilder.Entity<Funcionario>().Property(f => f.SalarioBase).HasPrecision(18, 2);
        modelBuilder.Entity<Produto>().Property(p => p.PrecoCusto).HasPrecision(18, 4);
        modelBuilder.Entity<Produto>().Property(p => p.PrecoVenda).HasPrecision(18, 2);
        modelBuilder.Entity<Produto>().Property(p => p.QuantidadeEstoque).HasPrecision(18, 4);
        modelBuilder.Entity<MovimentacaoEstoque>().Property(m => m.Quantidade).HasPrecision(18, 4);
        modelBuilder.Entity<FichaTecnica>().Property(f => f.RendimentoPadrao).HasPrecision(18, 4);
        modelBuilder.Entity<FichaTecnicaInsumo>().Property(f => f.QuantidadeNecessaria).HasPrecision(18, 4);
        modelBuilder.Entity<FichaTecnicaInsumo>().Property(f => f.PerdaPercentual).HasPrecision(18, 4);
        modelBuilder.Entity<OrdemProducao>().Property(o => o.QuantidadePlanejada).HasPrecision(18, 4);
        modelBuilder.Entity<OrdemProducao>().Property(o => o.QuantidadeRealizada).HasPrecision(18, 4);
        modelBuilder.Entity<OrdemProducao>().Property(o => o.CustoTotalCalculado).HasPrecision(18, 2);
        modelBuilder.Entity<OrdemProducaoInsumo>().Property(o => o.QuantidadePlanejada).HasPrecision(18, 4);
        modelBuilder.Entity<OrdemProducaoInsumo>().Property(o => o.QuantidadeConsumida).HasPrecision(18, 4);

        // Precision configurations - Fase 3
        modelBuilder.Entity<RegistroPonto>().Property(r => r.TotalHorasTrabalhadas).HasPrecision(18, 2);
        modelBuilder.Entity<RegistroPonto>().Property(r => r.TotalHorasExtras).HasPrecision(18, 2);
        
        modelBuilder.Entity<FolhaPagamento>().Property(f => f.SalarioBaseCalculado).HasPrecision(18, 2);
        modelBuilder.Entity<FolhaPagamento>().Property(f => f.TotalHorasExtras50).HasPrecision(18, 2);
        modelBuilder.Entity<FolhaPagamento>().Property(f => f.ValorHorasExtras50).HasPrecision(18, 2);
        modelBuilder.Entity<FolhaPagamento>().Property(f => f.TotalHorasExtras100).HasPrecision(18, 2);
        modelBuilder.Entity<FolhaPagamento>().Property(f => f.ValorHorasExtras100).HasPrecision(18, 2);
        modelBuilder.Entity<FolhaPagamento>().Property(f => f.ValorAdicionalNoturno).HasPrecision(18, 2);
        modelBuilder.Entity<FolhaPagamento>().Property(f => f.TotalDescontos).HasPrecision(18, 2);
        modelBuilder.Entity<FolhaPagamento>().Property(f => f.SalarioLiquido).HasPrecision(18, 2);
        
        modelBuilder.Entity<ContaPagar>().Property(c => c.Valor).HasPrecision(18, 2);

        // Alimentação
        modelBuilder.Entity<LancamentoAlimentacao>()
            .HasOne(la => la.Funcionario)
            .WithMany()
            .HasForeignKey(la => la.FuncionarioId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<LancamentoAlimentacao>().Property(la => la.Valor).HasPrecision(18, 2);

        modelBuilder.Entity<LancamentoAlimentacao>()
            .HasOne(la => la.ContaPagar)
            .WithMany()
            .HasForeignKey(la => la.ContaPagarId)
            .OnDelete(DeleteBehavior.SetNull);
        
        // Relacionamentos e Precision configurations - Fase 4
        modelBuilder.Entity<PedidoVendaItem>()
            .HasOne(pvi => pvi.Produto)
            .WithMany()
            .HasForeignKey(pvi => pvi.ProdutoId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<PedidoVenda>()
            .HasOne(p => p.Motorista)
            .WithMany()
            .HasForeignKey(p => p.MotoristaId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ContaReceber>().Property(c => c.Valor).HasPrecision(18, 2);
        modelBuilder.Entity<PedidoVenda>().Property(p => p.ValorTotal).HasPrecision(18, 2);
        modelBuilder.Entity<PedidoVendaItem>().Property(p => p.Quantidade).HasPrecision(18, 4);
        modelBuilder.Entity<PedidoVendaItem>().Property(p => p.PrecoUnitario).HasPrecision(18, 2);
        modelBuilder.Entity<PedidoVendaItem>().Property(p => p.Desconto).HasPrecision(18, 2);
        
        modelBuilder.Entity<Veiculo>().Property(v => v.CapacidadeCargaKg).HasPrecision(18, 2);
        modelBuilder.Entity<Veiculo>().Property(v => v.QuilometragemAtual).HasPrecision(18, 2);
        
        modelBuilder.Entity<Abastecimento>().Property(a => a.QuilometragemRegistrada).HasPrecision(18, 2);
        modelBuilder.Entity<Abastecimento>().Property(a => a.Litros).HasPrecision(18, 2);
        modelBuilder.Entity<Abastecimento>().Property(a => a.ValorTotal).HasPrecision(18, 2);
        
        modelBuilder.Entity<Abastecimento>()
            .HasOne(a => a.ContaPagar)
            .WithMany()
            .HasForeignKey(a => a.ContaPagarId)
            .OnDelete(DeleteBehavior.SetNull);
        
        modelBuilder.Entity<ManutencaoVeiculo>().Property(m => m.CustoTotal).HasPrecision(18, 2);
        modelBuilder.Entity<ManutencaoVeiculo>().Property(m => m.QuilometragemRegistrada).HasPrecision(18, 2);

        modelBuilder.Entity<ManutencaoVeiculo>()
            .HasOne(m => m.ContaPagar)
            .WithMany()
            .HasForeignKey(m => m.ContaPagarId)
            .OnDelete(DeleteBehavior.SetNull);
        
        modelBuilder.Entity<TrocaAvaria>().Property(t => t.Quantidade).HasPrecision(18, 4);

        // Relacionamentos OrdemProducao -> Usuarios
        modelBuilder.Entity<OrdemProducao>()
            .HasOne(o => o.UsuarioPlanejou)
            .WithMany()
            .HasForeignKey(o => o.UsuarioPlanejouId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<OrdemProducao>()
            .HasOne(o => o.UsuarioIniciou)
            .WithMany()
            .HasForeignKey(o => o.UsuarioIniciouId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<OrdemProducao>()
            .HasOne(o => o.UsuarioFinalizou)
            .WithMany()
            .HasForeignKey(o => o.UsuarioFinalizouId)
            .OnDelete(DeleteBehavior.Restrict);

        // Configurações Compras
        modelBuilder.Entity<Compra>().Property(c => c.ValorTotal).HasPrecision(18, 2);
        modelBuilder.Entity<CompraItem>().Property(c => c.Quantidade).HasPrecision(18, 4);
        modelBuilder.Entity<CompraItem>().Property(c => c.PrecoUnitario).HasPrecision(18, 4);
        
        modelBuilder.Entity<CompraItem>()
            .HasOne(ci => ci.Produto)
            .WithMany()
            .HasForeignKey(ci => ci.ProdutoId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<HistoricoPrecoProduto>().Property(h => h.PrecoAntigo).HasPrecision(18, 4);
        modelBuilder.Entity<HistoricoPrecoProduto>().Property(h => h.PrecoNovo).HasPrecision(18, 4);

        modelBuilder.Entity<ContaBancaria>().Property(c => c.SaldoInicial).HasPrecision(18, 2);
        modelBuilder.Entity<ContaBancaria>().Property(c => c.SaldoAtual).HasPrecision(18, 2);

        // Movimentação Bancária
        modelBuilder.Entity<MovimentacaoBancaria>().Property(m => m.Valor).HasPrecision(18, 2);
        modelBuilder.Entity<MovimentacaoBancaria>()
            .HasOne(m => m.ContaBancaria)
            .WithMany()
            .HasForeignKey(m => m.ContaBancariaId)
            .OnDelete(DeleteBehavior.Cascade);

        // Planejamento de Férias — CLT Arts. 129-153
        modelBuilder.Entity<PlanejamentoFerias>()
            .HasOne(p => p.Funcionario)
            .WithMany()
            .HasForeignKey(p => p.FuncionarioId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<PlanejamentoFerias>().Property(p => p.ValorRemFeriasBruto).HasPrecision(18, 2);
        modelBuilder.Entity<PlanejamentoFerias>().Property(p => p.ValorTercoConstitucional).HasPrecision(18, 2);
        modelBuilder.Entity<PlanejamentoFerias>().Property(p => p.ValorAbonoFeriasVendidas).HasPrecision(18, 2);
        modelBuilder.Entity<PlanejamentoFerias>().Property(p => p.ValorTotalBruto).HasPrecision(18, 2);
        modelBuilder.Entity<PlanejamentoFerias>().Property(p => p.ValorAdiantamentoDecimoTerceiro).HasPrecision(18, 2);

        // FolhaPagamento — campos de férias e 13º
        modelBuilder.Entity<FolhaPagamento>().Property(f => f.ValorFerias).HasPrecision(18, 2);
        modelBuilder.Entity<FolhaPagamento>().Property(f => f.ValorTercoConstitucionalFerias).HasPrecision(18, 2);
        modelBuilder.Entity<FolhaPagamento>().Property(f => f.ValorAbonoFeriasVendidas).HasPrecision(18, 2);
        modelBuilder.Entity<FolhaPagamento>().Property(f => f.ValorAdiantamento13Deducao).HasPrecision(18, 2);

        modelBuilder.Entity<FolhaPagamento>()
            .HasOne(f => f.PlanejamentoFerias)
            .WithMany()
            .HasForeignKey(f => f.PlanejamentoFeriasId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
