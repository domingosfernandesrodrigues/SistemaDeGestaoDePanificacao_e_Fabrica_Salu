using SGPF.Application.Interfaces;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using QuestPDF.Previewer;
using System.Net.Http;
using System.Text;
using System.Text.Json;

namespace SGPF.Application.Services;

public class VendaService : IVendaService
{
    private readonly IRepository<PedidoVenda> _pedidoRepo;
    private readonly IRepository<Produto> _produtoRepo;
    private readonly IRepository<MovimentacaoEstoque> _estoqueRepo;
    private readonly IRepository<ContaReceber> _contaReceberRepo;
    private readonly IRepository<PedidoVendaItem> _itemRepo;
    private readonly IRepository<Cliente> _clienteRepo;
    private readonly IRepository<Empresa> _empresaRepo;
    private readonly IRepository<ContaBancaria> _contaBancariaRepo;
    private readonly IRepository<MovimentacaoBancaria> _movimentacaoRepo;

    public VendaService(
        IRepository<PedidoVenda> pedidoRepo,
        IRepository<Produto> produtoRepo,
        IRepository<MovimentacaoEstoque> estoqueRepo,
        IRepository<ContaReceber> contaReceberRepo,
        IRepository<PedidoVendaItem> itemRepo,
        IRepository<Cliente> clienteRepo,
        IRepository<Empresa> empresaRepo,
        IRepository<ContaBancaria> contaBancariaRepo,
        IRepository<MovimentacaoBancaria> movimentacaoRepo)
    {
        _pedidoRepo = pedidoRepo;
        _produtoRepo = produtoRepo;
        _estoqueRepo = estoqueRepo;
        _contaReceberRepo = contaReceberRepo;
        _itemRepo = itemRepo;
        _clienteRepo = clienteRepo;
        _empresaRepo = empresaRepo;
        _contaBancariaRepo = contaBancariaRepo;
        _movimentacaoRepo = movimentacaoRepo;
    }

    public async Task<PedidoVenda?> GetByIdAsync(Guid id)
    {
        var pedido = await _pedidoRepo.GetByIdAsync(id);
        if (pedido != null)
        {
            pedido.Itens = (await _itemRepo.FindAsync(i => i.PedidoVendaId == id, asNoTracking: true)).ToList();
            if (pedido.Itens.Any())
            {
                var produtoIds = pedido.Itens.Select(i => i.ProdutoId).Distinct().ToList();
                var produtos = (await _produtoRepo.FindAsync(p => produtoIds.Contains(p.Id), asNoTracking: true))
                    .ToDictionary(p => p.Id);

                foreach (var item in pedido.Itens)
                {
                    if (produtos.TryGetValue(item.ProdutoId, out var produto))
                    {
                        item.Produto = produto;
                    }
                }
            }
            pedido.Cliente = await _clienteRepo.GetByIdAsync(pedido.ClienteId);
        }
        return pedido;
    }

    public async Task<PedidoVenda> CriarPedidoAsync(PedidoVenda pedido)
    {
        // Verificação de Inadimplência: bloquear se cliente tiver 3 ou mais comandas pendentes
        var comandasPendentes = await _contaReceberRepo.FindAsync(c =>
            c.ClienteId == pedido.ClienteId &&
            c.Status == StatusContaReceber.Pendente);

        var totalPendentes = comandasPendentes.Count();
        if (totalPendentes >= 3)
        {
            var cliente = await _clienteRepo.GetByIdAsync(pedido.ClienteId);
            var nomeCliente = cliente?.NomeFantasia ?? "Cliente";
            throw new Exception(
                $"INADIMPLÊNCIA: O cliente '{nomeCliente}' possui {totalPendentes} comanda(s) pendente(s). " +
                $"Não é permitido criar novos pedidos até que as pendências sejam quitadas.");
        }

        pedido.Status = StatusPedidoVenda.Separacao;
        pedido.ValorTotal = 0;

        var movimentacoes = new List<MovimentacaoEstoque>();
        var produtosAtualizados = new List<Produto>();

        foreach (var item in pedido.Itens)
        {
            var produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
            if (produto == null) throw new Exception($"Produto {item.ProdutoId} não encontrado.");

            if (produto.QuantidadeEstoque < item.Quantidade)
                throw new Exception($"Estoque insuficiente para o produto {produto.Nome}. Saldo: {produto.QuantidadeEstoque}");

            item.PrecoUnitario = produto.PrecoVenda;
            pedido.ValorTotal += item.Subtotal;

            movimentacoes.Add(new MovimentacaoEstoque
            {
                ProdutoId = produto.Id,
                Tipo = TipoMovimentacao.Reserva,
                Quantidade = item.Quantidade,
                Origem = pedido.NumeroPedido,
                Observacao = "Reserva de Venda"
            });

            produto.QuantidadeEstoque -= item.Quantidade; // Reduz o saldo disponível
            produtosAtualizados.Add(produto);
        }

        if (movimentacoes.Any()) await _estoqueRepo.AddRangeAsync(movimentacoes);
        if (produtosAtualizados.Any()) await _produtoRepo.UpdateRangeAsync(produtosAtualizados);


        // Processar faturamento via Gateway de Pagamento Real (Asaas) ou Fallback local
        await ProcessarFaturamentoAsaasOuFallbackAsync(pedido);

        await _pedidoRepo.AddAsync(pedido);

        return pedido;
    }

