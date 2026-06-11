import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { ShoppingCart, Package, CheckCircle, Loader2, Plus, Trash2, Save, FileText, AlertCircle, Pencil, Filter, Calendar, XCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import api from '../services/api';

const compraSchema = z.object({
  fornecedorId: z.string().min(1, 'Selecione um fornecedor'),
  observacao: z.string().optional(),
  itens: z.array(z.object({
    produtoId: z.string().min(1, 'Selecione um produto'),
    quantidade: z.coerce.number().min(0.001, 'Mínimo 0.001'),
    precoUnitario: z.coerce.number().min(0.0001, 'Mínimo 0.0001'),
  })).min(1, 'Adicione pelo menos um item'),
});

type CompraForm = z.infer<typeof compraSchema>;

interface Compra {
  id: string;
  fornecedorNome: string;
  dataCompra: string;
  valorTotal: number;
  status: string;
  produtosResumo: string;
  totalItens: number;
  observacao?: string;
  isPago: boolean;
  itens: { produtoId: string; quantidade: number; precoUnitario: number }[];
}

export function Compras() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Estados de Filtro
  const [filterFornecedor, setFilterFornecedor] = useState('');
  const [filterProduto, setFilterProduto] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterData, setFilterData] = useState('');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Linhas Expandidas
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const queryClient = useQueryClient();

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CompraForm>({
    resolver: zodResolver(compraSchema),
    defaultValues: { itens: [{ produtoId: '', quantidade: 1, precoUnitario: 0 }] }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "itens"
  });

  const { data: todasCompras, isLoading: loadingCompras } = useQuery<Compra[]>({
    queryKey: ['compras'],
    queryFn: async () => (await api.get('/Compras')).data,
  });

  const compras = (todasCompras || []).filter(c => c.categoria === 'Mercadoria');

  const { data: fornecedores } = useQuery<any[]>({
    queryKey: ['fornecedores'],
    queryFn: async () => (await api.get('/Fornecedores')).data,
  });

  const { data: produtos } = useQuery<any[]>({
    queryKey: ['produtos'],
    queryFn: async () => (await api.get('/Produtos')).data,
  });

  const mutationSave = useMutation({
    mutationFn: (data: CompraForm) => {
      const payload = { ...data, categoria: 'Mercadoria' };
      return editId ? api.put(`/Compras/${editId}`, payload) : api.post('/Compras', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      handleCloseModal();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao salvar compra')
  });

  const mutationDelete = useMutation({
    mutationFn: (id: string) => api.delete(`/Compras/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      alert('Compra excluída com sucesso.');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao excluir compra')
  });

  const mutationConfirm = useMutation({
    mutationFn: (id: string) => api.post(`/Compras/${id}/confirmar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      alert('Compra confirmada! Estoque e Financeiro atualizados.');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao confirmar compra')
  });

  const mutationPay = useMutation({
    mutationFn: (id: string) => api.post(`/Compras/${id}/pagar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      alert('Pagamento registrado! O valor foi debitado da conta bancária padrão.');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao registrar pagamento')
  });

  const mutationCancel = useMutation({
    mutationFn: (id: string) => api.post(`/Compras/${id}/cancelar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      alert('Compra cancelada com sucesso. Estoque e financeiro atualizados.');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao cancelar compra')
  });

  const handleEdit = async (compra: Compra) => {
    try {
      const response = await api.get(`/Compras/${compra.id}`);
      const data = response.data;
      setEditId(compra.id);
      reset({
        fornecedorId: data.fornecedorId,
        observacao: data.observacao || '',
        itens: data.itens.map((i: any) => ({
          produtoId: i.produtoId,
          quantidade: i.quantidade,
          precoUnitario: i.precoUnitario
        }))
      });
      setIsModalOpen(true);
    } catch (err) {
      alert('Erro ao carregar dados da compra.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    reset({
      fornecedorId: '',
      observacao: '',
      itens: [{ produtoId: '', quantidade: 1, precoUnitario: 0 }]
    });
  };

  const onSubmit = (data: CompraForm) => {
    mutationSave.mutate(data);
  };

  const calculateTotal = () => {
    const itens = watch('itens') || [];
    return itens.reduce((acc, item) => acc + (Number(item.quantidade) * Number(item.precoUnitario)), 0);
  };

  const filteredCompras = (compras || []).filter(compra => {
    const matchFornecedor = filterFornecedor === '' || compra.fornecedorNome.toLowerCase().includes(filterFornecedor.toLowerCase());
    const matchStatus = filterStatus === '' || compra.status === filterStatus;
    const matchProduto = filterProduto === '' || compra.produtosResumo.toLowerCase().includes(filterProduto.toLowerCase());
    const matchData = filterData === '' || new Date(compra.dataCompra).toISOString().split('T')[0] === filterData;
    
    return matchFornecedor && matchStatus && matchProduto && matchData;
  });

  // Cálculo da Paginação
  const totalPages = Math.ceil(filteredCompras.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompras = filteredCompras.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setCurrentPage(1); // Resetar para primeira página ao filtrar
  };

  if (loadingCompras) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-ember" size={32} /></div>;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Módulo de Compras</h2>
          <p className="text-slate-500">Registre entradas de produtos fabricados e de revenda.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Package size={18} />
          Nova Compra
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fornecedor</label>
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Nome do fornecedor..." 
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={filterFornecedor}
              onChange={(e) => handleFilterChange(setFilterFornecedor, e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Produto</label>
          <div className="relative">
            <Package className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Nome do produto..." 
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={filterProduto}
              onChange={(e) => handleFilterChange(setFilterProduto, e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="date" 
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={filterData}
              onChange={(e) => handleFilterChange(setFilterData, e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status</label>
            <select 
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={filterStatus}
              onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
            >
              <option value="">Todos</option>
              <option value="Rascunho">Rascunho</option>
              <option value="Confirmada">Confirmada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
          {(filterFornecedor || filterProduto || filterData || filterStatus) && (
            <button 
              onClick={() => { setFilterFornecedor(''); setFilterProduto(''); setFilterData(''); setFilterStatus(''); setCurrentPage(1); }}
              className="p-2 text-slate-400 hover:text-red-500 bg-slate-100 rounded-lg"
              title="Limpar Filtros"
            >
              <XCircle size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Versão Desktop: Tabela */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="w-10 px-3 lg:px-4 py-3.5"></th>
                <th className="px-3 lg:px-4 py-3.5 font-medium">Data</th>
                <th className="px-3 lg:px-4 py-3.5 font-medium">Fornecedor</th>
                <th className="px-3 lg:px-4 py-3.5 font-medium">Resumo</th>
                <th className="px-3 lg:px-4 py-3.5 font-medium">Total Itens</th>
                <th className="px-3 lg:px-4 py-3.5 font-medium">Valor Total</th>
                <th className="px-3 lg:px-4 py-3.5 font-medium">Status</th>
                <th className="px-3 lg:px-4 py-3.5 font-medium text-right w-[130px] min-w-[130px] shrink-0 sticky right-0 bg-slate-50 z-10 border-l border-slate-200/50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCompras.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Nenhuma compra encontrada.</td></tr>}
              {paginatedCompras.map(compra => (
                <Fragment key={compra.id}>
                  <tr className="group hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => toggleRow(compra.id)}>
                    <td className="px-3 lg:px-4 py-3.5 text-slate-400">
                      {expandedRows[compra.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </td>
                    <td className="px-3 lg:px-4 py-3.5 text-slate-600">{new Date(compra.dataCompra).toLocaleDateString()}</td>
                    <td className="px-3 lg:px-4 py-3.5 font-medium text-slate-900">{compra.fornecedorNome}</td>
                    <td className="px-3 lg:px-4 py-3.5 text-slate-500 max-w-[200px] truncate" title={compra.produtosResumo}>
                      {compra.produtosResumo || "Sem itens"}
                    </td>
                    <td className="px-3 lg:px-4 py-3.5 text-slate-600 font-medium">{Number(compra.totalItens)} un</td>
                    <td className="px-3 lg:px-4 py-3.5 font-bold text-slate-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(compra.valorTotal)}
                    </td>
                    <td className="px-3 lg:px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        compra.status === 'Rascunho'
                          ? 'bg-amber-100 text-amber-700'
                          : compra.status === 'Cancelada'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {compra.status}
                      </span>
                    </td>
                    <td className="px-3 lg:px-4 py-3.5 text-right w-[130px] min-w-[130px] shrink-0 sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-200/50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]" onClick={(e) => e.stopPropagation()}>
                      {compra.status === 'Rascunho' && (
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={() => handleEdit(compra)}
                            className="p-1.5 text-slate-500 hover:text-ember hover:bg-ember/5 rounded-lg transition-colors"
                            title="Editar Rascunho"
                          >
                            <Pencil size={18} />
                          </button>
                          <button 
                            onClick={() => confirm('Excluir este rascunho permanentemente?') && mutationDelete.mutate(compra.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir Rascunho"
                          >
                            {mutationDelete.isPending ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                          </button>
                          <button 
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                            onClick={() => confirm('Deseja confirmar esta compra? Isso atualizará o estoque e gerará uma conta a pagar.') && mutationConfirm.mutate(compra.id)}
                            disabled={mutationConfirm.isPending}
                            title="Confirmar Compra (Atualiza Estoque e Financeiro)"
                          >
                            {mutationConfirm.isPending ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                          </button>
                        </div>
                      )}
                      {compra.status === 'Confirmada' && !compra.isPago && (
                        <div className="flex justify-end gap-1.5">
                          <button 
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                            onClick={() => confirm('Confirmar pagamento? Isso debitará o valor da sua conta bancária.') && mutationPay.mutate(compra.id)}
                            disabled={mutationPay.isPending}
                            title="Registrar Pagamento / Liquidar"
                          >
                            {mutationPay.isPending ? <Loader2 className="animate-spin" size={18} /> : <DollarSign size={18} />}
                          </button>
                          <button 
                            className="p-1.5 text-red-650 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            onClick={() => confirm('Deseja realmente cancelar esta compra? O estoque será devolvido e a conta a pagar será cancelada.') && mutationCancel.mutate(compra.id)}
                            disabled={mutationCancel.isPending}
                            title="Cancelar Compra (Devolve Estoque)"
                          >
                            {mutationCancel.isPending ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />}
                          </button>
                        </div>
                      )}
                      {compra.status === 'Confirmada' && compra.isPago && (
                        <span className="text-xs font-bold text-emerald-600 uppercase flex items-center justify-end gap-1">
                          <CheckCircle size={14} /> Pago
                        </span>
                      )}
                    </td>
                  </tr>
                  {/* Detalhes Expandidos */}
                  {expandedRows[compra.id] && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={8} className="px-12 py-4">
                        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-inner">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-100 text-slate-500">
                              <tr>
                                <th className="px-4 py-2 font-semibold">Produto</th>
                                <th className="px-4 py-2 font-semibold text-center">Quantidade</th>
                                <th className="px-4 py-2 font-semibold text-right">Preço Unitário</th>
                                <th className="px-4 py-2 font-semibold text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {compra.itens.map((item, idx) => {
                                const prodNome = produtos?.find(p => p.id === item.produtoId)?.nome || 'Produto não encontrado';
                                return (
                                  <tr key={idx}>
                                    <td className="px-4 py-2 text-slate-700">{prodNome}</td>
                                    <td className="px-4 py-2 text-center text-slate-600">{Number(item.quantidade)}</td>
                                    <td className="px-4 py-2 text-right text-slate-600">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoUnitario)}
                                    </td>
                                    <td className="px-4 py-2 text-right font-medium text-slate-900">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantidade * item.precoUnitario)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {compra.observacao && (
                            <div className="p-3 bg-amber-50/50 border-t border-slate-100 text-[10px] text-slate-500 italic">
                              <strong>Obs:</strong> {compra.observacao}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Versão Mobile: Cards (iPhone 14 Pro Max) */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginatedCompras.length === 0 && <div className="p-8 text-center text-slate-400">Nenhuma compra encontrada.</div>}
          {paginatedCompras.map(compra => (
            <div key={compra.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(compra.dataCompra).toLocaleDateString()}</span>
                  <h3 className="font-bold text-slate-900">{compra.fornecedorNome}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  compra.status === 'Rascunho'
                    ? 'bg-amber-100 text-amber-700'
                    : compra.status === 'Cancelada'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {compra.status}
                </span>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-2">
                <p className="text-slate-600 italic">{compra.produtosResumo}</p>
                <div className="flex justify-between items-end border-t border-slate-200 pt-2">
                  <div>
                    <p className="text-slate-400 uppercase text-[9px] font-bold">Total Itens</p>
                    <p className="font-bold text-slate-700">{Number(compra.totalItens)} un</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 uppercase text-[9px] font-bold">Valor Total</p>
                    <p className="text-lg font-bold text-fire">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(compra.valorTotal)}
                    </p>
                  </div>
                </div>
              </div>

              {compra.status === 'Rascunho' && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleEdit(compra)}>
                    <Pencil size={14} className="mr-1" /> Editar
                  </Button>
                  <Button size="sm" className="flex-1 bg-gradient-to-r from-fire to-ember" onClick={() => confirm('Confirmar compra?') && mutationConfirm.mutate(compra.id)}>
                    <CheckCircle size={14} className="mr-1" /> Confirmar
                  </Button>
                  <button onClick={() => confirm('Excluir rascunho?') && mutationDelete.mutate(compra.id)} className="p-2 text-red-500 bg-red-50 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
              {compra.status === 'Confirmada' && !compra.isPago && (
                <div className="flex gap-2 pt-1">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="flex-grow bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" 
                    onClick={() => confirm('Confirmar pagamento?') && mutationPay.mutate(compra.id)}
                    disabled={mutationPay.isPending}
                  >
                    {mutationPay.isPending ? <Loader2 className="animate-spin mr-1" size={14} /> : <DollarSign size={14} className="mr-1" />} 
                    Pagar / Liquidar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200" 
                    onClick={() => confirm('Deseja realmente cancelar esta compra? O estoque será devolvido e a conta a pagar será cancelada.') && mutationCancel.mutate(compra.id)}
                    disabled={mutationCancel.isPending}
                  >
                    {mutationCancel.isPending ? <Loader2 className="animate-spin mr-1" size={14} /> : <XCircle size={14} className="mr-1" />}
                    Cancelar
                  </Button>
                </div>
              )}
              {compra.status === 'Confirmada' && compra.isPago && (
                <div className="pt-1 text-center">
                  <span className="text-xs font-bold text-emerald-600 uppercase flex items-center justify-center gap-1">
                    <CheckCircle size={14} /> Pagamento Realizado
                  </span>
                </div>
              )}
              
              <button 
                onClick={() => toggleRow(compra.id)}
                className="w-full py-1 text-[10px] text-slate-400 font-bold uppercase flex items-center justify-center gap-1 border-t border-slate-100 mt-2"
              >
                {expandedRows[compra.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expandedRows[compra.id] ? 'Esconder Detalhes' : 'Ver Detalhes dos Itens'}
              </button>

              {expandedRows[compra.id] && (
                <div className="mt-2 space-y-2 border-l-2 border-ember/20 pl-3">
                  {compra.itens.map((item, idx) => {
                    const prodNome = produtos?.find(p => p.id === item.produtoId)?.nome || 'Produto';
                    return (
                      <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{prodNome}</p>
                          <p className="text-slate-400 text-[10px]">{Number(item.quantidade)} un x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoUnitario)}</p>
                        </div>
                        <p className="font-bold text-slate-700">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantidade * item.precoUnitario)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Controles de Paginação (Mantidos iguais, mas agora integrados à estrutura) */}

        {/* Controles de Paginação */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredCompras.length)} de {filteredCompras.length} resultados
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === i + 1 
                      ? 'bg-ember text-white' 
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editId ? "Editar Rascunho de Compra" : "Registrar Nova Compra"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Controller
            control={control}
            name="fornecedorId"
            render={({ field }) => (
              <SearchableSelect
                label="Fornecedor"
                required
                placeholder="Pesquise o fornecedor..."
                options={fornecedores?.map(f => ({ value: f.id, label: f.nomeFantasia })) || []}
                value={field.value}
                onChange={field.onChange}
                error={errors.fornecedorId?.message}
              />
            )}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Produtos Comprados</label>
              <Button type="button" size="sm" variant="secondary" onClick={() => append({ produtoId: '', quantidade: 1, precoUnitario: 0 })} className="text-xs flex items-center gap-1">
                <Plus size={14} /> Adicionar Item
              </Button>
            </div>

            <div className="space-y-4 pr-1">
              {fields.map((field, index) => (
                <div key={field.id} className="relative bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-ember/40 transition-all group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 group-hover:bg-ember transition-colors rounded-l-xl"></div>
                  
                  <div className="flex flex-col gap-4">
                    <div className="flex-1">
                      <Controller
                        control={control}
                        name={`itens.${index}.produtoId`}
                        render={({ field }) => (
                          <SearchableSelect
                            label="Produto / Item"
                            required
                            placeholder="Buscar..."
                            options={produtos?.filter(p => p.tipo !== 0).map(p => ({ value: p.id, label: p.nome })) || []}
                            value={field.value}
                            onChange={(val) => {
                              field.onChange(val);
                              // Buscar o produto selecionado para pegar o preço de custo atual
                              const p = produtos?.find(x => x.id === val);
                              if (p) {
                                setValue(`itens.${index}.precoUnitario`, p.precoCusto);
                              }
                            }}
                            error={errors.itens?.[index]?.produtoId?.message}
                          />
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 sm:flex sm:items-end gap-3">
                      <div>
                        <Input 
                          label="Quantidade" 
                          required 
                          type="number" 
                          step="0.001" 
                          {...register(`itens.${index}.quantidade`)} 
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Input 
                            label="R$ Unitário" 
                            required 
                            type="number" 
                            step="0.0001" 
                            {...register(`itens.${index}.precoUnitario`)} 
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => remove(index)} 
                          className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mb-0.5"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Subtotal do Item</span>
                      <span className="text-sm font-black text-slate-700">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          (Number(watch(`itens.${index}.quantidade`)) || 0) * (Number(watch(`itens.${index}.precoUnitario`)) || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 flex justify-between items-center text-white">
            <span className="text-sm font-medium opacity-70">VALOR TOTAL DA COMPRA</span>
            <span className="text-xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal())}</span>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-3 text-amber-800 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <p>Ao confirmar a compra posteriormente, o sistema atualizará o <strong>Preço de Custo</strong> no cadastro do produto e somará ao estoque.</p>
          </div>

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 flex items-center justify-center gap-2" disabled={mutationSave.isPending}>
              {mutationSave.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {editId ? "Salvar Alterações" : "Salvar Rascunho"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
