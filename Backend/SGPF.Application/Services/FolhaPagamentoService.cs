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
    private readonly IRepository<PlanejamentoFerias> _feriasRepo;
    private static readonly HttpClient _httpClient = new HttpClient();
    private static readonly ConcurrentDictionary<string, byte[]> _logoCache = new();

    public FolhaPagamentoService(
        IRepository<FolhaPagamento> folhaRepo,
        IRepository<Funcionario> funcRepo,
        IRepository<RegistroPonto> pontoRepo,
        IRepository<ContaPagar> contaPagarRepo,
        IRepository<Afastamento> afastamentoRepo,
        IRepository<AgendaEvento> agendaRepo,
        IRepository<Empresa> empresaRepo,
        IRepository<PlanejamentoFerias> feriasRepo)
    {
        _folhaRepo = folhaRepo;
        _funcRepo = funcRepo;
        _pontoRepo = pontoRepo;
        _contaPagarRepo = contaPagarRepo;
        _afastamentoRepo = afastamentoRepo;
        _agendaRepo = agendaRepo;
        _empresaRepo = empresaRepo;
        _feriasRepo = feriasRepo;
    }

    public async Task<List<FolhaPagamento>> ProcessarFolhaAsync(int mes, int ano, TipoFolha tipo = TipoFolha.Mensal)
    {
        var funcionarios = await _funcRepo.GetAllAsync();
        var folhasGeradas = new List<FolhaPagamento>();

        foreach (var func in funcionarios)
        {
            // Verificar se já existe folha processada e FECHADA para este mês/tipo. Se fechada, não reprocessamos.
            var folhasExistentes = await _folhaRepo.FindAsync(f => 
                f.FuncionarioId == func.Id && 
                f.MesReferencia == mes && 
                f.AnoReferencia == ano &&
                f.Tipo == tipo);
            
            var folhaExistente = folhasExistentes.FirstOrDefault();
            if (folhaExistente != null && folhaExistente.Status == StatusFolha.Fechada)
                continue;

            decimal proventos = 0;
            decimal descontos = 0;
            decimal liquido = 0;
            decimal valorAdiantamento13Deducao = 0;

            decimal valorHE50 = 0;
            decimal valorHE100 = 0;
            decimal valorAdicionalNoturno = 0;
            PlanejamentoFerias? feriasFuncionario = null;

            if (tipo == TipoFolha.Adiantamento13)
            {
                // Verificar se o funcionário já solicitou o adiantamento de 13º nas férias para este ano
                var feriasComAdiantamento = await _feriasRepo.FindAsync(fv =>
                    fv.FuncionarioId == func.Id &&
                    fv.DataInicio.Year == ano &&
                    fv.Status != StatusPlanejamentoFerias.Cancelada &&
                    fv.SolicitaAdiantamentoDecimoTerceiro);

                if (feriasComAdiantamento.Any())
                {
                    // Pula o funcionário pois o adiantamento já foi/será pago junto com as férias dele
                    continue;
                }

                proventos = Math.Round(func.SalarioBase * 0.50m, 2);
                descontos = 0; // Sem descontos de INSS na primeira parcela
                liquido = proventos;
            }
            else if (tipo == TipoFolha.DecimoTerceiro)
            {
                proventos = func.SalarioBase;

                // A. Verificar se houve adiantamento pago em lote (folha de adiantamento) neste ano
                var adiantamentosFolha = await _folhaRepo.FindAsync(f =>
                    f.FuncionarioId == func.Id &&
                    f.AnoReferencia == ano &&
                    f.Tipo == TipoFolha.Adiantamento13 &&
                    f.Status == StatusFolha.Fechada);
                
                if (adiantamentosFolha.Any())
                {
                    valorAdiantamento13Deducao = Math.Round(func.SalarioBase * 0.50m, 2);
                }
                else
                {
                    // B. Verificar se houve adiantamento pago nas férias neste ano
                    var feriasComAdiantamento = await _feriasRepo.FindAsync(fv =>
                        fv.FuncionarioId == func.Id &&
                        fv.DataInicio.Year == ano &&
                        fv.Status != StatusPlanejamentoFerias.Cancelada &&
                        fv.SolicitaAdiantamentoDecimoTerceiro);
                    
                    if (feriasComAdiantamento.Any())
                    {
                        valorAdiantamento13Deducao = Math.Round(func.SalarioBase * 0.50m, 2);
                    }
                }

                // INSS simplificado de 8% sobre o 13º integral
                decimal inss = Math.Round(proventos * 0.08m, 2);

                descontos = valorAdiantamento13Deducao + inss;
                liquido = proventos - descontos;
            }
            else
            {

                
                decimal valorHora = func.SalarioBase / 220m; 
                
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

                // Verificar férias do funcionário no próximo mês (CLT Art. 144 — pago antes do início)
                var proximoMes = mes == 12 ? 1 : mes + 1;
                var proximoAno = mes == 12 ? ano + 1 : ano;
                var feriasProximoMes = await _feriasRepo.FindAsync(f =>
                    f.FuncionarioId == func.Id &&
                    f.DataInicio.Month == proximoMes &&
                    f.DataInicio.Year == proximoAno &&
                    f.Status != StatusPlanejamentoFerias.Cancelada &&
                    (f.TipoParcelamento == TipoParcelamentoFerias.Total ||
                     f.TipoParcelamento == TipoParcelamentoFerias.Primeira));

                feriasFuncionario = feriasProximoMes.FirstOrDefault();

                decimal valorDiario = func.SalarioBase / 30m;
                int diasGozoNoMes = 0;
                decimal valorFeriasGozoNoMes = 0;
                decimal valorTercoGozoNoMes = 0;
                decimal valorAdiantamentoFeriasDesconto = 0;

                // Verificar se o funcionário está de férias NESTE mês (CLT Art. 130/143)
                var feriasMesAtual = await _feriasRepo.FindAsync(f =>
                    f.FuncionarioId == func.Id &&
                    f.Status != StatusPlanejamentoFerias.Cancelada &&
                    f.DataInicio <= ultimoDiaMes &&
                    f.DataInicio.AddDays(f.DiasFerias - f.DiasAbono - 1) >= primeiroDiaMes);
                
                var feriasCorrente = feriasMesAtual.FirstOrDefault();
                if (feriasCorrente != null)
                {
                    var inicioFerias = feriasCorrente.DataInicio;
                    var fimFerias = feriasCorrente.DataInicio.AddDays(feriasCorrente.DiasFerias - feriasCorrente.DiasAbono - 1);
                    var inicioOverlap = inicioFerias < primeiroDiaMes ? primeiroDiaMes : inicioFerias;
                    var fimOverlap = fimFerias > ultimoDiaMes ? ultimoDiaMes : fimFerias;
                    diasGozoNoMes = (fimOverlap - inicioOverlap).Days + 1;

                    valorFeriasGozoNoMes = Math.Round(valorDiario * diasGozoNoMes, 2);
                    valorTercoGozoNoMes = Math.Round(valorFeriasGozoNoMes / 3m, 2);
                    valorAdiantamentoFeriasDesconto = valorFeriasGozoNoMes + valorTercoGozoNoMes;
                }

                decimal salarioTrabalhadoCalculado = Math.Round(valorDiario * (30 - diasGozoNoMes), 2);
                proventos = salarioTrabalhadoCalculado + valorHE50 + valorHE100 + valorAdicionalNoturno;

                // Incluir financeiro de férias nos proventos (Adiantamento das férias do PRÓXIMO mês — CLT Art. 144)
                if (feriasFuncionario != null)
                    proventos += feriasFuncionario.ValorTotalBruto;

                // Se está de férias este mês, incluímos nos proventos o valor das férias deste mês, e no desconto o adiantamento
                if (diasGozoNoMes > 0)
                {
                    proventos += (valorFeriasGozoNoMes + valorTercoGozoNoMes);
                }

                descontos = (proventos * 0.08m) + valorDescontoAfastamentos + valorAdiantamentoFeriasDesconto; 
                liquido = proventos - descontos;
            }

            if (folhaExistente != null)
            {
                folhaExistente.SalarioBaseCalculado = func.SalarioBase;
                folhaExistente.TotalDescontos = descontos;
                folhaExistente.SalarioLiquido = liquido;
                folhaExistente.Tipo = tipo;
                folhaExistente.ValorAdiantamento13Deducao = valorAdiantamento13Deducao;
                
                if (tipo != TipoFolha.Mensal)
                {
                    // Limpa rubricas mensais no recálculo do 13º
                    folhaExistente.TotalHorasExtras50 = 0;
                    folhaExistente.ValorHorasExtras50 = 0;
                    folhaExistente.TotalHorasExtras100 = 0;
                    folhaExistente.ValorHorasExtras100 = 0;
                    folhaExistente.ValorAdicionalNoturno = 0;
                    folhaExistente.TotalHorasExtras = 0;
                    folhaExistente.ValorHorasExtras = 0;
                    folhaExistente.ValorFerias = 0;
                    folhaExistente.ValorTercoConstitucionalFerias = 0;
                    folhaExistente.ValorAbonoFeriasVendidas = 0;
                    folhaExistente.DiasFerias = 0;
                    folhaExistente.DiasAbonoFerias = 0;
                    folhaExistente.PlanejamentoFeriasId = null;
                }
                else
                {
                    folhaExistente.ValorFerias = feriasFuncionario != null ? feriasFuncionario.ValorRemFeriasBruto : 0;
                    folhaExistente.ValorTercoConstitucionalFerias = feriasFuncionario != null ? feriasFuncionario.ValorTercoConstitucional : 0;
                    folhaExistente.ValorAbonoFeriasVendidas = feriasFuncionario != null ? feriasFuncionario.ValorAbonoFeriasVendidas : 0;
                    folhaExistente.DiasFerias = feriasFuncionario != null ? feriasFuncionario.DiasFerias : 0;
                    folhaExistente.DiasAbonoFerias = feriasFuncionario != null ? feriasFuncionario.DiasAbono : 0;
                    folhaExistente.PlanejamentoFeriasId = feriasFuncionario?.Id;
                    folhaExistente.ValorAdicionalNoturno = valorAdicionalNoturno;
                }
                
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
                    TotalDescontos = descontos,
                    SalarioLiquido = liquido,
                    Tipo = tipo,
                    ValorAdiantamento13Deducao = valorAdiantamento13Deducao,
                    Status = StatusFolha.Aberta
                };

                if (tipo == TipoFolha.Mensal)
                {
                    folha.ValorFerias = feriasFuncionario != null ? feriasFuncionario.ValorRemFeriasBruto : 0;
                    folha.ValorTercoConstitucionalFerias = feriasFuncionario != null ? feriasFuncionario.ValorTercoConstitucional : 0;
                    folha.ValorAbonoFeriasVendidas = feriasFuncionario != null ? feriasFuncionario.ValorAbonoFeriasVendidas : 0;
                    folha.DiasFerias = feriasFuncionario != null ? feriasFuncionario.DiasFerias : 0;
                    folha.DiasAbonoFerias = feriasFuncionario != null ? feriasFuncionario.DiasAbono : 0;
                    folha.PlanejamentoFeriasId = feriasFuncionario?.Id;
                    folha.ValorAdicionalNoturno = valorAdicionalNoturno;
                }

                await _folhaRepo.AddAsync(folha);
                folhasGeradas.Add(folha);
            }
        }

        return folhasGeradas;
    }

    public async Task<int> ContarFeriasProximoMesAsync(int mesAtual, int anoAtual)
    {
        var proximoMes = mesAtual == 12 ? 1 : mesAtual + 1;
        var proximoAno = mesAtual == 12 ? anoAtual + 1 : anoAtual;

        var ferias = await _feriasRepo.FindAsync(f =>
            f.DataInicio.Month == proximoMes &&
            f.DataInicio.Year == proximoAno &&
            f.Status != StatusPlanejamentoFerias.Cancelada &&
            (f.TipoParcelamento == TipoParcelamentoFerias.Total ||
             f.TipoParcelamento == TipoParcelamentoFerias.Primeira));

        return ferias.Count();
    }

    public async Task<FolhaPagamento> FecharFolhaAsync(Guid folhaId)
    {
        var folha = await _folhaRepo.GetByIdAsync(folhaId);
        if (folha == null || folha.Status != StatusFolha.Aberta)
            throw new Exception("Folha não encontrada ou já fechada.");

        var func = await _funcRepo.GetByIdAsync(folha.FuncionarioId);

        string descricao = folha.Tipo switch
        {
            TipoFolha.Adiantamento13 => $"Adiantamento 13º Salário {folha.AnoReferencia} - {func?.Nome}",
            TipoFolha.DecimoTerceiro => $"13º Salário Final {folha.AnoReferencia} - {func?.Nome}",
            _ => $"Folha Pagamento {folha.MesReferencia:D2}/{folha.AnoReferencia} - {func?.Nome}"
        };

        DateTime vencimento = folha.Tipo switch
        {
            TipoFolha.Adiantamento13 => new DateTime(folha.AnoReferencia, folha.MesReferencia, 30), // Fim do mês de referência
            TipoFolha.DecimoTerceiro => new DateTime(folha.AnoReferencia, 12, 20), // 20 de dezembro
            _ => new DateTime(folha.AnoReferencia, folha.MesReferencia, 5).AddMonths(1) // 5º dia útil do mês seguinte
        };

        // Integração Financeira Restaurada
        var contaPagar = new ContaPagar
        {
            Descricao = descricao,
            Valor = folha.SalarioLiquido,
            DataVencimento = vencimento,
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

        // Calcular dias de férias gozados no mês para ratear salário mensal (feito de forma assíncrona fora das expressões lambdas síncronas)
        var primeiroDiaMes = new DateTime(folha.AnoReferencia, folha.MesReferencia, 1);
        var ultimoDiaMes = primeiroDiaMes.AddMonths(1).AddDays(-1);

        var feriasMesAtual = await _feriasRepo.FindAsync(f =>
            f.FuncionarioId == folha.FuncionarioId &&
            f.Status != StatusPlanejamentoFerias.Cancelada &&
            f.DataInicio <= ultimoDiaMes &&
            f.DataInicio.AddDays(f.DiasFerias - f.DiasAbono - 1) >= primeiroDiaMes);
        
        var feriasCorrente = feriasMesAtual.FirstOrDefault();
        decimal valorFeriasGozoNoMes = 0;
        decimal valorTercoGozoNoMes = 0;
        decimal valorAdiantamentoFeriasDesconto = 0;
        int diasGozoNoMes = 0;

        if (feriasCorrente != null)
        {
            var inicioFerias = feriasCorrente.DataInicio;
            var fimFerias = feriasCorrente.DataInicio.AddDays(feriasCorrente.DiasFerias - feriasCorrente.DiasAbono - 1);
            var inicioOverlap = inicioFerias < primeiroDiaMes ? primeiroDiaMes : inicioFerias;
            var fimOverlap = fimFerias > ultimoDiaMes ? ultimoDiaMes : fimFerias;
            diasGozoNoMes = (fimOverlap - inicioOverlap).Days + 1;

            decimal valorDiario = folha.SalarioBaseCalculado / 30m;
            valorFeriasGozoNoMes = Math.Round(valorDiario * diasGozoNoMes, 2);
            valorTercoGozoNoMes = Math.Round(valorFeriasGozoNoMes / 3m, 2);
            valorAdiantamentoFeriasDesconto = valorFeriasGozoNoMes + valorTercoGozoNoMes;
        }

        int diasTrabalhados = 30 - diasGozoNoMes;
        decimal salarioTrabalhadoVal = Math.Round((folha.SalarioBaseCalculado / 30m) * diasTrabalhados, 2);

        PlanejamentoFerias? feriasFunc = null;
        if (folha.PlanejamentoFeriasId.HasValue)
        {
            feriasFunc = await _feriasRepo.GetByIdAsync(folha.PlanejamentoFeriasId.Value);
        }

        decimal valor13Adiantamento = 0;
        if (feriasFunc != null && feriasFunc.SolicitaAdiantamentoDecimoTerceiro)
        {
            valor13Adiantamento = feriasFunc.ValorAdiantamentoDecimoTerceiro;
        }

        decimal totalVencimentos = folha.Tipo switch
        {
            TipoFolha.Adiantamento13 => folha.SalarioLiquido,
            TipoFolha.DecimoTerceiro => folha.SalarioBaseCalculado,
            _ => Math.Round(salarioTrabalhadoVal + folha.ValorHorasExtras50 + folha.ValorHorasExtras100 + folha.ValorAdicionalNoturno + folha.ValorFerias + folha.ValorTercoConstitucionalFerias + folha.ValorAbonoFeriasVendidas + valor13Adiantamento + (diasGozoNoMes > 0 ? (valorFeriasGozoNoMes + valorTercoGozoNoMes) : 0m), 2)
        };
        
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
                            c.Item().AlignCenter().Text(folha.Tipo switch
                            {
                                TipoFolha.Adiantamento13 => "13º SALÁRIO - 1ª PARCELA",
                                TipoFolha.DecimoTerceiro => "13º SALÁRIO - PARCELA FINAL",
                                _ => "RECIBO DE PAGAMENTO"
                            }).FontSize(8).Bold().FontColor(Colors.Indigo.Medium);
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

                        if (folha.Tipo == TipoFolha.Adiantamento13)
                        {
                            // 13º Salário Adiantamento (1ª Parcela)
                            table.Cell().Element(ItemStyle).Text("131");
                            table.Cell().Element(ItemStyle).Text("Adiantamento de 13º Salário");
                            table.Cell().Element(ItemStyle).AlignCenter().Text("50%");
                            table.Cell().Element(ItemStyle).AlignRight().Text(folha.SalarioLiquido.ToString("N2"));
                            table.Cell().Element(ItemStyle).Text("");
                        }
                        else if (folha.Tipo == TipoFolha.DecimoTerceiro)
                        {
                            // 13º Salário Integral
                            table.Cell().Element(ItemStyle).Text("130");
                            table.Cell().Element(ItemStyle).Text("13º Salário Integral");
                            table.Cell().Element(ItemStyle).AlignCenter().Text("12/12");
                            table.Cell().Element(ItemStyle).AlignRight().Text(folha.SalarioBaseCalculado.ToString("N2"));
                            table.Cell().Element(ItemStyle).Text("");

                            // Desconto Adiantamento 13º (se houver)
                            if (folha.ValorAdiantamento13Deducao > 0)
                            {
                                table.Cell().Element(ItemStyle).Text("920");
                                table.Cell().Element(ItemStyle).Text("Desconto Adiantamento de 13º");
                                table.Cell().Element(ItemStyle).AlignCenter().Text("-");
                                table.Cell().Element(ItemStyle).Text("");
                                table.Cell().Element(ItemStyle).AlignRight().Text(folha.ValorAdiantamento13Deducao.ToString("N2"));
                            }

                            // INSS sobre 13º Salário
                            decimal inss13 = folha.TotalDescontos - folha.ValorAdiantamento13Deducao;
                            if (inss13 > 0)
                            {
                                table.Cell().Element(ItemStyle).Text("900");
                                table.Cell().Element(ItemStyle).Text("INSS sobre 13º Salário");
                                table.Cell().Element(ItemStyle).AlignCenter().Text("8.00%");
                                table.Cell().Element(ItemStyle).Text("");
                                table.Cell().Element(ItemStyle).AlignRight().Text(inss13.ToString("N2"));
                            }
                        }
                        else
                        {
                            // Lógica de Folha Mensal Padrão
                            table.Cell().Element(ItemStyle).Text("001");
                            table.Cell().Element(ItemStyle).Text("Salário Mensal");
                            table.Cell().Element(ItemStyle).AlignCenter().Text($"{diasTrabalhados} Dias");
                            table.Cell().Element(ItemStyle).AlignRight().Text(salarioTrabalhadoVal.ToString("N2"));
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

                            // Linhas de Férias (se houver planejamento no próximo mês — CLT Art. 144)
                            if (folha.ValorFerias > 0)
                            {
                                int diasGozo = folha.DiasFerias - folha.DiasAbonoFerias;
                                table.Cell().Element(ItemStyle).Text("810");
                                table.Cell().Element(ItemStyle).Text($"Férias ({diasGozo} dias — CLT Art. 144)");
                                table.Cell().Element(ItemStyle).AlignCenter().Text($"{diasGozo}d");
                                table.Cell().Element(ItemStyle).AlignRight().Text(folha.ValorFerias.ToString("N2"));
                                table.Cell().Element(ItemStyle).Text("");

                                table.Cell().Element(ItemStyle).Text("811");
                                table.Cell().Element(ItemStyle).Text("1/3 Constitucional sobre Férias (CF Art. 7º XVII)");
                                table.Cell().Element(ItemStyle).AlignCenter().Text("-");
                                table.Cell().Element(ItemStyle).AlignRight().Text(folha.ValorTercoConstitucionalFerias.ToString("N2"));
                                table.Cell().Element(ItemStyle).Text("");
                            }

                            if (folha.ValorAbonoFeriasVendidas > 0)
                            {
                                table.Cell().Element(ItemStyle).Text("820");
                                table.Cell().Element(ItemStyle).Text($"Abono Pecuniário ({folha.DiasAbonoFerias} dias — CLT Art. 143)");
                                table.Cell().Element(ItemStyle).AlignCenter().Text($"{folha.DiasAbonoFerias}d");
                                table.Cell().Element(ItemStyle).AlignRight().Text(folha.ValorAbonoFeriasVendidas.ToString("N2"));
                                table.Cell().Element(ItemStyle).Text("");
                            }

                            if (valor13Adiantamento > 0)
                            {
                                table.Cell().Element(ItemStyle).Text("131");
                                table.Cell().Element(ItemStyle).Text("Adiantamento de 13º Salário (Férias)");
                                table.Cell().Element(ItemStyle).AlignCenter().Text("50%");
                                table.Cell().Element(ItemStyle).AlignRight().Text(valor13Adiantamento.ToString("N2"));
                                table.Cell().Element(ItemStyle).Text("");
                            }

                            // Se está de férias este mês, incluímos as rubricas de férias deste mês no PDF
                            if (diasGozoNoMes > 0)
                            {
                                table.Cell().Element(ItemStyle).Text("810");
                                table.Cell().Element(ItemStyle).Text($"Férias ({diasGozoNoMes} dias — CLT Art. 144)");
                                table.Cell().Element(ItemStyle).AlignCenter().Text($"{diasGozoNoMes}d");
                                table.Cell().Element(ItemStyle).AlignRight().Text(valorFeriasGozoNoMes.ToString("N2"));
                                table.Cell().Element(ItemStyle).Text("");

                                table.Cell().Element(ItemStyle).Text("811");
                                table.Cell().Element(ItemStyle).Text("1/3 Constitucional sobre Férias (CF Art. 7º XVII)");
                                table.Cell().Element(ItemStyle).AlignCenter().Text("-");
                                table.Cell().Element(ItemStyle).AlignRight().Text(valorTercoGozoNoMes.ToString("N2"));
                                table.Cell().Element(ItemStyle).Text("");

                                table.Cell().Element(ItemStyle).Text("925");
                                table.Cell().Element(ItemStyle).Text("Desconto de Adiantamento de Férias");
                                table.Cell().Element(ItemStyle).AlignCenter().Text("-");
                                table.Cell().Element(ItemStyle).Text("");
                                table.Cell().Element(ItemStyle).AlignRight().Text(valorAdiantamentoFeriasDesconto.ToString("N2"));
                            }

                            // Linha: INSS (Simulado)
                            decimal inssVal = folha.TotalDescontos - valorAdiantamentoFeriasDesconto;
                            if (inssVal > 0)
                            {
                                table.Cell().Element(ItemStyle).Text("900");
                                table.Cell().Element(ItemStyle).Text("INSS / Previdência Social");
                                table.Cell().Element(ItemStyle).AlignCenter().Text("8.00%");
                                table.Cell().Element(ItemStyle).Text("");
                                table.Cell().Element(ItemStyle).AlignRight().Text(inssVal.ToString("N2"));
                            }
                        }

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
                                r.ConstantItem(80).AlignRight().Text($"R$ {totalVencimentos:N2}").FontSize(8);
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


}
