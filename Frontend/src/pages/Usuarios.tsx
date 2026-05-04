import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { UserCog, Plus, Edit2, Trash2, Loader2, Save, Shield, Mail, User, Eye, EyeOff, Search, Filter, ChevronLeft, ChevronRight, CheckCircle2, XCircle, KeyRound, Power } from 'lucide-react';
import api from '../services/api';

const usuarioSchema = z.object({
  nome: z.string().min(2, 'Informe o nome'),
  email: z.string().email('E-mail inválido'),
  senhaHash: z.string().optional().default('12345678'),
  role: z.string().min(1, 'Selecione o perfil'),
  clienteId: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
});

type UsuarioForm = z.infer<typeof usuarioSchema>;

export default function Usuarios() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Pegar o papel do usuário atual
  const currentUserRole = localStorage.getItem('sgpf_role') || 'Operador';
  
  // Filtros e Paginação
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 8;

  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<UsuarioForm>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: { ativo: true }
  });

  const selectedRole = watch('role');
  const watchAtivo = watch('ativo');

  const { data: usuarios, isLoading } = useQuery<any[]>({
    queryKey: ['usuarios'],
    queryFn: async () => (await api.get('/Usuarios')).data,
  });

  const { data: clientes } = useQuery<any[]>({
    queryKey: ['clientes'],
    queryFn: async () => (await api.get('/Clientes')).data,
  });

  const mutation = useMutation({
    mutationFn: (data: UsuarioForm) => {
      return editId ? api.put(`/Usuarios/${editId}`, { ...data, id: editId }) : api.post('/Usuarios', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      handleCloseModal();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao salvar usuário')
  });

  const mutationDelete = useMutation({
    mutationFn: (id: string) => api.delete(`/Usuarios/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao excluir usuário')
  });

  const mutationToggle = useMutation({
    mutationFn: (id: string) => api.post(`/Usuarios/${id}/toggle-status`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao tentar alterar o status do usuário. Verifique sua permissão.')
  });

  const mutationReset = useMutation({
    mutationFn: (id: string) => api.post(`/Usuarios/${id}/reset-password`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      alert('Senha resetada para a padrão (12345678) com sucesso!');
    },
    onError: () => alert('Erro ao resetar a senha.')
  });

  const handleEdit = (u: any) => {
    setEditId(u.id);
    setValue('nome', u.nome);
    setValue('email', u.email);
    setValue('senhaHash', u.senhaHash);
    setValue('role', u.role);
    setValue('clienteId', u.clienteId);
    setValue('ativo', u.ativo !== undefined ? u.ativo : true);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setShowPassword(false);
    reset({ ativo: true });
  };

  // Reset página ao mudar filtros
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroNome, filtroPerfil]);

  // Aplicação dos filtros
  const usuariosFiltrados = usuarios?.filter(u => {
    if (filtroNome && !u.nome.toLowerCase().includes(filtroNome.toLowerCase())) return false;
    if (filtroPerfil && u.role !== filtroPerfil) return false;
    return true;
  }) || [];

  // Paginação
  const totalPaginas = Math.ceil(usuariosFiltrados.length / itensPorPagina) || 1;
  const usuariosPaginados = usuariosFiltrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-600" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Controle de Usuários</h2>
          <p className="text-slate-500">Gerencie quem tem acesso ao sistema e defina níveis de permissão.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900">
          <Plus size={18} /> Novo Usuário
        </Button>
      </div>

      {/* Painel de Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600 flex items-center gap-1"><Search size={14} /> Nome do Usuário</label>
          <input 
            type="text"
            placeholder="Buscar por nome..."
            value={filtroNome} 
            onChange={e => setFiltroNome(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-800"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600 flex items-center gap-1"><Filter size={14} /> Perfil</label>
          <select 
            value={filtroPerfil} 
            onChange={e => setFiltroPerfil(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-800"
          >
            <option value="">Todos os perfis</option>
            <option value="Admin">Administrador</option>
            <option value="Gestor">Gestor</option>
            <option value="Operador">Operador</option>
            <option value="Cliente">Cliente</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button variant="secondary" className="w-full h-10" onClick={() => { setFiltroNome(''); setFiltroPerfil(''); }}>
            Limpar Filtros
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium">Nome</th>
              <th className="px-6 py-4 font-medium">E-mail</th>
              <th className="px-6 py-4 font-medium">Perfil</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuariosPaginados.map((u) => {
              const ativo = u.ativo !== undefined ? u.ativo : true;
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                      {u.nome.charAt(0)}
                    </div>
                    <span className={ativo ? '' : 'text-slate-400 line-through'}>{u.nome}</span>
                  </td>
                  <td className={`px-6 py-4 ${ativo ? 'text-slate-500' : 'text-slate-400'}`}>{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      !ativo ? 'bg-slate-100 text-slate-400' :
                      u.role === 'Admin' ? 'bg-red-50 text-red-600' : 
                      u.role === 'Gestor' ? 'bg-indigo-50 text-indigo-600' : 
                      u.role === 'Operador' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {ativo ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold"><CheckCircle2 size={14} /> Ativo</span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400 text-xs font-semibold"><XCircle size={14} /> Inativo</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => confirm(`Deseja ${ativo ? 'inativar' : 'ativar'} este usuário?`) && mutationToggle.mutate(u.id)} 
                        className={`p-1.5 rounded-md ${ativo ? 'text-slate-400 hover:text-orange-500' : 'text-emerald-500 hover:text-emerald-600'}`} 
                        title={ativo ? 'Inativar Usuário' : 'Ativar Usuário'}
                      >
                        <Power size={16} />
                      </button>
                      {(currentUserRole === 'Admin' || currentUserRole === 'Gestor') && (
                        <button 
                          onClick={() => confirm(`Deseja resetar a senha de ${u.nome} para a senha padrão? O usuário terá que alterar a senha no próximo acesso.`) && mutationReset.mutate(u.id)} 
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-md" 
                          title="Resetar Senha"
                        >
                          <KeyRound size={16} />
                        </button>
                      )}
                      <button onClick={() => handleEdit(u)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => confirm('Excluir usuário permanentemente?') && mutationDelete.mutate(u.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {usuariosPaginados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">Nenhum usuário encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="bg-slate-100 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-slate-600 order-2 sm:order-1 font-medium">
              Exibindo {usuariosPaginados.length} de {usuariosFiltrados.length} usuários
            </span>
            <div className="flex items-center gap-3 order-1 sm:order-2">
              <button 
                className={`flex items-center gap-1 px-3 h-9 rounded-lg text-sm font-bold transition-all ${paginaAtual === 1 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm'}`}
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))} 
                disabled={paginaAtual === 1}
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              
              <div className="flex items-center justify-center min-w-[80px] h-9 bg-slate-800 text-white rounded-lg text-xs font-bold shadow-inner">
                {paginaAtual} / {totalPaginas}
              </div>

              <button 
                className={`flex items-center gap-1 px-3 h-9 rounded-lg text-sm font-bold transition-all ${paginaAtual === totalPaginas ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'}`}
                onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))} 
                disabled={paginaAtual === totalPaginas}
              >
                Próximo <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editId ? 'Editar Usuário' : 'Novo Usuário'}>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
            <div>
              <span className="block text-sm font-bold text-slate-800">Status do Acesso</span>
              <span className="block text-xs text-slate-500">Usuários inativos não conseguem fazer login.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" {...register('ativo')} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-3 text-sm font-medium text-slate-700">
                {watchAtivo ? 'Ativo' : 'Inativo'}
              </span>
            </label>
          </div>

          <Input label="Nome Completo" {...register('nome')} error={errors.nome?.message} />
          
          <Input label="E-mail de Acesso" type="email" placeholder="exemplo@empresa.com" {...register('email')} error={errors.email?.message} />
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Perfil de Acesso</label>
            <select 
              {...register('role')}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all"
            >
              <option value="Operador">Operador (Funcionário)</option>
              <option value="Gestor">Gestor</option>
              <option value="Admin">Administrador</option>
              <option value="Cliente">Cliente</option>
            </select>
          </div>

          {selectedRole === 'Cliente' && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Vincular a qual Cliente?</label>
              <select 
                {...register('clienteId')}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all"
              >
                <option value="">Selecione o cliente...</option>
                {clientes?.map(c => (
                  <option key={c.id} value={c.id}>{c.nomeFantasia}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-900 text-white flex justify-center gap-2" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
