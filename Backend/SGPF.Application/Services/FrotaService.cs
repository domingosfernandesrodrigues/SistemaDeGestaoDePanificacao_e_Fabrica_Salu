using SGPF.Domain.Entities;
using SGPF.Application.Interfaces;
using SGPF.Domain.Interfaces;
using System.Linq;

namespace SGPF.Application.Services;

public class FrotaService
{
    private readonly IRepository<Abastecimento> _abastRepo;
    private readonly IRepository<ManutencaoVeiculo> _manuRepo;
    private readonly IRepository<Veiculo> _veiculoRepo;
    private readonly IRepository<ContaPagar> _pagarRepo;
    private readonly IRepository<ContaBancaria> _contaBancariaRepo;
    private readonly IRepository<MovimentacaoBancaria> _movimentacaoRepo;

    public FrotaService(
        IRepository<Abastecimento> abastRepo,
        IRepository<ManutencaoVeiculo> manuRepo,
        IRepository<Veiculo> veiculoRepo,
        IRepository<ContaPagar> pagarRepo,
        IRepository<ContaBancaria> contaBancariaRepo,
        IRepository<MovimentacaoBancaria> movimentacaoRepo)
    {
        _abastRepo = abastRepo;
        _manuRepo = manuRepo;
        _veiculoRepo = veiculoRepo;
        _pagarRepo = pagarRepo;
        _contaBancariaRepo = contaBancariaRepo;
        _movimentacaoRepo = movimentacaoRepo;
    }

    public async Task<(Abastecimento Abast, string? Warning)> RegistrarAbastecimentoAsync(Abastecimento abastecimento)
    {
        var veiculo = await _veiculoRepo.GetByIdAsync(abastecimento.VeiculoId);
        if (veiculo != null && abastecimento.QuilometragemRegistrada > veiculo.QuilometragemAtual)
        {
            veiculo.QuilometragemAtual = abastecimento.QuilometragemRegistrada;
            await _veiculoRepo.UpdateAsync(veiculo);
        }

        // Integração Financeira: Abastecimento gera uma ContaPagar automática já PAGA
        var contaPagar = new ContaPagar
        {
            Descricao = $"Abastecimento Veículo: {veiculo?.Modelo ?? "Frota"} ({veiculo?.Placa ?? "N/A"}) - {abastecimento.Litros:N2}L",
            Valor = abastecimento.ValorTotal,
            DataEmissao = DateTime.Now,
            DataVencimento = DateTime.Now,
            DataPagamento = DateTime.Now,
            Status = StatusContaPagar.Paga,
            Categoria = "Operacional (Frota)"
        };
        await _pagarRepo.AddAsync(contaPagar);

        abastecimento.ContaPagarId = contaPagar.Id;
        await _abastRepo.AddAsync(abastecimento);

        string? warning = null;

        // Conciliação automática: Debita o valor do saldo da conta bancária padrão (ou primeira ativa como fallback)
        var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                        ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
        if (contaPadrao != null)
        {
            if (contaPadrao.SaldoAtual < abastecimento.ValorTotal)
            {
                warning = $"Alerta: O saldo da conta bancária '{contaPadrao.Nome}' ficou negativo após o abastecimento (Saldo Atual: R$ {(contaPadrao.SaldoAtual - abastecimento.ValorTotal):N2}).";
            }

            contaPadrao.SaldoAtual -= abastecimento.ValorTotal;
            await _contaBancariaRepo.UpdateAsync(contaPadrao);

            // Gravar movimentação histórica
            await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
            {
                ContaBancariaId = contaPadrao.Id,
                Tipo = "saida",
                Valor = abastecimento.ValorTotal,
                Descricao = $"Abastecimento Veículo - {veiculo?.Placa ?? "N/A"}",
                DataMovimentacao = DateTime.Now,
                Origem = OrigemMovimentacao.FrotaAbastecimento,
                ReferenciaId = abastecimento.Id
            });
        }

