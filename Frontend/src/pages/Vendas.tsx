import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { ShoppingCart, Truck, CheckCircle, Loader2, Plus, Trash2, Save, PowerOff, Edit3, Search, CreditCard, Banknote, QrCode, FileText, QrCode as PixIcon } from 'lucide-react';
import api from '../services/api';

const pedidoSchema = z.object({
  clienteId: z.string().min(1, 'Selecione um cliente'),
  formaPagamento: z.coerce.number().default(0),
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
  dataPedido: string;
  formaPagamento: number;
  pago: boolean;
  pixQrCode?: string;
  boletoCodigoBarras?: string;
}

export function Vendas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  // Estados dos Filtros (Voltando ao padrão de Ano e Mês atual conforme solicitado)
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());
  const [filtroMes, setFiltroMes] = useState((new Date().getMonth() + 1).toString());
  const [filtroData, setFiltroData] = useState('');
  const [filtroPago, setFiltroPago] = useState<string>('');

  const [selectedVendaDocs, setSelectedVendaDocs] = useState<Venda | null>(null);

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
      const subtotalBase = (item.quantidade || 0) * preco;
      const descontoValor = subtotalBase * ((item.desconto || 0) / 100);
      const subtotal = subtotalBase - descontoValor;
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
    refetchInterval: 5000, // Atualiza a cada 5 segundos para mostrar confirmações automáticas
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
      setValue('formaPagamento', dados.formaPagamento);
      reset({ 
        clienteId: dados.clienteId, 
        formaPagamento: dados.formaPagamento,
        itens: dados.itens.map((i: any) => {
          const preco = i.precoUnitario || 0;
          const qtd = i.quantidade || 0;
          const descFixo = i.desconto || 0;
          const percDesc = preco > 0 ? (descFixo / (preco * qtd)) * 100 : 0;
          
          return {
            produtoId: i.produtoId,
            quantidade: i.quantidade,
            desconto: Math.round(percDesc * 100) / 100 // Arredondar para 2 casas
          };
        }) 
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

  const mutationTogglePagamento = useMutation({
    mutationFn: (id: string) => api.patch(`/Vendas/${id}/toggle-pagamento`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendas'] }),
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
    // Converter desconto de % para valor fixo para o Backend
    const dataFormatted = {
      ...data,
      itens: data.itens.map(item => {
        const prod = produtos?.find(p => p.id === item.produtoId);
        const preco = prod?.precoVenda || 0;
        const valorDesconto = (item.quantidade * preco) * (item.desconto / 100);
        return {
          ...item,
          desconto: valorDesconto
        };
      })
    };

    if (editId) {
      mutationUpdatePedido.mutate({ id: editId, data: dataFormatted as any });
    } else {
      mutationCreate.mutate(dataFormatted as any);
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
    const filtradas = vendas?.filter(v => {
      const matchesStatus = v.status === statusValue;
      const matchesCliente = (v.cliente?.nomeFantasia || '').toLowerCase().includes(filtroCliente.toLowerCase());
      
      const dataVenda = v.dataPedido ? new Date(v.dataPedido) : null;
      const isInvalidDate = !dataVenda || isNaN(dataVenda.getTime());

      // Se a data for inválida e houver filtro de tempo, não exibe. Se não houver filtro, exibe.
      const matchesAno = filtroAno === '' || (!isInvalidDate && dataVenda!.getFullYear().toString() === filtroAno);
      const matchesMes = filtroMes === '' || (!isInvalidDate && (dataVenda!.getMonth() + 1).toString() === filtroMes);
      const matchesData = filtroData === '' || (dataVenda && dataVenda.toISOString().split('T')[0] === filtroData);
      const matchesPago = filtroPago === '' || v.pago.toString() === filtroPago;

      return matchesStatus && matchesCliente && matchesAno && matchesMes && matchesData && matchesPago;
    }) || [];

    // Ordenação: Do mais recente (maior data) para o mais antigo
    const ordenadas = [...filtradas].sort((a, b) => {
      return new Date(b.dataPedido).getTime() - new Date(a.dataPedido).getTime();
    });
    
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
          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px]">{ordenadas.length}</span>
        </h3>
        
        <div className="space-y-4">
          {ordenadas.length === 0 && <p className="text-xs text-slate-400 text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">Arraste aqui</p>}
          {ordenadas.map(venda => (
            <div 
              key={venda.id} 
              draggable
              onDragStart={() => handleDragStart(venda.id)}
              className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-400 cursor-grab active:cursor-grabbing transition-all hover:shadow-md group 
                ${draggedId === venda.id ? 'opacity-50' : ''} 
                ${statusValue === 4 ? 'bg-red-50/50 border-red-100 opacity-80' : ''}`}
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
                   {statusValue !== 4 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); confirm('Deseja realmente cancelar este pedido?') && mutationCancel.mutate(venda.id); }}
                      className="p-1.5 text-amber-500 hover:text-amber-700 rounded bg-slate-50 border border-slate-100"
                      title="Cancelar Pedido"
                    >
                      <PowerOff size={14} />
                    </button>
                   )}
                   {statusValue === 4 && (
                     <button 
                        onClick={(e) => { e.stopPropagation(); confirm('Deseja excluir permanentemente este pedido cancelado?') && mutationDeleteOrder.mutate(venda.id); }}
                        className="p-1.5 text-red-500 hover:text-red-700 rounded bg-red-50 border border-red-100"
                        title="Excluir Permanentemente"
                      >
                        <Trash2 size={14} />
                      </button>
                   )}
                </div>
              </div>
              
              <h4 className="font-bold text-slate-800 leading-tight">{venda.cliente?.nomeFantasia || 'Cliente'}</h4>
              
              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                <Truck size={12} className="text-slate-300" />
                <span>Previsto: {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date())}</span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-black text-indigo-600 text-sm">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.valorTotal)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={(e) => { e.stopPropagation(); mutationTogglePagamento.mutate(venda.id); }}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase transition-colors ${
                        venda.pago ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                    >
                      {venda.pago ? 'Pago' : 'Pendente'}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedVendaDocs(venda); }}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      title="Gerar Pix ou Boleto"
                    >
                      <FileText size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                     {Number(venda.formaPagamento) === 0 ? 'Dinheiro' : 
                      Number(venda.formaPagamento) === 1 ? 'Pix' : 
                      Number(venda.formaPagamento) === 2 ? 'Crédito' : 
                      Number(venda.formaPagamento) === 3 ? 'Débito' : 'Boleto'}
                   </span>
                   <span className="text-[10px] text-slate-400 font-medium">
                      {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(venda.dataPedido))}
                   </span>
                </div>
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

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div className="md:col-span-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Buscar Cliente</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Nome do cliente..."
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Ano / Mês</label>
          <div className="flex gap-2">
            <select 
              value={filtroAno}
              onChange={(e) => setFiltroAno(e.target.value)}
              className="flex-1 h-10 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Anos</option>
              {[2024, 2025, 2026].map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
            <select 
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="flex-1 h-10 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Meses</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => (
                <option key={mes} value={mes}>
                  {new Date(0, mes - 1).toLocaleString('pt-BR', { month: 'short' })}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Data Específica</label>
          <input 
            type="date"
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

          <div className="flex gap-2">
            <select 
              value={filtroPago}
              onChange={(e) => setFiltroPago(e.target.value)}
              className="flex-1 h-10 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Todos (Pagto)</option>
              <option value="true">Pago</option>
              <option value="false">Pendente</option>
            </select>
            <Button 
              variant="secondary" 
              className="flex-1 h-10 text-xs"
              onClick={() => {
                setFiltroCliente('');
                setFiltroAno(new Date().getFullYear().toString());
                setFiltroMes((new Date().getMonth() + 1).toString());
                setFiltroData('');
                setFiltroPago('');
              }}
            >
              Limpar
            </Button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {renderVendasPorStatus(0, 'Aprovação (Portal)', 'bg-purple-500')}
        {renderVendasPorStatus(1, 'Em Separação', 'bg-amber-400')}
        {renderVendasPorStatus(2, 'Em Rota de Entrega', 'bg-blue-500')}
        {renderVendasPorStatus(3, 'Entregues (Hoje)', 'bg-green-500')}
        {renderVendasPorStatus(4, 'Cancelados', 'bg-red-500')}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Novo Pedido de Venda"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Forma de Pagamento</label>
              <select 
                {...register('formaPagamento')}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value={0}>Dinheiro</option>
                <option value={1}>Pix</option>
                <option value={2}>Cartão de Crédito</option>
                <option value={3}>Cartão de Débito</option>
                <option value={4}>Boleto Bancário</option>
              </select>
            </div>
          </div>

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

            <div className="space-y-3 pr-2">
              {fields.map((field, index) => {
                const selectedProd = produtos?.find(p => p.id === watchItens[index]?.produtoId);
                const preco = selectedProd?.precoVenda || 0;
                const qtd = watchItens[index]?.quantidade || 0;
                const descPerc = watchItens[index]?.desconto || 0;
                const subtotalBase = qtd * preco;
                const subtotalItem = Math.max(0, subtotalBase - (subtotalBase * (descPerc / 100)));

                return (
                  <div key={field.id} className="group flex flex-col sm:flex-row gap-4 items-start sm:items-end bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-300 hover:shadow-lg transition-all duration-300 relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-indigo-500 transition-colors rounded-l-2xl"></div>
                    
                    <div className="w-full sm:flex-1 sm:min-w-[180px] space-y-1.5">
                      <Controller
                        control={control}
                        name={`itens.${index}.produtoId`}
                        render={({ field }) => (
                          <SearchableSelect
                            label="Produto / Descrição"
                            placeholder="Selecione..."
                            options={produtos?.filter(p => p.ativo !== false && Number(p.tipo) !== 0).map(p => ({ 
                              value: p.id, 
                              label: `${Number(p.tipo) === 1 ? '🍞' : '📦'} ${p.nome} (${p.unidadeMedida}) - Saldo: ${p.quantidadeEstoque}` 
                            })) || []}
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.itens?.[index]?.produtoId?.message}
                            placeholder={!produtos ? "Carregando produtos..." : "Selecione o produto"}
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
                        <div className="w-20 sm:w-20 space-y-1.5 relative">
                          <Input 
                            label="Desc %" 
                            type="number"
                            step="0.1"
                            className="h-10 pl-2 pr-5 text-sm font-bold text-red-600 bg-red-50/30 border-red-100"
                            {...register(`itens.${index}.desconto`)}
                          />
                          <span className="absolute right-2 bottom-2.5 text-[10px] font-bold text-red-400">%</span>
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

      {/* Modal de Documentos (Boleto/Pix) */}
      <Modal 
        isOpen={!!selectedVendaDocs} 
        onClose={() => setSelectedVendaDocs(null)} 
        title="Documentos de Pagamento"
      >
        <div className="p-4 space-y-6 flex flex-col items-center">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full">
            <button 
              onClick={() => setSelectedVendaDocs(prev => prev ? {...prev, formaPagamento: 1} : null)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${Number(selectedVendaDocs?.formaPagamento) === 1 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              <PixIcon size={14} /> Pix
            </button>
            <button 
              onClick={() => setSelectedVendaDocs(prev => prev ? {...prev, formaPagamento: 4} : null)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${Number(selectedVendaDocs?.formaPagamento) === 4 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              <FileText size={14} /> Boleto
            </button>
          </div>

          {Number(selectedVendaDocs?.formaPagamento) === 1 ? (
            <>
              <div className="bg-white p-4 rounded-xl shadow-inner border border-slate-100">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedVendaDocs.pixQrCode || '00020126580014BR.GOV.BCB.PIX0136SGPF-FABRICA-CHAVE-PIX-MOCK-2024')}`} 
                  alt="QR Code Pix"
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-slate-500">Escaneie o código abaixo para pagar via Pix</p>
                <div className="bg-slate-100 p-3 rounded-lg text-[10px] font-mono break-all max-w-xs border border-slate-200">
                  {selectedVendaDocs.pixQrCode || '00020126580014BR.GOV.BCB.PIX0136SGPF-FABRICA-CHAVE-PIX-MOCK-2024'}
                </div>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedVendaDocs.pixQrCode || '');
                    alert('Código Pix copiado!');
                  }}
                >
                  Copiar Código Pix
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-full bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div className="font-bold text-lg text-slate-800">ITAU UNIBANCO S.A.</div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Vencimento</p>
                    <p className="font-bold text-slate-700">15/05/2026</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Beneficiário</p>
                  <p className="text-sm font-medium text-slate-700">SGP-FÁBRICA DE PANIFICAÇÃO LTDA</p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Nosso Número</p>
                    <p className="text-sm font-medium text-slate-700">{selectedVendaDocs?.numeroPedido.replace('PED-', '')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Valor do Documento</p>
                    <p className="text-lg font-black text-indigo-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedVendaDocs?.valorTotal || 0)}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t-2 border-black border-dashed">
                  <div className="w-full flex flex-col items-center gap-2">
                    <img 
                      src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${selectedVendaDocs?.boletoCodigoBarras?.replace(/\D/g, '') || '341917900101043510047910201500085950200000'}&scale=2&height=15&includetext`} 
                      alt="Código de Barras Boleto"
                      className="w-full max-h-24 object-contain"
                    />
                    <p className="text-[10px] font-bold font-mono tracking-widest text-slate-800">
                      {selectedVendaDocs?.boletoCodigoBarras || '34191.79001 01043.510047 91020.150008 5 950200000'}
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2">
                 <FileText size={18} /> Imprimir Boleto
              </Button>
            </>
          )}
          <p className="text-[10px] text-slate-400 text-center">Referente ao Pedido: {selectedVendaDocs?.numeroPedido}</p>
        </div>
      </Modal>
    </div>
  );
}
