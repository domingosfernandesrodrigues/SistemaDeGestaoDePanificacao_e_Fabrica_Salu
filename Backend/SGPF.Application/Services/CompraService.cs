using SGPF.Application.DTOs;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.Application.Services;

public interface ICompraService
{
    Task<Compra> CriarRascunhoAsync(CompraDto dto);
    Task<Compra> AtualizarRascunhoAsync(Guid id, CompraDto dto);
    Task ExcluirRascunhoAsync(Guid id);
    Task<Compra> ConfirmarCompraAsync(Guid compraId);
    Task<IEnumerable<Compra>> ListarTodasAsync();
    Task<Compra?> ObterPorIdAsync(Guid id);
    Task CancelarCompraAsync(Guid compraId);
}

public class CompraService : ICompraService
{
    private readonly IRepository<Compra> _compraRepo;
    private readonly IRepository<CompraItem> _itemRepo;
    private readonly IRepository<Produto> _produtoRepo;
    private readonly IRepository<MovimentacaoEstoque> _movimentacaoRepo;
    private readonly IRepository<ContaPagar> _pagarRepo;
    private readonly IRepository<HistoricoPrecoProduto> _historicoRepo;

    public CompraService(
        IRepository<Compra> compraRepo,
        IRepository<CompraItem> itemRepo,
        IRepository<Produto> produtoRepo,
        IRepository<MovimentacaoEstoque> movimentacaoRepo,
        IRepository<ContaPagar> pagarRepo,
        IRepository<HistoricoPrecoProduto> historicoRepo)
    {
        _compraRepo = compraRepo;
        _itemRepo = itemRepo;
        _produtoRepo = produtoRepo;
        _movimentacaoRepo = movimentacaoRepo;
        _pagarRepo = pagarRepo;
        _historicoRepo = historicoRepo;
    }

    public async Task<Compra> CriarRascunhoAsync(CompraDto dto)
    {
        var compra = new Compra
        {
            FornecedorId = dto.FornecedorId,
            Observacao = dto.Observacao,
            DataCompra = DateTime.Now,
            Status = StatusCompra.Rascunho,
            Categoria = Enum.TryParse<CategoriaCompra>(dto.Categoria, true, out var cat) ? cat : CategoriaCompra.Mercadoria,
            ValorTotal = dto.Itens.Sum(i => i.Quantidade * i.PrecoUnitario)
        };

        await _compraRepo.AddAsync(compra);

        foreach (var itemDto in dto.Itens)
        {
            await _itemRepo.AddAsync(new CompraItem
            {
                CompraId = compra.Id,
                ProdutoId = itemDto.ProdutoId,
                Quantidade = itemDto.Quantidade,
                PrecoUnitario = itemDto.PrecoUnitario
            });
        }

        return compra;
    }

    public async Task<Compra> ConfirmarCompraAsync(Guid compraId)
    {
        var compra = await _compraRepo.GetByIdAsync(compraId);
        if (compra == null) throw new Exception("Compra não encontrada");
        if (compra.Status != StatusCompra.Rascunho) throw new Exception("Apenas rascunhos podem ser confirmados.");

        var itens = await _itemRepo.FindAsync(i => i.CompraId == compraId);

        foreach (var item in itens)
        {
            var produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
            if (produto != null)
            {
                // 1. Atualizar Estoque
                produto.QuantidadeEstoque += item.Quantidade;
                
                // 2. Atualizar Preço de Custo (Regra: Último preço de compra)
                if (produto.PrecoCusto != item.PrecoUnitario)
                {
                    await _historicoRepo.AddAsync(new HistoricoPrecoProduto
                    {
                        ProdutoId = produto.Id,
                        PrecoAntigo = produto.PrecoCusto,
                        PrecoNovo = item.PrecoUnitario,
                        Tipo = TipoPrecoHistorico.Custo,
                        Origem = $"Compra #{compra.Id.ToString().Substring(0, 8)}"
                    });
                    
                    produto.PrecoCusto = item.PrecoUnitario;
                }
                
                await _produtoRepo.UpdateAsync(produto);

                // 3. Registrar Movimentação
                await _movimentacaoRepo.AddAsync(new MovimentacaoEstoque
                {
                    ProdutoId = produto.Id,
                    Tipo = TipoMovimentacao.Entrada,
                    Quantidade = item.Quantidade,
                    Origem = $"COMPRA-{compra.Id.ToString().Substring(0,8)}",
                    Observacao = "Entrada via módulo de compras"
                });
            }
        }

        // 4. Gerar Contas a Pagar
        await _pagarRepo.AddAsync(new ContaPagar
        {
            FornecedorId = compra.FornecedorId,
            Descricao = $"Compra #{compra.Id.ToString().Substring(0,8)}",
            Valor = compra.ValorTotal,
            DataEmissao = DateTime.Now,
            DataVencimento = DateTime.Now.AddDays(30),
            Status = StatusContaPagar.Pendente,
            Categoria = compra.Categoria == CategoriaCompra.Insumo ? "Insumos" : "Mercadorias"
        });

        compra.Status = StatusCompra.Confirmada;
        await _compraRepo.UpdateAsync(compra);

        return compra;
    }

