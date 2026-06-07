using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using SGPF.Infrastructure.Data;
using SGPF.Infrastructure.Interceptors;

var builder = WebApplication.CreateBuilder(args);

// Configuração do Serilog
builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration)
                 .Enrich.FromLogContext()
                 .WriteTo.Console()
                 .WriteTo.File("Logs/sgpf_log_.txt", rollingInterval: RollingInterval.Day)
                 .WriteTo.MSSqlServer(
                     connectionString: context.Configuration.GetConnectionString("DefaultConnection"),
                     sinkOptions: new Serilog.Sinks.MSSqlServer.MSSqlServerSinkOptions { 
                         TableName = "SystemLogs", 
                         AutoCreateSqlTable = false,
                         BatchPostingLimit = 50,
                         BatchPeriod = TimeSpan.FromSeconds(5)
                     }
                 ));

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
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<AuditInterceptor>();
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
{
    var interceptor = sp.GetRequiredService<AuditInterceptor>();
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
           .AddInterceptors(interceptor);
});

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

// Injeção de Dependências (Services e Repositories)
builder.Services.AddScoped(typeof(SGPF.Domain.Interfaces.IRepository<>), typeof(SGPF.Infrastructure.Repositories.Repository<>));
builder.Services.AddScoped<SGPF.Application.Interfaces.IAuthService, SGPF.Application.Services.AuthService>();
builder.Services.AddScoped<SGPF.Application.Interfaces.IOrdemProducaoService, SGPF.Application.Services.OrdemProducaoService>();
builder.Services.AddScoped<SGPF.Application.Interfaces.IFolhaPagamentoService, SGPF.Application.Services.FolhaPagamentoService>();
builder.Services.AddScoped<SGPF.Application.Interfaces.IVendaService, SGPF.Application.Services.VendaService>();
builder.Services.AddScoped<SGPF.Application.Interfaces.IDashboardService, SGPF.Application.Services.DashboardService>();
builder.Services.AddScoped<SGPF.Application.Interfaces.IPlanejamentoFeriasService, SGPF.Application.Services.PlanejamentoFeriasService>();
builder.Services.AddScoped<SGPF.Application.Services.FrotaService>();
builder.Services.AddScoped<SGPF.Application.Services.TrocaService>();
builder.Services.AddScoped<SGPF.Application.Services.IFinanceiroService, SGPF.Application.Services.FinanceiroService>();
builder.Services.AddScoped<SGPF.Application.Services.ICompraService, SGPF.Application.Services.CompraService>();
builder.Services.AddScoped<SGPF.Application.Services.ReuniaoService>();

// Registrar Hosted Service para retenção e limpeza de logs
builder.Services.AddHostedService<SGPF.WebApi.Services.LogRetentionService>();

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

// Aplicação de patches procedurais de banco e migrações de segurança (Clean Code & SRP)
await SGPF.WebApi.Services.DbPatchesInitializer.ApplyPatchesAsync(app.Services);

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

// Rebuild trigger: force dotnet watch to recompile - candidates feature
app.Run();
