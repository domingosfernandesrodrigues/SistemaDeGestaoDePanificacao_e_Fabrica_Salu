import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { ShoppingCart, Truck, CheckCircle, Loader2, Plus, Trash2, Save, PowerOff, Edit3 } from 'lucide-react';
import api from '../services/api';

const pedidoSchema = z.object({
  clienteId: z.string().min(1, 'Selecione um cliente'),
  itens: z.array(z.object({
    produtoId: z.string().min(1, 'Selecione um produto'),
    quantidade: z.coerce.number().min(1, 'Mínimo 1'),
    desconto: z.coerce.number().min(0, 'Desconto inválido').default(0),
  })).min(1, 'Adicione pelo menos um item'),
});

type PedidoForm = z.infer<typeof pedidoSchema>;

interface Venda {
  id: string;
  numeroPedido: string;
  cliente: { nomeFantasia: string };
  valorTotal: number;
  status: number;
}

export function Vendas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<PedidoForm>({
    resolver: zodResolver(pedidoSchema),
    defaultValues: { itens: [{ produtoId: '', quantidade: 1, desconto: 0 }] }
  });

  const watchItens = watch('itens');

  const calcularTotal = () => {
    return watchItens?.reduce((acc, item) => {
      const prod = produtos?.find(p => p.id === item.produtoId);
      const preco = prod?.precoVenda || 0;
      const subtotal = (item.quantidade || 0) * preco - (item.desconto || 0);
      return acc + Math.max(0, subtotal);
    }, 0) || 0;
  };

  const userRole = localStorage.getItem('sgpf_role') || 'Cliente';
  const canGiveDiscount = userRole === 'Admin' || userRole === 'Gestor' || userRole === 'Operador';

  const { fields, append, remove } = useFieldArray({
    control,
    name: "itens"
  });

  const { data: vendas, isLoading: loadingVendas } = useQuery<Venda[]>({
    queryKey: ['vendas'],
    queryFn: async () => {
      const response = await api.get('/Vendas');
      return response.data;
    },
  });

  const { data: clientes } = useQuery<any[]>({
    queryKey: ['clientes'],
    queryFn: async () => {
      const response = await api.get('/Clientes');
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

  const mutationCreate = useMutation({
    mutationFn: (newPedido: PedidoForm) => api.post('/Vendas', newPedido),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      handleCloseModal();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao criar pedido')
  });

  const mutationUpdatePedido = useMutation({
    mutationFn: ({ id, data }: { id: string, data: PedidoForm }) => api.put(`/Vendas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      handleCloseModal();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao atualizar pedido')
  });

  const handleEdit = async (venda: any) => {
    try {
      const response = await api.get(`/Produtos`); // Garantir produtos carregados
      const pedidoFull = await api.get(`/Vendas/${venda.id}`); 
      // Nota: Como o GetAll já traz quase tudo, podemos tentar carregar direto se o GetAll incluir itens
      // Se não, precisamos de um GetById no controller.
      
      setEditId(venda.id);
      const dados = pedidoFull.data;
      
      setValue('clienteId', dados.clienteId);
      reset({ 
        clienteId: dados.clienteId, 
        itens: dados.itens.map((i: any) => ({
          produtoId: i.produtoId,
          quantidade: i.quantidade,
          desconto: i.desconto || 0
        })) 
      });
      setIsModalOpen(true);
    } catch (e: any) {
      console.error(e);
      alert("Erro ao carregar detalhes para edição: " + (e.response?.data?.message || e.message));
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    reset({ clienteId: '', itens: [{ produtoId: '', quantidade: 1, desconto: 0 }] });
  };

  const mutationUpdateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string, status: number }) => api.patch(`/Vendas/${id}/status`, status, { headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendas'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao mover pedido')
  });

  const mutationCancel = useMutation({
    mutationFn: (id: string) => api.post(`/Vendas/${id}/cancelar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendas'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao cancelar pedido')
  });

  const mutationDeleteOrder = useMutation({
    mutationFn: (id: string) => api.delete(`/Vendas/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendas'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao excluir pedido')
  });

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDrop = (status: number) => {
    if (draggedId) {
      mutationUpdateStatus.mutate({ id: draggedId, status });
      setDraggedId(null);
    }
  };

  const onSubmit = (data: PedidoForm) => {
    if (editId) {
      mutationUpdatePedido.mutate({ id: editId, data });
    } else {
      mutationCreate.mutate(data);
    }
  };

  if (loadingVendas) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  const renderVendasPorStatus = (statusValue: number, title: string, dotColor: string) => {
    const filtradas = vendas?.filter(v => v.status === statusValue) || [];
    
    return (
      <div 
        className="bg-slate-100/50 rounded-xl p-4 border border-slate-200 min-h-[500px] transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDrop(statusValue)}
      >
        <h3 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
            {title}
          </div>
          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px]">{filtradas.length}</span>
        </h3>
        
        <div className="space-y-4">
          {filtradas.length === 0 && <p className="text-xs text-slate-400 text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">Arraste aqui</p>}
          {filtradas.map(venda => (
            <div 
              key={venda.id} 
              draggable
              onDragStart={() => handleDragStart(venda.id)}
              className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-400 cursor-grab active:cursor-grabbing transition-all hover:shadow-md group ${draggedId === venda.id ? 'opacity-50' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-400">{venda.numeroPedido}</span>
                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                   {(statusValue === 0 || statusValue === 1) && (
                     <>
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleEdit(venda); }}
                         className="p-1.5 text-blue-500 hover:text-blue-700 rounded bg-slate-50 border border-slate-100"
                         title="Editar Pedido"
                       >
                         <Edit3 size={14} />
                       </button>
                       <button 
                         onClick={(e) => { e.stopPropagation(); confirm('Excluir permanentemente?') && mutationDeleteOrder.mutate(venda.id); }}
                         className="p-1.5 text-red-400 hover:text-red-600 rounded bg-slate-50 border border-slate-100"
                       >
                         <Trash2 size={14} />
                       </button>
                     </>
                   )}
                   <button 
                     onClick={(e) => { e.stopPropagation(); confirm('Deseja realmente cancelar este pedido?') && mutationCancel.mutate(venda.id); }}
                     className="p-1.5 text-amber-500 hover:text-amber-700 rounded bg-slate-50 border border-slate-100"
                     title="Cancelar Pedido"
                   >
                     <PowerOff size={14} />
                   </button>
                </div>
              </div>
              
              <h4 className="font-bold text-slate-800 leading-tight">{venda.cliente?.nomeFantasia || 'Cliente'}</h4>
              
              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                <Truck size={12} className="text-slate-300" />
                <span>Previsto: {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date())}</span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="font-black text-indigo-600 text-sm">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.valorTotal)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                   {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date())}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Painel de Vendas B2B</h2>
          <p className="text-slate-500">Acompanhe os pedidos desde a separação até a entrega no cliente.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
          <ShoppingCart size={18} />
          Novo Pedido
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {renderVendasPorStatus(0, 'Aprovação (Portal)', 'bg-purple-500')}
        {renderVendasPorStatus(1, 'Em Separação', 'bg-amber-400')}
        {renderVendasPorStatus(2, 'Em Rota de Entrega', 'bg-blue-500')}
        {renderVendasPorStatus(3, 'Entregues (Hoje)', 'bg-green-500')}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Novo Pedido de Venda"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Controller
            control={control}
            name="clienteId"
            render={({ field }) => (
              <SearchableSelect
                label="Cliente"
                placeholder="Pesquise o cliente..."
                options={clientes?.map(c => ({ value: c.id, label: c.nomeFantasia })) || []}
                value={field.value}
                onChange={field.onChange}
                error={errors.clienteId?.message}
              />
            )}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Itens do Pedido</label>
              <Button 
                type="button" 
                size="sm" 
                variant="secondary"
                onClick={() => append({ produtoId: '', quantidade: 1, desconto: 0 })}
                className="text-xs flex items-center gap-1"
              >
                <Plus size={14} /> Adicionar Item
              </Button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {fields.map((field, index) => {
                const selectedProd = produtos?.find(p => p.id === watchItens[index]?.produtoId);
                const preco = selectedProd?.precoVenda || 0;
                const qtd = watchItens[index]?.quantidade || 0;
                const desc = watchItens[index]?.desconto || 0;
                const subtotalItem = Math.max(0, (qtd * preco) - desc);

                return (
                  <div key={field.id} className="group flex flex-col sm:flex-row gap-4 items-start sm:items-end bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-300 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-indigo-500 transition-colors"></div>
                    
                    <div className="w-full sm:flex-1 sm:min-w-[180px] space-y-1.5">
                      <Controller
                        control={control}
                        name={`itens.${index}.produtoId`}
                        render={({ field }) => (
                          <SearchableSelect
                            label="Produto / Descrição"
                            placeholder="Selecione..."
                            options={produtos?.filter(p => p.tipo !== 0).map(p => ({ 
                              value: p.id, 
                              label: `${p.tipo === 1 ? '🍞' : p.tipo === 0 ? '🥫' : '📦'} ${p.nome} (${p.unidadeMedida}) - Saldo: ${p.quantidadeEstoque}` 
                            })) || []}
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.itens?.[index]?.produtoId?.message}
                          />
                        )}
                      />
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                      <div className="w-16 sm:w-16 space-y-1.5">
                        <Input 
                          label="Qtd" 
                          type="number"
                          className="h-10 px-2 text-sm font-bold text-slate-700"
                          {...register(`itens.${index}.quantidade`)}
                        />
                      </div>
                      {canGiveDiscount && (
                        <div className="w-20 sm:w-20 space-y-1.5">
                          <Input 
                            label="Desc" 
                            type="number"
                            className="h-10 px-2 text-sm font-bold text-red-600 bg-red-50/30 border-red-100"
                            {...register(`itens.${index}.desconto`)}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end sm:min-w-[100px] sm:pb-1">
                      <div className="flex flex-col sm:items-end">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Unit.</span>
                        <span className="text-[13px] font-semibold text-slate-500">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preco)}
                        </span>
                      </div>
                      
                      <div className="flex flex-col sm:items-end mt-1">
                        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Subt.</span>
                        <span className="text-[15px] font-black text-indigo-600 font-mono">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotalItem)}
                        </span>
                      </div>

                      <button 
                        type="button" 
                        onClick={() => remove(index)}
                        className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all sm:hidden"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => remove(index)}
                      className="hidden sm:flex p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all mb-1 items-center justify-center"
                      title="Remover Item"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                );
              })}
            </div>
            {errors.itens && <p className="text-xs text-red-500">{errors.itens.message}</p>}
            
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center mt-4">
              <span className="text-sm font-bold text-indigo-900">Total do Pedido:</span>
              <span className="text-xl font-black text-indigo-700 font-mono">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calcularTotal())}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={handleCloseModal} disabled={mutationCreate.isPending || mutationUpdatePedido.isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 px-8" disabled={mutationCreate.isPending || mutationUpdatePedido.isPending}>
              {(mutationCreate.isPending || mutationUpdatePedido.isPending) ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              {editId ? 'Salvar Alterações' : 'Confirmar Pedido'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
