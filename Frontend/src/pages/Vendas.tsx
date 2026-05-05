import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { ShoppingCart, Truck, CheckCircle, Loader2, Plus, Trash2, Save } from 'lucide-react';
import api from '../services/api';

const pedidoSchema = z.object({
  clienteId: z.string().min(1, 'Selecione um cliente'),
  itens: z.array(z.object({
    produtoId: z.string().min(1, 'Selecione um produto'),
    quantidade: z.coerce.number().min(1, 'Mínimo 1'),
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
  const queryClient = useQueryClient();

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<PedidoForm>({
    resolver: zodResolver(pedidoSchema),
    defaultValues: { itens: [{ produtoId: '', quantidade: 1 }] }
  });

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
      setIsModalOpen(false);
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao criar pedido')
  });

  const mutationUpdate = useMutation({
    mutationFn: async ({ id, action }: { id: string, action: string }) => {
      if (action === 'entregar') return api.post(`/Vendas/${id}/entregar`);
      return Promise.reject('Ação não implementada');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendas'] }),
  });

  const onSubmit = (data: PedidoForm) => {
    mutationCreate.mutate(data);
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
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
          {title}
        </h3>
        
        <div className="space-y-4">
          {filtradas.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Nenhum pedido</p>}
          {filtradas.map(venda => (
            <div key={venda.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:border-indigo-300 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-400">{venda.numeroPedido}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  statusValue === 0 ? 'bg-purple-100 text-purple-800' :
                  statusValue === 1 ? 'bg-amber-100 text-amber-800' :
                  statusValue === 2 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {statusValue === 0 ? 'Novo' : statusValue === 1 ? 'Separação' : statusValue === 2 ? 'Em Rota' : 'Entregue'}
                </span>
              </div>
              <h4 className="font-bold text-slate-800">{venda.cliente?.nomeFantasia || 'Cliente'}</h4>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="font-bold text-indigo-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.valorTotal)}
                </span>
                {statusValue === 2 && (
                  <Button 
                    size="sm" 
                    className="text-xs"
                    onClick={() => mutationUpdate.mutate({ id: venda.id, action: 'entregar' })}
                    disabled={mutationUpdate.isPending}
                  >
                    Confirmar Entrega
                  </Button>
                )}
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                onClick={() => append({ produtoId: '', quantidade: 1 })}
                className="text-xs flex items-center gap-1"
              >
                <Plus size={14} /> Adicionar Item
              </Button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-3 items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex-1 space-y-1">
                    <Controller
                      control={control}
                      name={`itens.${index}.produtoId`}
                      render={({ field }) => (
                        <SearchableSelect
                          label="Produto"
                          placeholder="Pesquise..."
                          options={produtos?.filter(p => p.tipo !== 0).map(p => ({ value: p.id, label: p.nome })) || []}
                          value={field.value}
                          onChange={field.onChange}
                          error={errors.itens?.[index]?.produtoId?.message}
                        />
                      )}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <Input 
                      label="Qtd" 
                      type="number"
                      className="h-9 text-xs"
                      {...register(`itens.${index}.quantidade`)}
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => remove(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mb-0.5"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            {errors.itens && <p className="text-xs text-red-500">{errors.itens.message}</p>}
          </div>

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
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600"
              disabled={mutationCreate.isPending}
            >
              {mutationCreate.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Finalizar Pedido
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
