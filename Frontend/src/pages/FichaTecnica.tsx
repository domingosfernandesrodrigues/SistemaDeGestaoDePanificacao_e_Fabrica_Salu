import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ChefHat, Plus, Trash2, Save, Loader2, Scale, Percent, Info, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { SearchableSelect } from '../components/ui/SearchableSelect';

interface InsumoItem {
  insumoId: string;
  quantidadeNecessaria: number;
  perdaPercentual: number;
  insumo?: any;
}

export function FichaTecnica() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProdutoId, setSelectedProdutoId] = useState('');
  const [rendimentoPadrao, setRendimentoPadrao] = useState(1);
  const [items, setItems] = useState<InsumoItem[]>([]);
  const [editMode, setEditMode] = useState(false);

  const queryClient = useQueryClient();

  // Queries
  const { data: fichas, isLoading: loadingFichas } = useQuery<any[]>({
    queryKey: ['fichas-tecnicas'],
    queryFn: async () => (await api.get('/fichas-tecnicas')).data,
  });

  const { data: produtos } = useQuery<any[]>({
    queryKey: ['produtos'],
    queryFn: async () => (await api.get('/Produtos')).data,
  });

  // Filtros de Produtos e Insumos baseados no cadastro
  const produtosFabricados = produtos?.filter(p => (p.tipo ?? p.Tipo) === 1) || [];
  const insumosDisponiveis = produtos?.filter(p => (p.tipo ?? p.Tipo) === 0) || [];

  const mutationSave = useMutation({
    mutationFn: (data: any) => api.post('/fichas-tecnicas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fichas-tecnicas'] });
      handleCloseModal();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao salvar ficha técnica')
  });

  const resetForm = () => {
    setSelectedProdutoId('');
    setRendimentoPadrao(1);
    setItems([]);
    setEditMode(false);
  };

  const addItem = () => {
    setItems([...items, { insumoId: '', quantidadeNecessaria: 0, perdaPercentual: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InsumoItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleEdit = (ficha: any) => {
    setEditMode(true);
    setSelectedProdutoId(ficha.produtoId || ficha.ProdutoId);
    setRendimentoPadrao(ficha.rendimentoPadrao || ficha.RendimentoPadrao || 1);
    const rawInsumos = ficha.insumos || ficha.Insumos || [];
    setItems(rawInsumos.map((i: any) => ({
      insumoId: i.insumoId || i.InsumoId,
      quantidadeNecessaria: i.quantidadeNecessaria || i.QuantidadeNecessaria || 0,
      perdaPercentual: i.perdaPercentual || i.PerdaPercentual || 0
    })));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSave = () => {
    if (!selectedProdutoId) return alert('Selecione um produto');
    if (items.length === 0) return alert('Adicione pelo menos um insumo');
    if (items.some(i => !i.insumoId || i.quantidadeNecessaria <= 0)) return alert('Preencha todos os campos dos insumos');

    mutationSave.mutate({
      produtoId: selectedProdutoId,
      rendimentoPadrao,
      insumos: items
    });
  };

  if (loadingFichas) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Fichas Técnicas (BOM)</h2>
          <p className="text-slate-500">Gerencie as receitas e composições de seus produtos fabricados.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600">
          <ChefHat size={18} /> Nova Receita
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fichas?.map((ficha) => {
          const insumos = ficha.insumos || ficha.Insumos || [];
          const produto = ficha.produto || ficha.Produto;
          const rendimento = ficha.rendimentoPadrao || ficha.RendimentoPadrao || 1;
          
          const custoTotal = insumos.reduce((acc: number, i: any) => {
            const ins = i.insumo || i.Insumo;
            const preco = ins?.precoCusto || ins?.PrecoCusto || 0;
            const qtd = i.quantidadeNecessaria || i.QuantidadeNecessaria || 0;
            const perda = i.perdaPercentual || i.PerdaPercentual || 0;
            const qtdComPerda = qtd * (1 + (perda / 100));
            return acc + (qtdComPerda * preco);
          }, 0);

          return (
            <div key={ficha.id || ficha.Id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-800 text-lg">{produto?.nome || produto?.Nome || 'Sem Nome'}</h3>
                  <button onClick={() => handleEdit(ficha)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <TrendingUp size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <Scale size={12} /> Rende: {rendimento} {produto?.unidadeMedida || produto?.UnidadeMedida}
                </div>
              </div>
              
              <div className="p-5 flex-1 space-y-3">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Ingredientes</p>
                  <div className="space-y-1">
                    {insumos.slice(0, 3).map((i: any) => {
                      const ins = i.insumo || i.Insumo;
                      return (
                        <div key={i.id || i.Id} className="flex justify-between text-sm">
                          <span className="text-slate-600 truncate mr-2">{ins?.nome || ins?.Nome}</span>
                          <span className="font-medium text-slate-800 whitespace-nowrap">
                            {i.quantidadeNecessaria || i.QuantidadeNecessaria} {ins?.unidadeMedida || ins?.UnidadeMedida}
                          </span>
                        </div>
                      );
                    })}
                    {insumos.length > 3 && <p className="text-xs text-slate-400 italic text-center mt-1">+ {insumos.length - 3} outros itens</p>}
                    {insumos.length === 0 && <p className="text-xs text-slate-400 italic text-center">Nenhum item.</p>}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-end mt-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Custo de Produção</p>
                    <p className="text-xl font-black text-indigo-600">
                      {custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">
                    Custo/Un: <br/>
                    <span className="font-bold">{(custoTotal / rendimento).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editMode ? "Editar Ficha Técnica" : "Nova Ficha Técnica"}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <SearchableSelect
                label="Produto Final"
                placeholder="Pesquise o produto..."
                options={produtosFabricados.map(p => ({ 
                  value: p.id || p.Id, 
                  label: `${p.nome || p.Nome} (${p.unidadeMedida || p.UnidadeMedida})` 
                }))}
                value={selectedProdutoId}
                onChange={(val) => !editMode && setSelectedProdutoId(val)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <Scale size={14} className="text-slate-400" /> Rendimento da Receita
              </label>
              <Input 
                type="number" 
                step="any"
                value={rendimentoPadrao === 0 ? '' : rendimentoPadrao} 
                onChange={(e) => setRendimentoPadrao(e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="Ex: 50.00"
              />
              <p className="text-[10px] text-slate-400">Quantidade total que esta receita produz.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <Scale size={16} className="text-indigo-600" /> Ingredientes
              </h4>
              <button onClick={addItem} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded">
                <Plus size={14} /> Adicionar
              </button>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 items-end">
                  <div className="col-span-12 sm:col-span-5 space-y-1">
                    <SearchableSelect
                      label="Insumo"
                      placeholder="Pesquise o insumo..."
                      options={insumosDisponiveis.map(i => ({ 
                        value: i.id || i.Id, 
                        label: `${i.nome || i.Nome} (${i.unidadeMedida || i.UnidadeMedida})` 
                      }))}
                      value={item.insumoId}
                      onChange={(val) => updateItem(index, 'insumoId', val)}
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Qtd</label>
                    <input 
                      type="number" 
                      step="any"
                      value={item.quantidadeNecessaria === 0 ? '' : item.quantidadeNecessaria} 
                      onChange={(e) => updateItem(index, 'quantidadeNecessaria', e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full h-9 px-2 rounded-md border border-slate-200 text-xs text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Perda %</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="any"
                        value={item.perdaPercentual === 0 ? '' : item.perdaPercentual} 
                        onChange={(e) => updateItem(index, 'perdaPercentual', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full h-9 px-2 pr-6 rounded-md border border-slate-200 text-xs text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <Percent className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-center pb-1">
                    <button onClick={() => removeItem(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} className="w-full bg-indigo-600" disabled={mutationSave.isPending}>
            {mutationSave.isPending ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
            {editMode ? 'Salvar Alterações' : 'Gravar Receita'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
