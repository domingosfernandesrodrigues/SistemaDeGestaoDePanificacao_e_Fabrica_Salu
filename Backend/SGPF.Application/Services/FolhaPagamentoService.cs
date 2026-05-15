using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;
using System.Net.Http;
using System.Collections.Concurrent;

namespace SGPF.Application.Services;

public class FolhaPagamentoService : IFolhaPagamentoService
{
    private readonly IRepository<FolhaPagamento> _folhaRepo;
    private readonly IRepository<Funcionario> _funcRepo;
    private readonly IRepository<RegistroPonto> _pontoRepo;
    private readonly IRepository<ContaPagar> _contaPagarRepo;
    private readonly IRepository<Afastamento> _afastamentoRepo;
    private readonly IRepository<AgendaEvento> _agendaRepo;
    private readonly IRepository<Empresa> _empresaRepo;
    private static readonly HttpClient _httpClient = new HttpClient();
    private static readonly ConcurrentDictionary<string, byte[]> _logoCache = new();

    public FolhaPagamentoService(
        IRepository<FolhaPagamento> folhaRepo,
        IRepository<Funcionario> funcRepo,
        IRepository<RegistroPonto> pontoRepo,
        IRepository<ContaPagar> contaPagarRepo,
        IRepository<Afastamento> afastamentoRepo,
        IRepository<AgendaEvento> agendaRepo,
        IRepository<Empresa> empresaRepo)
    {
        _folhaRepo = folhaRepo;
        _funcRepo = funcRepo;
        _pontoRepo = pontoRepo;
        _contaPagarRepo = contaPagarRepo;
        _afastamentoRepo = afastamentoRepo;
        _agendaRepo = agendaRepo;
        _empresaRepo = empresaRepo;
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

            var feriados = (await _agendaRepo.GetAllAsync())
                .Where(f => f.Data.Month == mes && f.Data.Year == ano && f.Tipo == "Feriado")
                .ToList();

            decimal totalHE50 = 0;
            decimal totalHE100 = 0;
            decimal totalHorasNoturnas = 0;

            foreach (var g in registros.GroupBy(r => r.DataHoraEntrada.Date))
            {
                var data = g.Key;
                var totalDia = g.Sum(r => r.TotalHorasTrabalhadas);
                
                bool ehFeriado = feriados.Any(f => f.Data.Date == data.Date) || 
                                 data.DayOfWeek == DayOfWeek.Sunday ||
                                 EhFeriadoNacional(data);

                if (ehFeriado)
                {
                    totalHE100 += totalDia;
                }
                else
                {
                    var heDia = totalDia > 8 ? totalDia - 8 : 0;
                    totalHE50 += heDia;
                }

                // Cálculo Adicional Noturno (22h às 05h)
                foreach (var reg in g)
                {
                    totalHorasNoturnas += CalcularHorasNoturnas(reg.DataHoraEntrada, reg.DataHoraSaida ?? reg.DataHoraEntrada);
                }
            }
            
            decimal valorHora = func.SalarioBase / 220m; 
            decimal valorHE50 = totalHE50 * (valorHora * 1.5m);
            decimal valorHE100 = totalHE100 * (valorHora * 2.0m);
            decimal valorAdicionalNoturno = totalHorasNoturnas * (valorHora * 0.20m);
            
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

            decimal proventos = func.SalarioBase + valorHE50 + valorHE100 + valorAdicionalNoturno;
            decimal descontos = (proventos * 0.08m) + valorDescontoAfastamentos; 
            decimal liquido = proventos - descontos;

            if (folhaExistente != null)
            {
                folhaExistente.SalarioBaseCalculado = func.SalarioBase;
                folhaExistente.TotalHorasExtras50 = totalHE50;
                folhaExistente.ValorHorasExtras50 = valorHE50;
                folhaExistente.TotalHorasExtras100 = totalHE100;
                folhaExistente.ValorHorasExtras100 = valorHE100;
                folhaExistente.ValorAdicionalNoturno = valorAdicionalNoturno;
                folhaExistente.TotalHorasExtras = totalHE50 + totalHE100;
                folhaExistente.ValorHorasExtras = valorHE50 + valorHE100;
                folhaExistente.TotalDescontos = descontos;
                folhaExistente.SalarioLiquido = liquido;
                
                await _folhaRepo.UpdateAsync(folhaExistente);
                folhasGeradas.Add(folhaExistente);
            }
            else
            {
                var folha = new FolhaPagamento
                {
                    FuncionarioId = func.Id,
                    MesReferencia = mes,
                    AnoReferencia = ano,
                    SalarioBaseCalculado = func.SalarioBase,
                    TotalHorasExtras50 = totalHE50,
                    ValorHorasExtras50 = valorHE50,
                    TotalHorasExtras100 = totalHE100,
                    ValorHorasExtras100 = valorHE100,
                    ValorAdicionalNoturno = valorAdicionalNoturno,
                    TotalHorasExtras = totalHE50 + totalHE100,
                    ValorHorasExtras = valorHE50 + valorHE100,
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

        // Integração Financeira Restaurada
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
        
        var empresaList = await _empresaRepo.GetAllAsync();
        var empresa = empresaList.FirstOrDefault();
        
        string nomeEmpresa = !string.IsNullOrEmpty(empresa?.RazaoSocial) ? empresa.RazaoSocial : "SGP-FÁBRICA LTDA";
        string cnpjEmpresa = !string.IsNullOrEmpty(empresa?.CNPJ) ? empresa.CNPJ : "00.000.000/0001-00";
        string endEmpresa = !string.IsNullOrEmpty(empresa?.Endereco) ? empresa.Endereco : "Rua da Indústria, 123 - Polo Industrial";
        
        byte[]? logoBytes = null;
        if (!string.IsNullOrEmpty(empresa?.LogoUrl))
        {
            if (_logoCache.TryGetValue(empresa.LogoUrl, out var cachedLogo))
            {
                logoBytes = cachedLogo;
            }
            else if (empresa.LogoUrl.StartsWith("data:image"))
            {
                try
                {
                    var base64Data = empresa.LogoUrl.Substring(empresa.LogoUrl.IndexOf("base64,") + 7);
                    logoBytes = Convert.FromBase64String(base64Data);
                    if (logoBytes != null) _logoCache.TryAdd(empresa.LogoUrl, logoBytes);
                }
                catch { }
            }
            else
            {
                // Usa cliente estático para reusar conexão e evitar handshakes TLS repetidos
                try
                {
                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
                    var response = await _httpClient.GetAsync(empresa.LogoUrl, cts.Token);
                    if (response.IsSuccessStatusCode)
                    {
                        var content = await response.Content.ReadAsByteArrayAsync(cts.Token);
                        if (content.Length > 4 && 
                            ((content[0] == 0xFF && content[1] == 0xD8) || // JPG
                             (content[0] == 0x89 && content[1] == 0x50 && content[2] == 0x4E && content[3] == 0x47) || // PNG
                             (content[0] == 0x47 && content[1] == 0x49 && content[2] == 0x46))) // GIF
                        {
                            logoBytes = content;
                            _logoCache.TryAdd(empresa.LogoUrl, logoBytes);
                        }
                    }
                }
                catch
                {
                    // Logo indisponível — continua sem ela
                }
            }
        }


        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(9));

                // Borda externa decorativa
                page.Content().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(20).Column(col =>
                {
                    col.Spacing(10);

                    // Cabeçalho Principal
                    col.Item().Row(row =>
                    {
                        if (logoBytes != null)
                        {
                            row.ConstantItem(60).Height(50).Image(logoBytes).FitArea();
                            row.ConstantItem(15);
                        }

                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text(nomeEmpresa).FontSize(14).ExtraBold().FontColor(Colors.Indigo.Medium);
                            c.Item().Text($"CNPJ: {cnpjEmpresa}").FontSize(8).FontColor(Colors.Grey.Medium);
                            c.Item().Text(endEmpresa).FontSize(8).FontColor(Colors.Grey.Medium);
                        });

                        row.ConstantItem(150).Background(Colors.Indigo.Lighten5).Padding(10).Column(c =>
                        {
                            c.Item().AlignCenter().Text("RECIBO DE PAGAMENTO").FontSize(8).Bold().FontColor(Colors.Indigo.Medium);
                            c.Item().AlignCenter().Text($"{folha.MesReferencia:D2}/{folha.AnoReferencia}").FontSize(18).ExtraBold();
                        });
                    });

                    col.Item().PaddingVertical(5).LineHorizontal(1).LineColor(Colors.Grey.Lighten3);

                    // Dados do Funcionário
                    col.Item().Row(row =>
                    {
                        row.RelativeItem(3).Column(c =>
                        {
                            c.Item().Text("FUNCIONÁRIO").FontSize(7).Bold().FontColor(Colors.Grey.Medium);
                            c.Item().Text(func?.Nome?.ToUpper() ?? "NÃO INFORMADO").FontSize(11).Bold();
                        });
                        row.RelativeItem(2).Column(c =>
                        {
                            c.Item().Text("CARGO").FontSize(7).Bold().FontColor(Colors.Grey.Medium);
                            c.Item().Text(func?.Cargo ?? "NÃO INFORMADO").FontSize(9);
                        });
                        row.RelativeItem(2).Column(c =>
                        {
                            c.Item().Text("CPF").FontSize(7).Bold().FontColor(Colors.Grey.Medium);
                            c.Item().Text(func?.CPF ?? "000.000.000-00").FontSize(9);
                        });
                    });

                    col.Item().PaddingVertical(10);

                    // Tabela de Itens
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(30);
                            columns.RelativeColumn(1);
                            columns.ConstantColumn(50);
                            columns.ConstantColumn(75);
                            columns.ConstantColumn(75);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(CellStyle).Text("CÓD").Bold();
                            header.Cell().Element(CellStyle).Text("DESCRIÇÃO").Bold();
                            header.Cell().Element(CellStyle).AlignCenter().Text("REF").Bold();
                            header.Cell().Element(CellStyle).AlignRight().Text("VENCIMENTOS").Bold();
                            header.Cell().Element(CellStyle).AlignRight().Text("DESCONTOS").Bold();

                            static IContainer CellStyle(IContainer container)
                            {
                                return container.DefaultTextStyle(x => x.FontColor(Colors.White).FontSize(8))
                                                .Background(Colors.Indigo.Medium)
                                                .PaddingVertical(5)
                                                .PaddingHorizontal(5);
                            }
                        });

