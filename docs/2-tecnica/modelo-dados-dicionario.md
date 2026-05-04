# Dicionário de Dados Completo (SQL Server)

## Módulo: Cadastros Mestres (Fase 1)
- `Empresas`: Id, RazaoSocial, CNPJ, Endereco.
- `Funcionarios`: Id, Nome, CPF, Cargo, SalarioBase, DataAdmissao, EmpresaId.
- `Clientes`: Id, NomeFantasia, CNPJ_CPF, Endereco, Telefone, Ativo (BIT).
- `Fornecedores`: Id, NomeFantasia, CNPJ, TipoFornecimento (Insumos/Servicos).

## Módulo: Fábrica e Estoque (Fase 2)
- `Produtos`: Id, Nome, SKU, Tipo (MateriaPrima, ProdutoAcabado, Revenda), CustoAtual, PrecoVenda, Ativo (BIT).
- `FichaTecnica_BOM`: Id, ProdutoAcabadoId, RendimentoKg.
- `FichaTecnica_Itens`: Id, FichaTecnicaId, InsumoId, Quantidade.
- `OrdensProducao`: Id, ProdutoId, QuantidadePlanejada, QuantidadeRealizada, Status (Aberta, EmAndamento, Concluida, Cancelada), DataInicio, DataFim, CustoTotal.
- `MovimentacoesEstoque`: Id, ProdutoId, Quantidade, Tipo (Entrada/Saída/Avaria), DataMovimentacao, Origem.

## Módulo: RH e Folha (Fase 3)
- `RegistroPonto`: Id, FuncionarioId, Data, HoraEntrada, HoraSaida, Tipo.
- `FolhaPagamento`: Id, FuncionarioId, MesReferencia, AnoReferencia, SalarioBase, TotalProventos, TotalDescontos, ValorLiquido.

## Módulo: Operacional, Vendas e Logística (Fase 4)
- `PedidosVenda`: Id, ClienteId, DataPedido, ValorTotal, Status (AguardandoAprovacao, Aprovado, Entregue, Cancelado).
- `PedidosVenda_Itens`: Id, PedidoVendaId, ProdutoId, Quantidade, PrecoUnitario.
- `Veiculos`: Id, Placa, Modelo, Status (Disponivel, EmRota, Manutencao).
- `Abastecimentos`: Id, VeiculoId, Litros, ValorTotal, KM_Atual, Data.
- `Manutencoes`: Id, VeiculoId, Tipo (Preventiva/Corretiva), Descricao, Custo, Data.
- `Devolucoes`: Id, PedidoId, ProdutoId, Motivo, DataTroca.

## Módulo: Financeiro (Fase 5)
- `PlanoContas`: Id, Nome, Tipo (Entrada/Saida).
- `Lancamentos`: Id, PlanoContasId, Descricao, Valor, DataVencimento, DataPagamento, Status (Pendente, Pago, Cancelado).