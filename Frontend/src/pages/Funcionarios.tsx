import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Users, Search, Plus, Edit2, Trash2, Loader2, Save, User, Briefcase, DollarSign, Calendar } from 'lucide-react';
import api from '../services/api';

// Validação real de CPF
function validarCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11 || /^(\d)\1+$/.test(clean)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(clean[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(clean[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(clean[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(clean[10]);
}

function formatCPF(val: string) {
  const clean = val.replace(/\D/g, '').slice(0, 11);
  return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

const funcionarioSchema = z.object({
  nome: z.string().min(2, 'Informe o nome completo'),
  cpf: z.string().refine((val) => validarCPF(val), 'CPF inválido'),
  cargo: z.string().min(2, 'Informe o cargo'),
  salarioBase: z.coerce.number().min(0, 'Valor inválido'),
  dataAdmissao: z.string().min(1, 'Informe a data de admissão'),
  dataDemissao: z.string().optional(),
  usuarioId: z.string().optional().nullable(),
});

type FuncionarioForm = z.infer<typeof funcionarioSchema>;

export default function Funcionarios() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FuncionarioForm>({
    resolver: zodResolver(funcionarioSchema)
  });

  const cpfValue = watch('cpf');

  const { data: funcionarios, isLoading } = useQuery<any[]>({
    queryKey: ['funcionarios'],
    queryFn: async () => (await api.get('/Funcionarios')).data,
  });

  const { data: usuarios } = useQuery<any[]>({
    queryKey: ['usuarios'],
    queryFn: async () => (await api.get('/Usuarios')).data,
  });

  const mutation = useMutation({
    mutationFn: (data: FuncionarioForm) => {
      const payload = {
        ...data,
        cpf: data.cpf.replace(/\D/g, ''),
        dataDemissao: data.dataDemissao || null,
        usuarioId: data.usuarioId || null,
      };
      return editId
        ? api.put(`/Funcionarios/${editId}`, { ...payload, id: editId })
        : api.post('/Funcionarios', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      handleCloseModal();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao salvar funcionário')
  });

  const mutationDelete = useMutation({
    mutationFn: (id: string) => api.delete(`/Funcionarios/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['funcionarios'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao excluir funcionário')
  });

  const mutationToggle = useMutation({
    mutationFn: (id: string) => api.patch(`/Funcionarios/${id}/toggle-status`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['funcionarios'] }),
  });

  const handleEdit = (f: any) => {
    setEditId(f.id);
    setValue('nome', f.nome);
    setValue('cpf', formatCPF(f.cpf));
    setValue('cargo', f.cargo);
    setValue('salarioBase', f.salarioBase);
    setValue('dataAdmissao', f.dataAdmissao?.split('T')[0] || '');
    setValue('dataDemissao', f.dataDemissao?.split('T')[0] || '');
    setValue('usuarioId', f.usuarioId || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    reset();
  };

  const termLower = searchTerm.toLowerCase();
  const termDigits = searchTerm.replace(/\D/g, '');
  const filtered = funcionarios?.filter(f => {
    if (!searchTerm.trim()) return true;
    const matchesNome  = (f.nome  ?? '').toLowerCase().includes(termLower);
    const matchesCargo = (f.cargo ?? '').toLowerCase().includes(termLower);
    const matchesCPF   = termDigits.length > 0 && (f.cpf ?? '').includes(termDigits);
    return matchesNome || matchesCargo || matchesCPF;
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-ember" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Recursos Humanos (Funcionários)</h2>
          <p className="text-slate-500">Cadastre colaboradores para controle de ponto e folha de pagamento.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-fire to-ember">
          <Plus size={18} /> Novo Funcionário
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm max-w-md">
        <Search className="text-slate-400 ml-2" size={18} />
        <input
          type="text"
          placeholder="Buscar por nome, CPF ou cargo..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered?.map((f) => (
          <div key={f.id} className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow relative group ${
            f.ativo ? 'border-slate-200' : 'border-slate-300 opacity-60'
          }`}>
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 mb-4 border border-slate-200">
                <User size={24} />
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  f.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {f.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => mutationToggle.mutate(f.id)}
                    className={`p-1.5 rounded-md hover:bg-slate-50 ${f.ativo ? 'text-slate-400 hover:text-amber-600' : 'text-green-600 hover:text-green-700'}`}
                    title={f.ativo ? 'Inativar' : 'Reativar'}
                  >
                    <Save size={16} />
                  </button>
                  <button
                    onClick={() => confirm('Excluir funcionário permanentemente?') && mutationDelete.mutate(f.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-50"
                    title="Excluir (apenas sem histórico)"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => handleEdit(f)} className="p-1.5 text-slate-400 hover:text-ember rounded-md hover:bg-slate-50">
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-800 truncate">{f.nome}</h3>
            <p className="text-xs text-slate-400 font-mono mb-4">
              CPF: {f.cpf ? f.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : '-'}
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Briefcase size={14} className="text-ember" />
                <span className="font-medium">{f.cargo}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <DollarSign size={14} className="text-green-500" />
                <span>{Number(f.salarioBase).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar size={14} />
                <span>Admissão: {new Date(f.dataAdmissao).toLocaleDateString()}</span>
              </div>
              {f.dataDemissao && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <Calendar size={14} />
                  <span>Demissão: {new Date(f.dataDemissao).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editId ? 'Editar Funcionário' : 'Novo Funcionário'}>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <Input label="Nome Completo" required {...register('nome')} error={errors.nome?.message} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">CPF <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="000.000.000-00"
                className={`w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all ${
                  errors.cpf ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-indigo-500'
                }`}
                value={formatCPF(cpfValue || '')}
                onChange={(e) => setValue('cpf', e.target.value.replace(/\D/g, ''))}
              />
              {errors.cpf && <p className="text-xs text-red-500">{errors.cpf.message}</p>}
            </div>
            <Input label="Cargo" required {...register('cargo')} error={errors.cargo?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Salário Base" required type="number" step="0.01" {...register('salarioBase')} error={errors.salarioBase?.message} />
            <Input label="Data de Admissão" required type="date" {...register('dataAdmissao')} error={errors.dataAdmissao?.message} />
          </div>
          <Input label="Data de Demissão (opcional)" type="date" {...register('dataDemissao')} />

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Vínculo com Usuário do Sistema</label>
            <select
              {...register('usuarioId')}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="">Sem vínculo</option>
              {usuarios?.map(u => (
                <option key={u.id} value={u.id}>{u.nome} ({u.role})</option>
              ))}
            </select>
            <p className="text-xs text-slate-400">Necessário para o funcionário registrar ponto.</p>
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-fire to-ember flex justify-center gap-2" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
