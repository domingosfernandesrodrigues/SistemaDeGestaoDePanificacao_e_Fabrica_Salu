import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PackagePlus, Loader2, Save, Edit2, Trash2, Power, PowerOff, AlertCircle } from 'lucide-react';
import api from '../services/api';

const produtoSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  tipo: z.coerce.number(),
  unidadeMedida: z.string().min(1, 'Informe a unidade'),
  precoCusto: z.coerce.number().min(0),
  precoVenda: z.coerce.number().min(0),
  quantidadeEstoque: z.coerce.number().min(0),
  ativo: z.boolean().default(true),
});

type ProdutoForm = z.infer<typeof produtoSchema>;

export function Produtos() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ProdutoForm>({
    resolver: zodResolver(produtoSchema),
    defaultValues: { tipo: 1, unidadeMedida: 'Un', precoCusto: 0, precoVenda: 0, quantidadeEstoque: 0, ativo: true }
  });

  const { data: produtos, isLoading } = useQuery<any[]>({
    queryKey: ['produtos'],
    queryFn: async () => {
      const response = await api.get('/Produtos');
      return response.data;
    },
  });

  const mutationSave = useMutation({
    mutationFn: (data: ProdutoForm) => {
      return editId 
        ? api.put(`/Produtos/${editId}`, { ...data, id: editId }) 
        : api.post('/Produtos', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      handleCloseModal();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao salvar produto')
  });

  const mutationDelete = useMutation({
    mutationFn: (id: string) => api.delete(`/Produtos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['produtos'] }),
    onError: (err: any) => {
      if (err.response?.status === 400 && err.response?.data?.canInactivate) {
        if (confirm(`${err.response.data.message}\n\nDeseja inativar o produto agora?`)) {
          mutationToggle.mutate(err.config.url.split('/').pop());
        }
      } else {
        alert(err.response?.data?.message || 'Erro ao excluir produto');
      }
    }
  });

  const mutationToggle = useMutation({
    mutationFn: (id: string) => api.patch(`/Produtos/${id}/toggle-status`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['produtos'] }),
  });

  const handleEdit = (produto: any) => {
    setEditId(produto.id);
    setValue('nome', produto.nome);
    setValue('tipo', produto.tipo);
    setValue('unidadeMedida', produto.unidadeMedida);
    setValue('precoCusto', produto.precoCusto);
    setValue('precoVenda', produto.precoVenda);
    setValue('quantidadeEstoque', produto.quantidadeEstoque);
    setValue('ativo', produto.ativo);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    reset();
  };

  const onSubmit = (data: ProdutoForm) => {
    mutationSave.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cadastro de Produtos</h2>
          <p className="text-slate-500">Gerencie todos os insumos, produtos fabricados e de revenda.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600">
          <PackagePlus size={18} />
          Novo Produto
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">Nome do Produto</th>
                <th className="px-6 py-4 font-medium">Tipo</th>
                <th className="px-6 py-4 font-medium text-right">Custo</th>
                <th className="px-6 py-4 font-medium text-right">Estoque</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {produtos?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Nenhum produto cadastrado.</td>
                </tr>
              )}
              {produtos?.map((produto) => (
                <tr key={produto.id} className={`hover:bg-slate-50 transition-colors ${produto.ativo === false ? 'opacity-60 bg-slate-50/50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{produto.nome}</div>
                    {produto.ativo === false && <span className="text-[10px] font-bold text-red-500 uppercase">Inativo</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      produto.tipo === 0 ? 'bg-amber-100 text-amber-800' : 
                      produto.tipo === 1 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {produto.tipo === 0 ? 'Insumo' : produto.tipo === 1 ? 'Fabricado' : 'Revenda'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600 tabular-nums">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.precoCusto)}
                  </td>
                  <td className={`px-6 py-4 text-right font-medium tabular-nums ${produto.quantidadeEstoque > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {produto.quantidadeEstoque} <span className="text-[10px] text-slate-400">{produto.unidadeMedida}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => mutationToggle.mutate(produto.id)}
                      className={`p-1.5 rounded-lg transition-colors ${produto.ativo === false ? 'text-slate-400 hover:bg-slate-100' : 'text-green-600 hover:bg-green-50'}`}
                      title={produto.ativo === false ? 'Ativar' : 'Inativar'}
                    >
                      {produto.ativo === false ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => handleEdit(produto)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => confirm('Deseja realmente excluir este produto?') && mutationDelete.mutate(produto.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
        title={editId ? "Editar Produto" : "Cadastrar Novo Produto"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input 
            label="Nome do Produto" 
            placeholder="Ex: Pão Francês 50g"
            {...register('nome')}
            error={errors.nome?.message}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Tipo de Produto</label>
              <select 
                {...register('tipo')}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value={0}>Insumo (Matéria-prima)</option>
                <option value={1}>Produto Acabado (Fabricado)</option>
                <option value={2}>Revenda (Comprado pronto)</option>
              </select>
            </div>
            <Input 
              label="Unidade (Ex: Kg, Un)" 
              placeholder="Un"
              {...register('unidadeMedida')}
              error={errors.unidadeMedida?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Preço de Custo (R$)" 
              type="number" 
              step="0.0001"
              {...register('precoCusto')}
              error={errors.precoCusto?.message}
            />
            <Input 
              label="Preço de Venda (R$)" 
              type="number" 
              step="0.01"
              {...register('precoVenda')}
              error={errors.precoVenda?.message}
            />
          </div>

          <Input 
            label="Estoque Inicial" 
            type="number"
            step="0.001"
            {...register('quantidadeEstoque')}
            error={errors.quantidadeEstoque?.message}
          />

          <div className="flex items-center gap-2 py-2">
            <input type="checkbox" {...register('ativo')} id="ativo" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <label htmlFor="ativo" className="text-sm font-medium text-slate-700">Produto Ativo</label>
          </div>

          <div className="pt-4 flex gap-3">
            <Button 
              type="button" 
              variant="secondary" 
              className="flex-1" 
              onClick={handleCloseModal}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white"
              disabled={mutationSave.isPending}
            >
              {mutationSave.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {editId ? 'Atualizar Dados' : 'Salvar Produto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
