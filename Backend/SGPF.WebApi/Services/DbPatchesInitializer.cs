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
            
            // Patches para Empresa (Pagamentos)
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Empresas' AND COLUMN_NAME = 'PixChave') BEGIN ALTER TABLE Empresas ADD PixChave NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Empresas' AND COLUMN_NAME = 'BancoNome') BEGIN ALTER TABLE Empresas ADD BancoNome NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Empresas' AND COLUMN_NAME = 'BancoAgencia') BEGIN ALTER TABLE Empresas ADD BancoAgencia NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Empresas' AND COLUMN_NAME = 'BancoConta') BEGIN ALTER TABLE Empresas ADD BancoConta NVARCHAR(MAX) NULL; END"); } catch {}
            try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Empresas' AND COLUMN_NAME = 'GatewayToken') BEGIN ALTER TABLE Empresas ADD GatewayToken NVARCHAR(MAX) NULL; END"); } catch {}
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
                        [Quantidade] [decimal](18,4) NOT NULL,
                        [PrecoUnitario] [decimal](18,4) NOT NULL,
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
                            [UserId] [uniqueidentifier] NULL
                        )
                    END
                "); 
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

                // Semeia os abastecimentos e manutenções
                int currentYear = DateTime.UtcNow.Year;
                int currentMonth = DateTime.UtcNow.Month;
                int prevMonth = currentMonth == 1 ? 12 : currentMonth - 1;
                int prevYear = currentMonth == 1 ? currentYear - 1 : currentYear;

                var abasts = new List<Abastecimento>
                {
                    new Abastecimento
                    {
                        Id = Guid.NewGuid(),
                        VeiculoId = v1.Id,
                        Data = new DateTime(prevYear, prevMonth, 5, 8, 30, 0, DateTimeKind.Utc),
                        QuilometragemRegistrada = 11000,
                        Litros = 65,
                        ValorTotal = 390
                    },
                    new Abastecimento
                    {
                        Id = Guid.NewGuid(),
                        VeiculoId = v1.Id,
                        Data = new DateTime(prevYear, prevMonth, 20, 17, 0, 0, DateTimeKind.Utc),
                        QuilometragemRegistrada = 11700, // 700 km
                        Litros = 70, // 10 km/l
                        ValorTotal = 420
                    },
                    new Abastecimento
                    {
                        Id = Guid.NewGuid(),
                        VeiculoId = v1.Id,
                        Data = new DateTime(currentYear, currentMonth, 1, 9, 0, 0, DateTimeKind.Utc),
                        QuilometragemRegistrada = 12450, // 750 km
                        Litros = 75, // 10 km/l
                        ValorTotal = 450
                    },

                    new Abastecimento
                    {
                        Id = Guid.NewGuid(),
                        VeiculoId = v2.Id,
                        Data = new DateTime(prevYear, prevMonth, 10, 10, 0, 0, DateTimeKind.Utc),
                        QuilometragemRegistrada = 8000,
                        Litros = 40,
                        ValorTotal = 240
                    },
                    new Abastecimento
                    {
                        Id = Guid.NewGuid(),
                        VeiculoId = v2.Id,
                        Data = new DateTime(prevYear, prevMonth, 25, 16, 30, 0, DateTimeKind.Utc),
                        QuilometragemRegistrada = 8500, // 500 km
                        Litros = 41.5m, // ~12 km/l
                        ValorTotal = 249
                    },
                    new Abastecimento
                    {
                        Id = Guid.NewGuid(),
                        VeiculoId = v2.Id,
                        Data = new DateTime(currentYear, currentMonth, 2, 11, 0, 0, DateTimeKind.Utc),
                        QuilometragemRegistrada = 8900, // 400 km
                        Litros = 33.3m, // ~12 km/l
                        ValorTotal = 200
                    }
                };

                await context.Abastecimentos.AddRangeAsync(abasts);

                var manus = new List<ManutencaoVeiculo>
                {
                    new ManutencaoVeiculo
                    {
                        Id = Guid.NewGuid(),
                        VeiculoId = v1.Id,
                        Data = new DateTime(prevYear, prevMonth, 15, 14, 0, 0, DateTimeKind.Utc),
                        Tipo = TipoManutencao.Preventiva,
                        Descricao = "Troca de óleo e filtro de ar",
                        CustoTotal = 350,
                        QuilometragemRegistrada = 11500
                    },
                    new ManutencaoVeiculo
                    {
                        Id = Guid.NewGuid(),
                        VeiculoId = v1.Id,
                        Data = new DateTime(currentYear, currentMonth, 2, 10, 0, 0, DateTimeKind.Utc),
                        Tipo = TipoManutencao.Corretiva,
                        Descricao = "Troca de pastilhas de freio dianteiras",
                        CustoTotal = 480,
                        QuilometragemRegistrada = 12450
                    },

                    new ManutencaoVeiculo
                    {
                        Id = Guid.NewGuid(),
                        VeiculoId = v2.Id,
                        Data = new DateTime(prevYear, prevMonth, 18, 9, 30, 0, DateTimeKind.Utc),
                        Tipo = TipoManutencao.Preventiva,
                        Descricao = "Revisão de 10.000 km (antecipada)",
                        CustoTotal = 600,
                        QuilometragemRegistrada = 8300
                    }
                };

                await context.ManutencoesVeiculo.AddRangeAsync(manus);
                await context.SaveChangesAsync();
                Console.WriteLine("[SEED] Dados de teste para Frota semeados com sucesso.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DB INITIALIZATION ERROR] Erro crítico ao processar patches e migrações: {ex.Message}");
        }
    }
}