    public async Task<bool> ConfirmarPagamentoAsync(string numeroPedido, decimal? valorLiquido = null, string? transacaoId = null, DateTime? dataPagamento = null)
    {
        var pedido = (await _pedidoRepo.GetAllAsync()).FirstOrDefault(p => p.NumeroPedido == numeroPedido);
        if (pedido == null) return false;

        var eraPago = pedido.Pago;
        pedido.Pago = true;
        await _pedidoRepo.UpdateAsync(pedido);

        var dataRecebimentoEfetivo = dataPagamento ?? DateTime.UtcNow;

        // Atualizar Financeiro (Conta a Receber)
        var contas = await _contaReceberRepo.FindAsync(c => c.PedidoVendaId == pedido.Id);
        foreach (var conta in contas)
        {
            conta.Status = StatusContaReceber.Recebido;
            conta.DataRecebimento = dataRecebimentoEfetivo;
            await _contaReceberRepo.UpdateAsync(conta);
        }

        // Conciliação automática: credita o valor na conta bancária padrão caso ainda não estivesse pago
        if (!eraPago)
        {
            // Fallback inteligente para Conta Bancária Ativa: Prioriza padrão, depois qualquer ativa
            var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                              ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();

            if (contaPadrao != null)
            {
                var valorRecebidoReal = valorLiquido ?? pedido.ValorTotal;
                contaPadrao.SaldoAtual += valorRecebidoReal;
                await _contaBancariaRepo.UpdateAsync(contaPadrao);

                var traceInfo = !string.IsNullOrEmpty(transacaoId) ? $" (ID: {transacaoId})" : "";

                // Gravar movimentação
                await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
                {
                    ContaBancariaId = contaPadrao.Id,
                    Tipo = "entrada",
                    Valor = valorRecebidoReal,
                    Descricao = $"Recebimento Pedido {pedido.NumeroPedido}{traceInfo}",
                    DataMovimentacao = dataRecebimentoEfetivo,
                    Origem = OrigemMovimentacao.Venda,
                    ReferenciaId = pedido.Id
                });
            }
            else
            {
                Console.WriteLine($"[FINANCEIRO WARNING] Pagamento confirmado para o pedido {pedido.NumeroPedido}, mas nenhuma conta bancária ativa foi encontrada para conciliação automática!");
            }
        }

