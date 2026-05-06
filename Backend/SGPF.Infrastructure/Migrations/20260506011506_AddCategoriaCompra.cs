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
            // Adiciona coluna Categoria apenas se não existir (idempotente)
            migrationBuilder.Sql(@"
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
