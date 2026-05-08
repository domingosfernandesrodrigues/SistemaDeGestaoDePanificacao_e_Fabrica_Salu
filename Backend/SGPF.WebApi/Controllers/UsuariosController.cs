using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SGPF.Domain.Entities;
using SGPF.Domain.Interfaces;

namespace SGPF.WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin,Gestor")]
public class UsuariosController : ControllerBase
{
    private readonly IRepository<Usuario> _repository;
    private readonly SGPF.Infrastructure.Data.AppDbContext _context;

    public UsuariosController(IRepository<Usuario> repository, SGPF.Infrastructure.Data.AppDbContext context)
    {
        _repository = repository;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _repository.GetAllAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Usuario usuario)
    {
        usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(string.IsNullOrEmpty(usuario.SenhaHash) ? "12345678" : usuario.SenhaHash);
        await _repository.AddAsync(usuario);
        return Ok(usuario);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Usuario usuario)
    {
        if (id != usuario.Id) return BadRequest();
        
        var existing = await _repository.GetByIdAsync(id);
        if (existing == null) return NotFound();

        existing.Nome = usuario.Nome;
        existing.Email = usuario.Email;
        existing.Role = usuario.Role;
        existing.ClienteId = usuario.ClienteId;
        existing.Ativo = usuario.Ativo;
        
        await _repository.UpdateAsync(existing);
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var usuario = await _repository.GetByIdAsync(id);
        if (usuario == null) return NotFound();

        // 1. Verificar vínculo direto com Funcionários
        var temVinculoFuncionario = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.AnyAsync(_context.Funcionarios, f => f.UsuarioId == id);
        
        // 2. Se for um usuário do tipo Cliente, verificar se o Cliente vinculado possui movimentações
        bool temHistoricoCliente = false;
        if (usuario.ClienteId.HasValue)
        {
            var cid = usuario.ClienteId.Value;
            var temPedidos = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.AnyAsync(_context.PedidosVenda, p => p.ClienteId == cid);
            var temContas = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.AnyAsync(_context.ContasReceber, c => c.ClienteId == cid);
            var temReunioes = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.AnyAsync(_context.Reunioes, r => r.ClienteId == cid);
            
            if (temPedidos || temContas || temReunioes)
            {
                temHistoricoCliente = true;
            }
        }

        // 3. Verificar se o usuário criou Ordens de Produção (Histórico Industrial)
        var temOPs = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.AnyAsync(_context.OrdensProducao, o => 
            o.UsuarioPlanejouId == id || 
            o.UsuarioIniciouId == id || 
            o.UsuarioFinalizouId == id);

        if (temVinculoFuncionario || temHistoricoCliente || temOPs)
        {
            return BadRequest(new { message = "Este usuário possui histórico vinculado (Funcionário, Movimentações de Cliente ou Ordens de Produção) e não pode ser excluído permanentemente para preservar a integridade dos dados e auditoria industrial. Por favor, utilize a opção de INATIVAR o acesso." });
        }

        try 
        {
            await _repository.DeleteAsync(id);
            return NoContent();
        }
        catch (Exception)
        {
            // Fallback para qualquer restrição de integridade do banco de dados (Foreign Keys)
            return BadRequest(new { message = "Não foi possível excluir o usuário devido a restrições de integridade no banco de dados. Recomendamos inativar o usuário em vez de excluí-lo." });
        }
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id)
    {
        var usuario = await _repository.GetByIdAsync(id);
        if (usuario == null) return NotFound();

        usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword("12345678");
        usuario.PrecisaTrocarSenha = true;
        await _repository.UpdateAsync(usuario);

        return Ok(new { message = "Senha resetada com sucesso." });
    }

    [HttpPost("{id}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(Guid id)
    {
        var usuario = await _repository.GetByIdAsync(id);
        if (usuario == null) return NotFound();

        usuario.Ativo = !usuario.Ativo;
        await _repository.UpdateAsync(usuario);

        return Ok(usuario);
    }
}
