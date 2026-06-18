import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import {
  Settings, Droplet, ArrowRightLeft, Loader2, Save, Car, Truck, Trash2,
  ChevronLeft, ChevronRight, TrendingDown, Fuel, Wrench, DollarSign, CalendarDays, Pencil
} from 'lucide-react';
import api from '../services/api';

const veiculoSchema = z.object({
  modelo: z.string().min(2, 'Informe o modelo'),
  placa: z.string().min(7, 'Placa inválida'),
  quilometragemAtual: z.coerce.number().min(0),
});

const trocaSchema = z.object({
  clienteId: z.string().min(1, 'Selecione o cliente'),
  produtoId: z.string().min(1, 'Selecione o produto'),
  motoristaId: z.string().optional().nullable(),
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

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const anos = ['2024', '2025', '2026', '2027', '2028'];

// --- Financial Panel Sub-component ---
function PainelFinanceiroFrota() {
  const now = new Date();
  const [filtroMes, setFiltroMes] = useState(String(now.getMonth() + 1));
  const [filtroAno, setFiltroAno] = useState(String(now.getFullYear()));
  const [filtroTipo, setFiltroTipo] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 8;

  const { data: financeiro, isLoading } = useQuery<any>({
    queryKey: ['financeiro-frota', filtroMes, filtroAno],
    queryFn: async () => {
      const params: any = {};
      if (filtroMes) params.mes = filtroMes;
      if (filtroAno) params.ano = filtroAno;
      return (await api.get('/Logistica/financeiro-frota', { params })).data;
    },
  });

  useEffect(() => { setPaginaAtual(1); }, [filtroMes, filtroAno, filtroTipo]);

  const lancamentos: any[] = financeiro?.lancamentos || [];
  const filtrados = filtroTipo
    ? lancamentos.filter(l =>
        filtroTipo === 'abast'
          ? l.descricao?.startsWith('Abastecimento')
          : l.descricao?.startsWith('Manutenção')
      )
    : lancamentos;

  const totalPaginas = Math.ceil(filtrados.length / itensPorPagina) || 1;
  const paginados = filtrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  const fmt = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const mesLabel = filtroMes ? meses[Number(filtroMes) - 1] : 'Todos';

  return (
    <div className="mt-8 space-y-5">
      {/* Section header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-200 pt-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <DollarSign size={20} className="text-fire" />
            Controle Financeiro da Frota
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Custos de abastecimento e manutenção integrados ao fluxo de caixa.
          </p>
        </div>

        {/* Period filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filtroMes}
            onChange={e => setFiltroMes(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="">Todos os meses</option>
            {meses.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
          </select>
          <select
            value={filtroAno}
            onChange={e => setFiltroAno(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="">Todos os anos</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="">Todos os tipos</option>
            <option value="abast">Abastecimentos</option>
            <option value="manu">Manutenções</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-ember" size={28} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Calculate KPI values respecting the type filter */}
          {(() => {
            const base = filtroTipo
              ? lancamentos.filter(l =>
                  filtroTipo === 'abast'
                    ? l.descricao?.startsWith('Abastecimento')
                    : l.descricao?.startsWith('Manutenção')
                )
              : lancamentos;
            const kpiAbast = base.filter(l => l.descricao?.startsWith('Abastecimento')).reduce((s: number, l: any) => s + Number(l.valor), 0);
            const kpiManu = base.filter(l => l.descricao?.startsWith('Manutenção')).reduce((s: number, l: any) => s + Number(l.valor), 0);
            const kpiTotal = kpiAbast + kpiManu;
            return (
              <>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Fuel size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Abastecimento</p>
                    <p className="text-xl font-bold text-slate-800">{fmt(kpiAbast)}</p>
                    <p className="text-[10px] text-slate-500">{mesLabel} {filtroAno}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                    <Wrench size={20} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Manutenção</p>
                    <p className="text-xl font-bold text-slate-800">{fmt(kpiManu)}</p>
                    <p className="text-[10px] text-slate-500">{mesLabel} {filtroAno}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-xl p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <TrendingDown size={20} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Total Frota</p>
                    <p className="text-xl font-bold text-slate-800">{fmt(kpiTotal)}</p>
                    <p className="text-[10px] text-slate-500">{mesLabel} {filtroAno}</p>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Transactions table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <CalendarDays size={15} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Lançamentos Financeiros</span>
          {filtrados.length > 0 && (
            <span className="ml-auto text-[10px] font-bold text-slate-400">{filtrados.length} registro{filtrados.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[640px]">
            <thead className="text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 font-medium text-xs">Data</th>
                <th className="px-5 py-3 font-medium text-xs">Tipo</th>
                <th className="px-5 py-3 font-medium text-xs">Descrição</th>
                <th className="px-5 py-3 font-medium text-xs text-center">Status</th>
                <th className="px-5 py-3 font-medium text-xs text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginados.map((l: any, idx: number) => {
                const isAbast = l.descricao?.startsWith('Abastecimento');
                return (
                  <tr key={l.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(l.dataEmissao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isAbast
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isAbast ? <Fuel size={10} /> : <Wrench size={10} />}
                        {isAbast ? 'Combustível' : 'Manutenção'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 text-xs max-w-[280px] truncate" title={l.descricao}>
                      {l.descricao}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        l.status === 2 /* Paga */
                          ? 'bg-green-50 text-green-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {l.status === 2 ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900 text-sm whitespace-nowrap">
                      {Number(l.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400 italic text-sm">
                    Nenhum lançamento de frota no período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
            {filtrados.length > 0 && (
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={4} className="px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Total do período
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-fire text-sm">
                    {fmt(filtrados.reduce((s: number, l: any) => s + Number(l.valor), 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className="border-t border-slate-100 p-4 flex items-center justify-between">
            <span className="text-xs text-slate-500">Página {paginaAtual} de {totalPaginas}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPaginaAtual(p => Math.max(1, p - 1))} disabled={paginaAtual === 1} className="h-8 px-3">
                <ChevronLeft size={15} />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas} className="h-8 px-3">
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Frota Component ---
export function Frota() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAbastModalOpen, setIsAbastModalOpen] = useState(false);
  const [isManuModalOpen, setIsManuModalOpen] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<any>(null);
  
  const [isEditAbastModalOpen, setIsEditAbastModalOpen] = useState(false);
  const [isEditManuModalOpen, setIsEditManuModalOpen] = useState(false);
  const [selectedAbast, setSelectedAbast] = useState<any>(null);
  const [selectedManu, setSelectedManu] = useState<any>(null);
  
  // Filtros de Histórico
  const [filterDate, setFilterDate] = useState('');
  const [filterVeiculoId, setFilterVeiculoId] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  const queryClient = useQueryClient();
  
  const { register: regV, handleSubmit: handleV, reset: resetV, formState: { errors: errV } } = useForm({
    resolver: zodResolver(veiculoSchema)
  });

  const { register: regE, handleSubmit: handleE, reset: resetE, formState: { errors: errE } } = useForm({
    resolver: zodResolver(veiculoSchema)
  });

  const { register: regA, handleSubmit: handleA, reset: resetA, setValue: setA, formState: { errors: errA } } = useForm({
    resolver: zodResolver(abastSchema)
  });

  const { register: regM, handleSubmit: handleM, reset: resetM, setValue: setM, formState: { errors: errM } } = useForm({
    resolver: zodResolver(manuSchema)
  });

  const { register: regEditA, handleSubmit: handleEditA, reset: resetEditA, setValue: setEditA, formState: { errors: errEditA } } = useForm({
    resolver: zodResolver(abastSchema)
  });

  const { register: regEditM, handleSubmit: handleEditM, reset: resetEditM, setValue: setEditM, formState: { errors: errEditM } } = useForm({
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

  const mutationEdit = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/Logistica/veiculos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      setIsEditModalOpen(false);
      resetE();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao editar veículo')
  });

  const mutationAbast = useMutation({
    mutationFn: (data: any) => api.post('/Logistica/abastecer', data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      queryClient.invalidateQueries({ queryKey: ['abastecimentos'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-frota'] });
      setIsAbastModalOpen(false);
      resetA();
      if (res.data?.warning) alert(res.data.warning);
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao abastecer')
  });

  const mutationManu = useMutation({
    mutationFn: (data: any) => api.post('/Logistica/manutencao', data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      queryClient.invalidateQueries({ queryKey: ['manutencoes'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-frota'] });
      setIsManuModalOpen(false);
      resetM();
      if (res.data?.warning) alert(res.data.warning);
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao registrar manutenção')
  });

  const mutationEditAbast = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/Logistica/abastecer/${id}`, { id, ...data }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      queryClient.invalidateQueries({ queryKey: ['abastecimentos'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-frota'] });
      setIsEditAbastModalOpen(false);
      if (res.data?.warning) alert(res.data.warning);
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao editar abastecimento')
  });

  const mutationDeleteAbast = useMutation({
    mutationFn: (id: string) => api.delete(`/Logistica/abastecer/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      queryClient.invalidateQueries({ queryKey: ['abastecimentos'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-frota'] });
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao excluir abastecimento')
  });

  const mutationEditManu = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/Logistica/manutencao/${id}`, { id, ...data }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      queryClient.invalidateQueries({ queryKey: ['manutencoes'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-frota'] });
      setIsEditManuModalOpen(false);
      if (res.data?.warning) alert(res.data.warning);
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao editar manutenção')
  });

  const mutationDeleteManu = useMutation({
    mutationFn: (id: string) => api.delete(`/Logistica/manutencao/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veiculos'] });
      queryClient.invalidateQueries({ queryKey: ['manutencoes'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-frota'] });
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao excluir manutenção')
  });

  const openEditAbast = (abast: any) => {
    setSelectedAbast(abast);
    resetEditA({
      veiculoId: abast.veiculoId,
      quilometragemRegistrada: abast.quilometragemRegistrada,
      litros: abast.litros,
      valorTotal: abast.valorTotal,
    });
    setIsEditAbastModalOpen(true);
  };

  const openEditManu = (manu: any) => {
    setSelectedManu(manu);
    resetEditM({
      veiculoId: manu.veiculoId,
      tipo: manu.tipo,
      descricao: manu.descricao,
      custoTotal: manu.custoTotal,
      quilometragemRegistrada: manu.quilometragemRegistrada,
    });
    setIsEditManuModalOpen(true);
  };

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
    setA('quilometragemRegistrada', '' as any);
    setIsAbastModalOpen(true);
  };

  const openManu = (veiculo: any) => {
    setSelectedVeiculo(veiculo);
    setM('veiculoId', veiculo.id);
    setM('quilometragemRegistrada', '' as any);
    setIsManuModalOpen(true);
  };

  const openEdit = (veiculo: any) => {
    setSelectedVeiculo(veiculo);
    resetE({
      modelo: veiculo.modelo,
      placa: veiculo.placa,
      quilometragemAtual: veiculo.quilometragemAtual,
    });
    setIsEditModalOpen(true);
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-ember" size={32} /></div>;

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
          <div key={veiculo.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
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
                      onClick={() => openEdit(veiculo)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                      title="Editar Veículo"
                    >
                      <Pencil size={14} />
                    </button>
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
                    <span className="text-2xl font-bold text-fire">{veiculo.quilometragemAtual}</span>
                    <span className="text-slate-500 text-sm ml-1">Km</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="flex-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border-none"
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

      {/* Financial Control Panel */}
      <PainelFinanceiroFrota />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Veículo">
        <form onSubmit={handleV((data) => mutation.mutate(data))} className="space-y-4">
          <Input label="Modelo do Veículo" required placeholder="Ex: Renault Master" {...regV('modelo')} error={errV.modelo?.message as string} />
          <Input label="Placa" required placeholder="ABC1D23" {...regV('placa')} error={errV.placa?.message as string} />
          <Input label="Km Atual" required type="number" {...regV('quilometragemAtual')} error={errV.quilometragemAtual?.message as string} />
          <Button type="submit" className="w-full flex justify-center gap-2" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar Veículo
          </Button>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); resetE(); }} title={`Editar: ${selectedVeiculo?.modelo}`}>
        <form onSubmit={handleE((data) => mutationEdit.mutate({ id: selectedVeiculo.id, data }))} className="space-y-4">
          <Input label="Modelo do Veículo" required placeholder="Ex: Renault Master" {...regE('modelo')} error={errE.modelo?.message as string} />
          <Input label="Placa" required placeholder="ABC1D23" {...regE('placa')} error={errE.placa?.message as string} />
          <Input label="Km Atual" required type="number" {...regE('quilometragemAtual')} error={errE.quilometragemAtual?.message as string} />
          <Button type="submit" className="w-full flex justify-center gap-2 bg-blue-600 hover:bg-blue-700" disabled={mutationEdit.isPending}>
            {mutationEdit.isPending ? <Loader2 className="animate-spin" size={18} /> : <Pencil size={18} />} Salvar Alterações
          </Button>
        </form>
      </Modal>

      <Modal isOpen={isAbastModalOpen} onClose={() => setIsAbastModalOpen(false)} title={`Abastecer: ${selectedVeiculo?.modelo}`}>
        <form onSubmit={handleA((data) => mutationAbast.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quilometragem Atual (Km)" required type="number" {...regA('quilometragemRegistrada')} error={errA.quilometragemRegistrada?.message as string} />
            <Input label="Litros" required type="number" step="0.01" {...regA('litros')} error={errA.litros?.message as string} />
          </div>
          <Input label="Valor Total (R$)" required type="number" step="0.01" {...regA('valorTotal')} error={errA.valorTotal?.message as string} />
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
            <DollarSign size={14} className="shrink-0 mt-0.5" />
            <span>O valor será lançado automaticamente no <strong>fluxo de caixa</strong> e aparecerá no painel financeiro da frota abaixo.</span>
          </div>
          <Button type="submit" className="w-full bg-gradient-to-r from-fire to-ember hover:opacity-90 flex justify-center gap-2 shadow-md" disabled={mutationAbast.isPending}>
            {mutationAbast.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Registrar Abastecimento
          </Button>
        </form>
      </Modal>

      <Modal isOpen={isManuModalOpen} onClose={() => setIsManuModalOpen(false)} title={`Manutenção: ${selectedVeiculo?.modelo}`}>
        <form onSubmit={handleM((data) => mutationManu.mutate(data))} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Tipo de Manutenção <span className="text-red-500">*</span></label>
            <select {...regM('tipo')} className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-amber-500 outline-none">
              <option value="0">Preventiva</option>
              <option value="1">Corretiva</option>
            </select>
            <div className="flex gap-3 mt-2 p-2 bg-slate-50 rounded border border-slate-100 text-[10px] leading-relaxed">
              <div className="flex-1">
                <span className="font-bold text-fire block mb-0.5">PREVENTIVA:</span>
                <p className="text-slate-500 italic">Planejada para evitar falhas (ex: óleo, filtros, revisões).</p>
              </div>
              <div className="w-px bg-slate-200"></div>
              <div className="flex-1">
                <span className="font-bold text-amber-600 block mb-0.5">CORRETIVA:</span>
                <p className="text-slate-500 italic">Reparo de algo que já quebrou ou falhou.</p>
              </div>
            </div>
          </div>
          <Textarea label="Descrição Detalhada" required placeholder="Descreva os serviços realizados, peças trocadas, etc." {...regM('descricao')} error={errM.descricao?.message as string} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Km na Manutenção" required type="number" {...regM('quilometragemRegistrada')} error={errM.quilometragemRegistrada?.message as string} />
            <Input label="Custo (R$)" required type="number" step="0.01" {...regM('custoTotal')} error={errM.custoTotal?.message as string} />
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-600 flex items-start gap-2">
            <DollarSign size={14} className="shrink-0 mt-0.5" />
            <span>O custo será lançado automaticamente no <strong>fluxo de caixa</strong> e aparecerá no painel financeiro da frota abaixo.</span>
          </div>
          <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 flex justify-center gap-2" disabled={mutationManu.isPending}>
            {mutationManu.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Registrar Manutenção
          </Button>
        </form>
      </Modal>

      <Modal isOpen={isEditAbastModalOpen} onClose={() => setIsEditAbastModalOpen(false)} title={`Editar Abastecimento`}>
        <form onSubmit={handleEditA((data) => mutationEditAbast.mutate({ id: selectedAbast.id, data }))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quilometragem Atual (Km)" required type="number" {...regEditA('quilometragemRegistrada')} error={errEditA.quilometragemRegistrada?.message as string} />
            <Input label="Litros" required type="number" step="0.01" {...regEditA('litros')} error={errEditA.litros?.message as string} />
          </div>
          <Input label="Valor Total (R$)" required type="number" step="0.01" {...regEditA('valorTotal')} error={errEditA.valorTotal?.message as string} />
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
            <DollarSign size={14} className="shrink-0 mt-0.5" />
            <span>O valor ajustado será atualizado automaticamente no <strong>fluxo de caixa</strong> e no saldo da conta.</span>
          </div>
          <Button type="submit" className="w-full bg-gradient-to-r from-fire to-ember hover:opacity-90 flex justify-center gap-2 shadow-md" disabled={mutationEditAbast.isPending}>
            {mutationEditAbast.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar Alterações
          </Button>
        </form>
      </Modal>

      <Modal isOpen={isEditManuModalOpen} onClose={() => setIsEditManuModalOpen(false)} title={`Editar Manutenção`}>
        <form onSubmit={handleEditM((data) => mutationEditManu.mutate({ id: selectedManu.id, data }))} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Tipo de Manutenção <span className="text-red-500">*</span></label>
            <select {...regEditM('tipo')} className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-amber-500 outline-none">
              <option value="0">Preventiva</option>
              <option value="1">Corretiva</option>
            </select>
          </div>
          <Textarea label="Descrição Detalhada" required placeholder="Descreva os serviços realizados, peças trocadas, etc." {...regEditM('descricao')} error={errEditM.descricao?.message as string} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Km na Manutenção" required type="number" {...regEditM('quilometragemRegistrada')} error={errEditM.quilometragemRegistrada?.message as string} />
            <Input label="Custo (R$)" required type="number" step="0.01" {...regEditM('custoTotal')} error={errEditM.custoTotal?.message as string} />
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-600 flex items-start gap-2">
            <DollarSign size={14} className="shrink-0 mt-0.5" />
            <span>O custo ajustado será atualizado automaticamente no <strong>fluxo de caixa</strong> e no saldo da conta.</span>
          </div>
          <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 flex justify-center gap-2" disabled={mutationEditManu.isPending}>
            {mutationEditManu.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar Alterações
          </Button>
        </form>
      </Modal>

      {/* Activity History */}
      <div className="mt-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ArrowRightLeft size={20} className="text-ember" /> Histórico de Atividades da Frota
          </h3>
          
          {/* Filter bar */}
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
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Veículo</th>
                  <th className="px-6 py-4 font-medium">Tipo</th>
                  <th className="px-6 py-4 font-medium text-center">Km</th>
                  <th className="px-6 py-4 font-medium">Detalhes</th>
                  <th className="px-6 py-4 font-medium text-right">Valor</th>
                  <th className="px-6 py-4 font-medium text-center">Ações</th>
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
                            isAbast ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'
                          }`}>
                            {isAbast ? 'Abastecimento' : 'Manutenção'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs font-bold text-slate-700">
                          {event.quilometragemRegistrada}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {isAbast 
                            ? `${event.litros}L registrados` 
                            : `${event.descricao} (${event.tipo === 0 ? 'Prev.' : 'Corr.'})`
                          }
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">
                          {Number(event.valorTotal || event.custoTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => isAbast ? openEditAbast(event) : openEditManu(event)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100"
                              title={isAbast ? "Editar Abastecimento" : "Editar Manutenção"}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja excluir este ${isAbast ? 'abastecimento' : 'manutenção'}? Isso reverterá o saldo da conta bancária.`)) {
                                  if (isAbast) {
                                    mutationDeleteAbast.mutate(event.id);
                                  } else {
                                    mutationDeleteManu.mutate(event.id);
                                  }
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100"
                              title={isAbast ? "Excluir Abastecimento" : "Excluir Manutenção"}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {(!abastecimentos?.length && !manutencoes?.length) && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400 italic">
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
  const [modalType, setModalType] = useState<'troca' | 'avaria'>('troca');
  const queryClient = useQueryClient();
  const userRole = localStorage.getItem('sgpf_role');
  
  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm({
    resolver: zodResolver(trocaSchema)
  });

  const openModal = (type: 'troca' | 'avaria') => {
    setModalType(type);
    setIsModalOpen(true);
    reset();
    if (type === 'avaria') {
      setValue('motivo', 'Avaria');
    }
  };

  const { data: trocas, isLoading } = useQuery<any[]>({
    queryKey: ['trocas'],
    queryFn: async () => {
      const response = await api.get('/Logistica/trocas');
      return response.data;
    },
  });

  const { data: clientes } = useQuery<any[]>({ queryKey: ['clientes'], queryFn: async () => (await api.get('/Clientes')).data });
  const { data: produtos } = useQuery<any[]>({ queryKey: ['produtos'], queryFn: async () => (await api.get('/Produtos')).data });
  const { data: funcionarios } = useQuery<any[]>({ queryKey: ['funcionarios'], queryFn: async () => (await api.get('/Funcionarios')).data });

  const mutation = useMutation({
    mutationFn: (newTroca: any) => api.post('/Logistica/trocas', newTroca),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trocas'] });
      setIsModalOpen(false);
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao registrar troca')
  });

  const [filterCliente, setFilterCliente] = useState('');
  const [filterProduto, setFilterProduto] = useState('');
  const [filterData, setFilterData] = useState('');
  const [filterAno, setFilterAno] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  useEffect(() => {
    setPaginaAtual(1);
  }, [filterCliente, filterProduto, filterData, filterAno]);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-ember" size={32} /></div>;

  const trocasFiltradas = (trocas || [])
    .filter(t => {
      const matchesCliente = !filterCliente || t.clienteId === filterCliente;
      const matchesProduto = !filterProduto || t.produtoId === filterProduto;
      const matchesData = !filterData || new Date(t.dataTroca).toISOString().split('T')[0] === filterData;
      const matchesAno = !filterAno || new Date(t.dataTroca).getFullYear().toString() === filterAno;
      return matchesCliente && matchesProduto && matchesData && matchesAno;
    })
    .sort((a, b) => new Date(b.dataTroca).getTime() - new Date(a.dataTroca).getTime());

  const totalPaginas = Math.ceil(trocasFiltradas.length / itensPorPagina) || 1;
  const trocasPaginadas = trocasFiltradas.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  return (
    <div className="space-y-6 mt-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-200 pt-10">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Logística Reversa (Trocas & Avarias)</h2>
          <p className="text-sm md:text-base text-slate-500 mt-1">Registre trocas por erro de pedido ou avarias para reposição imediata.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Button onClick={() => openModal('troca')} className="w-full sm:w-auto flex justify-center items-center gap-2 bg-gradient-to-r from-fire to-ember shadow-lg">
            <ArrowRightLeft size={18} /> Registrar Troca
          </Button>
          <Button onClick={() => openModal('avaria')} variant="outline" className="w-full sm:w-auto flex justify-center items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
            <Trash2 size={18} /> Registrar Avaria
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[120px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ano</label>
          <select 
            value={filterAno}
            onChange={e => setFilterAno(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Todos</option>
            <option value="2027">2027</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Data Exata</label>
          <input 
            type="date" 
            value={filterData}
            onChange={e => setFilterData(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cliente</label>
          <select 
            value={filterCliente}
            onChange={e => setFilterCliente(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Todos os Clientes</option>
            {clientes?.map(c => <option key={c.id} value={c.id}>{c.nomeFantasia}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Produto</label>
          <select 
            value={filterProduto}
            onChange={e => setFilterProduto(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Todos os Produtos</option>
            {produtos?.filter(p => Number(p.tipo) === 1).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        {(filterData || filterCliente || filterProduto || filterAno) && (
          <div>
            <Button variant="secondary" onClick={() => { setFilterData(''); setFilterCliente(''); setFilterProduto(''); setFilterAno(''); }} className="h-10 px-4 whitespace-nowrap">
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Produto</th>
                <th className="px-6 py-4 font-medium text-center">Quantidade</th>
                <th className="px-6 py-4 font-medium">Motorista</th>
                <th className="px-6 py-4 font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trocasPaginadas.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>}
              {trocasPaginadas.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-600">{new Date(t.dataTroca).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{clientes?.find(c => c.id === t.clienteId)?.nomeFantasia || 'Cliente'}</td>
                  <td className="px-6 py-4 text-slate-600">{produtos?.find(p => p.id === t.produtoId)?.nome || 'Produto'}</td>
                  <td className="px-6 py-4 text-center font-bold text-slate-700">{t.quantidade}</td>
                  <td className="px-6 py-4 text-slate-600 italic">
                    {funcionarios?.find(f => f.id === t.motoristaId)?.nome || '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${t.motivo === 'Avaria' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                      {t.motivo}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {trocasPaginadas.length === 0 && <div className="p-8 text-center text-slate-400">Nenhum registro encontrado.</div>}
          {trocasPaginadas.map((t) => {
            const cliente = clientes?.find(c => c.id === t.clienteId);
            const produto = produtos?.find(p => p.id === t.produtoId);
            return (
              <div key={t.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">{cliente?.nomeFantasia || 'Cliente'}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(t.dataTroca).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider shrink-0 ml-2 ${t.motivo === 'Avaria' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                    {t.motivo}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex justify-between items-center gap-3">
                  <span className="text-sm font-medium text-slate-700 line-clamp-2">{produto?.nome || 'Produto'}</span>
                  <span className="text-sm font-bold text-fire bg-amber-50 px-2 py-1 rounded border border-amber-100 shrink-0">{t.quantidade} un</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPaginas > 1 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Página {paginaAtual} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPaginaAtual(p => Math.max(1, p - 1))} disabled={paginaAtual === 1} className="h-9 px-3">
                <ChevronLeft size={16} />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas} className="h-9 px-3">
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalType === 'troca' ? "Registrar Troca de Produto" : "Registrar Avaria de Produto"}>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <Controller
            control={control}
            name="clienteId"
            render={({ field }) => (
              <SearchableSelect
                label="Cliente"
                required
                placeholder="Pesquise o cliente..."
                options={clientes?.map(c => ({ value: c.id, label: c.nomeFantasia })) || []}
                value={field.value}
                onChange={field.onChange}
                error={errors.clienteId?.message as string}
              />
            )}
          />

          <Controller
            control={control}
            name="produtoId"
            render={({ field }) => (
              <SearchableSelect
                label="Produto"
                required
                placeholder="Pesquise o produto..."
                options={produtos?.filter(p => Number(p.tipo) === 1).map(p => ({
                  value: p.id,
                  label: `🍞 ${p.nome} (${p.unidadeMedida}) - Saldo: ${p.quantidadeEstoque}`
                })) || []}
                value={field.value}
                onChange={field.onChange}
                error={errors.produtoId?.message as string}
              />
            )}
          />
          
          {(userRole === 'Admin' || userRole === 'Gestor') && (
            <Controller
              control={control}
              name="motoristaId"
              render={({ field }) => (
                <SearchableSelect
                  label="Motorista (Opcional)"
                  placeholder="Selecione quem realizou a troca..."
                  options={funcionarios?.map(f => ({ value: f.id, label: f.nome })) || []}
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />
          )}
          
          <Input label="Quantidade" required type="number" {...register('quantidade')} error={errors.quantidade?.message as string} />
          <Input label="Motivo" required placeholder={modalType === 'troca' ? "Ex: Erro no pedido, Vencimento" : "Ex: Embalagem violada, Produto quebrado"} {...register('motivo')} error={errors.motivo?.message as string} />
          <Button type="submit" className="w-full bg-gradient-to-r from-fire to-ember hover:opacity-90 flex justify-center gap-2 shadow-md mt-4" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 
            {modalType === 'troca' ? 'Confirmar Registro de Troca' : 'Registrar Avaria'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
