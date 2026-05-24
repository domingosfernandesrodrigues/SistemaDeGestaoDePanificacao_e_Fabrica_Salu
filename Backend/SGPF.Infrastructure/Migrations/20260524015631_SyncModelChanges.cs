using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SGPF.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SyncModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "MotoristaId",
                table: "TrocasAvaria",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "MotoristaId",
                table: "PedidosVenda",
                type: "uniqueidentifier",
                nullable: true);


            migrationBuilder.CreateIndex(
                name: "IX_TrocasAvaria_MotoristaId",
                table: "TrocasAvaria",
                column: "MotoristaId");

            migrationBuilder.CreateIndex(
                name: "IX_PedidosVenda_MotoristaId",
                table: "PedidosVenda",
                column: "MotoristaId");

            migrationBuilder.AddForeignKey(
                name: "FK_PedidosVenda_Funcionarios_MotoristaId",
                table: "PedidosVenda",
                column: "MotoristaId",
                principalTable: "Funcionarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TrocasAvaria_Funcionarios_MotoristaId",
                table: "TrocasAvaria",
                column: "MotoristaId",
                principalTable: "Funcionarios",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PedidosVenda_Funcionarios_MotoristaId",
                table: "PedidosVenda");

            migrationBuilder.DropForeignKey(
                name: "FK_TrocasAvaria_Funcionarios_MotoristaId",
                table: "TrocasAvaria");

            migrationBuilder.DropIndex(
                name: "IX_TrocasAvaria_MotoristaId",
                table: "TrocasAvaria");

            migrationBuilder.DropIndex(
                name: "IX_PedidosVenda_MotoristaId",
                table: "PedidosVenda");

            migrationBuilder.DropColumn(
                name: "MotoristaId",
                table: "TrocasAvaria");

            migrationBuilder.DropColumn(
                name: "MotoristaId",
                table: "PedidosVenda");

        }
    }
}
