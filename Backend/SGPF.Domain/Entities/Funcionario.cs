namespace SGPF.Domain.Entities;

public class Funcionario
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public string CPF { get; set; } = string.Empty;
    public string Cargo { get; set; } = string.Empty;
    public decimal SalarioBase { get; set; }
    public DateTime DataAdmissao { get; set; }
    public DateTime? DataDemissao { get; set; }
    public bool Ativo { get; set; } = true;
    public Guid? UsuarioId { get; set; } // Vínculo com o usuário do sistema

    public Guid? EmpresaId { get; set; }
    public Empresa? Empresa { get; set; }
}