                        // Linha: Salário Base
                        table.Cell().Element(ItemStyle).Text("001");
                        table.Cell().Element(ItemStyle).Text("Salário Mensal");
                        table.Cell().Element(ItemStyle).AlignCenter().Text("30 Dias");
                        table.Cell().Element(ItemStyle).AlignRight().Text(folha.SalarioBaseCalculado.ToString("N2"));
                        table.Cell().Element(ItemStyle).Text("");

                        // Linha: Horas Extras 50%
                        if (folha.TotalHorasExtras50 > 0)
                        {
                            table.Cell().Element(ItemStyle).Text("050");
                            table.Cell().Element(ItemStyle).Text("Horas Extras (50%)");
                            table.Cell().Element(ItemStyle).AlignCenter().Text($"{folha.TotalHorasExtras50:N1}h");
                            table.Cell().Element(ItemStyle).AlignRight().Text(folha.ValorHorasExtras50.ToString("N2"));
                            table.Cell().Element(ItemStyle).Text("");
                        }

                        // Linha: Horas Extras 100%
                        if (folha.TotalHorasExtras100 > 0)
                        {
                            table.Cell().Element(ItemStyle).Text("100");
                            table.Cell().Element(ItemStyle).Text("Horas Extras (100% - Feriado/Dom)");
                            table.Cell().Element(ItemStyle).AlignCenter().Text($"{folha.TotalHorasExtras100:N1}h");
                            table.Cell().Element(ItemStyle).AlignRight().Text(folha.ValorHorasExtras100.ToString("N2"));
                            table.Cell().Element(ItemStyle).Text("");
                        }

