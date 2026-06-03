import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { 
  ChefHat, 
  Plus, 
  Trash2, 
  Loader2, 
  Save, 
  Check, 
  Calendar, 
  Tag, 
  Filter, 
  Users, 
  DollarSign, 
  Clock, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import api from '../services/api';

const alimentacaoSchema = z.object({
  funcionarioId: z.string().min(1, 'Selecione o funcionário'),
  tipoRefeicao: z.string().min(1, 'Selecione o tipo de refeição'),
  valor: z.coerce.number().min(0.01, 'O valor deve ser maior que zero'),
  data: z.string().min(1, 'Informe a data de consumo'),
  observacao: z.string().optional().or(z.literal('')),
});

type AlimentacaoForm = z.infer<typeof alimentacaoSchema>;

export default function Alimentacao() {
  const queryClient = useQueryClient();
  const userRole = localStorage.getItem('sgpf_role') || '';
  const isGestorOrAdmin = userRole === 'Admin' || userRole === 'Gestor';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  // Filtros
  const [filtroFuncionario, setFiltroFuncionario] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  // 1. Query de Funcionários (Apenas para Gestor/Admin)
  const { data: funcionarios } = useQuery<any[]>({
    queryKey: ['funcionarios'],
    queryFn: async () => (await api.get('/Funcionarios')).data,
    enabled: isGestorOrAdmin,
  });

  // 2. Query de Lançamentos de Alimentação
  const { data: lancamentos, isLoading } = useQuery<any[]>({
    queryKey: [isGestorOrAdmin ? 'lancamentos-alimentacao-todos' : 'lancamentos-alimentacao-meus'],
    queryFn: async () => {
      const url = isGestorOrAdmin ? '/LancamentosAlimentacao' : '/LancamentosAlimentacao/meus';
      return (await api.get(url)).data;
    },
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<AlimentacaoForm>({
    resolver: zodResolver(alimentacaoSchema),
    defaultValues: {
      data: new Date().toISOString().split('T')[0],
      tipoRefeicao: 'Almoço',
      observacao: ''
    }
  });

  const mutationCreate = useMutation({
    mutationFn: (data: AlimentacaoForm) => api.post('/LancamentosAlimentacao', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos-alimentacao-todos'] });
      queryClient.invalidateQueries({ queryKey: ['lancamentos-alimentacao-meus'] });
      queryClient.invalidateQueries({ queryKey: ['despesas'] }); // Invalida despesas para refletir a nova conta a pagar
      setIsModalOpen(false);
      reset({
        funcionarioId: isGestorOrAdmin ? '' : '00000000-0000-0000-0000-000000000000',
        data: new Date().toISOString().split('T')[0],
        tipoRefeicao: 'Almoço',
        observacao: ''
      });
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao registrar lançamento de refeição')
  });

  const mutationDelete = useMutation({
    mutationFn: (id: string) => api.delete(`/LancamentosAlimentacao/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos-alimentacao-todos'] });
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao excluir lançamento')
  });

  const mutationPagar = useMutation({
    mutationFn: (id: string) => api.post(`/LancamentosAlimentacao/${id}/pagar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos-alimentacao-todos'] });
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
      queryClient.invalidateQueries({ queryKey: ['resumo-financeiro'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-dre'] });
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      alert('Pagamento registrado e integrado ao caixa bancário com sucesso!');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao registrar pagamento')
  });

  // Reset de página nos filtros
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroFuncionario, filtroTipo, filtroDataInicio, filtroDataFim]);

  // Filtros Locais
  const lancamentosFiltrados = lancamentos?.filter(l => {
    if (filtroFuncionario && l.funcionarioId !== filtroFuncionario) return false;
    if (filtroTipo && l.tipoRefeicao !== filtroTipo) return false;
    
    const dataRefStr = l.data?.split('T')[0] || '';
    if (filtroDataInicio && dataRefStr < filtroDataInicio) return false;
    if (filtroDataFim && dataRefStr > filtroDataFim) return false;
    
    return true;
  }) || [];

  // Paginação
  const totalPaginas = Math.ceil(lancamentosFiltrados.length / itensPorPagina) || 1;
  const lancamentosPaginados = lancamentosFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  const getMealIcon = (tipo: string) => {
    switch (tipo) {
      case 'Café':
        return <Clock className="text-amber-500 w-4 h-4" />;
      case 'Almoço':
        return <ChefHat className="text-ember w-4 h-4" />;
      case 'Jantar':
        return <ChefHat className="text-dark w-4 h-4" />;
      default:
        return <ChefHat className="text-slate-400 w-4 h-4" />;
    }
  };

  const getMealBadgeStyle = (tipo: string) => {
    switch (tipo) {
      case 'Café':
        return 'bg-amber-50 text-amber-800 border-amber-200/50';
      case 'Almoço':
        return 'bg-orange-50 text-ember border-orange-200/50';
      case 'Jantar':
        return 'bg-stone-100 text-stone-800 border-stone-300/50';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Lançamentos de Alimentação</h2>
          <p className="text-slate-500">
            {isGestorOrAdmin 
              ? 'Gerencie o fornecimento de refeições aos colaboradores com integração financeira.' 
              : 'Visualize seu histórico de consumo de refeições na empresa.'
            }
          </p>
        </div>
        <Button 
          onClick={() => {
            if (!isGestorOrAdmin) {
              setValue('funcionarioId', '00000000-0000-0000-0000-000000000000');
            }
            setIsModalOpen(true);
          }} 
          className="flex items-center gap-2 bg-gradient-to-r from-fire to-ember h-11 px-6 shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-200"
        >
          <Plus size={18} /> Lançar Alimentação
        </Button>
      </div>

      {/* Painel de Filtros Otimizado */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4 items-end">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1 w-full">
          
          {isGestorOrAdmin && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                <Users size={12} /> Colaborador
              </label>
              <select 
                value={filtroFuncionario} 
                onChange={e => setFiltroFuncionario(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                <option value="">Todos os colaboradores</option>
                {funcionarios?.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
              <Tag size={12} /> Refeição
            </label>
            <select 
              value={filtroTipo} 
              onChange={e => setFiltroTipo(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              <option value="">Todas as refeições</option>
              <option value="Café">Café da Manhã</option>
              <option value="Almoço">Almoço</option>
              <option value="Jantar">Jantar</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
              <Calendar size={12} /> De
            </label>
            <input 
              type="date" 
              value={filtroDataInicio} 
              onChange={e => setFiltroDataInicio(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
              <Calendar size={12} /> Até
            </label>
            <input 
              type="date" 
              value={filtroDataFim} 
              onChange={e => setFiltroDataFim(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <Button 
          variant="secondary" 
          className="h-10 px-4 w-full xl:w-auto hover:bg-slate-100" 
          onClick={() => { setFiltroFuncionario(''); setFiltroTipo(''); setFiltroDataInicio(''); setFiltroDataFim(''); }}
        >
          Limpar Filtros
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-ember" size={32} /></div>
        ) : (
          <>
            {/* View Desktop (Tabela) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    {isGestorOrAdmin && <th className="px-6 py-4 font-medium">Colaborador</th>}
                    <th className="px-6 py-4 font-medium">Refeição</th>
                    <th className="px-6 py-4 font-medium">Data de Consumo</th>
                    <th className="px-6 py-4 font-medium">Observações</th>
                    <th className="px-6 py-4 font-medium">Status Financeiro</th>
                    <th className="px-6 py-4 font-medium text-right">Valor</th>
                    {isGestorOrAdmin && <th className="px-6 py-4 font-medium text-center">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lancamentosPaginados.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                      {isGestorOrAdmin && (
                        <td className="px-6 py-4 font-semibold text-slate-800">{l.nomeFuncionario}</td>
                      )}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold flex items-center gap-1.5 w-fit ${getMealBadgeStyle(l.tipoRefeicao)}`}>
                          {getMealIcon(l.tipoRefeicao)}
                          {l.tipoRefeicao}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {l.data ? new Date(l.data).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={l.observacao}>
                        {l.observacao || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          l.statusFinanceiro === 'Paga' ? 'bg-green-100 text-green-800' :
                          l.statusFinanceiro === 'Cancelada' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {l.statusFinanceiro === 'Paga' ? 'Pago' :
                           l.statusFinanceiro === 'Cancelada' ? 'Cancelado' :
                           'Pendente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {Number(l.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      {isGestorOrAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            {l.statusFinanceiro === 'Pendente' && (
                              <button 
                                onClick={() => confirm('Deseja realmente confirmar o pagamento desta refeição e deduzir o valor no caixa bancário?') && mutationPagar.mutate(l.id)} 
                                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-all duration-150"
                                title="Confirmar pagamento (Baixar)"
                              >
                                <Check size={16} />
                              </button>
                            )}
                            <button 
                              onClick={() => confirm('Deseja realmente estornar este lançamento de alimentação? Isso removerá a conta a pagar associada no financeiro.') && mutationDelete.mutate(l.id)} 
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-150"
                              title="Estornar lançamento"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {lancamentosPaginados.length === 0 && (
                    <tr>
                      <td colSpan={isGestorOrAdmin ? 6 : 4} className="px-6 py-12 text-center text-slate-400 italic">
                        Nenhum lançamento de alimentação encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* View Mobile (Cards) */}
            <div className="md:hidden divide-y divide-slate-100">
              {lancamentosPaginados.length === 0 && (
                <p className="p-8 text-center text-slate-400 italic">Nenhum lançamento encontrado.</p>
              )}
              {lancamentosPaginados.map((l) => (
                <div key={l.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      {isGestorOrAdmin && <h4 className="font-bold text-slate-800 text-sm leading-snug">{l.nomeFuncionario}</h4>}
                      <div className="flex gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase flex items-center gap-1 ${getMealBadgeStyle(l.tipoRefeicao)}`}>
                          {getMealIcon(l.tipoRefeicao)}
                          {l.tipoRefeicao}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Calendar size={10} />
                          {l.data ? new Date(l.data).toLocaleDateString('pt-BR') : '-'}
                        </span>
                      </div>
                    </div>
                    {isGestorOrAdmin && (
                      <button 
                        onClick={() => confirm('Estornar lançamento de refeição?') && mutationDelete.mutate(l.id)} 
                        className="p-2 text-red-600 bg-red-50 active:bg-red-100 hover:bg-red-100/50 rounded-lg transition-colors"
                        title="Estornar"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Observação</p>
                      <p className="text-xs text-slate-600 truncate">{l.observacao || '-'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Custo</p>
                      <p className="text-base font-bold text-slate-900">
                        {Number(l.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Controles de Paginação */}
            {totalPaginas > 1 && (
              <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-sm text-slate-600 font-medium">
                  Mostrando {Math.min(lancamentosFiltrados.length, (paginaAtual - 1) * itensPorPagina + 1)} a {Math.min(paginaAtual * itensPorPagina, lancamentosFiltrados.length)} de {lancamentosFiltrados.length} lançamentos
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
          </>
        )}
      </div>

      {/* Modal de Lançamento */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Lançamento de Alimentação">
          <form onSubmit={handleSubmit((data) => mutationCreate.mutate(data))} className="space-y-4">
            
            {isGestorOrAdmin ? (
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Users size={16} className="text-muted" /> Colaborador <span className="text-red-500">*</span>
                </label>
                <select 
                  {...register('funcionarioId')}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="">Selecione o colaborador...</option>
                  {funcionarios?.filter(f => f.ativo).map(f => (
                    <option key={f.id} value={f.id}>{f.nome} ({f.cargo})</option>
                  ))}
                </select>
                {errors.funcionarioId && <p className="text-xs text-red-500 font-bold mt-0.5">{errors.funcionarioId.message}</p>}
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Users size={16} className="text-muted" /> Colaborador
                </label>
                <input 
                  type="text"
                  disabled
                  value={localStorage.getItem('sgpf_user_name') || ''}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500 outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Tag size={16} className="text-muted" /> Refeição <span className="text-red-500">*</span>
                </label>
                <select 
                  {...register('tipoRefeicao')}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="Café">Café da Manhã</option>
                  <option value="Almoço">Almoço</option>
                  <option value="Jantar">Jantar</option>
                </select>
                {errors.tipoRefeicao && <p className="text-xs text-red-500 font-bold mt-0.5">{errors.tipoRefeicao.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Calendar size={16} className="text-muted" /> Data de Consumo <span className="text-red-500">*</span>
                </label>
                <input 
                  type="date"
                  {...register('data')}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                />
                {errors.data && <p className="text-xs text-red-500 font-bold mt-0.5">{errors.data.message}</p>}
              </div>
            </div>

            <div className="relative">
              <DollarSign className="absolute left-3 top-[34px] h-4 w-4 text-slate-400 pointer-events-none" />
              <Input 
                label="Valor do Custo (R$)" 
                required 
                type="number" 
                step="0.01" 
                placeholder="0,00" 
                className="pl-9"
                {...register('valor')} 
                error={errors.valor?.message} 
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Observações adicionais (opcional)</label>
              <textarea 
                placeholder="Ex: Refeição extra devido a plantão ou observações da entrega."
                {...register('observacao')}
                rows={3}
                className="w-full p-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              {errors.observacao && <p className="text-xs text-red-500 font-bold mt-0.5">{errors.observacao.message}</p>}
            </div>
            
            <div className="pt-4 flex gap-3">
              <Button type="button" variant="secondary" className="flex-1 hover:bg-slate-100" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-to-r from-fire to-ember text-white flex justify-center gap-2 items-center hover:scale-[1.02] active:scale-95 transition-all" 
                disabled={mutationCreate.isPending}
              >
                {mutationCreate.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar Lançamento
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
