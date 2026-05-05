using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SGPF.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});


// Configure OpenAPI
builder.Services.AddOpenApi();

// Configure Entity Framework Core com SQL Server
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

// Injeção de Dependências (Services e Repositories)
builder.Services.AddScoped(typeof(SGPF.Domain.Interfaces.IRepository<>), typeof(SGPF.Infrastructure.Repositories.Repository<>));
builder.Services.AddScoped<SGPF.Application.Interfaces.IAuthService, SGPF.Application.Services.AuthService>();
builder.Services.AddScoped<SGPF.Application.Interfaces.IOrdemProducaoService, SGPF.Application.Services.OrdemProducaoService>();
builder.Services.AddScoped<SGPF.Application.Interfaces.IFolhaPagamentoService, SGPF.Application.Services.FolhaPagamentoService>();
builder.Services.AddScoped<SGPF.Application.Interfaces.IVendaService, SGPF.Application.Services.VendaService>();
builder.Services.AddScoped<SGPF.Application.Services.FrotaService>();
builder.Services.AddScoped<SGPF.Application.Services.TrocaService>();
builder.Services.AddScoped<SGPF.Application.Services.IFinanceiroService, SGPF.Application.Services.FinanceiroService>();
builder.Services.AddScoped<SGPF.Application.Services.ReuniaoService>();

// Configure JWT Authentication
var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? "MySuperSecretKey_SGPF_2026_Minimum32Chars!!";
var key = Encoding.ASCII.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // Dev only
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

