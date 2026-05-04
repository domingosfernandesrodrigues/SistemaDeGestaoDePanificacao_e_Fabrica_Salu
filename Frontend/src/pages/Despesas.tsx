import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { FileText, Plus, Edit2, Trash2, Loader2, Save, DollarSign, Calendar, Tag, AlertCircle, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import api from '../services/api';

const despesaSchema = z.object({
  descricao: z.string().min(2, 'Informe a descrição'),
  valor: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  dataVencimento: z.string().optional().or(z.literal('')),
  mesReferencia: z.string().optional().or(z.literal('')),
  categoria: z.string().min(1, 'Selecione a categoria'),
});

type DespesaForm = z.infer<typeof despesaSchema>;

export default function Despesas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroVencimentoInicio, setFiltroVencimentoInicio] = useState('');
  const [filtroVencimentoFim, setFiltroVencimentoFim] = useState('');
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<DespesaForm>({
    resolver: zodResolver(despesaSchema)
  });

  const { data: despesas, isLoading } = useQuery<any[]>({
    queryKey: ['despesas'],
    queryFn: async () => (await api.get('/Despesas')).data,
  });

  const mutation = useMutation({
    mutationFn: (data: DespesaForm) => {
      return editId ? api.put(`/Despesas/${editId}`, { ...data, id: editId }) : api.post('/Despesas', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
      handleCloseModal();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao salvar despesa')
  });

  const mutationDelete = useMutation({
    mutationFn: (id: string) => api.delete(`/Despesas/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['despesas'] }),
  });

  const handleEdit = (d: any) => {
    setEditId(d.id);
    setValue('descricao', d.descricao);
    setValue('valor', d.valor);
    setValue('dataVencimento', d.dataVencimento?.split('T')[0] || '');
    setValue('mesReferencia', d.mesReferencia || '');
    setValue('categoria', d.categoria || 'Geral');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    reset();
  };

  // Reset da página ao alterar os filtros
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroCategoria, filtroVencimentoInicio, filtroVencimentoFim]);

  // Aplicação dos filtros
  const despesasFiltradas = despesas?.filter(d => {
    const dataVenc = d.dataVencimento?.split('T')[0] || '';
    if (filtroCategoria && d.categoria !== filtroCategoria) return false;
    if (filtroVencimentoInicio && dataVenc < filtroVencimentoInicio) return false;
    if (filtroVencimentoFim && dataVenc > filtroVencimentoFim) return false;
    return true;
  }) || [];

  // Lógica de Paginação
  const totalPaginas = Math.ceil(despesasFiltradas.length / itensPorPagina) || 1;
  const despesasPaginadas = despesasFiltradas.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Controle de Despesas</h2>
          <p className="text-slate-500">Registre gastos com energia, água, aluguel e outras despesas operacionais.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus size={18} /> Nova Despesa
        </Button>
      </div>

      {/* Painel de Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600 flex items-center gap-1"><Filter size={14} /> Categoria</label>
          <select 
            value={filtroCategoria} 
            onChange={e => setFiltroCategoria(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as categorias</option>
            <option value="Operacional">Operacional</option>
            <option value="Administrativa">Administrativa</option>
            <option value="Utilidades">Utilidades (Energia/Água)</option>
            <option value="Manutenção">Manutenção</option>
            <option value="Folha de Pagamento">Folha de Pagamento</option>
            <option value="Outros">Outros</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600 flex items-center gap-1"><Calendar size={14} /> Venc. Início</label>
          <input 
            type="date" 
            value={filtroVencimentoInicio} 
            onChange={e => setFiltroVencimentoInicio(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600 flex items-center gap-1"><Calendar size={14} /> Venc. Fim</label>
          <input 
            type="date" 
            value={filtroVencimentoFim} 
            onChange={e => setFiltroVencimentoFim(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2 h-10">
          <Button variant="secondary" className="w-full" onClick={() => { setFiltroCategoria(''); setFiltroVencimentoInicio(''); setFiltroVencimentoFim(''); }}>
            Limpar Filtros
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium">Descrição</th>
              <th className="px-6 py-4 font-medium">Referência</th>
              <th className="px-6 py-4 font-medium">Categoria</th>
              <th className="px-6 py-4 font-medium">Vencimento</th>
              <th className="px-6 py-4 font-medium text-right">Valor</th>
              <th className="px-6 py-4 font-medium text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {despesasPaginadas.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{d.descricao}</td>
                <td className="px-6 py-4">
                   <span className="text-xs font-bold text-slate-500 uppercase">{d.mesReferencia || '-'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                    {d.categoria || 'Geral'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {d.dataVencimento ? new Date(d.dataVencimento).toLocaleDateString() : 'Não inf.'}
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-900">
                  {Number(d.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => handleEdit(d)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => confirm('Excluir despesa?') && mutationDelete.mutate(d.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {despesasPaginadas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">Nenhuma despesa encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Controles de Paginação */}
        {totalPaginas > 1 && (
          <div className="bg-slate-100 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-slate-600 font-medium">
              Mostrando {Math.min(despesasFiltradas.length, (paginaAtual - 1) * itensPorPagina + 1)} a {Math.min(paginaAtual * itensPorPagina, despesasFiltradas.length)} de {despesasFiltradas.length} despesas
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                className="h-10 px-4 flex items-center gap-2 !bg-white !text-slate-700 border border-slate-300 shadow-sm hover:!bg-slate-50 disabled:opacity-50" 
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
              >
                <ChevronLeft size={16} /> Anterior
              </Button>
              <div className="h-10 px-4 flex items-center bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 shadow-sm">
                Página {paginaAtual} de {totalPaginas}
              </div>
              <Button 
                variant="secondary" 
                className="h-10 px-4 flex items-center gap-2 !bg-white !text-slate-700 border border-slate-300 shadow-sm hover:!bg-slate-50 disabled:opacity-50" 
                onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas}
              >
                Próximo <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editId ? 'Editar Despesa' : 'Nova Despesa'}>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <Input label="Descrição da Despesa" placeholder="Ex: Conta de Energia" {...register('descricao')} error={errors.descricao?.message} />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Categoria</label>
              <select 
                {...register('categoria')}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="Operacional">Operacional</option>
                <option value="Administrativa">Administrativa</option>
                <option value="Utilidades">Utilidades (Energia/Água)</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <Input label="Mês Referência" placeholder="Ex: Março/2026" {...register('mesReferencia')} error={errors.mesReferencia?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <Input label="Valor (R$)" type="number" step="0.01" placeholder="0,00" {...register('valor')} error={errors.valor?.message} />
             <Input label="Data de Vencimento" type="date" {...register('dataVencimento')} error={errors.dataVencimento?.message} />
          </div>
          
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white flex justify-center gap-2" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
