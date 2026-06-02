using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SGPF.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoriaCompra : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Se as tabelas Compras e CompraItems não existirem (banco de dados novo), cria elas primeiro
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Compras]') AND type in (N'U'))
                BEGIN
                    CREATE TABLE [dbo].[Compras](
                        [Id] [uniqueidentifier] NOT NULL PRIMARY KEY,
                        [FornecedorId] [uniqueidentifier] NOT NULL,
                        [DataCompra] [datetime2](7) NOT NULL,
                        [ValorTotal] [decimal](18,2) NOT NULL,
                        [Status] [int] NOT NULL,
                        [Observacao] [nvarchar](max) NULL,
                        CONSTRAINT [FK_Compras_Fornecedores] FOREIGN KEY ([FornecedorId]) REFERENCES [dbo].[Fornecedores] ([Id])
                    );
                END

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
                    );
                END

                -- Adiciona coluna Categoria apenas se não existir (idempotente)
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[Compras]') 
                    AND name = 'Categoria'
                )
                BEGIN
                    ALTER TABLE [Compras] ADD [Categoria] int NOT NULL DEFAULT 0;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1 FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[Compras]') 
                    AND name = 'Categoria'
                )
                BEGIN
                    ALTER TABLE [Compras] DROP COLUMN [Categoria];
                END
            ");
        }
    }
}