    public async Task<Compra> AtualizarRascunhoAsync(Guid id, CompraDto dto)
    {
        var compra = await _compraRepo.GetByIdAsync(id);
        if (compra == null) throw new Exception("Compra não encontrada");
        if (compra.Status != StatusCompra.Rascunho) throw new Exception("Apenas rascunhos podem ser editados.");

        compra.FornecedorId = dto.FornecedorId;
        compra.Observacao = dto.Observacao;
        compra.Categoria = Enum.TryParse<CategoriaCompra>(dto.Categoria, true, out var catAtualizar) ? catAtualizar : CategoriaCompra.Mercadoria;
        compra.ValorTotal = dto.Itens.Sum(i => i.Quantidade * i.PrecoUnitario);

        await _compraRepo.UpdateAsync(compra);

        // Limpar itens antigos e adicionar novos
        var itensAntigos = await _itemRepo.FindAsync(i => i.CompraId == id);
        foreach (var item in itensAntigos) await _itemRepo.DeleteAsync(item.Id);

        foreach (var itemDto in dto.Itens)
        {
            await _itemRepo.AddAsync(new CompraItem
            {
                CompraId = compra.Id,
                ProdutoId = itemDto.ProdutoId,
                Quantidade = itemDto.Quantidade,
                PrecoUnitario = itemDto.PrecoUnitario
            });
        }

        return compra;
    }

    public async Task ExcluirRascunhoAsync(Guid id)
    {
        var compra = await _compraRepo.GetByIdAsync(id);
        if (compra == null) throw new Exception("Compra não encontrada");
        if (compra.Status != StatusCompra.Rascunho) throw new Exception("Apenas rascunhos podem ser excluídos.");

        var itens = await _itemRepo.FindAsync(i => i.CompraId == id);
        foreach (var item in itens) await _itemRepo.DeleteAsync(item.Id);

        await _compraRepo.DeleteAsync(id);
    }

    public async Task<IEnumerable<Compra>> ListarTodasAsync()
    {
        return await _compraRepo.GetAllAsync();
    }

    public async Task<Compra?> ObterPorIdAsync(Guid id)
    {
        var compra = await _compraRepo.GetByIdAsync(id);
        if (compra != null)
        {
            var itens = await _itemRepo.FindAsync(i => i.CompraId == id);
            compra.Itens = itens.ToList();
        }
        return compra;
    }

    public async Task CancelarCompraAsync(Guid compraId)
    {
        var compra = await _compraRepo.GetByIdAsync(compraId);
        if (compra == null) throw new Exception("Compra não encontrada");
        
        if (compra.Status == StatusCompra.Cancelada) return;
        if (compra.Status != StatusCompra.Confirmada) throw new Exception("Somente compras confirmadas podem ser canceladas.");

        // 1. Localizar a ContaPagar associada (usando a tag da descrição)
        var tag = $"Compra #{compra.Id.ToString().Substring(0, 8)}";
        var faturas = await _pagarRepo.FindAsync(p => p.Descricao.Contains(tag));
        var fatura = faturas.FirstOrDefault();
        
        if (fatura != null)
        {
            if (fatura.Status == StatusContaPagar.Paga)
            {
                throw new Exception("Não é possível cancelar uma compra cuja fatura já foi paga. Reabrar/estorne o pagamento primeiro.");
            }
            fatura.Status = StatusContaPagar.Cancelada;
            await _pagarRepo.UpdateAsync(fatura);
        }

        // 2. Reverter estoque (deduzir quantidades compradas)
        var itens = await _itemRepo.FindAsync(i => i.CompraId == compraId);
        var produtosDeducao = new List<Produto>();
        var movimentacoes = new List<MovimentacaoEstoque>();

        foreach (var item in itens)
        {
            var produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
            if (produto != null)
            {
                if (produto.QuantidadeEstoque < item.Quantidade)
                {
                    throw new Exception($"Estoque insuficiente para cancelar esta compra. O produto '{produto.Nome}' possui apenas {produto.QuantidadeEstoque} em estoque, mas seriam deduzidos {item.Quantidade}.");
                }
                
                produto.QuantidadeEstoque -= item.Quantidade;
                produtosDeducao.Add(produto);

                movimentacoes.Add(new MovimentacaoEstoque
                {
                    ProdutoId = produto.Id,
                    Tipo = TipoMovimentacao.Saida,
                    Quantidade = item.Quantidade,
                    Origem = $"CANCEL-COMPRA-{compra.Id.ToString().Substring(0, 8)}",
                    Observacao = "Estorno de cancelamento de compra"
                });
            }
        }

        if (produtosDeducao.Any()) await _produtoRepo.UpdateRangeAsync(produtosDeducao);
        if (movimentacoes.Any()) await _movimentacaoRepo.AddRangeAsync(movimentacoes);

        compra.Status = StatusCompra.Cancelada;
        await _compraRepo.UpdateAsync(compra);
    }
}
