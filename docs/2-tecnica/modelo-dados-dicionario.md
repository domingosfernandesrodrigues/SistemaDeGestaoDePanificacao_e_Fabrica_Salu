# Dicionário de Dados Completo (SQL Server)

## Módulo: Cadastros Mestres (Fase 1)
- `Empresas`: Id, RazaoSocial, NomeFantasia, CNPJ, InscricaoEstadual, Telefone, Email, Endereco, LogoUrl.
  > ⚠️ Os campos de pagamento (PixChave, BancoNome, BancoAgencia, BancoConta, GatewayToken) foram **migrados** para `ContasBancarias`.
- `Funcionarios`: Id, Nome, CPF, Cargo, SalarioBase, DataAdmissao, EmpresaId, Ativo.
- `Clientes`: Id, NomeFantasia, CNPJ_CPF, Endereco, Telefone, Ativo (BIT), UserId (portal B2B).
- `Fornecedores`: Id, NomeFantasia, CNPJ, TipoFornecimento (Insumos/Servicos/Ambos).

## Módulo: Fábrica e Estoque (Fase 2)
- `Produtos`: Id, Nome, SKU, Tipo (MateriaPrima, ProdutoAcabado, Revenda), PrecoCusto, PrecoVenda, QuantidadeEstoque, ControleEstoqueInicial (BIT), Ativo.
- `FichasTecnicas`: Id, ProdutoAcabadoId, RendimentoKg, CustoTotalCalculado.
- `FichasTecnicas_Itens`: Id, FichaTecnicaId, InsumoId, Quantidade.
- `OrdensProducao`: Id, ProdutoId, QuantidadePlanejada, QuantidadeRealizada, Status (Aberta/EmAndamento/Finalizada/Cancelada), DataInicio, DataFinalizacao, CustoTotalCalculado.
- `MovimentacoesEstoque`: Id, ProdutoId, Quantidade, Tipo (Entrada/Saida/Reserva/Avaria), DataMovimentacao, Origem, Observacao.
- `HistoricoPrecosProdutos`: Id, ProdutoId, PrecoAntigo, PrecoNovo, Tipo (Custo/Venda), DataAlteracao, Origem.

## Módulo: RH e Folha (Fase 3)
- `RegistrosPonto`: Id, FuncionarioId, DataHoraEntrada, DataHoraSaida, TotalHorasTrabalhadas, TotalHorasExtras, Observacao.
- `FolhasPagamento`: Id, FuncionarioId, MesReferencia, AnoReferencia, SalarioBaseCalculado, TotalHorasExtras50, ValorHorasExtras50, TotalHorasExtras100, ValorHorasExtras100, ValorAdicionalNoturno, TotalDescontos, SalarioLiquido, Status (0=Aberta/1=Fechada), Tipo (0=Mensal/1=Adiantamento13/2=DecimoTerceiro), ValorAdiantamento13Deducao (DECIMAL), ValorFerias (DECIMAL), ValorTercoConstitucionalFerias (DECIMAL), ValorAbonoFeriasVendidas (DECIMAL), DiasFerias (INT), DiasAbonoFerias (INT), PlanejamentoFeriasId (GUID, Nullable FK), DataGeracao.
- `PlanejamentosFerias`: Id, FuncionarioId, DataInicio, DataFim, DiasFerias, TipoParcelamento (0=Total/1=Primeira/2=Segunda/3=Terceira), SolicitaAbono (BIT), DiasAbono, SolicitaAdiantamentoDecimoTerceiro (BIT), ValorAdiantamentoDecimoTerceiro (DECIMAL), PeriodoAquisitivoInicio, PeriodoAquisitivoFim, PeriodoConcessivoFim, Status (0=Planejada/1=Aprovada/2=Iniciada/3=Concluida/4=Cancelada), ValorRemFeriasBruto (DECIMAL), ValorTercoConstitucional (DECIMAL), ValorAbonoFeriasVendidas (DECIMAL), ValorTotalBruto (DECIMAL), Observacao, DataCriacao, DataAprovacao, DataCancelamento, MotivoCancelamento.
- `AgendaEventos`: Id, Titulo, Data, Tipo (Feriado/Lembrete/Aviso), Descricao, IsNacional (BIT).
- `Afastamentos`: Id, FuncionarioId, Tipo, DataInicio, DataFim, Observacao, Motivo, Status, AnexoNome, AnexoBase64, DataCriacao.


## Módulo: Operacional, Vendas e Logística (Fase 4)
- `PedidosVenda`: Id, NumeroPedido, ClienteId, MotoristaId (GUID, FK Funcionarios), DataPedido, ValorTotal, Status (Novo/Separacao/Rota/Entregue/Cancelado), FormaPagamento, Pago (BIT), PixQrCode, BoletoCodigoBarras, DataEntregaRealizada.
- `PedidosVenda_Itens`: Id, PedidoVendaId, ProdutoId, Quantidade, PrecoUnitario.
- `Veiculos`: Id, Placa, Modelo, Marca, Ano, Status (Disponivel/EmRota/Manutencao).
- `Abastecimentos`: Id, VeiculoId, Litros, ValorTotal, KM_Atual, Data.
- `ManutencaoVeiculos`: Id, VeiculoId, Tipo (Preventiva/Corretiva), Descricao, CustoTotal, Data.
- `TrocaAvarias`: Id, PedidoId, ProdutoId, MotoristaId (GUID, FK Funcionarios), Motivo, Quantidade, DataTroca.
- `Compras`: Id, FornecedorId, DataCompra, ValorTotal, Status (Rascunho/Confirmada), Categoria (Mercadoria/Insumo), Observacao.
- `Compras_Itens`: Id, CompraId, ProdutoId, Quantidade, PrecoUnitario.

## Módulo: Financeiro (Fase 5)
- `ContasReceber`: Id, ClienteId, PedidoVendaId, Descricao, Valor, DataEmissao, DataVencimento, DataRecebimento, Status (Pendente/Recebido/Cancelado).
- `ContasPagar`: Id, FornecedorId, Descricao, Valor, DataEmissao, DataVencimento, DataPagamento, Status (Pendente/Paga/Cancelada).
- `ContasBancarias`: Id, Nome, Tipo (0=Outros/1=Corrente/2=Poupança/3=Investimento), SaldoInicial (decimal), SaldoAtual (decimal), Ativa (BIT), IsPadrao (BIT), PixChave, BancoNome, Agencia, NumeroConta, GatewayToken.
  > Regra: apenas uma conta pode ter `IsPadrao = true` por vez. Saldo conciliado automaticamente nas baixas.
- `MovimentacoesBancarias`: Id (Guid, PK), ContaBancariaId (Guid, FK ContasBancarias), Tipo (VARCHAR(10) - "entrada" / "saida"), Valor (DECIMAL(18,2)), Descricao (VARCHAR(MAX)), DataMovimentacao (DATETIME2), Origem (INT - 0=Manual, 1=BaixaPagar, 2=BaixaReceber, 3=Venda, 4=FrotaAbastecimento, 5=FrotaManutencao, 6=AberturaConta), ReferenciaId (Guid, Nullable FK).

## Módulo: Landing Page e Autenticação
- `Usuarios` (ASP.NET Identity): Id, Email, NomCompleto, Role (Admin/Gestor/Operador/Motorista/Cliente), PrecisaTrocarSenha (BIT), Ativo (BIT).
- Rota pública `/` → Landing Page institucional com login integrado via modal.
- Rota `/dashboard` → Sistema ERP (protegido por JWT).