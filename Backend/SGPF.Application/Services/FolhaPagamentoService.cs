using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.Application.Services;

public class FolhaPagamentoService : IFolhaPagamentoService
{
    private readonly IRepository<FolhaPagamento> _folhaRepo;
    private readonly IRepository<Funcionario> _funcRepo;
    private readonly IRepository<RegistroPonto> _pontoRepo;
    private readonly IRepository<ContaPagar> _contaPagarRepo;
    private readonly IRepository<Afastamento> _afastamentoRepo;

    public FolhaPagamentoService(
        IRepository<FolhaPagamento> folhaRepo,
        IRepository<Funcionario> funcRepo,
        IRepository<RegistroPonto> pontoRepo,
        IRepository<ContaPagar> contaPagarRepo,
        IRepository<Afastamento> afastamentoRepo)
    {
        _folhaRepo = folhaRepo;
        _funcRepo = funcRepo;
        _pontoRepo = pontoRepo;
        _contaPagarRepo = contaPagarRepo;
        _afastamentoRepo = afastamentoRepo;
    }

    public async Task<List<FolhaPagamento>> ProcessarFolhaAsync(int mes, int ano)
    {
        var funcionarios = await _funcRepo.GetAllAsync();
        var folhasGeradas = new List<FolhaPagamento>();

        foreach (var func in funcionarios)
        {
            // Verificar se já existe folha processada e FECHADA para este mês. Se fechada, não reprocessamos.
            var folhasExistentes = await _folhaRepo.FindAsync(f => 
                f.FuncionarioId == func.Id && 
                f.MesReferencia == mes && 
                f.AnoReferencia == ano);
            
            var folhaExistente = folhasExistentes.FirstOrDefault();
            if (folhaExistente != null && folhaExistente.Status == StatusFolha.Fechada)
                continue;

            var registros = await _pontoRepo.FindAsync(p => 
                p.FuncionarioId == func.Id && 
                p.DataHoraEntrada.Month == mes && 
                p.DataHoraEntrada.Year == ano &&
                p.DataHoraSaida != null);

            // Calcular horas extras agrupando por DIA para maior precisão
            decimal totalHorasExtras = registros
                .GroupBy(r => r.DataHoraEntrada.Date)
                .Select(g => {
                    var totalDia = g.Sum(r => r.TotalHorasTrabalhadas);
                    return totalDia > 8 ? totalDia - 8 : 0;
                })
                .Sum();
            
            // Simulação de cálculo financeiro:
            decimal valorHora = func.SalarioBase / 220m; 
            decimal valorHorasExtras = totalHorasExtras * (valorHora * 1.5m); 
            
            var primeiroDiaMes = new DateTime(ano, mes, 1);
            var ultimoDiaMes = primeiroDiaMes.AddMonths(1).AddDays(-1);

            var afastamentosMes = await _afastamentoRepo.FindAsync(a => 
                a.FuncionarioId == func.Id && 
                a.Status == "Aprovado" &&
                a.DataInicio <= ultimoDiaMes && 
                a.DataFim >= primeiroDiaMes);

            var motivosDesconto = new[] { 
                "Licença não remunerada", 
                "Falta não justificada", 
                "Suspensão disciplinar", 
                "Suspensão do contrato (layoff)", 
                "Afastamento acima do período legal sem cobertura" 
            };

            decimal valorDescontoAfastamentos = 0;
            foreach (var af in afastamentosMes)
            {
                if (motivosDesconto.Contains(af.Motivo))
                {
                    var inicioReal = af.DataInicio < primeiroDiaMes ? primeiroDiaMes : af.DataInicio;
                    var fimReal = af.DataFim > ultimoDiaMes ? ultimoDiaMes : af.DataFim;
                    
                    int diasDesconto = (fimReal - inicioReal).Days + 1;
                    valorDescontoAfastamentos += (func.SalarioBase / 30m) * diasDesconto;
                }
            }

            decimal proventos = func.SalarioBase + valorHorasExtras;
            decimal descontos = (proventos * 0.08m) + valorDescontoAfastamentos; 
            decimal liquido = proventos - descontos;

            if (folhaExistente != null)
            {
                // Atualizar folha aberta existente
                folhaExistente.SalarioBaseCalculado = func.SalarioBase;
                folhaExistente.TotalHorasExtras = totalHorasExtras;
                folhaExistente.ValorHorasExtras = valorHorasExtras;
                folhaExistente.TotalDescontos = descontos;
                folhaExistente.SalarioLiquido = liquido;
                
                await _folhaRepo.UpdateAsync(folhaExistente);
                folhasGeradas.Add(folhaExistente);
            }
            else
            {
                // Criar nova folha
                var folha = new FolhaPagamento
                {
                    FuncionarioId = func.Id,
                    MesReferencia = mes,
                    AnoReferencia = ano,
                    SalarioBaseCalculado = func.SalarioBase,
                    TotalHorasExtras = totalHorasExtras,
                    ValorHorasExtras = valorHorasExtras,
                    TotalDescontos = descontos,
                    SalarioLiquido = liquido,
                    Status = StatusFolha.Aberta
                };

                await _folhaRepo.AddAsync(folha);
                folhasGeradas.Add(folha);
            }
        }

        return folhasGeradas;
    }

