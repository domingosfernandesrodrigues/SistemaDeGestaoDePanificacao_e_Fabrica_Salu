import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Truck, Search, Plus, Edit2, Trash2, Loader2, Save, Globe, Phone, FileText } from 'lucide-react';
import api from '../services/api';

const fornecedorSchema = z.object({
  nomeFantasia: z.string().min(2, 'Informe o nome fantasia'),
  razaoSocial: z.string().min(2, 'Informe a razão social'),
  cnpj: z.string().refine((val) => {
    const clean = val.replace(/\D/g, '');
    return clean.length === 14;
  }, 'CNPJ deve ter 14 dígitos'),
  contato: z.string().min(2, 'Informe o nome do contato'),
  telefone: z.string().min(10, 'Informe um telefone válido'),
  email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
  inscricaoEstadual: z.string().optional(),
  endereco: z.string().optional(),
});

type FornecedorForm = z.infer<typeof fornecedorSchema>;

export default function Fornecedores() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FornecedorForm>({
    resolver: zodResolver(fornecedorSchema)
  });

  // Funções de Máscara
  const formatCNPJ = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 14);
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  const formatPhone = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    if (clean.length <= 10) {
      return clean.replace(/^(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return clean.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  const formatIE = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 14);
    if(clean.length > 9) return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,})/, "$1.$2.$3.$4");
    if(clean.length > 6) return clean.replace(/^(\d{3})(\d{3})(\d{1,})/, "$1.$2.$3");
    if(clean.length > 3) return clean.replace(/^(\d{3})(\d{1,})/, "$1.$2");
    return clean;
  };

  const cnpjValue = watch('cnpj');
  const phoneValue = watch('telefone');
  const ieValue = watch('inscricaoEstadual');

  const { data: fornecedores, isLoading } = useQuery<any[]>({
    queryKey: ['fornecedores'],
    queryFn: async () => (await api.get('/Fornecedores')).data,
  });

  const mutation = useMutation({
    mutationFn: (data: FornecedorForm) => {
      return editId ? api.put(`/Fornecedores/${editId}`, { ...data, id: editId }) : api.post('/Fornecedores', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      handleCloseModal();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao salvar fornecedor')
  });

  const mutationDelete = useMutation({
    mutationFn: (id: string) => api.delete(`/Fornecedores/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fornecedores'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao excluir fornecedor')
  });

  const mutationToggle = useMutation({
    mutationFn: (id: string) => api.patch(`/Fornecedores/${id}/toggle-status`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fornecedores'] }),
  });

  const handleEdit = (f: any) => {
    setEditId(f.id);
    setValue('nomeFantasia', f.nomeFantasia);
    setValue('razaoSocial', f.razaoSocial);
    setValue('cnpj', f.cnpj);
    setValue('contato', f.contato || '');
    setValue('telefone', f.telefone || '');
    setValue('email', f.email || '');
    setValue('inscricaoEstadual', f.inscricaoEstadual || '');
    setValue('endereco', f.endereco || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    reset();
  };

  const filteredFornecedores = fornecedores?.filter(f => 
    f.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.cnpj.includes(searchTerm)
  );

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Fornecedores</h2>
          <p className="text-slate-500">Cadastre e gerencie as empresas que fornecem insumos para a fábrica.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600">
          <Plus size={18} /> Novo Fornecedor
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm max-w-md">
        <Search className="text-slate-400 ml-2" size={18} />
        <input 
          type="text" 
          placeholder="Buscar por nome ou CNPJ..." 
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFornecedores?.map((f) => (
            <div key={f.id} className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow relative group ${
              f.ativo ? 'border-slate-200' : 'border-slate-300 opacity-60'
            }`}>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-4">
                  <Truck size={24} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    f.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {f.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => mutationToggle.mutate(f.id)} 
                      className={`p-1.5 rounded-md hover:bg-slate-50 ${ f.ativo ? 'text-slate-400 hover:text-amber-600' : 'text-green-600 hover:text-green-700' }`}
                      title={f.ativo ? 'Inativar Fornecedor' : 'Ativar Fornecedor'}
                    >
                      <Save size={16} />
                    </button>
                    <button 
                      onClick={() => confirm('Excluir fornecedor permanentemente?') && mutationDelete.mutate(f.id)} 
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-50"
                      title="Excluir (apenas sem histórico)"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button onClick={() => handleEdit(f)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-50">
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            
            <h3 className="text-lg font-bold text-slate-800 truncate">{f.nomeFantasia}</h3>
            <p className="text-xs text-slate-400 font-mono mb-4">{f.cnpj}</p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Globe size={14} className="text-slate-400" />
                <span className="truncate">{f.email || 'Sem e-mail'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone size={14} className="text-slate-400" />
                <span>{f.telefone || 'Sem telefone'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileText size={14} className="text-slate-400" />
                <span className="truncate">Contato: {f.contato || 'N/A'}</span>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 text-xs text-slate-500">
                <p className="truncate" title={f.endereco}>{f.endereco || 'Endereço não cadastrado'}</p>
                {f.inscricaoEstadual && <p className="mt-0.5">IE: {f.inscricaoEstadual}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editId ? 'Editar Fornecedor' : 'Novo Fornecedor'}>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <Input label="Nome Fantasia" {...register('nomeFantasia')} error={errors.nomeFantasia?.message} />
          <Input label="Razão Social" {...register('razaoSocial')} error={errors.razaoSocial?.message} />
          <Input 
            label="CNPJ" 
            placeholder="00.000.000/0000-00" 
            {...register('cnpj')} 
            value={formatCNPJ(cnpjValue || '')}
            onChange={(e) => setValue('cnpj', e.target.value.replace(/\D/g, ''))}
            error={errors.cnpj?.message} 
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Telefone" 
              placeholder="(00) 00000-0000"
              {...register('telefone')} 
              value={formatPhone(phoneValue || '')}
              onChange={(e) => setValue('telefone', e.target.value.replace(/\D/g, ''))}
              error={errors.telefone?.message}
            />
            <Input label="Pessoa de Contato" {...register('contato')} error={errors.contato?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="E-mail" {...register('email')} error={errors.email?.message} />
            <Input 
              label="Inscrição Estadual" 
              placeholder="Opcional" 
              {...register('inscricaoEstadual')} 
              value={formatIE(ieValue || '')}
              onChange={(e) => setValue('inscricaoEstadual', e.target.value.replace(/\D/g, ''))}
              error={errors.inscricaoEstadual?.message} 
            />
          </div>
          <Input label="Endereço Completo" placeholder="Rua, Número, Bairro, Cidade - UF" {...register('endereco')} error={errors.endereco?.message} />
          
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-indigo-600 flex justify-center gap-2" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
