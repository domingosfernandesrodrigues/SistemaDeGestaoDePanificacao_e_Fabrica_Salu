using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class CandidaturasController : ControllerBase
{
    private readonly IRepository<Candidatura> _repository;
    private readonly string _uploadFolder;

    public CandidaturasController(IRepository<Candidatura> repository)
    {
        _repository = repository;
        _uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "Curriculos");
        if (!Directory.Exists(_uploadFolder))
        {
            Directory.CreateDirectory(_uploadFolder);
        }
    }

    [HttpPost]
    public async Task<IActionResult> Enviar([FromForm] EnviarCandidaturaRequest request)
    {
        if (request.Curriculo == null || request.Curriculo.Length == 0)
        {
            return BadRequest(new { message = "É obrigatório anexar o currículo." });
        }

        if (string.IsNullOrWhiteSpace(request.Nome) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Telefone) ||
            string.IsNullOrWhiteSpace(request.CargoInteresse))
        {
            return BadRequest(new { message = "Todos os campos obrigatórios (Nome, E-mail, Telefone e Cargo) devem ser preenchidos." });
        }

        // Validação da extensão
        var ext = Path.GetExtension(request.Curriculo.FileName).ToLower();
        string[] allowedExtensions = { ".pdf", ".docx", ".doc" };
        if (!allowedExtensions.Contains(ext))
        {
            return BadRequest(new { message = "Formato de arquivo inválido. Apenas .pdf, .docx e .doc são permitidos." });
        }

        // Validação de tamanho (máximo 5MB)
        long maxSizeBytes = 5 * 1024 * 1024;
        if (request.Curriculo.Length > maxSizeBytes)
        {
            return BadRequest(new { message = "O currículo não pode ter mais de 5MB." });
        }

        // Salvar arquivo de forma segura usando um Guid
        var guidName = Guid.NewGuid().ToString() + ext;
        var filePath = Path.Combine(_uploadFolder, guidName);

        try
        {
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await request.Curriculo.CopyToAsync(stream);
            }
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = $"Erro ao salvar arquivo no servidor: {ex.Message}" });
        }

        var candidatura = new Candidatura
        {
            Nome = request.Nome,
            Email = request.Email,
            Telefone = request.Telefone,
            CargoInteresse = request.CargoInteresse,
            Mensagem = request.Mensagem,
            NomeOriginalArquivo = Path.GetFileName(request.Curriculo.FileName),
            NomeArquivoSalvo = guidName,
            DataEnvio = DateTime.UtcNow,
            Status = "Novo"
        };

        try
        {
            await _repository.AddAsync(candidatura);
            return Ok(new { message = "Candidatura enviada com sucesso!" });
        }
        catch (Exception ex)
        {
            // Tenta limpar o arquivo físico se der erro na persistência do banco
            if (System.IO.File.Exists(filePath))
            {
                try { System.IO.File.Delete(filePath); } catch {}
            }
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = $"Erro ao salvar candidatura no banco de dados: {ex.Message}" });
        }
    }

    [Authorize(Roles = "Admin,Gestor")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var lista = await _repository.GetAllAsync();
        var sorted = lista.OrderByDescending(c => c.DataEnvio);
        return Ok(sorted);
    }

    [Authorize(Roles = "Admin,Gestor")]
    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var candidatura = await _repository.GetByIdAsync(id);
        if (candidatura == null) return NotFound();

        var filePath = Path.Combine(_uploadFolder, candidatura.NomeArquivoSalvo);
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { message = "Arquivo do currículo não foi encontrado no servidor." });
        }

        var contentType = "application/octet-stream";
        if (candidatura.NomeOriginalArquivo.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            contentType = "application/pdf";
        else if (candidatura.NomeOriginalArquivo.EndsWith(".docx", StringComparison.OrdinalIgnoreCase))
            contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        else if (candidatura.NomeOriginalArquivo.EndsWith(".doc", StringComparison.OrdinalIgnoreCase))
            contentType = "application/msword";

        return PhysicalFile(filePath, contentType, candidatura.NomeOriginalArquivo);
    }

    [Authorize(Roles = "Admin,Gestor")]
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
    {
        var candidatura = await _repository.GetByIdAsync(id);
        if (candidatura == null) return NotFound();

        string[] validStatuses = { "Novo", "Em Análise", "Entrevista", "Contratado", "Recusado" };
        if (!validStatuses.Contains(request.Status))
        {
            return BadRequest(new { message = "Status inválido." });
        }

        candidatura.Status = request.Status;
        await _repository.UpdateAsync(candidatura);
        return Ok(candidatura);
    }

    [Authorize(Roles = "Admin,Gestor")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var candidatura = await _repository.GetByIdAsync(id);
        if (candidatura == null) return NotFound();

        var filePath = Path.Combine(_uploadFolder, candidatura.NomeArquivoSalvo);
        if (System.IO.File.Exists(filePath))
        {
            try
            {
                System.IO.File.Delete(filePath);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao excluir arquivo físico de currículo: {ex.Message}");
            }
        }

        await _repository.DeleteAsync(id);
        return NoContent();
    }
}

public class EnviarCandidaturaRequest
{
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
    public string CargoInteresse { get; set; } = string.Empty;
    public string? Mensagem { get; set; } = string.Empty;
    public IFormFile Curriculo { get; set; } = null!;
}

public class UpdateStatusRequest
{
    public string Status { get; set; } = string.Empty;
}