    public async Task<FolhaPagamento> FecharFolhaAsync(Guid folhaId)
    {
        var folha = await _folhaRepo.GetByIdAsync(folhaId);
        if (folha == null || folha.Status != StatusFolha.Aberta)
            throw new Exception("Folha não encontrada ou já fechada.");

        var func = await _funcRepo.GetByIdAsync(folha.FuncionarioId);

        // Integração Financeira: Gerar Conta a Pagar
        var contaPagar = new ContaPagar
        {
            Descricao = $"Folha Pagamento {folha.MesReferencia:D2}/{folha.AnoReferencia} - {func?.Nome}",
            Valor = folha.SalarioLiquido,
            DataVencimento = new DateTime(folha.AnoReferencia, folha.MesReferencia, 5).AddMonths(1), // 5º dia útil do mês seguinte (simplificado)
            Categoria = "Folha de Pagamento"
        };
        await _contaPagarRepo.AddAsync(contaPagar);

        folha.Status = StatusFolha.Fechada;
        await _folhaRepo.UpdateAsync(folha);

        return folha;
    }

    public async Task<byte[]> GerarContrachequePdfAsync(Guid folhaId)
    {
        var folha = await _folhaRepo.GetByIdAsync(folhaId);
        if (folha == null) throw new Exception("Folha não encontrada");
        
        var func = await _funcRepo.GetByIdAsync(folha.FuncionarioId);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Helvetica"));

                // Cabeçalho Moderno
                page.Header().Row(row =>
                {
                    row.RelativeItem().Column(col =>
                    {
                        col.Item().Text("SGP-FÁBRICA").FontSize(20).ExtraBold().FontColor(Colors.Indigo.Medium);
                        col.Item().Text("Sistema de Gestão de Panificação").FontSize(9).SemiBold().FontColor(Colors.Grey.Medium);
                    });

                    row.ConstantItem(120).Background(Colors.Indigo.Lighten5).Padding(10).Column(col =>
                    {
                        col.Item().AlignCenter().Text("COMPROVANTE").FontSize(8).Bold().FontColor(Colors.Indigo.Medium);
                        col.Item().AlignCenter().Text($"{folha.MesReferencia:D2}/{folha.AnoReferencia}").FontSize(16).Black();
                    });
                });

                page.Content().PaddingVertical(20).Column(col =>
                {
                    col.Spacing(15);

                    // Título do Documento
                    col.Item().AlignCenter().Text("RECIBO DE PAGAMENTO DE SALÁRIO").FontSize(14).ExtraBold().Underline();

                    // Informações do Funcionário em Grid
                    col.Item().Row(row =>
                    {
                        row.RelativeItem(2).Column(c =>
                        {
                            c.Item().Text("FUNCIONÁRIO").FontSize(7).Bold().FontColor(Colors.Grey.Medium);
                            c.Item().Text(func?.Nome ?? "-").FontSize(12).Bold();
                        });
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("CARGO").FontSize(7).Bold().FontColor(Colors.Grey.Medium);
                            c.Item().Text(func?.Cargo ?? "-").FontSize(10).Medium();
                        });
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("CPF").FontSize(7).Bold().FontColor(Colors.Grey.Medium);
                            c.Item().Text(func?.CPF ?? "-").FontSize(10);
                        });
                    });

                    // Tabela Principal com Design Clean
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(35);  // Cód.
                            columns.RelativeColumn(3);  // Descrição
                            columns.RelativeColumn();    // Referência
                            columns.RelativeColumn();    // Proventos
                            columns.RelativeColumn();    // Descontos
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(HeaderStyle).Text("CÓD.");
                            header.Cell().Element(HeaderStyle).Text("DESCRIÇÃO");
                            header.Cell().Element(HeaderStyle).AlignCenter().Text("REF.");
                            header.Cell().Element(HeaderStyle).AlignRight().Text("VENCIMENTOS");
                            header.Cell().Element(HeaderStyle).AlignRight().Text("DESCONTOS");

                            static IContainer HeaderStyle(IContainer container)
                            {
                                return container.DefaultTextStyle(x => x.SemiBold().FontColor(Colors.White))
                                    .PaddingVertical(6)
                                    .Background(Colors.Indigo.Medium)
                                    .PaddingHorizontal(5);
                            }
                        });

                        // Itens
                        table.Cell().Element(ItemStyle).Text("001");
                        table.Cell().Element(ItemStyle).Text("Salário Base");
                        table.Cell().Element(ItemStyle).AlignCenter().Text("30 Dias");
                        table.Cell().Element(ItemStyle).AlignRight().Text(folha.SalarioBaseCalculado.ToString("N2"));
                        table.Cell().Element(ItemStyle).Text("");

                        if (folha.TotalHorasExtras > 0)
                        {
                            table.Cell().Element(ItemStyle).Text("050");
                            table.Cell().Element(ItemStyle).Text("Horas Extras (50%)");
                            table.Cell().Element(ItemStyle).AlignCenter().Text($"{folha.TotalHorasExtras}h");
                            table.Cell().Element(ItemStyle).AlignRight().Text(folha.ValorHorasExtras.ToString("N2"));
                            table.Cell().Element(ItemStyle).Text("");
                        }

                        table.Cell().Element(ItemStyle).Text("900");
                        table.Cell().Element(ItemStyle).Text("INSS / Contribuição");
                        table.Cell().Element(ItemStyle).AlignCenter().Text("8.00%");
                        table.Cell().Element(ItemStyle).Text("");
                        table.Cell().Element(ItemStyle).AlignRight().Text(folha.TotalDescontos.ToString("N2"));

                        static IContainer ItemStyle(IContainer container)
                        {
                            return container.PaddingVertical(8).PaddingHorizontal(5).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten3);
                        }
                    });

                    // Resumo Financeiro
                    col.Item().PaddingTop(10).Row(row =>
                    {
                        row.RelativeItem(); // Espaço à esquerda
                        row.ConstantItem(250).Column(c =>
                        {
                            c.Spacing(2);
                            c.Item().Row(r =>
                            {
                                r.RelativeItem().Text("Total de Vencimentos").FontSize(8).SemiBold();
                                r.ConstantItem(80).AlignRight().Text($"R$ {(folha.SalarioBaseCalculado + folha.ValorHorasExtras):N2}").FontSize(8);
                            });
                            c.Item().Row(r =>
                            {
                                r.RelativeItem().Text("Total de Descontos").FontSize(8).SemiBold().FontColor(Colors.Red.Medium);
                                r.ConstantItem(80).AlignRight().Text($"R$ {folha.TotalDescontos:N2}").FontSize(8).FontColor(Colors.Red.Medium);
                            });
                            
                            c.Item().PaddingTop(5).Background(Colors.Indigo.Lighten5).Padding(8).Row(r =>
                            {
                                r.RelativeItem().Text("LÍQUIDO A RECEBER").FontSize(11).ExtraBold().FontColor(Colors.Indigo.Medium);
                                r.ConstantItem(100).AlignRight().Text($"R$ {folha.SalarioLiquido:N2}").FontSize(11).ExtraBold().FontColor(Colors.Indigo.Medium);
                            });
                        });
                    });

                    // Rodapé Informativo (Sem Assinatura)
                    col.Item().PaddingTop(40).Column(c =>
                    {
                        c.Item().AlignCenter().Text("ESTE DOCUMENTO É APENAS PARA FINS INFORMATIVOS.").FontSize(7).Italic().FontColor(Colors.Grey.Medium);
                        c.Item().AlignCenter().Text("DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO.").FontSize(8).SemiBold();
                    });
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Autenticação Digital: ").FontSize(7).FontColor(Colors.Grey.Medium);
                    x.Span(Guid.NewGuid().ToString().ToUpper()).FontSize(7).FontColor(Colors.Grey.Medium);
                    x.Span(" | Emitido em ").FontSize(7).FontColor(Colors.Grey.Medium);
                    x.Span(DateTime.Now.ToString("dd/MM/yyyy HH:mm")).FontSize(7).FontColor(Colors.Grey.Medium);
                });
            });
        });

        return document.GeneratePdf();
    }
}
