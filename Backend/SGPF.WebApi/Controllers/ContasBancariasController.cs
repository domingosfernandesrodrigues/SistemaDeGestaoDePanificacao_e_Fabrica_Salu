using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;
using SGPF.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin,Gestor")]
public class ContasBancariasController : ControllerBase
{
    private readonly IRepository<ContaBancaria> _repository;
    private readonly IRepository<MovimentacaoBancaria> _movimentacaoRepo;
    private readonly IRepository<ContaReceber> _receberRepo;
    private readonly IRepository<ContaPagar> _pagarRepo;
    private readonly AppDbContext _context;

    public ContasBancariasController(
        IRepository<ContaBancaria> repository,
        IRepository<MovimentacaoBancaria> movimentacaoRepo,
        IRepository<ContaReceber> receberRepo,
        IRepository<ContaPagar> pagarRepo,
        AppDbContext context)
    {
        _repository = repository;
        _movimentacaoRepo = movimentacaoRepo;
        _receberRepo = receberRepo;
        _pagarRepo = pagarRepo;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _repository.GetAllAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var conta = await _repository.GetByIdAsync(id);
        return conta == null ? NotFound() : Ok(conta);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ContaBancaria conta)
    {
        // Se for a primeira conta ou marcada como padrão, desmarca as outras
        if (conta.IsPadrao)
        {
            await DesmarcarOutrasContasPadrao(Guid.Empty);
        }

        conta.SaldoAtual = conta.SaldoInicial;
        await _repository.AddAsync(conta);

        if (conta.SaldoInicial > 0)
        {
            await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
            {
                ContaBancariaId = conta.Id,
                Tipo = "entrada",
                Valor = conta.SaldoInicial,
                Descricao = "Saldo Inicial de Abertura de Conta",
                DataMovimentacao = DateTime.Now,
                Origem = OrigemMovimentacao.AberturaConta
            });
        }

