import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Settings, Droplet, ArrowRightLeft, Loader2, Save, Car, Truck, Trash2 } from 'lucide-react';
import api from '../services/api';

const veiculoSchema = z.object({
  modelo: z.string().min(2, 'Informe o modelo'),
  placa: z.string().min(7, 'Placa inválida'),
  quilometragemAtual: z.coerce.number().min(0),
});

const trocaSchema = z.object({
  clienteId: z.string().min(1, 'Selecione o cliente'),
  produtoId: z.string().min(1, 'Selecione o produto'),
  quantidade: z.coerce.number().min(1),
  motivo: z.string().min(1, 'Informe o motivo'),
});

const abastSchema = z.object({
  veiculoId: z.string(),
  quilometragemRegistrada: z.coerce.number().min(0),
  litros: z.coerce.number().min(0.1),
  valorTotal: z.coerce.number().min(0.1),
});

const manuSchema = z.object({
  veiculoId: z.string(),
  tipo: z.coerce.number(), // 0: Preventiva, 1: Corretiva
  descricao: z.string().min(3, 'Descreva a manutenção'),
  custoTotal: z.coerce.number().min(0.01),
  quilometragemRegistrada: z.coerce.number().min(0),
});

export function Frota() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAbastModalOpen, setIsAbastModalOpen] = useState(false);
  const [isManuModalOpen, setIsManuModalOpen] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<any>(null);
  
  // Filtros de Histórico
  const [filterDate, setFilterDate] = useState('');
  const [filterVeiculoId, setFilterVeiculoId] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  const queryClient = useQueryClient();
  
  const { register: regV, handleSubmit: handleV, reset: resetV, formState: { errors: errV } } = useForm({
    resolver: zodResolver(veiculoSchema)
  });

  const { register: regA, handleSubmit: handleA, reset: resetA, setValue: setA, formState: { errors: errA } } = useForm({
    resolver: zodResolver(abastSchema)
  });

  const { register: regM, handleSubmit: handleM, reset: resetM, setValue: setM, formState: { errors: errM } } = useForm({
    resolver: zodResolver(manuSchema)
  });

  const { data: veiculos, isLoading } = useQuery<any[]>({
    queryKey: ['veiculos'],
    queryFn: async () => {
      const response = await api.get('/Logistica/veiculos');
      return response.data;
    },
  });

  const { data: abastecimentos } = useQuery<any[]>({
    queryKey: ['abastecimentos'],
    queryFn: async () => (await api.get('/Logistica/abastecimentos')).data,
  });

  const { data: manutencoes } = useQuery<any[]>({
    queryKey: ['manutencoes'],
    queryFn: async () => (await api.get('/Logistica/manutencoes')).data,
  });

  const mutation = useMutation({
    mutationFn: (newVeiculo: any) => api.post('/Logistica/veiculos', newVeiculo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      setIsModalOpen(false);
      resetV();
    },
  });

  const mutationAbast = useMutation({
    mutationFn: (data: any) => api.post('/Logistica/abastecer', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      queryClient.invalidateQueries({ queryKey: ['abastecimentos'] });
      setIsAbastModalOpen(false);
      resetA();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao abastecer')
  });

  const mutationManu = useMutation({
    mutationFn: (data: any) => api.post('/Logistica/manutencao', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      queryClient.invalidateQueries({ queryKey: ['manutencoes'] });
      setIsManuModalOpen(false);
      resetM();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao registrar manutenção')
  });

  const mutationToggleStatus = useMutation({
    mutationFn: (id: string) => api.patch(`/Logistica/veiculos/${id}/toggle-status`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['veiculos'] }),
  });

  const mutationDeleteVeiculo = useMutation({
    mutationFn: (id: string) => api.delete(`/Logistica/veiculos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['veiculos'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao excluir veículo')
  });

  const openAbast = (veiculo: any) => {
    setSelectedVeiculo(veiculo);
    setA('veiculoId', veiculo.id);
    setA('quilometragemRegistrada', veiculo.quilometragemAtual);
    setIsAbastModalOpen(true);
  };

  const openManu = (veiculo: any) => {
    setSelectedVeiculo(veiculo);
    setM('veiculoId', veiculo.id);
    setM('quilometragemRegistrada', veiculo.quilometragemAtual);
    setIsManuModalOpen(true);
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Controle de Frota</h2>
          <p className="text-slate-500">Acompanhe a quilometragem, manutenções e abastecimentos dos veículos.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900">
          <Car size={18} />
          Novo Veículo
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {veiculos?.map((veiculo) => (
          <div key={veiculo.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start gap-6">
            <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Truck size={32} className="text-slate-400" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{veiculo.modelo}</h3>
                  <span className="inline-block mt-1 font-mono bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-sm font-bold text-slate-700">
                    {veiculo.placa}
                  </span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    veiculo.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {veiculo.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex gap-1 mb-1">
                    <button 
                      onClick={() => mutationToggleStatus.mutate(veiculo.id)}
                      className={`p-1 rounded hover:bg-slate-100 ${veiculo.ativo ? 'text-slate-400' : 'text-green-600'}`}
                      title={veiculo.ativo ? 'Inativar Veículo' : 'Ativar Veículo'}
                    >
                      <Save size={14} />
                    </button>
                    <button 
                      onClick={() => confirm('Excluir este veículo permanentemente?') && mutationDeleteVeiculo.mutate(veiculo.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100"
                      title="Excluir Veículo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-indigo-600">{veiculo.quilometragemAtual}</span>
                    <span className="text-slate-500 text-sm ml-1">Km</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-none"
                  onClick={() => openAbast(veiculo)}
                >
                  <Droplet size={14} className="mr-2" /> Abastecer
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="flex-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border-none"
                  onClick={() => openManu(veiculo)}
                >
                  <Settings size={14} className="mr-2" /> Manutenção
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Veículo">
        <form onSubmit={handleV((data) => mutation.mutate(data))} className="space-y-4">
          <Input label="Modelo do Veículo" placeholder="Ex: Renault Master" {...regV('modelo')} error={errV.modelo?.message as string} />
          <Input label="Placa" placeholder="ABC1D23" {...regV('placa')} error={errV.placa?.message as string} />
          <Input label="Km Atual" type="number" {...regV('quilometragemAtual')} error={errV.quilometragemAtual?.message as string} />
          <Button type="submit" className="w-full flex justify-center gap-2" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar Veículo
          </Button>
        </form>
      </Modal>

      <Modal isOpen={isAbastModalOpen} onClose={() => setIsAbastModalOpen(false)} title={`Abastecer: ${selectedVeiculo?.modelo}`}>
        <form onSubmit={handleA((data) => mutationAbast.mutate(data))} className="space-y-4">
          <Input label="Quilometragem (Km)" type="number" {...regA('quilometragemRegistrada')} error={errA.quilometragemRegistrada?.message as string} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Litros" type="number" step="0.01" {...regA('litros')} error={errA.litros?.message as string} />
            <Input label="Valor Total (R$)" type="number" step="0.01" {...regA('valorTotal')} error={errA.valorTotal?.message as string} />
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 flex justify-center gap-2" disabled={mutationAbast.isPending}>
            {mutationAbast.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Registrar Abastecimento
          </Button>
        </form>
      </Modal>

      <Modal isOpen={isManuModalOpen} onClose={() => setIsManuModalOpen(false)} title={`Manutenção: ${selectedVeiculo?.modelo}`}>
        <form onSubmit={handleM((data) => mutationManu.mutate(data))} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Tipo de Manutenção</label>
            <select {...regM('tipo')} className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-amber-500 outline-none">
              <option value="0">Preventiva</option>
              <option value="1">Corretiva</option>
            </select>
          </div>
          <Input label="Descrição" placeholder="Ex: Troca de óleo e filtros" {...regM('descricao')} error={errM.descricao?.message as string} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Custo (R$)" type="number" step="0.01" {...regM('custoTotal')} error={errM.custoTotal?.message as string} />
            <Input label="Km na Manutenção" type="number" {...regM('quilometragemRegistrada')} error={errM.quilometragemRegistrada?.message as string} />
          </div>
          <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 flex justify-center gap-2" disabled={mutationManu.isPending}>
            {mutationManu.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Registrar Manutenção
          </Button>
        </form>
      </Modal>

      {/* Histórico de Frota */}
      <div className="mt-12 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ArrowRightLeft size={20} className="text-indigo-600" /> Histórico de Atividades da Frota
          </h3>
          
          {/* Barra de Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-9 px-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <select 
              value={filterVeiculoId}
              onChange={(e) => setFilterVeiculoId(e.target.value)}
              className="h-9 px-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Todos os Veículos</option>
              {veiculos?.map(v => <option key={v.id} value={v.id}>{v.placa} - {v.modelo}</option>)}
            </select>
            <select 
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="h-9 px-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Todos os Tipos</option>
              <option value="abast">Abastecimentos</option>
              <option value="manu">Manutenções</option>
            </select>
            {(filterDate || filterVeiculoId || filterTipo) && (
              <button 
                onClick={() => { setFilterDate(''); setFilterVeiculoId(''); setFilterTipo(''); }}
                className="text-xs font-bold text-red-500 hover:text-red-600 px-2"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Veículo</th>
                  <th className="px-6 py-4 font-medium">Tipo</th>
                  <th className="px-6 py-4 font-medium">Detalhes</th>
                  <th className="px-6 py-4 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...(abastecimentos || []), ...(manutencoes || [])]
                  .filter(event => {
                    const isAbast = 'litros' in event;
                    const matchesDate = !filterDate || new Date(event.data).toISOString().split('T')[0] === filterDate;
                    const matchesVeiculo = !filterVeiculoId || event.veiculoId === filterVeiculoId;
                    const matchesTipo = !filterTipo || (filterTipo === 'abast' ? isAbast : !isAbast);
                    return matchesDate && matchesVeiculo && matchesTipo;
                  })
                  .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                  .map((event, idx) => {
                    const veiculo = veiculos?.find(v => v.id === event.veiculoId);
                    const isAbast = 'litros' in event;
                    
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-500">{new Date(event.data).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{veiculo?.modelo}</div>
                          <div className="text-[10px] font-mono text-slate-400">{veiculo?.placa}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isAbast ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {isAbast ? 'Abastecimento' : 'Manutenção'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {isAbast 
                            ? `${event.litros}L em ${event.quilometragemRegistrada} Km` 
                            : `${event.descricao} (${event.tipo === 0 ? 'Prev.' : 'Corr.'})`
                          }
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">
                          {Number(event.valorTotal || event.custoTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    );
                  })}
                {(!abastecimentos?.length && !manutencoes?.length) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">
                      Nenhuma atividade registrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Trocas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(trocaSchema)
  });

  const { data: trocas, isLoading } = useQuery<any[]>({
    queryKey: ['trocas'],
    queryFn: async () => {
      const response = await api.get('/Logistica/trocas');
      return response.data;
    },
  });

  const { data: clientes } = useQuery<any[]>({ queryKey: ['clientes'], queryFn: async () => (await api.get('/Clientes')).data });
  const { data: produtos } = useQuery<any[]>({ queryKey: ['produtos'], queryFn: async () => (await api.get('/Produtos')).data });

  const mutation = useMutation({
    mutationFn: (newTroca: any) => api.post('/Logistica/trocas', newTroca),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trocas'] });
      setIsModalOpen(false);
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao registrar troca')
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  return (
    <div className="space-y-6 mt-12">
      <div className="flex items-center justify-between border-t border-slate-200 pt-10">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Logística Reversa (Trocas)</h2>
          <p className="text-slate-500">Registre avarias e faça a reposição imediata sem cobrar o cliente novamente.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700">
          <ArrowRightLeft size={18} /> Registrar Avaria
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium">Data</th>
              <th className="px-6 py-4 font-medium">Cliente</th>
              <th className="px-6 py-4 font-medium">Produto</th>
              <th className="px-6 py-4 font-medium">Motivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trocas?.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhuma troca registrada.</td></tr>}
            {trocas?.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-slate-600">{new Date(t.dataTroca).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-medium text-slate-900">{clientes?.find(c => c.id === t.clienteId)?.nomeFantasia || 'Cliente'}</td>
                <td className="px-6 py-4 text-slate-600">{produtos?.find(p => p.id === t.produtoId)?.nome || 'Produto'}</td>
                <td className="px-6 py-4 text-slate-600">{t.motivo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Troca/Avaria">
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Cliente</label>
            <select {...register('clienteId')} className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm">
              <option value="">Selecione...</option>
              {clientes?.map(c => <option key={c.id} value={c.id}>{c.nomeFantasia}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Produto</label>
            <select {...register('produtoId')} className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm">
              <option value="">Selecione...</option>
              {produtos?.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <Input label="Quantidade" type="number" {...register('quantidade')} error={errors.quantidade?.message as string} />
          <Input label="Motivo (Avaria, Vencimento, etc)" {...register('motivo')} error={errors.motivo?.message as string} />
          <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 flex justify-center gap-2" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Registrar Troca
          </Button>
        </form>
      </Modal>
    </div>
  );
}
