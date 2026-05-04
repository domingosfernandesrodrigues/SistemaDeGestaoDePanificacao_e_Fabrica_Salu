using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.Application.Services;

public class OrdemProducaoService : IOrdemProducaoService
{
    private readonly IRepository<OrdemProducao> _opRepository;
    private readonly IRepository<FichaTecnica> _fichaRepository;
    private readonly IRepository<MovimentacaoEstoque> _estoqueRepository;
    private readonly IRepository<Produto> _produtoRepository;

    public OrdemProducaoService(
        IRepository<OrdemProducao> opRepository,
        IRepository<FichaTecnica> fichaRepository,
        IRepository<MovimentacaoEstoque> estoqueRepository,
        IRepository<Produto> produtoRepository)
    {
        _opRepository = opRepository;
        _fichaRepository = fichaRepository;
        _estoqueRepository = estoqueRepository;
        _produtoRepository = produtoRepository;
    }

    public async Task<OrdemProducao> StartOPAsync(Guid opId, Guid usuarioId)
    {
        var op = await _opRepository.GetByIdAsync(opId);
        if (op == null || op.Status != StatusOrdemProducao.Planejada)
            throw new Exception("OP não encontrada ou não está Planejada.");

        var fichas = await _fichaRepository.FindAsync(f => f.ProdutoId == op.ProdutoId);
        var ficha = fichas.FirstOrDefault();
        if (ficha == null)
            throw new Exception("Produto não possui Ficha Técnica.");

        var multiplicador = op.QuantidadePlanejada / ficha.RendimentoPadrao;

        foreach (var item in op.Insumos) // Assumindo Insumos já populados baseados na Ficha
        {
            var qtdReserva = item.QuantidadePlanejada;

            var mov = new MovimentacaoEstoque
            {
                ProdutoId = item.InsumoId,
                Tipo = TipoMovimentacao.Reserva,
                Quantidade = qtdReserva,
                Origem = op.NumeroOP,
                Observacao = "Reserva automática (OP Aberta)"
            };
            await _estoqueRepository.AddAsync(mov);
            
            // Subtrai do saldo
            var insumo = await _produtoRepository.GetByIdAsync(item.InsumoId);
            if(insumo != null) {
                insumo.QuantidadeEstoque -= qtdReserva;
                await _produtoRepository.UpdateAsync(insumo);
            }
        }

        op.Status = StatusOrdemProducao.EmAndamento;
        op.UsuarioIniciouId = usuarioId;
        await _opRepository.UpdateAsync(op);

        return op;
    }

    public async Task<OrdemProducao> FinishOPAsync(Guid opId, List<OrdemProducaoInsumo> insumosConsumidosReais, Guid usuarioId)
    {
        var op = await _opRepository.GetByIdAsync(opId);
        if (op == null || op.Status != StatusOrdemProducao.EmAndamento)
            throw new Exception("OP não encontrada ou não está Em Andamento.");

        decimal custoTotal = 0;

        foreach (var item in insumosConsumidosReais)
        {
            // Converter Reserva para Saída Definitiva no Histórico
            var movSaida = new MovimentacaoEstoque
            {
                ProdutoId = item.InsumoId,
                Tipo = TipoMovimentacao.Saida,
                Quantidade = item.QuantidadeConsumida,
                Origem = op.NumeroOP,
                Observacao = "Consumo OP Finalizada"
            };
            await _estoqueRepository.AddAsync(movSaida);

            var insumo = await _produtoRepository.GetByIdAsync(item.InsumoId);
            if(insumo != null)
            {
                custoTotal += insumo.PrecoCusto * item.QuantidadeConsumida;
                
                // Ajusta a diferença entre o planejado/reservado e o real consumido
                var diferenca = item.QuantidadeConsumida - item.QuantidadePlanejada;
                if(diferenca != 0) {
                    insumo.QuantidadeEstoque -= diferenca;
                    await _produtoRepository.UpdateAsync(insumo);
                }
            }
        }

        op.CustoTotalCalculado = custoTotal;
        op.Status = StatusOrdemProducao.Finalizada;
        op.DataFinalizacao = DateTime.UtcNow;
        op.QuantidadeRealizada = op.QuantidadePlanejada; // Pode ser ajustado pelo usuário
        op.UsuarioFinalizouId = usuarioId;

        // Dar Entrada do Produto Acabado
        var movEntrada = new MovimentacaoEstoque
        {
            ProdutoId = op.ProdutoId,
            Tipo = TipoMovimentacao.Entrada,
            Quantidade = op.QuantidadeRealizada,
            Origem = op.NumeroOP,
            Observacao = "Entrada OP Finalizada"
        };
        await _estoqueRepository.AddAsync(movEntrada);

        var prodAcabado = await _produtoRepository.GetByIdAsync(op.ProdutoId);
        if(prodAcabado != null) {
            prodAcabado.QuantidadeEstoque += op.QuantidadeRealizada;
            // Atualiza preço de custo baseado no custo fabril (Custo Médio Simplificado)
            prodAcabado.PrecoCusto = custoTotal / op.QuantidadeRealizada;
            await _produtoRepository.UpdateAsync(prodAcabado);
        }

        await _opRepository.UpdateAsync(op);
        return op;
    }
}
