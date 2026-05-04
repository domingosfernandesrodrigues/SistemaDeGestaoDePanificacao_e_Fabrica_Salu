using SGPF.Domain.Entities;
using SGPF.Application.Interfaces;
using SGPF.Domain.Interfaces;

namespace SGPF.Application.Services;

public class TrocaService
{
    private readonly IRepository<TrocaAvaria> _trocaRepo;
    private readonly IRepository<Produto> _produtoRepo;
    private readonly IRepository<MovimentacaoEstoque> _estoqueRepo;

    public TrocaService(
        IRepository<TrocaAvaria> trocaRepo,
        IRepository<Produto> produtoRepo,
        IRepository<MovimentacaoEstoque> estoqueRepo)
    {
        _trocaRepo = trocaRepo;
        _produtoRepo = produtoRepo;
        _estoqueRepo = estoqueRepo;
    }

    public async Task<TrocaAvaria> RegistrarTrocaAsync(TrocaAvaria troca)
    {
        var produto = await _produtoRepo.GetByIdAsync(troca.ProdutoId);
        if (produto == null) throw new Exception("Produto não encontrado.");

        if (produto.QuantidadeEstoque < troca.Quantidade)
            throw new Exception("Estoque insuficiente para realizar a troca.");

        // Registra a Saída (Reposição para o cliente)
        var mov = new MovimentacaoEstoque
        {
            ProdutoId = produto.Id,
            Tipo = TipoMovimentacao.Saida,
            Quantidade = troca.Quantidade,
            Origem = "Troca/Avaria",
            Observacao = $"Motivo: {troca.Motivo} - Cliente {troca.ClienteId}"
        };
        await _estoqueRepo.AddAsync(mov);

        produto.QuantidadeEstoque -= troca.Quantidade;
        await _produtoRepo.UpdateAsync(produto);

        await _trocaRepo.AddAsync(troca);
        return troca;
    }
}
