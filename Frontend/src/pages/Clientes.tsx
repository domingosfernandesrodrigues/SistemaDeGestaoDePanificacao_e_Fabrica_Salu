import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { UserPlus, Loader2, Save, Users, Edit2, Trash2, Power, PowerOff } from 'lucide-react';
import api from '../services/api';

// Funções de Máscara (Robustas contra valores vazios)
const formatDocument = (value: string = '') => {
  const nums = (value || '').replace(/\D/g, '');
  if (nums.length <= 11) {
    return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, '$1.$2.$3-$4').substring(0, 14);
  }
  return nums.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, '$1.$2.$3/$4-$5').substring(0, 18);
};

const formatPhone = (value: string = '') => {
  const nums = (value || '').replace(/\D/g, '');
  if (nums.length <= 10) {
    return nums.replace(/(\d{2})(\d{4})(\d{4})/g, '($1) $2-$3').substring(0, 14);
  }
  return nums.replace(/(\d{2})(\d{5})(\d{4})/g, '($1) $2-$3').substring(0, 15);
};

// Validações
const validateCPF = (cpf: string) => {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11 || /^(\d)\1+$/.test(nums)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(nums.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(nums.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(nums.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(nums.substring(10, 11))) return false;
  return true;
};

const validateCNPJ = (cnpj: string) => {
  const nums = cnpj.replace(/\D/g, '');
  if (nums.length !== 14 || /^(\d)\1+$/.test(nums)) return false;
  let size = nums.length - 2;
  let numbers = nums.substring(0, size);
  const digits = nums.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  size = size + 1;
  numbers = nums.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  return true;
};

const clienteSchema = z.object({
  nomeFantasia: z.string().min(3, 'Nome muito curto'),
  cnp_j_CPF: z.string().refine(val => {
    const nums = val.replace(/\D/g, '');
    if (nums.length === 11) return validateCPF(nums);
    if (nums.length === 14) return validateCNPJ(nums);
    return false;
  }, 'CPF ou CNPJ inválido (verifique os dígitos)'),
  endereco: z.string().min(5, 'Endereço muito curto'),
  telefone: z.string().min(10, 'Telefone inválido'),
  ativo: z.boolean().optional().default(true),
});

type ClienteForm = z.infer<typeof clienteSchema>;

export function Clientes() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema),
    defaultValues: { nomeFantasia: '', cnp_j_CPF: '', telefone: '', endereco: '', ativo: true }
  });

  const { data: clientes, isLoading, isError, error: queryError } = useQuery<any[]>({
    queryKey: ['clientes'],
    queryFn: async () => (await api.get('/Clientes')).data,
  });

  // Lógica de Filtro
  const filteredClientes = clientes?.filter(c => {
    const term = search.toLowerCase().trim();
    if (!term) return true;

    const doc = (c.cnp_j_CPF || c.cN_J_CPF || c.CNPJ_CPF || '').replace(/\D/g, '');
    const nome = (c.nomeFantasia || '').toLowerCase();
    const cleanTerm = term.replace(/\D/g, '');

    // Se o termo tem números, busca preferencialmente no documento
    if (cleanTerm && doc.includes(cleanTerm)) return true;
    
    // Busca no nome
    return nome.includes(term);
  }) || [];

  // Lógica de Paginação
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const paginatedClientes = filteredClientes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Resetar para página 1 ao pesquisar
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const mutationSave = useMutation({
    mutationFn: (data: ClienteForm) => {
      const cleanData = {
        ...data,
        cnp_j_CPF: data.cnp_j_CPF.replace(/\D/g, ''),
        telefone: data.telefone.replace(/\D/g, ''),
      };
      return editId ? api.put(`/Clientes/${editId}`, cleanData) : api.post('/Clientes', cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      handleCloseModal();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao salvar cliente')
  });

  const mutationDelete = useMutation({
    mutationFn: (id: string) => api.delete(`/Clientes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clientes'] }),
    onError: (err: any) => {
      console.error('Erro ao excluir:', err);
      const msg = err.response?.data?.message || err.response?.data || 'Erro desconhecido ao excluir';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  });

  const mutationToggle = useMutation({
    mutationFn: (id: string) => api.post(`/Clientes/${id}/toggle-status`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clientes'] }),
  });

  const handleEdit = (cliente: any) => {
    setEditId(cliente.id);
    setValue('nomeFantasia', cliente.nomeFantasia);
    setValue('cnp_j_CPF', formatDocument(cliente.cnp_j_CPF || cliente.cN_J_CPF || cliente.CNPJ_CPF));
    setValue('telefone', formatPhone(cliente.telefone));
    setValue('endereco', cliente.endereco);
    setValue('ativo', cliente.ativo ?? cliente.Ativo ?? true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    reset();
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  if (isError) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100 max-w-md mx-auto">
          <p className="font-bold">Erro ao carregar clientes</p>
          <p className="text-sm opacity-80">{(queryError as any)?.response?.data?.message || (queryError as any)?.message || 'Erro desconhecido'}</p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['clientes'] })}>Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Clientes</h2>
          <p className="text-slate-500">Cadastre e gerencie seus clientes B2B.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 w-full sm:w-auto justify-center bg-indigo-600 shadow-sm active:scale-95 transition-transform">
          <UserPlus size={18} /> Novo Cliente
        </Button>
      </div>

      {/* Barra de Busca */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, CPF ou CNPJ..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
          />
        </div>
        <div className="text-sm text-slate-500 font-medium whitespace-nowrap">
          {filteredClientes.length} cliente(s) encontrado(s)
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Nome Fantasia</th>
                <th className="px-6 py-4 font-medium">CNPJ/CPF</th>
                <th className="px-6 py-4 font-medium">Contato</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedClientes.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nenhum cliente encontrado.</td></tr>
              )}
              {paginatedClientes.map((cliente) => {
                const isAtivo = cliente.ativo ?? cliente.Ativo ?? true;
                const doc = cliente.cnp_j_CPF || cliente.cN_J_CPF || cliente.CNPJ_CPF;
                
                return (
                  <tr key={cliente.id} className={`hover:bg-slate-50 transition-colors ${!isAtivo ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isAtivo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {isAtivo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{cliente.nomeFantasia}</td>
                    <td className="px-6 py-4 text-slate-600">{formatDocument(doc)}</td>
                    <td className="px-6 py-4 text-slate-600">{formatPhone(cliente.telefone)}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleEdit(cliente)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><Edit2 size={16} /></button>
                      <button onClick={() => mutationToggle.mutate(cliente.id)} className={`p-2 rounded-lg transition-colors ${isAtivo ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`} title={isAtivo ? 'Desativar' : 'Ativar'}>
                        {isAtivo ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>
                      <button onClick={() => confirm('Deseja excluir permanentemente?') && mutationDelete.mutate(cliente.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginatedClientes.length === 0 && <p className="p-8 text-center text-slate-400">Nenhum cliente encontrado.</p>}
          {paginatedClientes.map((cliente) => {
            const isAtivo = cliente.ativo ?? cliente.Ativo ?? true;
            const doc = cliente.cnp_j_CPF || cliente.cN_J_CPF || cliente.CNPJ_CPF;
            
            return (
              <div key={cliente.id} className={`p-4 space-y-4 ${!isAtivo ? 'bg-slate-50 opacity-60' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800">{cliente.nomeFantasia}</h4>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isAtivo ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                      {isAtivo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(cliente)} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => mutationToggle.mutate(cliente.id)} className={`p-2 rounded-lg ${isAtivo ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50'}`}>
                      {isAtivo ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                    <button onClick={() => confirm('Excluir cliente?') && mutationDelete.mutate(cliente.id)} className="p-2 text-red-600 bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                  <div><p className="font-bold uppercase text-[9px] text-slate-400">Documento</p><p>{formatDocument(doc)}</p></div>
                  <div><p className="font-bold uppercase text-[9px] text-slate-400">Telefone</p><p>{formatPhone(cliente.telefone)}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controles de Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button 
              variant="secondary" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Próxima
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700">
                Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> até <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredClientes.length)}</span> de <span className="font-medium">{filteredClientes.length}</span> resultados
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editId ? 'Editar Cliente' : 'Novo Cliente'}>
        <form onSubmit={handleSubmit((data) => mutationSave.mutate(data))} className="space-y-4">
          <Input label="Nome Fantasia / Razão Social" {...register('nomeFantasia')} error={errors.nomeFantasia?.message} />
          <Controller name="cnp_j_CPF" control={control} render={({ field }) => (
            <Input label="CNPJ ou CPF" placeholder="00.000.000/0000-00" {...field} onChange={(e) => field.onChange(formatDocument(e.target.value))} error={errors.cnp_j_CPF?.message} />
          )} />
          <Controller name="telefone" control={control} render={({ field }) => (
            <Input label="Telefone" placeholder="(00) 00000-0000" {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} error={errors.telefone?.message} />
          )} />
          <Input label="Endereço Completo" {...register('endereco')} error={errors.endereco?.message} />
          
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Button type="button" variant="secondary" className="w-full sm:flex-1 h-11" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit" className="w-full sm:flex-1 h-11 bg-indigo-600" disabled={mutationSave.isPending}>
              {mutationSave.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} className="mr-2" />}
              {editId ? 'Atualizar Dados' : 'Salvar Cliente'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