                        // Linha: Adicional Noturno
                        if (folha.ValorAdicionalNoturno > 0)
                        {
                            table.Cell().Element(ItemStyle).Text("060");
                            table.Cell().Element(ItemStyle).Text("Adicional Noturno (20%)");
                            table.Cell().Element(ItemStyle).AlignCenter().Text("-");
                            table.Cell().Element(ItemStyle).AlignRight().Text(folha.ValorAdicionalNoturno.ToString("N2"));
                            table.Cell().Element(ItemStyle).Text("");
                        }

                        // Linha: INSS (Simulado)
                        table.Cell().Element(ItemStyle).Text("900");
                        table.Cell().Element(ItemStyle).Text("INSS / Previdência Social");
                        table.Cell().Element(ItemStyle).AlignCenter().Text("8.00%");
                        table.Cell().Element(ItemStyle).Text("");
                        table.Cell().Element(ItemStyle).AlignRight().Text(folha.TotalDescontos.ToString("N2"));

                        static IContainer ItemStyle(IContainer container)
                        {
                            return container.BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten4).PaddingVertical(6).PaddingHorizontal(5);
                        }
                    });

                    // Totais e Líquido
                    col.Item().PaddingTop(15).Row(row =>
                    {
                        row.RelativeItem(2);
                        row.RelativeItem(3).Column(c =>
                        {
                            c.Item().Row(r =>
                            {
                                r.RelativeItem().Text("Total de Vencimentos").FontSize(8).Bold();
                                r.ConstantItem(80).AlignRight().Text($"R$ {(folha.SalarioBaseCalculado + folha.ValorHorasExtras50 + folha.ValorHorasExtras100 + folha.ValorAdicionalNoturno):N2}").FontSize(8);
                            });
                            c.Item().Row(r =>
                            {
                                r.RelativeItem().Text("Total de Descontos").FontSize(8).Bold().FontColor(Colors.Red.Medium);
                                r.ConstantItem(80).AlignRight().Text($"R$ {folha.TotalDescontos:N2}").FontSize(8).FontColor(Colors.Red.Medium);
                            });

                            c.Item().PaddingTop(10).Background(Colors.Indigo.Lighten5).Padding(10).Row(r =>
                            {
                                r.RelativeItem().Text("VALOR LÍQUIDO").FontSize(12).ExtraBold().FontColor(Colors.Indigo.Medium);
                                r.ConstantItem(100).AlignRight().Text($"R$ {folha.SalarioLiquido:N2}").FontSize(12).ExtraBold().FontColor(Colors.Indigo.Medium);
                            });
                        });
                    });

                    col.Item().PaddingTop(30).Column(c =>
                    {
                        c.Spacing(20);
                        c.Item().AlignCenter().Text("Declaro ter recebido a importância líquida discriminada neste recibo.").FontSize(8).Italic();
                        
                        c.Item().Row(row =>
                        {
                            row.RelativeItem().PaddingHorizontal(20).Column(colAssinatura =>
                            {
                                colAssinatura.Item().PaddingTop(20).LineHorizontal(0.5f).LineColor(Colors.Black);
                                colAssinatura.Item().AlignCenter().Text("Assinatura do Funcionário").FontSize(7).Bold();
                                colAssinatura.Item().AlignCenter().Text(DateTime.Now.ToString("dd/MM/yyyy")).FontSize(6);
                            });
                            row.RelativeItem().PaddingHorizontal(20).Column(colAssinatura =>
                            {
                                colAssinatura.Item().PaddingTop(20).LineHorizontal(0.5f).LineColor(Colors.Black);
                                colAssinatura.Item().AlignCenter().Text("Responsável pela Empresa").FontSize(7).Bold();
                                colAssinatura.Item().AlignCenter().Text(!string.IsNullOrEmpty(empresa?.NomeFantasia) ? empresa.NomeFantasia : nomeEmpresa).FontSize(6);
                            });
                        });
                    });
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Autenticação: ").FontSize(6).FontColor(Colors.Grey.Medium);
                    x.Span(Guid.NewGuid().ToString().ToUpper()).FontSize(6).FontColor(Colors.Grey.Medium);
                    x.Span(" | Gerado via Sistema SGP-F ERP").FontSize(6).FontColor(Colors.Grey.Medium);
                });
            });
        });

        return document.GeneratePdf();
    }

    private bool EhFeriadoNacional(DateTime data)
    {
        var feriados = new List<(int mes, int dia)>
        {
            (1, 1),   // Ano Novo
            (4, 21),  // Tiradentes
            (5, 1),   // Dia do Trabalho
            (9, 7),   // Independência
            (10, 12), // Nossa Sra Aparecida
            (11, 2),  // Finados
            (11, 15), // Proclamação República
            (12, 25)  // Natal
        };
        return feriados.Any(f => f.mes == data.Month && f.dia == data.Day);
    }

    private decimal CalcularHorasNoturnas(DateTime entrada, DateTime saida)
    {
        // Faixa noturna: 22h às 05h do dia seguinte
        var inicioNoturno = entrada.Date.AddHours(22);
        var fimNoturno = entrada.Date.AddDays(1).AddHours(5);

        if (saida <= inicioNoturno) return 0;
        
        var start = entrada > inicioNoturno ? entrada : inicioNoturno;
        var end = saida < fimNoturno ? saida : fimNoturno;

        if (end <= start) return 0;

        return (decimal)(end - start).TotalHours;
    }
}