        return true;
    }

    // Nota: Como não quero quebrar o código agora, vou apenas simular o uso dos campos se existirem.
    // Vou ajustar o construtor do VendaService.

    public async Task<PedidoVenda> CriarPedidoPortalAsync(PedidoVenda pedido)
    {
        pedido.Status = StatusPedidoVenda.Novo;
        pedido.ValorTotal = 0;

        foreach (var item in pedido.Itens)
        {
            var produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
            if (produto != null)
            {
                item.PrecoUnitario = produto.PrecoVenda;
                pedido.ValorTotal += item.Subtotal;
            }
        }
        await _pedidoRepo.AddAsync(pedido);
        return pedido;
    }

    public async Task<PedidoVenda> AprovarPedidoAsync(Guid pedidoId)
    {
        var pedido = await GetByIdAsync(pedidoId);
        if (pedido == null || pedido.Status != StatusPedidoVenda.Novo)
            throw new Exception("Pedido não pode ser aprovado.");

        // Evita colisão de rastreamento do EF Core limpando referências circulares
        foreach (var item in pedido.Itens)
        {
            item.Produto = null!;
        }

        var movimentacoes = new List<MovimentacaoEstoque>();
        var produtosAtualizados = new List<Produto>();

        foreach (var item in pedido.Itens)
        {
            var produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
            if (produto != null)
            {
                if (produto.QuantidadeEstoque < item.Quantidade)
                    throw new Exception($"Estoque insuficiente para o produto {produto.Nome}. Disponível: {produto.QuantidadeEstoque}");

                produto.QuantidadeEstoque -= item.Quantidade;
                produtosAtualizados.Add(produto);

                movimentacoes.Add(new MovimentacaoEstoque
                {
                    ProdutoId = produto.Id,
                    Tipo = TipoMovimentacao.Reserva,
                    Quantidade = item.Quantidade,
                    Origem = pedido.NumeroPedido,
                    Observacao = "Reserva (Aprovação de Venda)"
                });
            }
        }

        if (movimentacoes.Any()) await _estoqueRepo.AddRangeAsync(movimentacoes);
        if (produtosAtualizados.Any()) await _produtoRepo.UpdateRangeAsync(produtosAtualizados);


        pedido.Status = StatusPedidoVenda.Separacao;
        await _pedidoRepo.UpdateAsync(pedido);

        // CRIAR FINANCEIRO (Pendente): Melhor forma para visibilidade de Fluxo de Caixa
        var conta = new ContaReceber
        {
            ClienteId = pedido.ClienteId,
            Descricao = $"Fatura Ref. Pedido {pedido.NumeroPedido}",
            Valor = pedido.ValorTotal,
            DataVencimento = DateTime.UtcNow.AddDays(15), // Padrão 15 dias, pode ser ajustado
            PedidoVendaId = pedido.Id,
            Status = pedido.Pago ? StatusContaReceber.Recebido : StatusContaReceber.Pendente,
            DataRecebimento = pedido.Pago ? DateTime.UtcNow : null
        };
        await _contaReceberRepo.AddAsync(conta);

        if (pedido.Pago)
        {
            var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                            ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
            if (contaPadrao != null)
            {
                contaPadrao.SaldoAtual += pedido.ValorTotal;
                await _contaBancariaRepo.UpdateAsync(contaPadrao);

                // Gravar movimentação
                await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
                {
                    ContaBancariaId = contaPadrao.Id,
                    Tipo = "entrada",
                    Valor = pedido.ValorTotal,
                    Descricao = $"Recebimento Pedido {pedido.NumeroPedido} (Criar Faturado)",
                    DataMovimentacao = DateTime.UtcNow,
                    Origem = OrigemMovimentacao.Venda,
                    ReferenciaId = pedido.Id
                });
            }
        }

        return pedido;
    }

    public async Task<PedidoVenda> EntregarPedidoAsync(Guid pedidoId)
    {
        var pedido = await GetByIdAsync(pedidoId);
        if (pedido == null || pedido.Status == StatusPedidoVenda.Entregue)
            throw new Exception("Pedido inválido ou já entregue.");

        // Evita colisão de rastreamento do EF Core limpando referências circulares
        foreach (var item in pedido.Itens)
        {
            item.Produto = null!;
        }

        var movimentacoes = new List<MovimentacaoEstoque>();

        foreach (var item in pedido.Itens)
        {
            movimentacoes.Add(new MovimentacaoEstoque
            {
                ProdutoId = item.ProdutoId,
                Tipo = TipoMovimentacao.Saida,
                Quantidade = item.Quantidade,
                Origem = pedido.NumeroPedido,
                Observacao = "Venda Concluída"
            });
        }
        
        if (movimentacoes.Any()) await _estoqueRepo.AddRangeAsync(movimentacoes);


        pedido.Status = StatusPedidoVenda.Entregue;
        pedido.DataEntregaRealizada = DateTime.UtcNow;
        await _pedidoRepo.UpdateAsync(pedido);

        return pedido;
    }

    public async Task<PedidoVenda> AtualizarStatusAsync(Guid id, StatusPedidoVenda novoStatus)
    {
        var pedido = await _pedidoRepo.GetByIdAsync(id);
        if (pedido == null) throw new Exception("Pedido não encontrado.");

        if (novoStatus == StatusPedidoVenda.Entregue) return await EntregarPedidoAsync(id);
        if (novoStatus == StatusPedidoVenda.Separacao && pedido.Status == StatusPedidoVenda.Novo) return await AprovarPedidoAsync(id);

        pedido.Status = novoStatus;
        await _pedidoRepo.UpdateAsync(pedido);
        return pedido;
    }

    public async Task<PedidoVenda> CancelarPedidoAsync(Guid id)
    {
        var pedido = await GetByIdAsync(id);
        if (pedido == null) throw new Exception("Pedido não encontrado.");
        if (pedido.Status == StatusPedidoVenda.Cancelado) return pedido;

        // Evita colisão de rastreamento do EF Core limpando referências circulares
        foreach (var item in pedido.Itens)
        {
            item.Produto = null!;
        }

        // Reverter Logística
        if (pedido.Status != StatusPedidoVenda.Novo && pedido.Status != StatusPedidoVenda.Cancelado)
        {
            var movimentacoes = new List<MovimentacaoEstoque>();
            var produtosAtualizados = new List<Produto>();

            foreach (var item in pedido.Itens)
            {
                var produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
                if (produto != null)
                {
                    produto.QuantidadeEstoque += item.Quantidade;
                    produtosAtualizados.Add(produto);

                    movimentacoes.Add(new MovimentacaoEstoque
                    {
                        ProdutoId = item.ProdutoId,
                        Tipo = TipoMovimentacao.Entrada,
                        Quantidade = item.Quantidade,
                        Origem = pedido.NumeroPedido,
                        Observacao = $"Estorno de Cancelamento ({pedido.Status})"
                    });
                }
            }

            if (movimentacoes.Any()) await _estoqueRepo.AddRangeAsync(movimentacoes);
            if (produtosAtualizados.Any()) await _produtoRepo.UpdateRangeAsync(produtosAtualizados);
        }

        // Reverter Financeiro
        var contasFinanceiro = await _contaReceberRepo.FindAsync(c => c.PedidoVendaId == pedido.Id);
        decimal valorEstorno = 0;
        foreach (var conta in contasFinanceiro)
        {
            if (conta.Status == StatusContaReceber.Recebido)
            {
                valorEstorno += conta.Valor;
            }
            conta.Status = StatusContaReceber.Cancelado;
            await _contaReceberRepo.UpdateAsync(conta);
        }

        if (valorEstorno > 0)
        {
            var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                            ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
            if (contaPadrao != null)
            {
                contaPadrao.SaldoAtual -= valorEstorno;
                await _contaBancariaRepo.UpdateAsync(contaPadrao);

                // Gravar movimentação
                await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
                {
                    ContaBancariaId = contaPadrao.Id,
                    Tipo = "saida",
                    Valor = valorEstorno,
                    Descricao = $"Estorno / Cancelamento Pedido {pedido.NumeroPedido}",
                    DataMovimentacao = DateTime.UtcNow,
                    Origem = OrigemMovimentacao.Venda,
                    ReferenciaId = pedido.Id
                });
            }
        }

        pedido.Status = StatusPedidoVenda.Cancelado;
        await _pedidoRepo.UpdateAsync(pedido);
        return pedido;
    }

    public async Task<PedidoVenda> AtualizarPedidoAsync(Guid id, PedidoVenda pedidoAtualizado)
    {
        var pedidoExistente = await GetByIdAsync(id);
        if (pedidoExistente == null) throw new Exception("Pedido não encontrado.");
        
        if (pedidoExistente.Status > StatusPedidoVenda.Separacao)
            throw new Exception("Somente pedidos em Aprovação ou Separação podem ser editados.");

        // Evita colisão de rastreamento do EF Core limpando referências circulares
        foreach (var item in pedidoExistente.Itens)
        {
            item.Produto = null!;
        }

        // 1. Reverter estoque atual (Reservas)
        if (pedidoExistente.Status == StatusPedidoVenda.Separacao)
        {
            var produtosEstorno = new List<Produto>();
            foreach (var item in pedidoExistente.Itens)
            {
                var produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
                if (produto != null)
                {
                    produto.QuantidadeEstoque += item.Quantidade;
                    produtosEstorno.Add(produto);
                }
            }
            if (produtosEstorno.Any()) await _produtoRepo.UpdateRangeAsync(produtosEstorno);
        }

        // 2. Limpar itens antigos
        var itensAntigos = await _itemRepo.FindAsync(i => i.PedidoVendaId == id);
        foreach (var item in itensAntigos)
        {
            await _itemRepo.DeleteAsync(item.Id);
        }

        // 3. Processar novos itens
        pedidoExistente.ClienteId = pedidoAtualizado.ClienteId;
        pedidoExistente.ValorTotal = 0;

        var itensNovos = new List<PedidoVendaItem>();
        var produtosNovosAtualizados = new List<Produto>();

        foreach (var item in pedidoAtualizado.Itens)
        {
            var produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
            if (produto == null) throw new Exception("Produto não encontrado.");

            if (pedidoExistente.Status == StatusPedidoVenda.Separacao && produto.QuantidadeEstoque < item.Quantidade)
                throw new Exception($"Estoque insuficiente para {produto.Nome}");

            item.PedidoVendaId = pedidoExistente.Id;
            item.PrecoUnitario = produto.PrecoVenda;
            pedidoExistente.ValorTotal += item.Subtotal;
            
            itensNovos.Add(item);

            if (pedidoExistente.Status == StatusPedidoVenda.Separacao)
            {
                produto.QuantidadeEstoque -= item.Quantidade;
                produtosNovosAtualizados.Add(produto);
            }
        }

        if (itensNovos.Any()) await _itemRepo.AddRangeAsync(itensNovos);
        if (produtosNovosAtualizados.Any()) await _produtoRepo.UpdateRangeAsync(produtosNovosAtualizados);

        // Atualizar Forma de Pagamento e Motorista que estavam esquecidos
        pedidoExistente.FormaPagamento = pedidoAtualizado.FormaPagamento;
        pedidoExistente.MotoristaId = pedidoAtualizado.MotoristaId;

        // Limpar e regenerar dados de faturamento via Gateway Real (Asaas) ou Fallback local
        pedidoExistente.BoletoCodigoBarras = null;
        pedidoExistente.PixQrCode = null;
        await ProcessarFaturamentoAsaasOuFallbackAsync(pedidoExistente);

        await _pedidoRepo.UpdateAsync(pedidoExistente);

        // 4. Sincronizar com Financeiro
        var contas = await _contaReceberRepo.FindAsync(c => c.PedidoVendaId == pedidoExistente.Id);
        foreach (var conta in contas)
        {
            conta.Valor = pedidoExistente.ValorTotal;
            await _contaReceberRepo.UpdateAsync(conta);
        }

        return pedidoExistente;
    }

    public async Task ExcluirPedidoAsync(Guid id)
    {
        var pedido = await GetByIdAsync(id);
        if (pedido == null) return;

        // Evita colisão de rastreamento do EF Core limpando referências circulares
        foreach (var item in pedido.Itens)
        {
            item.Produto = null!;
        }

        // Se o pedido não estiver em status Novo ou Cancelado (onde o estoque já foi estornado/não baixado),
        // precisamos reverter os itens para o estoque antes de apagar.
        if (pedido.Status != StatusPedidoVenda.Novo && pedido.Status != StatusPedidoVenda.Cancelado)
        {
            var movimentacoes = new List<MovimentacaoEstoque>();
            var produtosAtualizados = new List<Produto>();

            foreach (var item in pedido.Itens)
            {
                var produto = await _produtoRepo.GetByIdAsync(item.ProdutoId);
                if (produto != null)
                {
                    produto.QuantidadeEstoque += item.Quantidade;
                    produtosAtualizados.Add(produto);

                    movimentacoes.Add(new MovimentacaoEstoque
                    {
                        ProdutoId = item.ProdutoId,
                        Tipo = TipoMovimentacao.Entrada,
                        Quantidade = item.Quantidade,
                        Origem = pedido.NumeroPedido,
                        Observacao = $"Estorno de Exclusão Direta do Pedido ({pedido.Status})"
                    });
                }
            }

            if (movimentacoes.Any()) await _estoqueRepo.AddRangeAsync(movimentacoes);
            if (produtosAtualizados.Any()) await _produtoRepo.UpdateRangeAsync(produtosAtualizados);
        }

        // Remover Contas a Receber associadas para evitar quebra de chave estrangeira/integridade
        var contas = await _contaReceberRepo.FindAsync(c => c.PedidoVendaId == pedido.Id);
        foreach (var conta in contas)
        {
            await _contaReceberRepo.DeleteAsync(conta.Id);
        }

        // Limpar itens do pedido
        var itens = await _itemRepo.FindAsync(i => i.PedidoVendaId == pedido.Id);
        foreach (var item in itens)
        {
            await _itemRepo.DeleteAsync(item.Id);
        }

        await _pedidoRepo.DeleteAsync(id);
    }

    public async Task<IEnumerable<PedidoVenda>> GetPedidosAsync(Guid? motoristaId = null)
    {
        var pedidos = motoristaId.HasValue
            ? await _pedidoRepo.FindAsync(p => p.MotoristaId == motoristaId.Value, asNoTracking: true)
            : await _pedidoRepo.GetAllAsync(asNoTracking: true);

        var pedidosList = pedidos.ToList();

        if (pedidosList.Any())
        {
            var clienteIds = pedidosList.Select(p => p.ClienteId).Distinct().ToList();
            var clientes = (await _clienteRepo.FindAsync(c => clienteIds.Contains(c.Id), asNoTracking: true))
                .ToDictionary(c => c.Id);

            foreach (var p in pedidosList)
            {
                if (clientes.TryGetValue(p.ClienteId, out var cliente))
                {
                    p.Cliente = cliente;
                }
            }
        }
        return pedidosList.OrderByDescending(p => p.DataPedido);
    }

    public async Task<PedidoVenda> TogglePagamentoAsync(Guid id)
    {
        var pedido = await _pedidoRepo.GetByIdAsync(id);
        if (pedido == null) throw new Exception("Pedido não encontrado.");

        var eraPago = pedido.Pago;
        pedido.Pago = !pedido.Pago;
        await _pedidoRepo.UpdateAsync(pedido);

        // Sincronizar Financeiro
        var contas = await _contaReceberRepo.FindAsync(c => c.PedidoVendaId == pedido.Id);
        foreach (var conta in contas)
        {
            conta.Status = pedido.Pago ? StatusContaReceber.Recebido : StatusContaReceber.Pendente;
            conta.DataRecebimento = pedido.Pago ? DateTime.UtcNow : null;
            await _contaReceberRepo.UpdateAsync(conta);
        }

        // Conciliação automática: atualiza o saldo da conta padrão (ou primeira ativa como fallback)
        var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                        ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
        if (contaPadrao != null)
        {
            var valorTotal = contas.Sum(c => c.Valor);
            if (pedido.Pago && !eraPago)
            {
                contaPadrao.SaldoAtual += valorTotal; // marcou como pago: credita
                await _contaBancariaRepo.UpdateAsync(contaPadrao);

                // Gravar movimentação
                await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
                {
                    ContaBancariaId = contaPadrao.Id,
                    Tipo = "entrada",
                    Valor = valorTotal,
                    Descricao = $"Recebimento Pedido {pedido.NumeroPedido} (Status Alterado)",
                    DataMovimentacao = DateTime.UtcNow,
                    Origem = OrigemMovimentacao.Venda,
                    ReferenciaId = pedido.Id
                });
            }
            else if (!pedido.Pago && eraPago)
            {
                contaPadrao.SaldoAtual -= valorTotal; // reverteu: debita de volta
                await _contaBancariaRepo.UpdateAsync(contaPadrao);

                // Gravar movimentação
                await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
                {
                    ContaBancariaId = contaPadrao.Id,
                    Tipo = "saida",
                    Valor = valorTotal,
                    Descricao = $"Estorno Pedido {pedido.NumeroPedido} (Status Alterado)",
                    DataMovimentacao = DateTime.UtcNow,
                    Origem = OrigemMovimentacao.Venda,
                    ReferenciaId = pedido.Id
                });
            }
        }

        return pedido;
    }

    public async Task<byte[]> GerarNotaFiscalAsync(Guid pedidoId)
    {
        var pedido = await GetByIdAsync(pedidoId);
        if (pedido == null) throw new Exception("Pedido não encontrado");

        var empresa = (await _empresaRepo.GetAllAsync()).FirstOrDefault();
        var nomeEmpresa = empresa?.NomeFantasia ?? "SGP-F FABRICA";

        // QuestPDF License - Necessário na versão comunitária/paga (Simulado)
        QuestPDF.Settings.License = LicenseType.Community;

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily(Fonts.Verdana));

                page.Header().Row(row =>
                {
                    row.RelativeItem().Column(col =>
                    {
                        col.Item().Text(nomeEmpresa).FontSize(20).SemiBold().FontColor(Colors.Indigo.Medium);
                        col.Item().Text($"CNPJ: {empresa?.CNPJ ?? "00.000.000/0000-00"}");
                        col.Item().Text(empresa?.Endereco ?? "Endereço não configurado");
                    });

                    row.RelativeItem().AlignRight().Column(col =>
                    {
                        col.Item().Text("DANFE (Simulado)").FontSize(12).SemiBold();
                        col.Item().Text($"Nº: {pedido.NumeroPedido.Replace("PED-", "")}");
                        col.Item().Text($"Série: 001");
                        col.Item().Text($"Data: {pedido.DataPedido:dd/MM/yyyy HH:mm}");
                    });
                });

                page.Content().PaddingVertical(10).Column(col =>
                {
                    // Dados do Cliente
                    col.Item().Background(Colors.Grey.Lighten3).Padding(5).Text("DADOS DO DESTINATÁRIO").SemiBold();
                    col.Item().Padding(5).Column(innerCol =>
                    {
                        innerCol.Item().Text($"Nome/Razão Social: {pedido.Cliente?.NomeFantasia}");
                        innerCol.Item().Text($"CNPJ/CPF: {pedido.Cliente?.CNPJ_CPF}");
                        innerCol.Item().Text("Endereço: Endereço do Cliente (Simulado)");
                    });

                    col.Item().PaddingVertical(10);

                    // Tabela de Itens
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(50);
                            columns.RelativeColumn();
                            columns.ConstantColumn(50);
                            columns.ConstantColumn(80);
                            columns.ConstantColumn(80);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(CellStyle).Text("CÓD");
                            header.Cell().Element(CellStyle).Text("DESCRIÇÃO");
                            header.Cell().Element(CellStyle).Text("QTD");
                            header.Cell().Element(CellStyle).Text("UNIT");
                            header.Cell().Element(CellStyle).Text("TOTAL");

                            static IContainer CellStyle(IContainer container) => container.DefaultTextStyle(x => x.SemiBold()).PaddingVertical(5).BorderBottom(1).BorderColor(Colors.Black);
                        });

                        foreach (var item in pedido.Itens)
                        {
                            table.Cell().Element(ItemStyle).Text(item.Produto?.Id.ToString().Substring(0, 5) ?? "000");
                            table.Cell().Element(ItemStyle).Text(item.Produto?.Nome ?? "Produto");
                            table.Cell().Element(ItemStyle).Text($"{item.Quantidade:N0}");
                            table.Cell().Element(ItemStyle).Text($"{item.PrecoUnitario:C}");
                            table.Cell().Element(ItemStyle).Text($"{item.Subtotal:C}");

                            static IContainer ItemStyle(IContainer container) => container.PaddingVertical(5).BorderBottom(1).BorderColor(Colors.Grey.Lighten2);
                        }
                    });

                    col.Item().AlignRight().PaddingVertical(10).Column(innerCol =>
                    {
                        innerCol.Item().Text($"TOTAL PRODUTOS: {pedido.ValorTotal:C}").SemiBold();
                        innerCol.Item().Text($"TOTAL NOTA: {pedido.ValorTotal:C}").FontSize(14).SemiBold().FontColor(Colors.Indigo.Medium);
                    });

                    col.Item().PaddingVertical(20).Text("DADOS ADICIONAIS").SemiBold();
                    col.Item().Border(1).Padding(5).Text($"Forma de Pagamento: {pedido.FormaPagamento}. Status: {(pedido.Pago ? "PAGO" : "PENDENTE")}");
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Página ");
                    x.CurrentPageNumber();
                });
            });
        }).GeneratePdf();
    }

    public async Task<byte[]> GerarComandaAsync(Guid pedidoId)
    {
        var pedido = await GetByIdAsync(pedidoId);
        if (pedido == null) throw new Exception("Pedido não encontrado");

        var empresa = (await _empresaRepo.GetAllAsync()).FirstOrDefault();
        var nomeEmpresa = empresa?.NomeFantasia ?? "SGP-F PANIFICAÇÃO";

        QuestPDF.Settings.License = LicenseType.Community;

        byte[]? logoBytes = null;
        if (!string.IsNullOrEmpty(empresa?.LogoUrl))
        {
            try
            {
                var base64Data = empresa.LogoUrl;
                if (base64Data.Contains(","))
                {
                    base64Data = base64Data.Split(',')[1];
                }
                logoBytes = Convert.FromBase64String(base64Data);
            }
            catch
            {
                // Ignora se não for base64 válido
            }
        }

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                // Formato Impressora de Balcão (80mm)
                page.Size(226, PageSizes.A4.Height); // ~80mm width
                page.Margin(0.5f, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(10.5f).FontFamily(Fonts.CourierNew).Bold());

                page.Header().Column(col =>
                {
                    col.Item().PaddingTop(35); // Espaçador aumentado para 35 no topo para evitar corte físico/guilhotina da impressora
                    if (logoBytes != null)
                    {
                        col.Item().AlignCenter().Width(80).Image(logoBytes);
                        col.Item().PaddingVertical(5);
                    }
                    col.Item().AlignCenter().Text(nomeEmpresa).FontSize(13).Bold();
                    if (!string.IsNullOrEmpty(empresa?.Telefone))
                    {
                        col.Item().AlignCenter().Text($"TEL: {empresa.Telefone}");
                    }
                    col.Item().AlignCenter().Text("--------------------------------");
                    col.Item().AlignCenter().Text("COMPROVANTE DE PEDIDO").Bold();
                    col.Item().Text($"DATA: {DateTime.Now:dd/MM/yyyy HH:mm}");
                    col.Item().Text($"PEDIDO: {pedido.NumeroPedido}");
                    col.Item().Text($"CLIENTE: {pedido.Cliente?.NomeFantasia}");
                    if (!string.IsNullOrEmpty(pedido.Cliente?.Telefone))
                    {
                        col.Item().Text($"CONTATO: {pedido.Cliente.Telefone}");
                    }
                    if (!string.IsNullOrEmpty(pedido.Cliente?.Endereco))
                    {
                        col.Item().Text($"ENTREGA: {pedido.Cliente.Endereco}");
                    }
                    col.Item().AlignCenter().Text("--------------------------------");
                });

                page.Content().Column(col =>
                {
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn();
                            columns.ConstantColumn(30);
                            columns.ConstantColumn(50);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Text("ITEM");
                            header.Cell().AlignRight().Text("QTD");
                            header.Cell().AlignRight().Text("TOTAL");
                        });

                        foreach (var item in pedido.Itens)
                        {
                            table.Cell().Text(item.Produto?.Nome ?? "Prod");
                            table.Cell().AlignRight().Text($"{item.Quantidade:N0}");
                            table.Cell().AlignRight().Text($"{item.Subtotal:N2}");
                        }
                    });

                    col.Item().AlignCenter().PaddingVertical(5).Text("--------------------------------");
                    col.Item().AlignRight().Text($"TOTAL: {pedido.ValorTotal:C}").Bold().FontSize(12);
                    col.Item().Text($"PAGTO: {pedido.FormaPagamento}");
                    col.Item().Text($"STATUS: {(pedido.Pago ? "PAGO" : "PENDENTE")}");
                    col.Item().AlignCenter().PaddingVertical(10).Text("OBRIGADO PELA PREFERÊNCIA!").FontSize(9).Italic();
                });
            });
        }).GeneratePdf();
    }
    // Gera um BR Code Pix válido conforme especificação do Banco Central (EMV QR Code)
    private static string SanitizarChavePix(string chave)
    {
        var clean = chave.Trim();
        if (clean.Contains("@"))
        {
            return clean;
        }
        if (System.Guid.TryParse(clean, out var parsedGuid))
        {
            return parsedGuid.ToString().ToLower();
        }
        return new string(clean.Where(char.IsDigit).ToArray());
    }

    private static string GerarBrCodePix(string chavePixUrl, decimal valor, string nomeRecebedor)
    {
        var chaveSanitizada = SanitizarChavePix(chavePixUrl);

        // Trunca nome para máx 25 chars (limite da spec)
        nomeRecebedor = nomeRecebedor.Length > 25 ? nomeRecebedor[..25].Trim() : nomeRecebedor;

        // Campo 26: Merchant Account Info (Pix)
        var pixKey   = $"0014BR.GOV.BCB.PIX01{chaveSanitizada.Length:00}{chaveSanitizada}";
        var mai      = $"26{pixKey.Length:00}{pixKey}";

        // Campo 54: Valor
        var valorStr = valor.ToString("F2", System.Globalization.CultureInfo.InvariantCulture);
        var valorField = $"54{valorStr.Length:00}{valorStr}";

        // Monta payload sem CRC
        var payload =
            "000201"         +  // Payload Format Indicator
            "010211"         +  // Point of Initiation Method (11 = QR estático)
            mai              +  // Merchant Account Info
            "52040000"       +  // MCC
            "5303986"        +  // Transaction Currency (BRL)
            valorField       +  // Amount
            "5802BR"         +  // Country Code
            $"59{nomeRecebedor.Length:00}{nomeRecebedor}" + // Merchant Name (max 25)
            "6009SAO PAULO"  +  // Merchant City
            "62070503***"    +  // Additional Data (txid ***)
            "6304";             // CRC placeholder (4 zeros serão somados)

        // Calcula CRC16-CCITT sobre o payload inteiro (incluindo "6304")
        var crc = Crc16Ccitt(payload);
        return payload + crc.ToString("X4");
    }

    private static ushort Crc16Ccitt(string str)
    {
        const ushort poly = 0x1021;
        ushort crc = 0xFFFF;
        foreach (var c in System.Text.Encoding.UTF8.GetBytes(str))
        {
            crc ^= (ushort)(c << 8);
            for (var i = 0; i < 8; i++)
                crc = (ushort)((crc & 0x8000) != 0 ? (crc << 1) ^ poly : crc << 1);
        }
        return crc;
    }

    private async Task ProcessarFaturamentoAsaasOuFallbackAsync(PedidoVenda pedido)
    {
        var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                        ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
        var empresa = (await _empresaRepo.GetAllAsync()).FirstOrDefault();
        var token = contaPadrao?.GatewayToken ?? empresa?.GatewayToken;

        var factory = new PaymentGatewayFactory(_contaBancariaRepo, _empresaRepo);
        var gateway = factory.ObterGateway(token ?? "");

        try
        {
            var cliente = await _clienteRepo.GetByIdAsync(pedido.ClienteId);
            if (cliente != null)
            {
                var billingResult = await gateway.CriarCobrancaAsync(token ?? "", pedido, cliente);
                if (billingResult.Sucesso)
                {
                    pedido.BoletoCodigoBarras = billingResult.BoletoCodigoBarras;
                    pedido.PixQrCode = billingResult.PixQrCode;
                    return;
                }
                else
                {
                    Console.WriteLine($"[{gateway.ProviderName.ToUpper()} INTEGRATION ERROR] Falha ao criar cobrança no {gateway.ProviderName}. Detalhes: {billingResult.ErrorMessage}. Utilizando simulador Offline.");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GATEWAY INTEGRATION ERROR] Falha geral no faturamento. Detalhes: {ex.Message}. Utilizando simulador Offline.");
        }

        // Fallback offline (simulação) se o token não existir ou falhar
        GerarDadosPagamentoFallback(pedido, contaPadrao, empresa);
    }

    private void GerarDadosPagamentoFallback(PedidoVenda pedido, ContaBancaria? contaPadrao, Empresa? empresa)
    {
        pedido.BoletoCodigoBarras = null;
        pedido.PixQrCode = null;

        if (pedido.FormaPagamento == FormaPagamento.Boleto)
        {
            var valorEmCentavos = (long)(pedido.ValorTotal * 100);
            pedido.BoletoCodigoBarras = $"34191.79001 01043.510047 91020.150008 5 9502{valorEmCentavos:D10}";
        }
        else if (pedido.FormaPagamento == FormaPagamento.Pix)
        {
            var chave = contaPadrao?.PixChave ?? empresa?.PixChave ?? "sgpf-fabrica-pix-key-12345";
            var nomeRecebedor = (empresa?.NomeFantasia ?? "SGPF FABRICA").ToUpper();
            pedido.PixQrCode = GerarBrCodePix(chave, pedido.ValorTotal, nomeRecebedor);
        }
    }
}