        return (abastecimento, warning);
    }

    public async Task<(ManutencaoVeiculo Manu, string? Warning)> RegistrarManutencaoAsync(ManutencaoVeiculo manutencao)
    {
        var veiculo = await _veiculoRepo.GetByIdAsync(manutencao.VeiculoId);
        if (veiculo != null && manutencao.QuilometragemRegistrada > veiculo.QuilometragemAtual)
        {
            veiculo.QuilometragemAtual = manutencao.QuilometragemRegistrada;
            await _veiculoRepo.UpdateAsync(veiculo);
        }

        // Integração Financeira: Manutenção gera uma ContaPagar automática já PAGA
        var contaPagar = new ContaPagar
        {
            Descricao = $"Manutenção {(manutencao.Tipo == TipoManutencao.Preventiva ? "Preventiva" : "Corretiva")} Veículo: {veiculo?.Modelo ?? "Frota"} ({veiculo?.Placa ?? "N/A"})",
            Valor = manutencao.CustoTotal,
            DataEmissao = DateTime.Now,
            DataVencimento = DateTime.Now,
            DataPagamento = DateTime.Now,
            Status = StatusContaPagar.Paga,
            Categoria = "Operacional (Frota)"
        };
        await _pagarRepo.AddAsync(contaPagar);

        manutencao.ContaPagarId = contaPagar.Id;
        await _manuRepo.AddAsync(manutencao);

        string? warning = null;

        // Conciliação automática: Debita o valor do saldo da conta bancária padrão (ou primeira ativa como fallback)
        var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                        ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
        if (contaPadrao != null)
        {
            if (contaPadrao.SaldoAtual < manutencao.CustoTotal)
            {
                warning = $"Alerta: O saldo da conta bancária '{contaPadrao.Nome}' ficou negativo após a manutenção (Saldo Atual: R$ {(contaPadrao.SaldoAtual - manutencao.CustoTotal):N2}).";
            }

            contaPadrao.SaldoAtual -= manutencao.CustoTotal;
            await _contaBancariaRepo.UpdateAsync(contaPadrao);

            // Gravar movimentação histórica
            await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
            {
                ContaBancariaId = contaPadrao.Id,
                Tipo = "saida",
                Valor = manutencao.CustoTotal,
                Descricao = $"Manutenção Veículo {(manutencao.Tipo == TipoManutencao.Preventiva ? "Preventiva" : "Corretiva")} - {veiculo?.Placa ?? "N/A"}",
                DataMovimentacao = DateTime.Now,
                Origem = OrigemMovimentacao.FrotaManutencao,
                ReferenciaId = manutencao.Id
            });
        }

        return (manutencao, warning);
    }

    public async Task<string?> AtualizarAbastecimentoAsync(Abastecimento novoAbast)
    {
        var antigoAbast = await _abastRepo.GetByIdAsync(novoAbast.Id);
        if (antigoAbast == null) throw new Exception("Abastecimento não encontrado.");

        var veiculo = await _veiculoRepo.GetByIdAsync(novoAbast.VeiculoId);
        if (veiculo != null && novoAbast.QuilometragemRegistrada > veiculo.QuilometragemAtual)
        {
            veiculo.QuilometragemAtual = novoAbast.QuilometragemRegistrada;
            await _veiculoRepo.UpdateAsync(veiculo);
        }

        decimal diferencaValor = novoAbast.ValorTotal - antigoAbast.ValorTotal;

        // Atualizar propriedades
        antigoAbast.VeiculoId = novoAbast.VeiculoId;
        antigoAbast.Data = novoAbast.Data;
        antigoAbast.QuilometragemRegistrada = novoAbast.QuilometragemRegistrada;
        antigoAbast.Litros = novoAbast.Litros;
        antigoAbast.ValorTotal = novoAbast.ValorTotal;

        // Tentar localizar a ContaPagar associada
        ContaPagar? conta = null;
        if (antigoAbast.ContaPagarId.HasValue)
        {
            conta = await _pagarRepo.GetByIdAsync(antigoAbast.ContaPagarId.Value);
        }
        else
        {
            // Fallback de busca caso seja dado antigo semeado sem chave
            var tagPlaca = veiculo?.Placa ?? "N/A";
            var contas = await _pagarRepo.FindAsync(p => p.Categoria == "Operacional (Frota)" && p.Descricao.Contains(tagPlaca));
            conta = contas.OrderBy(c => Math.Abs((c.DataEmissao - antigoAbast.Data).TotalDays)).FirstOrDefault();
            if (conta != null)
            {
                antigoAbast.ContaPagarId = conta.Id;
            }
        }

        if (conta != null)
        {
            conta.Valor = novoAbast.ValorTotal;
            conta.Descricao = $"Abastecimento Veículo: {veiculo?.Modelo ?? "Frota"} ({veiculo?.Placa ?? "N/A"}) - {novoAbast.Litros:N2}L";
            await _pagarRepo.UpdateAsync(conta);
        }

        await _abastRepo.UpdateAsync(antigoAbast);

        string? warning = null;

        // Reconciliar financeiro
        var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                        ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
        if (contaPadrao != null)
        {
            if (diferencaValor != 0)
            {
                if (contaPadrao.SaldoAtual < diferencaValor)
                {
                    warning = $"Alerta: O saldo da conta bancária '{contaPadrao.Nome}' ficou negativo após o ajuste (Saldo Atual: R$ {(contaPadrao.SaldoAtual - diferencaValor):N2}).";
                }

                contaPadrao.SaldoAtual -= diferencaValor;
                await _contaBancariaRepo.UpdateAsync(contaPadrao);

                // Localizar e atualizar MovimentacaoBancaria
                var movs = await _movimentacaoRepo.FindAsync(m => m.ReferenciaId == antigoAbast.Id && m.Origem == OrigemMovimentacao.FrotaAbastecimento);
                var mov = movs.FirstOrDefault();
                if (mov != null)
                {
                    mov.Valor = novoAbast.ValorTotal;
                    mov.Descricao = $"Abastecimento Veículo - {veiculo?.Placa ?? "N/A"}";
                    await _movimentacaoRepo.UpdateAsync(mov);
                }
                else
                {
                    // Se não existia, cria uma
                    await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
                    {
                        ContaBancariaId = contaPadrao.Id,
                        Tipo = "saida",
                        Valor = novoAbast.ValorTotal,
                        Descricao = $"Abastecimento Veículo - {veiculo?.Placa ?? "N/A"}",
                        DataMovimentacao = DateTime.Now,
                        Origem = OrigemMovimentacao.FrotaAbastecimento,
                        ReferenciaId = antigoAbast.Id
                    });
                }
            }
        }

        return warning;
    }

    public async Task ExcluirAbastecimentoAsync(Guid id)
    {
        var abastecimento = await _abastRepo.GetByIdAsync(id);
        if (abastecimento == null) return;

        // Estornar valor para a conta bancária
        var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                        ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
        if (contaPadrao != null)
        {
            contaPadrao.SaldoAtual += abastecimento.ValorTotal;
            await _contaBancariaRepo.UpdateAsync(contaPadrao);
        }

        // Deletar movimentação bancária
        var movs = await _movimentacaoRepo.FindAsync(m => m.ReferenciaId == id && m.Origem == OrigemMovimentacao.FrotaAbastecimento);
        foreach (var m in movs)
        {
            await _movimentacaoRepo.DeleteAsync(m.Id);
        }

        // Deletar conta a pagar associada
        ContaPagar? conta = null;
        if (abastecimento.ContaPagarId.HasValue)
        {
            conta = await _pagarRepo.GetByIdAsync(abastecimento.ContaPagarId.Value);
        }
        else
        {
            // Fallback de busca caso seja dado antigo semeado sem chave
            var veiculo = await _veiculoRepo.GetByIdAsync(abastecimento.VeiculoId);
            var tagPlaca = veiculo?.Placa ?? "N/A";
            var contas = await _pagarRepo.FindAsync(p => p.Categoria == "Operacional (Frota)" && p.Descricao.Contains(tagPlaca));
            conta = contas.OrderBy(c => Math.Abs((c.DataEmissao - abastecimento.Data).TotalDays)).FirstOrDefault();
        }

        if (conta != null)
        {
            await _pagarRepo.DeleteAsync(conta.Id);
        }

        await _abastRepo.DeleteAsync(id);
    }

    public async Task<string?> AtualizarManutencaoAsync(ManutencaoVeiculo novaManu)
    {
        var antigaManu = await _manuRepo.GetByIdAsync(novaManu.Id);
        if (antigaManu == null) throw new Exception("Manutenção não encontrada.");

        var veiculo = await _veiculoRepo.GetByIdAsync(novaManu.VeiculoId);
        if (veiculo != null && novaManu.QuilometragemRegistrada > veiculo.QuilometragemAtual)
        {
            veiculo.QuilometragemAtual = novaManu.QuilometragemRegistrada;
            await _veiculoRepo.UpdateAsync(veiculo);
        }

        decimal diferencaValor = novaManu.CustoTotal - antigaManu.CustoTotal;

        // Atualizar propriedades
        antigaManu.VeiculoId = novaManu.VeiculoId;
        antigaManu.Data = novaManu.Data;
        antigaManu.Tipo = novaManu.Tipo;
        antigaManu.Descricao = novaManu.Descricao;
        antigaManu.CustoTotal = novaManu.CustoTotal;
        antigaManu.QuilometragemRegistrada = novaManu.QuilometragemRegistrada;

        // Tentar localizar a ContaPagar associada
        ContaPagar? conta = null;
        if (antigaManu.ContaPagarId.HasValue)
        {
            conta = await _pagarRepo.GetByIdAsync(antigaManu.ContaPagarId.Value);
        }
        else
        {
            // Fallback de busca caso seja dado antigo semeado sem chave
            var tagPlaca = veiculo?.Placa ?? "N/A";
            var contas = await _pagarRepo.FindAsync(p => p.Categoria == "Operacional (Frota)" && p.Descricao.Contains(tagPlaca));
            conta = contas.OrderBy(c => Math.Abs((c.DataEmissao - antigaManu.Data).TotalDays)).FirstOrDefault();
            if (conta != null)
            {
                antigaManu.ContaPagarId = conta.Id;
            }
        }

        if (conta != null)
        {
            conta.Valor = novaManu.CustoTotal;
            conta.Descricao = $"Manutenção {(novaManu.Tipo == TipoManutencao.Preventiva ? "Preventiva" : "Corretiva")} Veículo: {veiculo?.Modelo ?? "Frota"} ({veiculo?.Placa ?? "N/A"})";
            await _pagarRepo.UpdateAsync(conta);
        }

        await _manuRepo.UpdateAsync(antigaManu);

        string? warning = null;

        // Reconciliar financeiro
        var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                        ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
        if (contaPadrao != null)
        {
            if (diferencaValor != 0)
            {
                if (contaPadrao.SaldoAtual < diferencaValor)
                {
                    warning = $"Alerta: O saldo da conta bancária '{contaPadrao.Nome}' ficou negativo após o ajuste (Saldo Atual: R$ {(contaPadrao.SaldoAtual - diferencaValor):N2}).";
                }

                contaPadrao.SaldoAtual -= diferencaValor;
                await _contaBancariaRepo.UpdateAsync(contaPadrao);

                // Localizar e atualizar MovimentacaoBancaria
                var movs = await _movimentacaoRepo.FindAsync(m => m.ReferenciaId == antigaManu.Id && m.Origem == OrigemMovimentacao.FrotaManutencao);
                var mov = movs.FirstOrDefault();
                if (mov != null)
                {
                    mov.Valor = novaManu.CustoTotal;
                    mov.Descricao = $"Manutenção Veículo {(novaManu.Tipo == TipoManutencao.Preventiva ? "Preventiva" : "Corretiva")} - {veiculo?.Placa ?? "N/A"}";
                    await _movimentacaoRepo.UpdateAsync(mov);
                }
                else
                {
                    // Se não existia, cria uma
                    await _movimentacaoRepo.AddAsync(new MovimentacaoBancaria
                    {
                        ContaBancariaId = contaPadrao.Id,
                        Tipo = "saida",
                        Valor = novaManu.CustoTotal,
                        Descricao = $"Manutenção Veículo {(novaManu.Tipo == TipoManutencao.Preventiva ? "Preventiva" : "Corretiva")} - {veiculo?.Placa ?? "N/A"}",
                        DataMovimentacao = DateTime.Now,
                        Origem = OrigemMovimentacao.FrotaManutencao,
                        ReferenciaId = antigaManu.Id
                    });
                }
            }
        }

        return warning;
    }

    public async Task ExcluirManutencaoAsync(Guid id)
    {
        var manutencao = await _manuRepo.GetByIdAsync(id);
        if (manutencao == null) return;

        // Estornar valor para a conta bancária
        var contaPadrao = (await _contaBancariaRepo.FindAsync(c => c.IsPadrao && c.Ativa)).FirstOrDefault()
                        ?? (await _contaBancariaRepo.FindAsync(c => c.Ativa)).FirstOrDefault();
        if (contaPadrao != null)
        {
            contaPadrao.SaldoAtual += manutencao.CustoTotal;
            await _contaBancariaRepo.UpdateAsync(contaPadrao);
        }

        // Deletar movimentação bancária
        var movs = await _movimentacaoRepo.FindAsync(m => m.ReferenciaId == id && m.Origem == OrigemMovimentacao.FrotaManutencao);
        foreach (var m in movs)
        {
            await _movimentacaoRepo.DeleteAsync(m.Id);
        }

        // Deletar conta a pagar associada
        ContaPagar? conta = null;
        if (manutencao.ContaPagarId.HasValue)
        {
            conta = await _pagarRepo.GetByIdAsync(manutencao.ContaPagarId.Value);
        }
        else
        {
            // Fallback de busca caso seja dado antigo semeado sem chave
            var veiculo = await _veiculoRepo.GetByIdAsync(manutencao.VeiculoId);
            var tagPlaca = veiculo?.Placa ?? "N/A";
            var contas = await _pagarRepo.FindAsync(p => p.Categoria == "Operacional (Frota)" && p.Descricao.Contains(tagPlaca));
            conta = contas.OrderBy(c => Math.Abs((c.DataEmissao - manutencao.Data).TotalDays)).FirstOrDefault();
        }

        if (conta != null)
        {
            await _pagarRepo.DeleteAsync(conta.Id);
        }

        await _manuRepo.DeleteAsync(id);
    }
}
