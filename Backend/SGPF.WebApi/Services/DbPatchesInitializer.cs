using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SGPF.Domain.Entities;
using SGPF.Infrastructure.Data;

namespace SGPF.WebApi.Services;

public static class DbPatchesInitializer
{
    public static async Task ApplyPatchesAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        
        try
        {
            Console.WriteLine("[DB PATCHES] Iniciando a aplicação de patches procedurais...");
            
            // 1. Executa todos os patches raw SQL originais (anteriormente poluindo o Program.cs)
            await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Clientes') AND name = 'Ativo') BEGIN ALTER TABLE Clientes ADD Ativo BIT NOT NULL DEFAULT 1; END");
            await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Produtos') AND name = 'Ativo') BEGIN ALTER TABLE Produtos ADD Ativo BIT NOT NULL DEFAULT 1; END");
            await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'Nome') BEGIN ALTER TABLE Usuarios ADD Nome NVARCHAR(MAX) NOT NULL DEFAULT ''; END");
            
            // Patch Funcionarios: tornar EmpresaId opcional com SQL dinamico (nome da FK pode variar)
            try { await context.Database.ExecuteSqlRawAsync(@"
                DECLARE @fkName NVARCHAR(200);
                SELECT @fkName = fk.name
                FROM sys.foreign_keys fk
                JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
                JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
                WHERE OBJECT_NAME(fk.parent_object_id) = 'Funcionarios' AND c.name = 'EmpresaId';
                IF @fkName IS NOT NULL
                    EXEC('ALTER TABLE Funcionarios DROP CONSTRAINT [' + @fkName + ']');
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Funcionarios') AND name = 'EmpresaId' AND is_nullable = 0)
                    ALTER TABLE Funcionarios ALTER COLUMN EmpresaId UNIQUEIDENTIFIER NULL;"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Funcionarios') AND name = 'DataDemissao') BEGIN ALTER TABLE Funcionarios ADD DataDemissao DATETIME2 NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Funcionarios') AND name = 'Ativo') BEGIN ALTER TABLE Funcionarios ADD Ativo BIT NOT NULL DEFAULT 1; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Funcionarios') AND name = 'UsuarioId') BEGIN ALTER TABLE Funcionarios ADD UsuarioId UNIQUEIDENTIFIER NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("UPDATE Funcionarios SET Ativo = 1 WHERE Ativo = 0"); } catch {}
            await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Veiculos') AND name = 'Ativo') BEGIN ALTER TABLE Veiculos ADD Ativo BIT NOT NULL DEFAULT 1; END");
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Abastecimentos') AND name = 'ContaPagarId') BEGIN ALTER TABLE Abastecimentos ADD ContaPagarId UNIQUEIDENTIFIER NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ManutencoesVeiculo') AND name = 'ContaPagarId') BEGIN ALTER TABLE ManutencoesVeiculo ADD ContaPagarId UNIQUEIDENTIFIER NULL; END"); } catch {}
            