        return CreatedAtAction(nameof(GetById), new { id = conta.Id }, conta);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ContaBancaria conta)
    {
        if (id != conta.Id) return BadRequest();
        
        var existing = await _repository.GetByIdAsync(id);
        if (existing == null) return NotFound();

        if (conta.IsPadrao && !existing.IsPadrao)
        {
            await DesmarcarOutrasContasPadrao(id);
        }

        existing.Nome = conta.Nome;
        existing.Tipo = conta.Tipo;
        existing.Ativa = conta.Ativa;
        existing.IsPadrao = conta.IsPadrao;
        existing.SaldoInicial = conta.SaldoInicial;
        existing.PixChave = conta.PixChave;
        existing.BancoNome = conta.BancoNome;
        existing.Agencia = conta.Agencia;
        existing.NumeroConta = conta.NumeroConta;
        existing.GatewayToken = conta.GatewayToken;

        if (existing.SaldoAtual == existing.SaldoInicial)
        {
            existing.SaldoAtual = conta.SaldoInicial;
        }

        await _repository.UpdateAsync(existing);
        return NoContent();
    }

    [HttpPost("{id}/movimentar")]
    public async Task<IActionResult> Movimentar(Guid id, [FromBody] MovimentacaoManual request)
    {
        var conta = await _repository.GetByIdAsync(id);
        if (conta == null) return NotFound();

        if (request.Tipo == "entrada")
        {
            conta.SaldoAtual += request.Valor;
        }
        else
        {
            conta.SaldoAtual -= request.Valor;
        }

        await _repository.UpdateAsync(conta);

        // Gravar movimentação manual
        await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
        {
            ContaBancariaId = conta.Id,
            Tipo = request.Tipo,
            Valor = request.Valor,
            Descricao = string.IsNullOrWhiteSpace(request.Descricao) ? "Movimentação Manual" : request.Descricao,
            DataMovimentacao = DateTime.Now,
            Origem = OrigemMovimentacao.Manual
        });

        return Ok(conta);
    }

    private async Task DesmarcarOutrasContasPadrao(Guid exceptId)
    {
        var todas = await _repository.GetAllAsync();
        foreach (var c in todas.Where(x => x.Id != exceptId && x.IsPadrao))
        {
            c.IsPadrao = false;
            await _repository.UpdateAsync(c);
        }
    }

    [HttpGet("extrato")]
    public async Task<IActionResult> GetExtrato([FromQuery] int mes, [FromQuery] int ano, [FromQuery] Guid? contaId = null)
    {
        var dataInicio = new DateTime(ano, mes, 1, 0, 0, 0, DateTimeKind.Local);
        var dataFim = dataInicio.AddMonths(1).AddTicks(-1);

        var contaPadrao = (await _repository.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault();
        bool filtrarPadrao = contaPadrao != null && (!contaId.HasValue || contaId.Value == contaPadrao.Id);

        var extratoList = new List<object>();

        // 1. Obter movimentações manuais gravadas
        var movs = await _movimentacaoRepo.FindAsync(
            m => m.DataMovimentacao >= dataInicio && m.DataMovimentacao <= dataFim && (!contaId.HasValue || m.ContaBancariaId == contaId.Value),
            asNoTracking: true
        );
        foreach (var m in movs)
        {
            extratoList.Add(new
            {
                m.Id,
                m.ContaBancariaId,
                m.Tipo,
                m.Valor,
                m.Descricao,
                m.DataMovimentacao,
                Origem = (int)m.Origem,
                m.ReferenciaId
            });
        }

        // Se for a conta padrão, integramos com as baixas financeiras reais para trazer o histórico preexistente
        if (filtrarPadrao && contaPadrao != null)
        {
            // Otimização: Criação de HashSet para busca em tempo constante O(1)
            var movsReferenciaIds = movs
                .Where(m => m.ReferenciaId.HasValue)
                .Select(m => m.ReferenciaId!.Value)
                .ToHashSet();

            // 2. Receitas recebidas (Contas a Receber)
            var receitas = await _receberRepo.FindAsync(
                r => r.Status == StatusContaReceber.Recebido && r.DataRecebimento >= dataInicio && r.DataRecebimento <= dataFim,
                asNoTracking: true
            );
            foreach (var r in receitas)
            {
                // Evita duplicados caso já tenha sido gravado na tabela nova
                if (!movsReferenciaIds.Contains(r.Id))
                {
                    extratoList.Add(new
                    {
                        Id = r.Id,
                        ContaBancariaId = contaPadrao.Id,
                        Tipo = "entrada",
                        r.Valor,
                        Descricao = $"Baixa de Conta a Receber: {r.Descricao}",
                        DataMovimentacao = r.DataRecebimento ?? r.DataEmissao,
                        Origem = 2, // Receita/BaixaReceber
                        ReferenciaId = (Guid?)r.Id
                    });
                }
            }

            // 3. Despesas pagas (Contas a Pagar)
            var despesas = await _pagarRepo.FindAsync(
                p => p.Status == StatusContaPagar.Paga && p.DataPagamento >= dataInicio && p.DataPagamento <= dataFim,
                asNoTracking: true
            );
            foreach (var p in despesas)
            {
                if (!movsReferenciaIds.Contains(p.Id))
                {
                    int origem = 1; // Despesa/BaixaPagar
                    if (p.Categoria.Contains("Frota"))
                    {
                        origem = p.Descricao.Contains("Abastecimento") ? 4 : 5; // FrotaAbastecimento ou FrotaManutencao
                    }

                    extratoList.Add(new
                    {
                        Id = p.Id,
                        ContaBancariaId = contaPadrao.Id,
                        Tipo = "saida",
                        p.Valor,
                        Descricao = $"Baixa de Conta a Pagar: {p.Descricao}",
                        DataMovimentacao = p.DataPagamento ?? p.DataEmissao,
                        Origem = origem,
                        ReferenciaId = (Guid?)p.Id
                    });
                }
            }
        }

        // Retorna ordenado dinamicamente por data descendente
        var resultadoOrdenado = extratoList
            .OrderByDescending(x => {
                var prop = x.GetType().GetProperty("DataMovimentacao");
                return prop != null ? (DateTime)prop.GetValue(x)! : DateTime.MinValue;
            })
            .ToList();

        return Ok(resultadoOrdenado);
    }

    [HttpGet("saldos-periodo")]
    public async Task<IActionResult> GetSaldosPeriodo([FromQuery] int mes, [FromQuery] int ano)
    {
        var contas = await _repository.GetAllAsync();
        var dataLimite = new DateTime(ano, mes, 1, 0, 0, 0, DateTimeKind.Local).AddMonths(1);
        var dataHoje = DateTime.Now;

        var contaPadrao = contas.FirstOrDefault(c => c.IsPadrao && c.Ativa);

        // Se o período selecionado for anterior ao mês atual, aplicamos o cálculo retroativo
        bool isHistorico = dataLimite <= new DateTime(dataHoje.Year, dataHoje.Month, 1, 0, 0, 0, DateTimeKind.Local);

        decimal receitasFuturas = 0;
        decimal despesasFuturas = 0;
        var refIds = new HashSet<Guid>();
        var movsResumo = new List<MovimentacaoResumo>();

        if (isHistorico)
        {
            // Otimização de Banco de Dados: Executa somas diretas no banco usando LINQ SumAsync
            var recsQuery = _context.ContasReceber
                .AsNoTracking()
                .Where(r => r.Status == StatusContaReceber.Recebido && r.DataRecebimento >= dataLimite);
            
            receitasFuturas = await recsQuery.SumAsync(r => r.Valor);
            var recIds = await recsQuery.Select(r => r.Id).ToListAsync();

            var despQuery = _context.ContasPagar
                .AsNoTracking()
                .Where(p => p.Status == StatusContaPagar.Paga && p.DataPagamento >= dataLimite);
            
            despesasFuturas = await despQuery.SumAsync(p => p.Valor);
            var despIds = await despQuery.Select(p => p.Id).ToListAsync();

            refIds = recIds.Concat(despIds).Distinct().ToHashSet();

            // Otimização de Banco de Dados: Busca apenas agrupamentos de movimentações futuras (reduzindo milhares de linhas para poucas linhas agregadas)
            var queryMovs = _context.MovimentacoesBancarias
                .AsNoTracking()
                .Where(m => m.DataMovimentacao >= dataLimite);

            if (refIds.Any())
            {
                queryMovs = queryMovs.Where(m => !m.ReferenciaId.HasValue || !refIds.Contains(m.ReferenciaId.Value));
            }

            movsResumo = await queryMovs
                .GroupBy(m => new { m.ContaBancariaId, m.Tipo })
                .Select(g => new MovimentacaoResumo 
                { 
                    ContaBancariaId = g.Key.ContaBancariaId, 
                    Tipo = g.Key.Tipo, 
                    Total = g.Sum(x => x.Valor) 
                })
                .ToListAsync();
        }

        var resultado = contas.Select(conta =>
        {
            decimal saldoPeriodo = conta.SaldoAtual;

            if (isHistorico)
            {
                // Se a conta bancária ainda não havia sido aberta/cadastrada no período filtrado, o saldo dela era zero
                if (conta.DataAbertura >= dataLimite)
                {
                    saldoPeriodo = 0;
                }
                else
                {
                    decimal entradasManuaisFuturas = movsResumo
                        .Where(m => m.ContaBancariaId == conta.Id && m.Tipo == "entrada")
                        .Sum(m => m.Total);

                    decimal saidasManuaisFuturas = movsResumo
                        .Where(m => m.ContaBancariaId == conta.Id && m.Tipo == "saida")
                        .Sum(m => m.Total);

                    if (contaPadrao != null && conta.Id == contaPadrao.Id)
                    {
                        // Conta padrão recebe as receitas, despesas e suas próprias movimentações manuais
                        saldoPeriodo = conta.SaldoAtual - receitasFuturas + despesasFuturas - entradasManuaisFuturas + saidasManuaisFuturas;
                    }
                    else
                    {
                        // Contas secundárias recebem apenas suas próprias movimentações manuais
                        saldoPeriodo = conta.SaldoAtual - entradasManuaisFuturas + saidasManuaisFuturas;
                    }
                }
            }

            return new
            {
                conta.Id,
                conta.Nome,
                conta.Tipo,
                conta.SaldoInicial,
                SaldoAtual = saldoPeriodo,
                conta.Ativa,
                conta.IsPadrao,
                conta.PixChave,
                conta.BancoNome,
                conta.Agencia,
                conta.NumeroConta,
                conta.GatewayToken
            };
        });

        return Ok(resultado);
    }

    private class MovimentacaoResumo
    {
        public Guid ContaBancariaId { get; set; }
        public string Tipo { get; set; } = null!;
        public decimal Total { get; set; }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _repository.DeleteAsync(id);
        return NoContent();
    }
}

public class MovimentacaoManual
{
    public string Tipo { get; set; } = "entrada";
    public decimal Valor { get; set; }
    public string Descricao { get; set; } = string.Empty;
}
