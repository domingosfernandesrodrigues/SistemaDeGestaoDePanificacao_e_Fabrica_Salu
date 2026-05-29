import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Play, CheckCircle, Loader2, Factory, Save, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import api from '../services/api';

const opSchema = z.object({
  produtoId: z.string().min(1, 'Selecione o produto'),
  quantidadePlanejada: z.coerce.number().min(1, 'Mínimo 1'),
});

type OpForm = z.infer<typeof opSchema>;

interface OP {
  id: string;
  numeroOP: string;
  produtoId: string;
  produto: { nome: string };
  quantidadePlanejada: number;
  quantidadeRealizada: number;
  status: number; // 0: Planejada, 1: EmAndamento, 2: Finalizada
  dataFinalizacao?: string;
  usuarioPlanejou?: { nome: string };
  usuarioIniciou?: { nome: string };
  usuarioFinalizou?: { nome: string };
}

export function OrdensProducao() {
  const [selectedOP, setSelectedOP] = useState<any>(null);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

  // Filtros de Histórico
  const [filterDate, setFilterDate] = useState('');
  const [filterProdutoId, setFilterProdutoId] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, control, watch, formState: { errors } } = useForm<OpForm>({
    resolver: zodResolver(opSchema)
  });

  const { data: ops, isLoading: loadingOps } = useQuery<OP[]>({
    queryKey: ['ordens-producao'],
    queryFn: async () => {
      const response = await api.get('/ordens-producao');
      return response.data;
    },
  });

  const { data: produtos } = useQuery<any[]>({
    queryKey: ['produtos'],
    queryFn: async () => {
      const response = await api.get('/Produtos');
      return response.data;
    },
  });

  const watchProdutoId = watch('produtoId');
  const selectedProdutoInfo = produtos?.find(p => p.id === watchProdutoId);

  const mutationSave = useMutation({
    mutationFn: (data: OpForm) => {
      return editId 
        ? api.put(`/ordens-producao/${editId}`, data) 
        : api.post('/ordens-producao', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-producao'] });
      handleCloseModal();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao salvar OP')
  });

  const mutationStatus = useMutation({
    mutationFn: async ({ id, action }: { id: string, action: 'start' | 'finish' }) => {
      if (action === 'start') return api.post(`/ordens-producao/${id}/start`);
      if (action === 'finish') return api.post(`/ordens-producao/${id}/finish`, []); 
      return Promise.reject('Ação inválida');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ordens-producao'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao atualizar OP')
  });
  
  const mutationDelete = useMutation({
    mutationFn: (id: string) => api.delete(`/ordens-producao/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ordens-producao'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao excluir OP')
  });

  const handleEdit = (op: OP) => {
    setEditId(op.id);
    setValue('produtoId', op.produtoId);
    setValue('quantidadePlanejada', op.quantidadePlanejada);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    reset();
  };

  const onSubmit = (data: OpForm) => {
    mutationSave.mutate(data);
  };

  if (loadingOps) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-ember" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Ordens de Produção (OP)</h2>
          <p className="text-slate-500 text-sm">Controle a abertura, reserva de insumos e finalização da linha de produção.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-gradient-to-r from-fire to-ember w-full sm:w-auto">
          <Factory size={18} />
          <span>Nova Ordem</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ops?.filter(op => op.status !== 2).map((op) => (
          <div key={op.id} className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col relative overflow-hidden ${
            op.status === 1 ? 'border-blue-200' : 'border-slate-200'
          }`}>
            {op.status === 1 && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>}
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${op.status === 1 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {op.numeroOP}
                </span>
                {op.status === 0 && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEdit(op)}
                      className="p-1 text-slate-400 hover:text-ember transition-colors"
                      title="Editar Planejamento"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => confirm('Deseja excluir esta ordem de produção?') && mutationDelete.mutate(op.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Excluir Ordem"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                op.status === 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
              }`}>
                {op.status === 0 ? 'Planejada' : 'Em Execução'}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-1">{op.produto?.nome}</h3>
            <div className="flex flex-col gap-1 mb-6">
              <p className="text-sm text-slate-500">
                Meta: <span className="font-bold text-slate-700">{op.quantidadePlanejada} Und</span>
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200" title="Quem planejou">
                  📝 {op.usuarioPlanejou?.nome || 'Sistema'}
                </span>
                {op.usuarioIniciou && (
                  <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-100" title="Quem iniciou">
                    🚀 {op.usuarioIniciou.nome}
                  </span>
                )}
              </div>
            </div>
            
            <div className="mt-auto">
              {op.status === 0 ? (
                <Button 
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => mutationStatus.mutate({ id: op.id, action: 'start' })}
                  disabled={mutationStatus.isPending}
                >
                  <Play size={16} />
                  Iniciar Produção
                </Button>
              ) : (
                <Button 
                  variant="secondary" 
                  className="w-full flex items-center justify-center gap-2 !bg-amber-50 !text-amber-700 hover:!bg-amber-100 border border-amber-200"
                  onClick={() => mutationStatus.mutate({ id: op.id, action: 'finish' })}
                  disabled={mutationStatus.isPending}
                >
                  <CheckCircle size={16} />
                  Apontar Finalização
                </Button>
              )}
              {op.status === 0 && <p className="text-[10px] text-center text-slate-400 mt-2 italic">Irá reservar os insumos no estoque.</p>}
            </div>
          </div>
        ))}

      </div>

      {/* Histórico de Produção Finalizada */}
      <div className="mt-12 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-600" /> Histórico de Produção
          </h3>

          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-10 px-3 w-full sm:w-40 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
            <select 
              value={filterProdutoId}
              onChange={(e) => setFilterProdutoId(e.target.value)}
              className="h-10 px-3 w-full sm:w-56 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">Todos os Produtos</option>
              {produtos?.filter(p => p.tipo === 1).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            {(filterDate || filterProdutoId) && (
              <button 
                onClick={() => { setFilterDate(''); setFilterProdutoId(''); }}
                className="text-sm font-bold text-red-500 hover:text-red-600 px-4 py-2 w-full sm:w-auto text-center"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">OP / Responsáveis</th>
                <th className="px-6 py-4 font-medium">Produto</th>
                <th className="px-6 py-4 font-medium text-center">Quantidade</th>
                <th className="px-6 py-4 font-medium">Finalizado em</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ops?.filter(op => {
                if (op.status !== 2) return false;
                const matchesDate = !filterDate || new Date(op.dataFinalizacao!).toISOString().split('T')[0] === filterDate;
                const matchesProduto = !filterProdutoId || op.produtoId === filterProdutoId;
                return matchesDate && matchesProduto;
              }).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">
                    Nenhuma ordem encontrada com estes filtros.
                  </td>
                </tr>
              )}
              {ops?.filter(op => {
                if (op.status !== 2) return false;
                const matchesDate = !filterDate || new Date(op.dataFinalizacao!).toISOString().split('T')[0] === filterDate;
                const matchesProduto = !filterProdutoId || op.produtoId === filterProdutoId;
                return matchesDate && matchesProduto;
              })
                .sort((a, b) => new Date(b.dataFinalizacao || 0).getTime() - new Date(a.dataFinalizacao || 0).getTime())
                .map((op) => (
                <tr key={op.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs font-bold text-slate-500 mb-1">{op.numeroOP}</div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[9px] text-slate-400 bg-slate-50 border border-slate-100 px-1 rounded" title="Planejado por">P: {op.usuarioPlanejou?.nome || '...'}</span>
                      <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-100 px-1 rounded" title="Iniciado por">I: {op.usuarioIniciou?.nome || '...'}</span>
                      <span className="text-[9px] text-emerald-400 bg-emerald-50 border border-emerald-100 px-1 rounded" title="Finalizado por">F: {op.usuarioFinalizou?.nome || '...'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{op.produto?.nome}</td>
                  <td className="px-6 py-4 text-center font-bold text-slate-700">{op.quantidadeRealizada} Und</td>
                  <td className="px-6 py-4 text-slate-500">
                    {op.dataFinalizacao ? new Date(op.dataFinalizacao).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-bold uppercase">
                      Finalizada
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editId ? "Editar Planejamento da OP" : "Abrir Ordem de Produção"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={control}
            name="produtoId"
            render={({ field }) => (
              <SearchableSelect
                label="Produto a Fabricar"
                placeholder="Pesquise o produto..."
                options={produtos?.filter(p => p.tipo === 1).map(p => ({ 
                  value: p.id, 
                  label: `${p.nome} (Saldo: ${p.quantidadeEstoque} ${p.unidadeMedida || 'Un'})` 
                })) || []}
                value={field.value}
                onChange={field.onChange}
                error={errors.produtoId?.message}
              />
            )}
          />

          {selectedProdutoInfo && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between transition-all duration-300 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${
                  selectedProdutoInfo.quantidadeEstoque <= 0 
                    ? 'bg-red-50 text-red-500'
                    : selectedProdutoInfo.quantidadeEstoque <= 10
                    ? 'bg-amber-50 text-amber-500'
                    : 'bg-emerald-50 text-emerald-500'
                }`}>
                  <Factory size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Saldo Atual em Estoque</p>
                  <h4 className="text-lg font-black text-slate-800 mt-0.5">
                    {selectedProdutoInfo.quantidadeEstoque} <span className="text-xs font-semibold text-slate-500">{selectedProdutoInfo.unidadeMedida || 'Un'}</span>
                  </h4>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  selectedProdutoInfo.quantidadeEstoque <= 0 
                    ? 'bg-red-100/80 text-red-700'
                    : selectedProdutoInfo.quantidadeEstoque <= 10
                    ? 'bg-amber-100/80 text-amber-700'
                    : 'bg-emerald-100/80 text-emerald-700'
                }`}>
                  {selectedProdutoInfo.quantidadeEstoque <= 0 
                    ? 'Esgotado'
                    : selectedProdutoInfo.quantidadeEstoque <= 10
                    ? 'Estoque Baixo'
                    : 'Disponível'}
                </span>
              </div>
            </div>
          )}

          <Input 
            label="Quantidade Planejada (Un)" 
            type="number"
            {...register('quantidadePlanejada')}
            error={errors.quantidadePlanejada?.message}
          />

          <div className="pt-4 flex gap-3">
            <Button 
              type="button" 
              variant="secondary" 
              className="flex-1" 
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-fire to-ember"
              disabled={mutationSave.isPending}
            >
              {mutationSave.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {editId ? 'Salvar Alterações' : 'Abrir OP'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