            // Patches para Empresa (Remoção de campos que migraram para ContasBancarias)
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Empresas') AND name = 'PixChave') BEGIN ALTER TABLE Empresas DROP COLUMN PixChave; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Empresas') AND name = 'BancoNome') BEGIN ALTER TABLE Empresas DROP COLUMN BancoNome; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Empresas') AND name = 'BancoAgencia') BEGIN ALTER TABLE Empresas DROP COLUMN BancoAgencia; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Empresas') AND name = 'BancoConta') BEGIN ALTER TABLE Empresas DROP COLUMN BancoConta; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Empresas') AND name = 'GatewayToken') BEGIN ALTER TABLE Empresas DROP COLUMN GatewayToken; END"); } catch {}

            // Patches Ficha Técnica e Ordem Produção (Unidades de Medida)
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FichaTecnicaInsumos') AND name = 'UnidadeMedida') BEGIN ALTER TABLE FichaTecnicaInsumos ADD UnidadeMedida NVARCHAR(50) NOT NULL DEFAULT ''; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrdemProducaoInsumos') AND name = 'UnidadeMedida') BEGIN ALTER TABLE OrdemProducaoInsumos ADD UnidadeMedida NVARCHAR(50) NOT NULL DEFAULT ''; END"); } catch {}

            // Ajuste de Precisão das Colunas para decimal(18,2) nas Tabelas Existentes
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CompraItems') AND name = 'Quantidade') BEGIN ALTER TABLE CompraItems ALTER COLUMN Quantidade DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CompraItems') AND name = 'PrecoUnitario') BEGIN ALTER TABLE CompraItems ALTER COLUMN PrecoUnitario DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FichasTecnicas') AND name = 'RendimentoPadrao') BEGIN ALTER TABLE FichasTecnicas ALTER COLUMN RendimentoPadrao DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FichaTecnicaInsumos') AND name = 'QuantidadeNecessaria') BEGIN ALTER TABLE FichaTecnicaInsumos ALTER COLUMN QuantidadeNecessaria DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FichaTecnicaInsumos') AND name = 'PerdaPercentual') BEGIN ALTER TABLE FichaTecnicaInsumos ALTER COLUMN PerdaPercentual DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HistoricoPrecos') AND name = 'PrecoAntigo') BEGIN ALTER TABLE HistoricoPrecos ALTER COLUMN PrecoAntigo DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('HistoricoPrecos') AND name = 'PrecoNovo') BEGIN ALTER TABLE HistoricoPrecos ALTER COLUMN PrecoNovo DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MovimentacoesEstoque') AND name = 'Quantidade') BEGIN ALTER TABLE MovimentacoesEstoque ALTER COLUMN Quantidade DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrdemProducaoInsumos') AND name = 'QuantidadePlanejada') BEGIN ALTER TABLE OrdemProducaoInsumos ALTER COLUMN QuantidadePlanejada DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrdemProducaoInsumos') AND name = 'QuantidadeConsumida') BEGIN ALTER TABLE OrdemProducaoInsumos ALTER COLUMN QuantidadeConsumida DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrdensProducao') AND name = 'QuantidadePlanejada') BEGIN ALTER TABLE OrdensProducao ALTER COLUMN QuantidadePlanejada DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrdensProducao') AND name = 'QuantidadeRealizada') BEGIN ALTER TABLE OrdensProducao ALTER COLUMN QuantidadeRealizada DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PedidoVendaItens') AND name = 'Quantidade') BEGIN ALTER TABLE PedidoVendaItens ALTER COLUMN Quantidade DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Produtos') AND name = 'PrecoCusto') BEGIN ALTER TABLE Produtos ALTER COLUMN PrecoCusto DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Produtos') AND name = 'QuantidadeEstoque') BEGIN ALTER TABLE Produtos ALTER COLUMN QuantidadeEstoque DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TrocasAvaria') AND name = 'Quantidade') BEGIN ALTER TABLE TrocasAvaria ALTER COLUMN Quantidade DECIMAL(18,2) NOT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Empresas' AND COLUMN_NAME = 'Latitude') BEGIN ALTER TABLE Empresas ADD Latitude FLOAT NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Empresas' AND COLUMN_NAME = 'Longitude') BEGIN ALTER TABLE Empresas ADD Longitude FLOAT NULL; END"); } catch {}
            
            // Patch Individual para cada coluna de Fornecedores
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Fornecedores') AND name = 'RazaoSocial') BEGIN ALTER TABLE Fornecedores ADD RazaoSocial NVARCHAR(MAX) NOT NULL DEFAULT ''; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Fornecedores') AND name = 'Contato') BEGIN ALTER TABLE Fornecedores ADD Contato NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Fornecedores') AND name = 'Telefone') BEGIN ALTER TABLE Fornecedores ADD Telefone NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Fornecedores') AND name = 'Email') BEGIN ALTER TABLE Fornecedores ADD Email NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Fornecedores') AND name = 'Ativo') BEGIN ALTER TABLE Fornecedores ADD Ativo BIT NOT NULL DEFAULT 1; END"); } catch {}
            
            // Garantir que registros existentes estejam como Ativos
            try { await context.Database.ExecuteSqlRawAsync("UPDATE Fornecedores SET Ativo = 1 WHERE Ativo = 0"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("UPDATE Veiculos SET Ativo = 1 WHERE Ativo = 0"); } catch {}

            // Garantir que campos antigos não causem erro de NOT NULL
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Fornecedores') AND name = 'TipoFornecimento') BEGIN ALTER TABLE Fornecedores ALTER COLUMN TipoFornecimento NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Fornecedores') AND name = 'CNPJ') BEGIN ALTER TABLE Fornecedores ADD CNPJ NVARCHAR(MAX) NOT NULL DEFAULT ''; END"); } catch {}
            
            // Patch para criar tabela Afastamentos se não existir
            try { await context.Database.ExecuteSqlRawAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Afastamentos]') AND type in (N'U'))
                BEGIN
                    CREATE TABLE [dbo].[Afastamentos](
                        [Id] [uniqueidentifier] NOT NULL PRIMARY KEY,
                        [FuncionarioId] [uniqueidentifier] NOT NULL,
                        [DataInicio] [datetime2](7) NOT NULL,
                        [DataFim] [datetime2](7) NOT NULL,
                        [Motivo] [nvarchar](max) NOT NULL,
                        [Observacao] [nvarchar](max) NULL,
                        [Status] [nvarchar](max) NOT NULL,
                        [DataCriacao] [datetime2](7) NOT NULL,
                        CONSTRAINT [FK_Afastamentos_Funcionarios_FuncionarioId] FOREIGN KEY([FuncionarioId]) REFERENCES [dbo].[Funcionarios] ([Id]) ON DELETE CASCADE
                    )
                END
            "); } catch {}

            // Patch para criar tabela LancamentosAlimentacao se não existir
            try { await context.Database.ExecuteSqlRawAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LancamentosAlimentacao]') AND type in (N'U'))
                BEGIN
                    CREATE TABLE [dbo].[LancamentosAlimentacao](
                        [Id] [uniqueidentifier] NOT NULL PRIMARY KEY,
                        [FuncionarioId] [uniqueidentifier] NOT NULL,
                        [Data] [datetime2](7) NOT NULL,
                        [TipoRefeicao] [nvarchar](50) NOT NULL,
                        [Valor] [decimal](18, 2) NOT NULL,
                        [Observacao] [nvarchar](max) NULL,
                        [ContaPagarId] [uniqueidentifier] NULL,
                        [DataCriacao] [datetime2](7) NOT NULL,
                        CONSTRAINT [FK_LancamentosAlimentacao_Funcionarios_FuncionarioId] FOREIGN KEY([FuncionarioId]) REFERENCES [dbo].[Funcionarios] ([Id]) ON DELETE CASCADE
                    )
                END
            "); } catch {}

            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LancamentosAlimentacao') AND name = 'ContaPagarId') BEGIN ALTER TABLE LancamentosAlimentacao ADD ContaPagarId UNIQUEIDENTIFIER NULL; END"); } catch {}
            
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Afastamentos') AND name = 'Tipo') BEGIN ALTER TABLE Afastamentos ALTER COLUMN Tipo NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Afastamentos') AND name = 'Motivo') BEGIN ALTER TABLE Afastamentos ADD Motivo NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Afastamentos') AND name = 'Observacao') BEGIN ALTER TABLE Afastamentos ADD Observacao NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Afastamentos') AND name = 'Status') BEGIN ALTER TABLE Afastamentos ADD Status NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Afastamentos') AND name = 'AnexoNome') BEGIN ALTER TABLE Afastamentos ADD AnexoNome NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Afastamentos') AND name = 'AnexoBase64') BEGIN ALTER TABLE Afastamentos ADD AnexoBase64 NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Afastamentos') AND name = 'DataCriacao') BEGIN ALTER TABLE Afastamentos ADD DataCriacao DATETIME2 NOT NULL DEFAULT GETDATE(); END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'Ativo') BEGIN ALTER TABLE Usuarios ADD Ativo BIT NOT NULL DEFAULT 1; END"); } catch {}
            
            // Patches para PedidoVenda (Pagamentos)
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PedidosVenda' AND COLUMN_NAME = 'FormaPagamento') BEGIN ALTER TABLE PedidosVenda ADD FormaPagamento INT NOT NULL DEFAULT 0; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PedidosVenda' AND COLUMN_NAME = 'Pago') BEGIN ALTER TABLE PedidosVenda ADD Pago BIT NOT NULL DEFAULT 0; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PedidosVenda' AND COLUMN_NAME = 'PixQrCode') BEGIN ALTER TABLE PedidosVenda ADD PixQrCode NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PedidosVenda' AND COLUMN_NAME = 'BoletoCodigoBarras') BEGIN ALTER TABLE PedidosVenda ADD BoletoCodigoBarras NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PedidosVenda' AND COLUMN_NAME = 'MotoristaId') BEGIN ALTER TABLE PedidosVenda ADD MotoristaId UNIQUEIDENTIFIER NULL; END"); } catch {}
            
            // Patches para OrdemProducao (Rastreabilidade)
            try { 
                await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'OrdensProducao' AND COLUMN_NAME = 'UsuarioPlanejouId') BEGIN ALTER TABLE OrdensProducao ADD UsuarioPlanejouId UNIQUEIDENTIFIER NULL; END");
                await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'OrdensProducao' AND COLUMN_NAME = 'UsuarioIniciouId') BEGIN ALTER TABLE OrdensProducao ADD UsuarioIniciouId UNIQUEIDENTIFIER NULL; END");
                await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'OrdensProducao' AND COLUMN_NAME = 'UsuarioFinalizouId') BEGIN ALTER TABLE OrdensProducao ADD UsuarioFinalizouId UNIQUEIDENTIFIER NULL; END");
            } catch {}

            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ContasPagar') AND name = 'MesReferencia') BEGIN ALTER TABLE ContasPagar ADD MesReferencia NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ContasPagar') AND name = 'FornecedorId') BEGIN ALTER TABLE ContasPagar ADD FornecedorId UNIQUEIDENTIFIER NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ContasPagar') AND name = 'DataEmissao') BEGIN ALTER TABLE ContasPagar ADD DataEmissao DATETIME2 NOT NULL DEFAULT GETDATE(); END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ContasPagar') AND name = 'DataVencimento' AND is_nullable = 0) BEGIN ALTER TABLE ContasPagar ALTER COLUMN DataVencimento DATETIME2 NULL; END"); } catch {}

            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'PrecisaTrocarSenha') BEGIN ALTER TABLE Usuarios ADD PrecisaTrocarSenha BIT NOT NULL DEFAULT 1; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TrocasAvaria') AND name = 'MotoristaId') BEGIN ALTER TABLE TrocasAvaria ADD MotoristaId UNIQUEIDENTIFIER NULL; END"); } catch {}

            // Patches Folha CLT
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FolhasPagamento') AND name = 'TotalHorasExtras50') BEGIN ALTER TABLE FolhasPagamento ADD TotalHorasExtras50 DECIMAL(18,2) NOT NULL DEFAULT 0; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FolhasPagamento') AND name = 'ValorHorasExtras50') BEGIN ALTER TABLE FolhasPagamento ADD ValorHorasExtras50 DECIMAL(18,2) NOT NULL DEFAULT 0; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FolhasPagamento') AND name = 'TotalHorasExtras100') BEGIN ALTER TABLE FolhasPagamento ADD TotalHorasExtras100 DECIMAL(18,2) NOT NULL DEFAULT 0; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FolhasPagamento') AND name = 'ValorHorasExtras100') BEGIN ALTER TABLE FolhasPagamento ADD ValorHorasExtras100 DECIMAL(18,2) NOT NULL DEFAULT 0; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FolhasPagamento') AND name = 'ValorAdicionalNoturno') BEGIN ALTER TABLE FolhasPagamento ADD ValorAdicionalNoturno DECIMAL(18,2) NOT NULL DEFAULT 0; END"); } catch {}

            // Patches Geolocalização da Empresa (Cerca Virtual do Ponto)
            try {
                await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Empresas') AND name = 'Latitude') BEGIN ALTER TABLE Empresas ADD Latitude FLOAT NULL; END");
                await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Empresas') AND name = 'Longitude') BEGIN ALTER TABLE Empresas ADD Longitude FLOAT NULL; END");
            } catch {}

            // Patches Férias (CLT Arts. 129-153)
            try {
                await context.Database.ExecuteSqlRawAsync(@"
                    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PlanejamentosFerias]') AND type in (N'U'))
                    BEGIN
                        CREATE TABLE [dbo].[PlanejamentosFerias](
                            [Id] [uniqueidentifier] NOT NULL PRIMARY KEY,
                            [FuncionarioId] [uniqueidentifier] NOT NULL,
                            [DataInicio] [datetime2](7) NOT NULL,
                            [DataFim] [datetime2](7) NOT NULL,
                            [DiasFerias] [int] NOT NULL,
                            [TipoParcelamento] [int] NOT NULL,
                            [SolicitaAbono] [bit] NOT NULL DEFAULT 0,
                            [DiasAbono] [int] NOT NULL DEFAULT 0,
                            [PeriodoAquisitivoInicio] [datetime2](7) NOT NULL,
                            [PeriodoAquisitivoFim] [datetime2](7) NOT NULL,
                            [PeriodoConcessivoFim] [datetime2](7) NOT NULL,
                            [Status] [int] NOT NULL DEFAULT 0,
                            [ValorRemFeriasBruto] [decimal](18,2) NOT NULL DEFAULT 0,
                            [ValorTercoConstitucional] [decimal](18,2) NOT NULL DEFAULT 0,
                            [ValorAbonoFeriasVendidas] [decimal](18,2) NOT NULL DEFAULT 0,
                            [ValorTotalBruto] [decimal](18,2) NOT NULL DEFAULT 0,
                            [Observacao] [nvarchar](max) NULL,
                            [DataCriacao] [datetime2](7) NOT NULL DEFAULT GETDATE(),
                            [DataAprovacao] [datetime2](7) NULL,
                            [DataCancelamento] [datetime2](7) NULL,
                            [MotivoCancelamento] [nvarchar](max) NULL,
                            CONSTRAINT [FK_PlanejamentosFerias_Funcionarios] FOREIGN KEY([FuncionarioId]) REFERENCES [dbo].[Funcionarios]([Id])
                        )
                    END
                ");
            } catch {}

            // Patches colunas férias na FolhasPagamento
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.FolhasPagamento') AND name = 'ValorFerias') BEGIN ALTER TABLE FolhasPagamento ADD ValorFerias DECIMAL(18,2) NOT NULL DEFAULT 0; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.FolhasPagamento') AND name = 'ValorTercoConstitucionalFerias') BEGIN ALTER TABLE FolhasPagamento ADD ValorTercoConstitucionalFerias DECIMAL(18,2) NOT NULL DEFAULT 0; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.FolhasPagamento') AND name = 'ValorAbonoFeriasVendidas') BEGIN ALTER TABLE FolhasPagamento ADD ValorAbonoFeriasVendidas DECIMAL(18,2) NOT NULL DEFAULT 0; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.FolhasPagamento') AND name = 'DiasFerias') BEGIN ALTER TABLE FolhasPagamento ADD DiasFerias INT NOT NULL DEFAULT 0; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.FolhasPagamento') AND name = 'DiasAbonoFerias') BEGIN ALTER TABLE FolhasPagamento ADD DiasAbonoFerias INT NOT NULL DEFAULT 0; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.FolhasPagamento') AND name = 'PlanejamentoFeriasId') BEGIN ALTER TABLE FolhasPagamento ADD PlanejamentoFeriasId UNIQUEIDENTIFIER NULL; END"); } catch {}

            // Patches 13º Salário
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PlanejamentosFerias') AND name = 'SolicitaAdiantamentoDecimoTerceiro') BEGIN ALTER TABLE PlanejamentosFerias ADD SolicitaAdiantamentoDecimoTerceiro BIT NOT NULL DEFAULT 0; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PlanejamentosFerias') AND name = 'ValorAdiantamentoDecimoTerceiro') BEGIN ALTER TABLE PlanejamentosFerias ADD ValorAdiantamentoDecimoTerceiro DECIMAL(18,2) NOT NULL DEFAULT 0; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.FolhasPagamento') AND name = 'Tipo') BEGIN ALTER TABLE FolhasPagamento ADD Tipo INT NOT NULL DEFAULT 0; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.FolhasPagamento') AND name = 'ValorAdiantamento13Deducao') BEGIN ALTER TABLE FolhasPagamento ADD ValorAdiantamento13Deducao DECIMAL(18,2) NOT NULL DEFAULT 0; END"); } catch {}

            // Patches para criar tabela AgendaEventos se não existir
            try { await context.Database.ExecuteSqlRawAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AgendaEventos]') AND type in (N'U'))
                BEGIN
                    CREATE TABLE [dbo].[AgendaEventos](
                        [Id] [uniqueidentifier] NOT NULL PRIMARY KEY,
                        [Titulo] [nvarchar](max) NOT NULL,
                        [Data] [datetime2](7) NOT NULL,
                        [Tipo] [nvarchar](max) NOT NULL,
                        [Descricao] [nvarchar](max) NULL
                    )
                END
            "); } catch {}

            // Patches Compras
            try { await context.Database.ExecuteSqlRawAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Compras]') AND type in (N'U'))
                BEGIN
                    CREATE TABLE [dbo].[Compras](
                        [Id] [uniqueidentifier] NOT NULL PRIMARY KEY,
                        [FornecedorId] [uniqueidentifier] NOT NULL,
                        [DataCompra] [datetime2](7) NOT NULL,
                        [ValorTotal] [decimal](18,2) NOT NULL,
                        [Status] [int] NOT NULL,
                        [Observacao] [nvarchar](max) NULL
                    )
                END
            "); } catch {}

            try { await context.Database.ExecuteSqlRawAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CompraItems]') AND type in (N'U'))
                BEGIN
                    CREATE TABLE [dbo].[CompraItems](
                        [Id] [uniqueidentifier] NOT NULL PRIMARY KEY,
                        [CompraId] [uniqueidentifier] NOT NULL,
                        [ProdutoId] [uniqueidentifier] NOT NULL,
                        [Quantidade] [decimal](18,2) NOT NULL,
                        [PrecoUnitario] [decimal](18,2) NOT NULL,
                        CONSTRAINT [FK_CompraItems_Compras] FOREIGN KEY([CompraId]) REFERENCES [dbo].[Compras] ([Id]) ON DELETE CASCADE,
                        CONSTRAINT [FK_CompraItems_Produtos] FOREIGN KEY([ProdutoId]) REFERENCES [dbo].[Produtos] ([Id])
                    )
                END
            "); } catch {}
            
            // Patch para criar tabela ContasBancarias se não existir
            try { await context.Database.ExecuteSqlRawAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ContasBancarias]') AND type in (N'U'))
                BEGIN
                    CREATE TABLE [dbo].[ContasBancarias](
                        [Id] [uniqueidentifier] NOT NULL PRIMARY KEY,
                        [Nome] [nvarchar](max) NOT NULL,
                        [Tipo] [int] NOT NULL,
                        [SaldoInicial] [decimal](18,2) NOT NULL,
                        [SaldoAtual] [decimal](18,2) NOT NULL,
                        [DataAbertura] [datetime2](7) NOT NULL,
                        [Ativa] [bit] NOT NULL DEFAULT 1,
                        [IsPadrao] [bit] NOT NULL DEFAULT 0,
                        [PixChave] [nvarchar](max) NULL,
                        [BancoNome] [nvarchar](max) NULL,
                        [Agencia] [nvarchar](max) NULL,
                        [NumeroConta] [nvarchar](max) NULL
                    )
                END
            "); } catch {}

            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ContasBancarias') AND name = 'IsPadrao') BEGIN ALTER TABLE ContasBancarias ADD IsPadrao BIT NOT NULL DEFAULT 0; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ContasBancarias') AND name = 'PixChave') BEGIN ALTER TABLE ContasBancarias ADD PixChave NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ContasBancarias') AND name = 'BancoNome') BEGIN ALTER TABLE ContasBancarias ADD BancoNome NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ContasBancarias') AND name = 'Agencia') BEGIN ALTER TABLE ContasBancarias ADD Agencia NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ContasBancarias') AND name = 'NumeroConta') BEGIN ALTER TABLE ContasBancarias ADD NumeroConta NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ContasBancarias') AND name = 'GatewayToken') BEGIN ALTER TABLE ContasBancarias ADD GatewayToken NVARCHAR(MAX) NULL; END"); } catch {}

            // Patch para criar tabela AuditLogs se não existir
            try { 
                await context.Database.ExecuteSqlRawAsync(@"
                    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AuditLogs]') AND type in (N'U'))
                    BEGIN
                        CREATE TABLE [dbo].[AuditLogs](
                            [Id] [uniqueidentifier] NOT NULL PRIMARY KEY,
                            [TableName] [nvarchar](max) NOT NULL,
                            [Action] [nvarchar](max) NOT NULL,
                            [KeyValues] [nvarchar](max) NOT NULL,
                            [OldValues] [nvarchar](max) NULL,
                            [NewValues] [nvarchar](max) NULL,
                            [Timestamp] [datetime2](7) NOT NULL,
                            [UserId] [uniqueidentifier] NULL,
                            [UserName] [nvarchar](max) NULL
                        )
                    END
                "); 
            } catch {}

            // Patch para garantir a coluna UserName em bancos de dados legados
            try {
                await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'UserName') BEGIN ALTER TABLE AuditLogs ADD UserName NVARCHAR(MAX) NULL; END");
            } catch {}

            // Patch para criar tabela SystemLogs (Serilog) se não existir
            try {
                await context.Database.ExecuteSqlRawAsync(@"
                    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SystemLogs]') AND type in (N'U'))
                    BEGIN
                        CREATE TABLE [dbo].[SystemLogs](
                            [Id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
                            [Message] [nvarchar](max) NULL,
                            [MessageTemplate] [nvarchar](max) NULL,
                            [Level] [nvarchar](128) NULL,
                            [TimeStamp] [datetimeoffset](7) NOT NULL,
                            [Exception] [nvarchar](max) NULL,
                            [Properties] [xml] NULL,
                            [LogEvent] [nvarchar](max) NULL
                        )
                    END
                ");
            } catch {}

            // Patch para criar tabela Candidaturas se não existir
            try { await context.Database.ExecuteSqlRawAsync(@"
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Candidaturas]') AND type in (N'U'))
                BEGIN
                    CREATE TABLE [dbo].[Candidaturas](
                        [Id] [uniqueidentifier] NOT NULL PRIMARY KEY,
                        [Nome] [nvarchar](max) NOT NULL,
                        [Email] [nvarchar](max) NOT NULL,
                        [Telefone] [nvarchar](max) NOT NULL,
                        [CargoInteresse] [nvarchar](max) NOT NULL,
                        [Mensagem] [nvarchar](max) NULL,
                        [NomeOriginalArquivo] [nvarchar](max) NOT NULL,
                        [NomeArquivoSalvo] [nvarchar](max) NOT NULL,
                        [DataEnvio] [datetime2](7) NOT NULL,
                        [Status] [nvarchar](max) NOT NULL DEFAULT 'Novo'
                    )
                END
            "); } catch {}

            Console.WriteLine("[DB PATCHES] Aplicação de patches procedurais finalizada com sucesso.");

            // 2. MIGRACAO DE SEGURANÇA (P0): Criptografar senhas em texto puro no banco com BCrypt
            Console.WriteLine("[SECURITY MIGRATION] Verificando senhas em texto puro legadas...");
            var plainTextUsers = await context.Usuarios.Where(u => !u.SenhaHash.StartsWith("$")).ToListAsync();
            foreach (var user in plainTextUsers)
            {
                user.SenhaHash = BCrypt.Net.BCrypt.HashPassword(user.SenhaHash);
                context.Usuarios.Update(user);
            }
            if (plainTextUsers.Any())
            {
                await context.SaveChangesAsync();
                Console.WriteLine($"[SECURITY MIGRATION] Criptografadas com sucesso {plainTextUsers.Count} senhas legadas que estavam em texto puro com BCrypt.");
            }
            else
            {
                Console.WriteLine("[SECURITY MIGRATION] Nenhuma senha legada em texto puro encontrada. Base de dados em conformidade criptográfica.");
            }

            // 3. SEED VEICULOS E DADOS DE FROTA SE NÃO HOUVER ABASTECIMENTOS OU MANUTENÇÕES
            if (!await context.Abastecimentos.AnyAsync() && !await context.ManutencoesVeiculo.AnyAsync())
            {
                Console.WriteLine("[SEED] Semeando dados de teste para Frota (Veículos, Abastecimentos e Manutenções)...");
                
                // Garantir que temos pelo menos os veículos de teste
                var v1 = await context.Veiculos.FirstOrDefaultAsync(v => v.Placa == "SGPF001");
                if (v1 == null)
                {
                    v1 = new Veiculo
                    {
                        Id = Guid.NewGuid(),
                        Modelo = "Renault Master 2.3",
                        Placa = "SGPF001",
                        CapacidadeCargaKg = 1500,
                        QuilometragemAtual = 12450,
                        Ativo = true
                    };
                    await context.Veiculos.AddAsync(v1);
                }

                var v2 = await context.Veiculos.FirstOrDefaultAsync(v => v.Placa == "SGPF002");
                if (v2 == null)
                {
                    v2 = new Veiculo
                    {
                        Id = Guid.NewGuid(),
                        Modelo = "Fiat Fiorino 1.4",
                        Placa = "SGPF002",
                        CapacidadeCargaKg = 650,
                        QuilometragemAtual = 8900,
                        Ativo = true
                    };
                    await context.Veiculos.AddAsync(v2);
                }
                
                await context.SaveChangesAsync();

                // Semeia os abastecimentos e manutenções com suas respectivas Contas a Pagar
                int currentYear = DateTime.Now.Year;
                int currentMonth = DateTime.Now.Month;
                int prevMonth = currentMonth == 1 ? 12 : currentMonth - 1;
                int prevYear = currentMonth == 1 ? currentYear - 1 : currentYear;

                async Task<Abastecimento> criarAbastecimentoComConta(Guid veiculoId, DateTime data, decimal km, decimal litros, decimal valor, string modeloPlaca)
                {
                    var conta = new ContaPagar
                    {
                        Descricao = $"Abastecimento Veículo: {modeloPlaca} - {litros:N2}L",
                        Valor = valor,
                        DataEmissao = data,
                        DataVencimento = data,
                        DataPagamento = data,
                        Status = StatusContaPagar.Paga,
                        Categoria = "Operacional (Frota)"
                    };
                    await context.ContasPagar.AddAsync(conta);
                    await context.SaveChangesAsync();
                    return new Abastecimento
                    {
                        Id = Guid.NewGuid(),
                        VeiculoId = veiculoId,
                        Data = data,
                        QuilometragemRegistrada = km,
                        Litros = litros,
                        ValorTotal = valor,
                        ContaPagarId = conta.Id
                    };
                }

                async Task<ManutencaoVeiculo> criarManutencaoComConta(Guid veiculoId, DateTime data, TipoManutencao tipo, string desc, decimal custo, decimal km, string modeloPlaca)
                {
                    var conta = new ContaPagar
                    {
                        Descricao = $"Manutenção {(tipo == TipoManutencao.Preventiva ? "Preventiva" : "Corretiva")} Veículo: {modeloPlaca}",
                        Valor = custo,
                        DataEmissao = data,
                        DataVencimento = data,
                        DataPagamento = data,
                        Status = StatusContaPagar.Paga,
                        Categoria = "Operacional (Frota)"
                    };
                    await context.ContasPagar.AddAsync(conta);
                    await context.SaveChangesAsync();
                    return new ManutencaoVeiculo
                    {
                        Id = Guid.NewGuid(),
                        VeiculoId = veiculoId,
                        Data = data,
                        Tipo = tipo,
                        Descricao = desc,
                        CustoTotal = custo,
                        QuilometragemRegistrada = km,
                        ContaPagarId = conta.Id
                    };
                }

                var abasts = new List<Abastecimento>
                {
                    await criarAbastecimentoComConta(v1.Id, new DateTime(prevYear, prevMonth, 5, 8, 30, 0, DateTimeKind.Utc), 11000, 65, 390, $"{v1.Modelo} ({v1.Placa})"),
                    await criarAbastecimentoComConta(v1.Id, new DateTime(prevYear, prevMonth, 20, 17, 0, 0, DateTimeKind.Utc), 11700, 70, 420, $"{v1.Modelo} ({v1.Placa})"),
                    await criarAbastecimentoComConta(v1.Id, new DateTime(currentYear, currentMonth, 1, 9, 0, 0, DateTimeKind.Utc), 12450, 75, 450, $"{v1.Modelo} ({v1.Placa})"),
                    await criarAbastecimentoComConta(v2.Id, new DateTime(prevYear, prevMonth, 10, 10, 0, 0, DateTimeKind.Utc), 8000, 40, 240, $"{v2.Modelo} ({v2.Placa})"),
                    await criarAbastecimentoComConta(v2.Id, new DateTime(prevYear, prevMonth, 25, 16, 30, 0, DateTimeKind.Utc), 8500, 41.5m, 249, $"{v2.Modelo} ({v2.Placa})"),
                    await criarAbastecimentoComConta(v2.Id, new DateTime(currentYear, currentMonth, 2, 11, 0, 0, DateTimeKind.Utc), 8900, 33.3m, 200, $"{v2.Modelo} ({v2.Placa})")
                };

                await context.Abastecimentos.AddRangeAsync(abasts);

                var manus = new List<ManutencaoVeiculo>
                {
                    await criarManutencaoComConta(v1.Id, new DateTime(prevYear, prevMonth, 15, 14, 0, 0, DateTimeKind.Utc), TipoManutencao.Preventiva, "Troca de óleo e filtro de ar", 350, 11500, $"{v1.Modelo} ({v1.Placa})"),
                    await criarManutencaoComConta(v1.Id, new DateTime(currentYear, currentMonth, 2, 10, 0, 0, DateTimeKind.Utc), TipoManutencao.Corretiva, "Troca de pastilhas de freio dianteiras", 480, 12450, $"{v1.Modelo} ({v1.Placa})"),
                    await criarManutencaoComConta(v2.Id, new DateTime(prevYear, prevMonth, 18, 9, 30, 0, DateTimeKind.Utc), TipoManutencao.Preventiva, "Revisão de 10.000 km (antecipada)", 600, 8300, $"{v2.Modelo} ({v2.Placa})")
                };

                await context.ManutencoesVeiculo.AddRangeAsync(manus);
                await context.SaveChangesAsync();
                Console.WriteLine("[SEED] Dados de teste para Frota semeados com sucesso.");
            }

            // 4. BACKFILL: Garantir ContaPagarId para Abastecimentos e Manutenções legados/existentes
            var abastsSemConta = await context.Abastecimentos.Where(a => a.ContaPagarId == null).ToListAsync();
            if (abastsSemConta.Any())
            {
                var vlist = await context.Veiculos.ToListAsync();
                var vMap = vlist.ToDictionary(v => v.Id);
                foreach (var abast in abastsSemConta)
                {
                    vMap.TryGetValue(abast.VeiculoId, out var veiculo);
                    var contaPagar = new ContaPagar
                    {
                        Descricao = $"Abastecimento Veículo: {veiculo?.Modelo ?? "Frota"} ({veiculo?.Placa ?? "N/A"}) - {abast.Litros:N2}L",
                        Valor = abast.ValorTotal,
                        DataEmissao = abast.Data,
                        DataVencimento = abast.Data,
                        DataPagamento = abast.Data,
                        Status = StatusContaPagar.Paga,
                        Categoria = "Operacional (Frota)"
                    };
                    await context.ContasPagar.AddAsync(contaPagar);
                    await context.SaveChangesAsync();
                    abast.ContaPagarId = contaPagar.Id;
                    context.Abastecimentos.Update(abast);
                }
                await context.SaveChangesAsync();
                Console.WriteLine($"[BACKFILL] Criadas {abastsSemConta.Count} contas a pagar retroativas para Abastecimentos.");
            }

            var manusSemConta = await context.ManutencoesVeiculo.Where(m => m.ContaPagarId == null).ToListAsync();
            if (manusSemConta.Any())
            {
                var vlist = await context.Veiculos.ToListAsync();
                var vMap = vlist.ToDictionary(v => v.Id);
                foreach (var manu in manusSemConta)
                {
                    vMap.TryGetValue(manu.VeiculoId, out var veiculo);
                    var contaPagar = new ContaPagar
                    {
                        Descricao = $"Manutenção {(manu.Tipo == TipoManutencao.Preventiva ? "Preventiva" : "Corretiva")} Veículo: {veiculo?.Modelo ?? "Frota"} ({veiculo?.Placa ?? "N/A"})",
                        Valor = manu.CustoTotal,
                        DataEmissao = manu.Data,
                        DataVencimento = manu.Data,
                        DataPagamento = manu.Data,
                        Status = StatusContaPagar.Paga,
                        Categoria = "Operacional (Frota)"
                    };
                    await context.ContasPagar.AddAsync(contaPagar);
                    await context.SaveChangesAsync();
                    manu.ContaPagarId = contaPagar.Id;
                    context.ManutencoesVeiculo.Update(manu);
                }
                await context.SaveChangesAsync();
                Console.WriteLine($"[BACKFILL] Criadas {manusSemConta.Count} contas a pagar retroativas para Manutenções.");
            }

            // 5. BACKFILL: Associar funcionários sem EmpresaId à primeira empresa cadastrada
            var funcsSemEmpresa = await context.Funcionarios.Where(f => f.EmpresaId == null).ToListAsync();
            if (funcsSemEmpresa.Any())
            {
                var primeiraEmpresa = await context.Empresas.FirstOrDefaultAsync();
                if (primeiraEmpresa != null)
                {
                    foreach (var f in funcsSemEmpresa)
                    {
                        f.EmpresaId = primeiraEmpresa.Id;
                    }
                    context.Funcionarios.UpdateRange(funcsSemEmpresa);
                    await context.SaveChangesAsync();
                    Console.WriteLine($"[BACKFILL] Associados {funcsSemEmpresa.Count} funcionários sem empresa à empresa '{primeiraEmpresa.NomeFantasia}'.");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DB INITIALIZATION ERROR] Erro crítico ao processar patches e migrações: {ex.Message}");
        }
    }
}
