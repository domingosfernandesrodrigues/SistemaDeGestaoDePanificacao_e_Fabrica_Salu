using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SGPF.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            /*
            migrationBuilder.AddColumn<string>(
                name: "BoletoCodigoBarras",
                table: "PedidosVenda",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FormaPagamento",
                table: "PedidosVenda",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "Pago",
                table: "PedidosVenda",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PixQrCode",
                table: "PedidosVenda",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BancoAgencia",
                table: "Empresas",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BancoConta",
                table: "Empresas",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BancoNome",
                table: "Empresas",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GatewayToken",
                table: "Empresas",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PixChave",
                table: "Empresas",
                type: "nvarchar(max)",
                nullable: true);
            */

            /*
            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TableName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    KeyValues = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OldValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ContasBancarias",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Tipo = table.Column<int>(type: "int", nullable: false),
                    SaldoInicial = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    SaldoAtual = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    DataAbertura = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Ativa = table.Column<bool>(type: "bit", nullable: false),
                    IsPadrao = table.Column<bool>(type: "bit", nullable: false),
                    PixChave = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BancoNome = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Agencia = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NumeroConta = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GatewayToken = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContasBancarias", x => x.Id);
                });
            */
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "ContasBancarias");

            migrationBuilder.DropColumn(
                name: "BoletoCodigoBarras",
                table: "PedidosVenda");

            migrationBuilder.DropColumn(
                name: "FormaPagamento",
                table: "PedidosVenda");

            migrationBuilder.DropColumn(
                name: "Pago",
                table: "PedidosVenda");

            migrationBuilder.DropColumn(
                name: "PixQrCode",
                table: "PedidosVenda");

            migrationBuilder.DropColumn(
                name: "BancoAgencia",
                table: "Empresas");

            migrationBuilder.DropColumn(
                name: "BancoConta",
                table: "Empresas");

            migrationBuilder.DropColumn(
                name: "BancoNome",
                table: "Empresas");

            migrationBuilder.DropColumn(
                name: "GatewayToken",
                table: "Empresas");

            migrationBuilder.DropColumn(
                name: "PixChave",
                table: "Empresas");
        }
    }
}
