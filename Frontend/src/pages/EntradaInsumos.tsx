import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { FlaskConical, CheckCircle, Loader2, Plus, Trash2, Save, AlertCircle, Pencil, Filter, Calendar, XCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';

const schema = z.object({
  fornecedorId: z.string().min(1, 'Selecione um fornecedor'),
  observacao: z.string().optional(),
  itens: z.array(z.object({
    produtoId: z.string().min(1, 'Selecione um insumo'),
    quantidade: z.coerce.number().min(0.001, 'Mínimo 0.001'),
    precoUnitario: z.coerce.number().min(0.0001, 'Mínimo 0.0001'),
  })).min(1, 'Adicione pelo menos um insumo'),
});

type EntradaForm = z.infer<typeof schema>;

interface Compra {
  id: string;
  fornecedorNome: string;
  dataCompra: string;
  valorTotal: number;
  status: string;
  categoria: string;
  produtosResumo: string;
  totalItens: number;
  observacao?: string;
  itens: { produtoId: string; quantidade: number; precoUnitario: number }[];
}

export function EntradaInsumos() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterFornecedor, setFilterFornecedor] = useState('');
  const [filterInsumo, setFilterInsumo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterData, setFilterData] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const itemsPerPage = 10;

  const queryClient = useQueryClient();

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<EntradaForm>({
    resolver: zodResolver(schema),
    defaultValues: { itens: [{ produtoId: '', quantidade: 1, precoUnitario: 0 }] }
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'itens' });

  const { data: todasCompras, isLoading } = useQuery<Compra[]>({
    queryKey: ['compras'],
    queryFn: async () => (await api.get('/Compras')).data,
  });

  const entradas = (todasCompras || []).filter(c => c.categoria === 'Insumo');

  const { data: fornecedores } = useQuery<any[]>({
    queryKey: ['fornecedores'],
    queryFn: async () => (await api.get('/Fornecedores')).data,
  });

  const { data: produtos } = useQuery<any[]>({
    queryKey: ['produtos'],
    queryFn: async () => (await api.get('/Produtos')).data,
  });

  // Apenas Insumos (tipo 0)
  const insumos = (produtos || []).filter(p => p.tipo === 0);

  const mutationSave = useMutation({
    mutationFn: (data: EntradaForm) => {
      const payload = { ...data, categoria: 'Insumo' };
      return editId ? api.put(`/Compras/${editId}`, payload) : api.post('/Compras', payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['compras'] }); handleClose(); },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao salvar entrada')
  });

  const mutationDelete = useMutation({
    mutationFn: (id: string) => api.delete(`/Compras/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['compras'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao excluir')
  });

  const mutationConfirm = useMutation({
    mutationFn: (id: string) => api.post(`/Compras/${id}/confirmar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      alert('Entrada confirmada! Estoque de insumos atualizado.');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao confirmar')
  });

  const handleEdit = async (entrada: Compra) => {
    try {
      const { data } = await api.get(`/Compras/${entrada.id}`);
      setEditId(entrada.id);
      reset({
        fornecedorId: data.fornecedorId,
        observacao: data.observacao || '',
        itens: data.itens.map((i: any) => ({ produtoId: i.produtoId, quantidade: i.quantidade, precoUnitario: i.precoUnitario }))
      });
      setIsModalOpen(true);
    } catch { alert('Erro ao carregar dados.'); }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditId(null);
    reset({ fornecedorId: '', observacao: '', itens: [{ produtoId: '', quantidade: 1, precoUnitario: 0 }] });
  };

  const calculateTotal = () =>
    (watch('itens') || []).reduce((acc, i) => acc + Number(i.quantidade) * Number(i.precoUnitario), 0);

  const handleFilterChange = (setter: (v: string) => void, val: string) => { setter(val); setCurrentPage(1); };

  const filtered = entradas.filter(e => {
    return (filterFornecedor === '' || e.fornecedorNome.toLowerCase().includes(filterFornecedor.toLowerCase()))
      && (filterStatus === '' || e.status === filterStatus)
      && (filterInsumo === '' || e.produtosResumo.toLowerCase().includes(filterInsumo.toLowerCase()))
      && (filterData === '' || new Date(e.dataCompra).toISOString().split('T')[0] === filterData);
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-orange-600" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Entrada de Insumos</h2>
          <p className="text-slate-500">Registre a compra de matérias-primas para produção.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700">
          <FlaskConical size={18} /> Nova Entrada
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fornecedor</label>
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Nome do fornecedor..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none" value={filterFornecedor} onChange={e => handleFilterChange(setFilterFornecedor, e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Insumo</label>
          <div className="relative">
            <FlaskConical className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Nome do insumo..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none" value={filterInsumo} onChange={e => handleFilterChange(setFilterInsumo, e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input type="date" className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none" value={filterData} onChange={e => handleFilterChange(setFilterData, e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status</label>
            <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none" value={filterStatus} onChange={e => handleFilterChange(setFilterStatus, e.target.value)}>
              <option value="">Todos</option>
              <option value="Rascunho">Rascunho</option>
              <option value="Confirmada">Confirmada</option>
            </select>
          </div>
          {(filterFornecedor || filterInsumo || filterData || filterStatus) && (
            <button onClick={() => { setFilterFornecedor(''); setFilterInsumo(''); setFilterData(''); setFilterStatus(''); setCurrentPage(1); }} className="p-2 text-slate-400 hover:text-red-500 bg-slate-100 rounded-lg" title="Limpar Filtros">
              <XCircle size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-orange-50 text-orange-800 border-b border-orange-100">
              <tr>
                <th className="w-10 px-6 py-4"></th>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Fornecedor</th>
                <th className="px-6 py-4 font-medium">Insumos</th>
                <th className="px-6 py-4 font-medium">Total Itens</th>
                <th className="px-6 py-4 font-medium">Valor Total</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 && <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Nenhuma entrada de insumo encontrada.</td></tr>}
              {paginated.map(entrada => (
                <Fragment key={entrada.id}>
                  <tr className="hover:bg-orange-50/30 transition-colors cursor-pointer" onClick={() => setExpandedRows(p => ({ ...p, [entrada.id]: !p[entrada.id] }))}>
                    <td className="px-6 py-4 text-slate-400">{expandedRows[entrada.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(entrada.dataCompra).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{entrada.fornecedorNome}</td>
                    <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate" title={entrada.produtosResumo}>{entrada.produtosResumo || 'Sem itens'}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{Number(entrada.totalItens)} un</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entrada.valorTotal)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${entrada.status === 'Rascunho' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{entrada.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                      {entrada.status === 'Rascunho' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(entrada)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={18} /></button>
                          <button onClick={() => confirm('Excluir este rascunho?') && mutationDelete.mutate(entrada.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                            {mutationDelete.isPending ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                          </button>
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 flex items-center gap-1" onClick={() => confirm('Confirmar entrada? Isso atualizará o estoque de insumos.') && mutationConfirm.mutate(entrada.id)} disabled={mutationConfirm.isPending}>
                            {mutationConfirm.isPending ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />} Confirmar
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedRows[entrada.id] && (
                    <tr className="bg-orange-50/20">
                      <td colSpan={8} className="px-12 py-4">
                        <div className="border border-orange-100 rounded-lg bg-white overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-orange-50 text-orange-700">
                              <tr>
                                <th className="px-4 py-2 font-semibold">Insumo</th>
                                <th className="px-4 py-2 font-semibold text-center">Quantidade</th>
                                <th className="px-4 py-2 font-semibold text-right">Preço Unitário</th>
                                <th className="px-4 py-2 font-semibold text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {entrada.itens.map((item, idx) => {
                                const nome = produtos?.find(p => p.id === item.produtoId)?.nome || 'Insumo';
                                return (
                                  <tr key={idx}>
                                    <td className="px-4 py-2 text-slate-700">{nome}</td>
                                    <td className="px-4 py-2 text-center">{Number(item.quantidade)}</td>
                                    <td className="px-4 py-2 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoUnitario)}</td>
                                    <td className="px-4 py-2 text-right font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantidade * item.precoUnitario)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {entrada.observacao && <div className="p-3 border-t text-[10px] text-slate-500 italic"><strong>Obs:</strong> {entrada.observacao}</div>}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginated.length === 0 && <div className="p-8 text-center text-slate-400">Nenhuma entrada encontrada.</div>}
          {paginated.map(entrada => (
            <div key={entrada.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(entrada.dataCompra).toLocaleDateString()}</span>
                  <h3 className="font-bold text-slate-900">{entrada.fornecedorNome}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${entrada.status === 'Rascunho' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{entrada.status}</span>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-xs space-y-2">
                <p className="text-slate-600 italic">{entrada.produtosResumo}</p>
                <div className="flex justify-between items-end border-t border-orange-100 pt-2">
                  <div><p className="text-slate-400 uppercase text-[9px] font-bold">Total Itens</p><p className="font-bold">{Number(entrada.totalItens)} un</p></div>
                  <div className="text-right"><p className="text-slate-400 uppercase text-[9px] font-bold">Valor Total</p><p className="text-lg font-black text-orange-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entrada.valorTotal)}</p></div>
                </div>
              </div>
              {entrada.status === 'Rascunho' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleEdit(entrada)}><Pencil size={14} className="mr-1" /> Editar</Button>
                  <Button size="sm" className="flex-1 bg-orange-600" onClick={() => confirm('Confirmar entrada?') && mutationConfirm.mutate(entrada.id)}><CheckCircle size={14} className="mr-1" /> Confirmar</Button>
                  <button onClick={() => confirm('Excluir?') && mutationDelete.mutate(entrada.id)} className="p-2 text-red-500 bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t flex items-center justify-between">
            <span className="text-xs text-slate-500">Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filtered.length)} de {filtered.length}</span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2 border rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={16} /></button>
              {[...Array(totalPages)].map((_, i) => (
                <button key={i} onClick={() => setCurrentPage(i + 1)} className={`px-3 py-1 rounded-lg text-sm font-medium ${currentPage === i + 1 ? 'bg-orange-600 text-white' : 'border bg-white text-slate-600 hover:bg-slate-50'}`}>{i + 1}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 border rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={handleClose} title={editId ? 'Editar Entrada de Insumo' : 'Nova Entrada de Insumo'}>
        <form onSubmit={handleSubmit(d => mutationSave.mutate(d))} className="space-y-6">
          <Controller control={control} name="fornecedorId" render={({ field }) => (
            <SearchableSelect label="Fornecedor" placeholder="Pesquise o fornecedor..." options={fornecedores?.map(f => ({ value: f.id, label: f.nomeFantasia })) || []} value={field.value} onChange={field.onChange} error={errors.fornecedorId?.message} />
          )} />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Insumos (Matéria-Prima)</label>
              <Button type="button" size="sm" variant="secondary" onClick={() => append({ produtoId: '', quantidade: 1, precoUnitario: 0 })} className="text-xs flex items-center gap-1">
                <Plus size={14} /> Adicionar Insumo
              </Button>
            </div>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 bg-orange-50 p-3 rounded-lg border border-orange-100 items-end">
                  <div className="col-span-6">
                    <Controller control={control} name={`itens.${index}.produtoId`} render={({ field }) => (
                      <SearchableSelect label="Insumo" placeholder="Buscar..." options={insumos.map(p => ({ value: p.id, label: `${p.nome} (${p.unidadeMedida})` }))} value={field.value} onChange={field.onChange} error={errors.itens?.[index]?.produtoId?.message} />
                    )} />
                  </div>
                  <div className="col-span-2"><Input label="Qtd" type="number" step="0.001" {...register(`itens.${index}.quantidade`)} /></div>
                  <div className="col-span-3"><Input label="R$ Unit" type="number" step="0.0001" {...register(`itens.${index}.precoUnitario`)} /></div>
                  <div className="col-span-1 flex justify-center pb-2">
                    <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-orange-900 rounded-lg p-4 flex justify-between items-center text-white">
            <span className="text-sm font-medium opacity-70">VALOR TOTAL DA ENTRADA</span>
            <span className="text-xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal())}</span>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-3 text-amber-800 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <p>Ao confirmar, o sistema atualizará o <strong>Preço de Custo</strong> e somará ao estoque de <strong>Insumos</strong>.</p>
          </div>

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 flex items-center justify-center gap-2" disabled={mutationSave.isPending}>
              {mutationSave.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {editId ? 'Salvar Alterações' : 'Salvar Rascunho'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
