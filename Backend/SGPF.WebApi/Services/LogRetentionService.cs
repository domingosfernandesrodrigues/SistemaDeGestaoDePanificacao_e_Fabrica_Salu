using System.Data;
using System.IO.Compression;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SGPF.Infrastructure.Data;

namespace SGPF.WebApi.Services;

/// <summary>
/// Serviço de background (Hosted Service) responsável por aplicar as políticas de retenção de logs.
/// Motivos de prazos (Compliance):
/// - Logs Operacionais (Erros, Warnings): Retidos por 30 dias na base ativa. Motivo: Diagnósticos técnicos raramente precisam de dados mais antigos que isso em produção.
/// - Logs de Auditoria (AuditLog): Retidos por 5 anos (1825 dias) na base ativa. Motivo: Legislação fiscal, tributária e trabalhista brasileira (ex: Receita Federal, eSocial) exige guarda de informações e histórico de alterações por 5 anos.
/// Após esse prazo, os dados são compactados (.gz) e deletados do banco.
/// </summary>
public class LogRetentionService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<LogRetentionService> _logger;

    // Políticas de retenção
    private readonly int _operationalRetentionDays = 30;
    private readonly int _auditRetentionDays = 1825; // 5 anos
    private readonly string _archivePath = "Logs/Archives";

    public LogRetentionService(IServiceProvider serviceProvider, ILogger<LogRetentionService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        
        if (!Directory.Exists(_archivePath))
        {
            Directory.CreateDirectory(_archivePath);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("LogRetentionService iniciado. Aguardando 30 segundos para a primeira execução...");
        
        // Aguarda o sistema inicializar completamente e aplicar patches
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessLogRetentionAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao processar retenção de logs.");
            }

            // Executa a cada 24 horas
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }

    private async Task ProcessLogRetentionAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var dataLimiteOperacional = DateTime.UtcNow.AddDays(-_operationalRetentionDays);
        var dataLimiteAuditoria = DateTime.UtcNow.AddDays(-_auditRetentionDays);

        _logger.LogInformation("Iniciando rotina de retenção: Operacional < {0}, Auditoria < {1}", dataLimiteOperacional, dataLimiteAuditoria);

        await ArchiveAndDeleteOperationalLogs(context, dataLimiteOperacional);
        await ArchiveAndDeleteAuditLogs(context, dataLimiteAuditoria);
    }

    private async Task ArchiveAndDeleteOperationalLogs(AppDbContext context, DateTime limite)
    {
        // SystemLogs é gerado pelo Serilog, não está no DbContext nativamente.
        var conn = context.Database.GetDbConnection();
        var isClosed = conn.State == ConnectionState.Closed;
        if (isClosed) await conn.OpenAsync();

        try
        {
            // 1. Verificar se existem logs antigos e carregá-logs para arquivo
            using var cmdSelect = conn.CreateCommand();
            cmdSelect.CommandText = "SELECT Id, Message, MessageTemplate, Level, TimeStamp, Exception, Properties FROM SystemLogs WHERE TimeStamp < @limite";
            var paramSelect = cmdSelect.CreateParameter();
            paramSelect.ParameterName = "@limite";
            paramSelect.Value = limite;
            cmdSelect.Parameters.Add(paramSelect);

            var logsToArchive = new List<Dictionary<string, object>>();

            using (var reader = await cmdSelect.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    var log = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        log[reader.GetName(i)] = reader.IsDBNull(i) ? null! : reader.GetValue(i);
                    }
                    logsToArchive.Add(log);
                }
            }

            if (logsToArchive.Any())
            {
                // 2. Arquivar e comprimir
                string filename = Path.Combine(_archivePath, $"SystemLogs_{DateTime.UtcNow:yyyyMMdd_HHmmss}.json.gz");
                await CompressAndSaveAsync(filename, logsToArchive);
                
                // 3. Deletar do banco
                using var cmdDelete = conn.CreateCommand();
                cmdDelete.CommandText = "DELETE FROM SystemLogs WHERE TimeStamp < @limite";
                var paramDelete = cmdDelete.CreateParameter();
                paramDelete.ParameterName = "@limite";
                paramDelete.Value = limite;
                cmdDelete.Parameters.Add(paramDelete);
                
                int deleted = await cmdDelete.ExecuteNonQueryAsync();
                _logger.LogInformation("Expiração Automática: {0} logs operacionais arquivados e deletados com sucesso.", deleted);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao processar logs operacionais (Tabela pode não existir ainda).");
        }
        finally
        {
            if (isClosed) await conn.CloseAsync();
        }
    }

    private async Task ArchiveAndDeleteAuditLogs(AppDbContext context, DateTime limite)
    {
        // AuditLogs estão no DbSet
        var oldAudits = await context.AuditLogs
            .AsNoTracking()
            .Where(a => a.Timestamp < limite)
            .ToListAsync();

        if (oldAudits.Any())
        {
            // Arquivar e comprimir
            string filename = Path.Combine(_archivePath, $"AuditLogs_{DateTime.UtcNow:yyyyMMdd_HHmmss}.json.gz");
            await CompressAndSaveAsync(filename, oldAudits);

            // Deletar
            context.AuditLogs.RemoveRange(oldAudits);
            await context.SaveChangesAsync();
            _logger.LogInformation("Expiração Automática: {0} logs de auditoria arquivados e deletados com sucesso.", oldAudits.Count);
        }
    }

    private async Task CompressAndSaveAsync<T>(string filePath, T data)
    {
        string json = JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true });
        byte[] bytes = Encoding.UTF8.GetBytes(json);

        using var fileStream = new FileStream(filePath, FileMode.Create);
        using var gzipStream = new GZipStream(fileStream, CompressionMode.Compress);
        await gzipStream.WriteAsync(bytes, 0, bytes.Length);
    }
}
