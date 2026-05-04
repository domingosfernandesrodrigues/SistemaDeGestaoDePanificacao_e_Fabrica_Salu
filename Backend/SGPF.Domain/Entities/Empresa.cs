namespace SGPF.Domain.Entities;

public class Empresa
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string RazaoSocial { get; set; } = string.Empty;
    public string CNPJ { get; set; } = string.Empty;
    public string Endereco { get; set; } = string.Empty;
    public ICollection<Funcionario> Funcionarios { get; set; } = new List<Funcionario>();
}