// PATCH: Garantir que a coluna Ativo existe na tabela Clientes
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try {
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
                    [Id] [uniqueidentifier] NOT NULL,
                    [FuncionarioId] [uniqueidentifier] NOT NULL,
                    [DataInicio] [datetime2](7) NOT NULL,
                    [DataFim] [datetime2](7) NOT NULL,
                    [Motivo] [nvarchar](max) NOT NULL,
                    [Observacao] [nvarchar](max) NULL,
                    [Status] [nvarchar](max) NOT NULL,
                    [DataCriacao] [datetime2](7) NOT NULL,
                 CONSTRAINT [PK_Afastamentos] PRIMARY KEY CLUSTERED 
                (
                    [Id] ASC
                )
                ) ON [PRIMARY]
                
                ALTER TABLE [dbo].[Afastamentos]  WITH CHECK ADD  CONSTRAINT [FK_Afastamentos_Funcionarios_FuncionarioId] FOREIGN KEY([FuncionarioId])
                REFERENCES [dbo].[Funcionarios] ([Id])
                ON DELETE CASCADE
                
                ALTER TABLE [dbo].[Afastamentos] CHECK CONSTRAINT [FK_Afastamentos_Funcionarios_FuncionarioId]
            END
        "); } catch {}
        
        try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Afastamentos') AND name = 'Tipo') BEGIN ALTER TABLE Afastamentos ALTER COLUMN Tipo NVARCHAR(MAX) NULL; END"); } catch {}
        try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Afastamentos') AND name = 'Motivo') BEGIN ALTER TABLE Afastamentos ADD Motivo NVARCHAR(MAX) NULL; END"); } catch {}
        try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Afastamentos') AND name = 'Observacao') BEGIN ALTER TABLE Afastamentos ADD Observacao NVARCHAR(MAX) NULL; END"); } catch {}
        try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Afastamentos') AND name = 'Status') BEGIN ALTER TABLE Afastamentos ADD Status NVARCHAR(MAX) NULL; END"); } catch {}
        try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Afastamentos') AND name = 'AnexoNome') BEGIN ALTER TABLE Afastamentos ADD AnexoNome NVARCHAR(MAX) NULL; END"); } catch {}
        try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Afastamentos') AND name = 'AnexoBase64') BEGIN ALTER TABLE Afastamentos ADD AnexoBase64 NVARCHAR(MAX) NULL; END"); } catch {}
        try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Afastamentos') AND name = 'DataCriacao') BEGIN ALTER TABLE Afastamentos ADD DataCriacao DATETIME2 NOT NULL DEFAULT GETDATE(); END"); } catch {}
        try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'Ativo') BEGIN ALTER TABLE Usuarios ADD Ativo BIT NOT NULL DEFAULT 1; END"); } catch {}
        // Patches para OrdemProducao (Rastreabilidade) - Movido para o início para garantir execução
        try { 
            Console.WriteLine("Iniciando patches de OrdensProducao...");
            await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'OrdensProducao' AND COLUMN_NAME = 'UsuarioPlanejouId') BEGIN ALTER TABLE OrdensProducao ADD UsuarioPlanejouId UNIQUEIDENTIFIER NULL; END");
            await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'OrdensProducao' AND COLUMN_NAME = 'UsuarioIniciouId') BEGIN ALTER TABLE OrdensProducao ADD UsuarioIniciouId UNIQUEIDENTIFIER NULL; END");
            await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'OrdensProducao' AND COLUMN_NAME = 'UsuarioFinalizouId') BEGIN ALTER TABLE OrdensProducao ADD UsuarioFinalizouId UNIQUEIDENTIFIER NULL; END");
            Console.WriteLine("Patches de OrdensProducao aplicados com sucesso.");
        } catch (Exception ex) { 
            Console.WriteLine($"Erro crítico nos patches de Produção: {ex.Message}");
        }

        try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ContasPagar') AND name = 'MesReferencia') BEGIN ALTER TABLE ContasPagar ADD MesReferencia NVARCHAR(MAX) NULL; END"); } catch {}
        try { await context.Database.ExecuteSqlRawAsync("IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ContasPagar') AND name = 'DataVencimento' AND is_nullable = 0) BEGIN ALTER TABLE ContasPagar ALTER COLUMN DataVencimento DATETIME2 NULL; END"); } catch {}

        try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'PrecisaTrocarSenha') BEGIN ALTER TABLE Usuarios ADD PrecisaTrocarSenha BIT NOT NULL DEFAULT 1; END"); } catch {}

        // Patches Folha CLT
        try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FolhasPagamento') AND name = 'TotalHorasExtras50') BEGIN ALTER TABLE FolhasPagamento ADD TotalHorasExtras50 DECIMAL(18,2) NOT NULL DEFAULT 0; END"); } catch {}
        try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FolhasPagamento') AND name = 'ValorHorasExtras50') BEGIN ALTER TABLE FolhasPagamento ADD ValorHorasExtras50 DECIMAL(18,2) NOT NULL DEFAULT 0; END"); } catch {}
        try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FolhasPagamento') AND name = 'TotalHorasExtras100') BEGIN ALTER TABLE FolhasPagamento ADD TotalHorasExtras100 DECIMAL(18,2) NOT NULL DEFAULT 0; END"); } catch {}
        try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FolhasPagamento') AND name = 'ValorHorasExtras100') BEGIN ALTER TABLE FolhasPagamento ADD ValorHorasExtras100 DECIMAL(18,2) NOT NULL DEFAULT 0; END"); } catch {}
        try { await context.Database.ExecuteSqlRawAsync("IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FolhasPagamento') AND name = 'ValorAdicionalNoturno') BEGIN ALTER TABLE FolhasPagamento ADD ValorAdicionalNoturno DECIMAL(18,2) NOT NULL DEFAULT 0; END"); } catch {}

        // Patch para criar tabela AgendaEventos se não existir
        try { await context.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AgendaEventos]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[AgendaEventos](
                    [Id] [uniqueidentifier] NOT NULL,
                    [Titulo] [nvarchar](max) NOT NULL,
                    [Data] [datetime2](7) NOT NULL,
                    [Tipo] [nvarchar](max) NOT NULL,
                    [Descricao] [nvarchar](max) NULL,
                 CONSTRAINT [PK_AgendaEventos] PRIMARY KEY CLUSTERED ([Id] ASC)
                ) ON [PRIMARY]
            END
        "); } catch {}
    } catch (Exception ex) { 
        Console.WriteLine($"Erro ao aplicar patches: {ex.Message}");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowAll");


app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
