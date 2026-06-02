import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import {
  Sun, Plus, Edit2, XCircle, Loader2, AlertTriangle,
  CheckCircle, Info, Calendar, User, ChevronLeft, ChevronRight, Split
} from 'lucide-react';
import api from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlanejamentoFerias {
  id: string;
  funcionarioId: string;
  funcionarioNome: string;
  dataInicio: string;
  dataFim: string;
  diasFerias: number;
  diasEfetivosGozo: number;
  tipoParcelamento: number; // 0=Total 1=Primeira 2=Segunda 3=Terceira
  solicitaAbono: boolean;
  diasAbono: number;
  solicitaAdiantamentoDecimoTerceiro: boolean;
  valorAdiantamentoDecimoTerceiro: number;
  status: number; // 0=Planejada 1=Aprovada 2=Iniciada 3=Concluida 4=Cancelada
  periodoAquisitivoInicio: string;
  periodoAquisitivoFim: string;
  periodoConcessivoFim: string;
  valorRemFeriasBruto: number;
  valorTercoConstitucional: number;
  valorAbonoFeriasVendidas: number;
  valorTotalBruto: number;
  observacao?: string;
  dataCriacao: string;
  periodoConcessivoVencido: boolean;
}

const STATUS_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: 'Planejada', color: 'bg-blue-100 text-blue-700' },
  1: { label: 'Aprovada',  color: 'bg-emerald-100 text-emerald-700' },
  2: { label: 'Iniciada',  color: 'bg-amber-100 text-amber-700' },
  3: { label: 'Concluída', color: 'bg-slate-100 text-slate-600' },
  4: { label: 'Cancelada', color: 'bg-red-100 text-red-600' },
};

const TIPO_LABEL: Record<number, string> = {
  0: '30 Dias (Integral)',
  1: '1ª Parcela',
  2: '2ª Parcela',
  3: '3ª Parcela',
};

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '--';

// ─── Componente Principal ────────────────────────────────────────────────────

export function PlanejamentoFerias() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<PlanejamentoFerias | null>(null);
  const [parcelado, setParcelado] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  // Filtros
  const [filtroFuncionario, setFiltroFuncionario] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;

  const { data: planejamentos = [], isLoading } = useQuery<PlanejamentoFerias[]>({
    queryKey: ['planejamento-ferias'],
    queryFn: async () => (await api.get('/planejamento-ferias')).data,
  });

  const { data: funcionarios = [] } = useQuery<any[]>({
    queryKey: ['funcionarios'],
    queryFn: async () => (await api.get('/Funcionarios')).data,
  });

  // ─── Formulário ───────────────────────────────────────────────────────────

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      funcionarioId: '',
      parcelado: false,
      dataInicioP1: '',
      diasDuracaoP1: 30,
      dataInicioP2: '',
      diasDuracaoP2: 5,
      dataInicioP3: '',
      diasDuracaoP3: 5,
      solicitaAbono: false,
      diasAbono: 0,
      solicitaAdiantamentoDecimoTerceiro: false,
      observacao: '',
    }
  });

  const watchSolicitaAbono = watch('solicitaAbono');
  const watchSolicita13 = watch('solicitaAdiantamentoDecimoTerceiro');
  const watchDiasP1 = Number(watch('diasDuracaoP1') || 30);
  const watchDiasAbono = Number(watch('diasAbono') || 0);
  const watchFuncId = watch('funcionarioId');

  // Funcionário selecionado — mostra info do período aquisitivo
  const funcSelecionado = funcionarios.find((f: any) => f.id === watchFuncId);
  const dataAdmissao = funcSelecionado?.dataAdmissao;

  // Preview financeiro em tempo real
  const salarioBase = funcSelecionado?.salarioBase ?? 0;
  const diasGozo = watchDiasP1 - (watchSolicitaAbono ? watchDiasAbono : 0);
  const previewRemFerias = (salarioBase / 30) * diasGozo;
  const previewTerco = previewRemFerias / 3;
  const previewAbono = watchSolicitaAbono ? (salarioBase / 30) * watchDiasAbono * (4 / 3) : 0;
  const preview13 = watchSolicita13 ? salarioBase * 0.50 : 0;
  const previewTotal = previewRemFerias + previewTerco + previewAbono + preview13;

  // ─── Mutations ────────────────────────────────────────────────────────────

  const mutationCreate = useMutation({
    mutationFn: (data: any) => api.post('/planejamento-ferias', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planejamento-ferias'] });
      setIsModalOpen(false);
      reset();
      setParcelado(false);
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao criar planejamento.'),
  });

  const mutationUpdate = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/planejamento-ferias/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planejamento-ferias'] });
      setIsModalOpen(false);
      setEditItem(null);
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao atualizar planejamento.'),
  });

  const mutationCancel = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      api.post(`/planejamento-ferias/${id}/cancelar`, { motivo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planejamento-ferias'] });
      setCancelingId(null);
      setMotivoCancelamento('');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao cancelar.'),
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    reset();
    setEditItem(null);
    setParcelado(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: PlanejamentoFerias) => {
    setEditItem(p);
    reset({
      funcionarioId: p.funcionarioId,
      dataInicioP1: p.dataInicio.split('T')[0],
      diasDuracaoP1: p.diasFerias,
      solicitaAbono: p.solicitaAbono,
      diasAbono: p.diasAbono,
      solicitaAdiantamentoDecimoTerceiro: p.solicitaAdiantamentoDecimoTerceiro,
      observacao: p.observacao || '',
    });
    setParcelado(false);
    setIsModalOpen(true);
  };

  const onSubmit = (data: any) => {
    if (editItem) {
      mutationUpdate.mutate({
        id: editItem.id,
        data: {
          dataInicio: data.dataInicioP1,
          diasDuracao: Number(data.diasDuracaoP1),
          solicitaAbono: data.solicitaAbono,
          diasAbono: data.solicitaAbono ? Number(data.diasAbono) : 0,
          solicitaAdiantamentoDecimoTerceiro: data.solicitaAdiantamentoDecimoTerceiro,
          observacao: data.observacao || null,
        }
      });
    } else {
      mutationCreate.mutate({
        funcionarioId: data.funcionarioId,
        parcelado: parcelado,
        dataInicioP1: data.dataInicioP1,
        diasDuracaoP1: Number(data.diasDuracaoP1),
        dataInicioP2: parcelado ? data.dataInicioP2 || null : null,
        diasDuracaoP2: parcelado ? Number(data.diasDuracaoP2) : null,
        dataInicioP3: parcelado && data.dataInicioP3 ? data.dataInicioP3 : null,
        diasDuracaoP3: parcelado && data.dataInicioP3 ? Number(data.diasDuracaoP3) : null,
        solicitaAbono: data.solicitaAbono,
        diasAbono: data.solicitaAbono ? Number(data.diasAbono) : 0,
        solicitaAdiantamentoDecimoTerceiro: data.solicitaAdiantamentoDecimoTerceiro,
        observacao: data.observacao || null,
      });
    }
  };

  // ─── Filtros e Paginação ──────────────────────────────────────────────────

  useEffect(() => { setPagina(1); }, [filtroFuncionario, filtroStatus]);

  const planejamentosFiltrados = planejamentos.filter(p => {
    if (filtroFuncionario && p.funcionarioId !== filtroFuncionario) return false;
    if (filtroStatus !== '' && p.status !== Number(filtroStatus)) return false;
    return true;
  }).sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());

  const totalPaginas = Math.ceil(planejamentosFiltrados.length / porPagina) || 1;
  const paginados = planejamentosFiltrados.slice((pagina - 1) * porPagina, pagina * porPagina);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-ember" size={32} /></div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sun size={24} className="text-emerald-500" />
            Planejamento de Férias
          </h2>
          <p className="text-slate-500 text-sm">Gestão conforme CLT Arts. 129–153 e CF/88 Art. 7º XVII.</p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-fire to-ember h-11 px-6 shadow-md"
        >
          <Plus size={18} /> Novo Planejamento
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Planejados', value: planejamentos.filter(p => p.status <= 1).length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Em Andamento', value: planejamentos.filter(p => p.status === 2).length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Concluídos', value: planejamentos.filter(p => p.status === 3).length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Cancelados', value: planejamentos.filter(p => p.status === 4).length, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4 border border-white shadow-sm`}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.label}</p>
            <p className={`text-3xl font-black mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Info CLT */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3">
        <Info size={18} className="text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-800 leading-relaxed">
          <strong>Base Legal:</strong> O direito às férias é adquirido após 12 meses de trabalho (Art. 129).
          A duração é de 30 dias, reduzida conforme faltas injustificadas (Art. 130).
          A remuneração inclui o <strong>1/3 constitucional obrigatório</strong> (CF Art. 7º XVII).
          O parcelamento é permitido em até 3 períodos: mínimo 14 dias na 1ª parcela e 5 dias nas demais (Art. 148).
          O abono pecuniário converte até 1/3 dos dias em dinheiro (Art. 143).
          O início deve ser comunicado com <strong>30 dias de antecedência</strong> (Art. 136 §1).
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1"><User size={11} /> Funcionário</label>
          <select
            value={filtroFuncionario}
            onChange={e => setFiltroFuncionario(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-ember/20 outline-none"
          >
            <option value="">Todos</option>
            {funcionarios.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
        <div className="w-full sm:w-48 space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</label>
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-ember/20 outline-none"
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <Button variant="secondary" className="h-10 px-4 shrink-0" onClick={() => { setFiltroFuncionario(''); setFiltroStatus(''); }}>
          Limpar
        </Button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-4 py-4">Funcionário</th>
                <th className="px-3 py-4">Período de Gozo</th>
                <th className="px-3 py-4 text-center">Dias</th>
                <th className="px-3 py-4 text-center">Tipo</th>
                <th className="px-3 py-4 text-right">Total Bruto</th>
                <th className="px-3 py-4 text-center">Status</th>
                <th className="px-4 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginados.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-medium">Nenhum planejamento encontrado.</td></tr>
              )}
              {paginados.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50/80 transition-colors ${p.periodoConcessivoVencido ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3 font-bold text-slate-800">{p.funcionarioNome}</td>
                  <td className="px-3 py-3 text-slate-600 text-xs">
                    <div>{fmtDate(p.dataInicio)} → {fmtDate(p.dataFim)}</div>
                    {p.periodoConcessivoVencido && (
                      <span className="text-red-500 font-bold flex items-center gap-1 mt-0.5">
                        <AlertTriangle size={10} /> Período concessivo vencido!
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-black text-slate-700">{p.diasFerias}d</span>
                    {p.solicitaAbono && <span className="block text-[10px] text-slate-400">Abono: {p.diasAbono}d</span>}
                    {p.solicitaAdiantamentoDecimoTerceiro && <span className="block text-[10px] text-sky-600 font-bold">13º Adiantado</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs font-bold text-slate-500">{TIPO_LABEL[p.tipoParcelamento]}</span>
                  </td>
                  <td className="px-3 py-3 text-right font-black text-emerald-600">
                    {fmt.format(p.valorTotalBruto)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${STATUS_LABEL[p.status]?.color}`}>
                      {STATUS_LABEL[p.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {p.status <= 1 && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="h-8 w-8 flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg border border-slate-200 transition-all"
                            title="Editar"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setCancelingId(p.id)}
                            className="h-8 w-8 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 rounded-lg border border-red-200 transition-all"
                            title="Cancelar"
                          >
                            <XCircle size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="lg:hidden divide-y divide-slate-100">
          {paginados.length === 0 && <p className="p-8 text-center text-slate-400">Nenhum planejamento encontrado.</p>}
          {paginados.map(p => (
            <div key={p.id} className={`p-4 space-y-3 ${p.periodoConcessivoVencido ? 'bg-red-50/40' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-800">{p.funcionarioNome}</p>
                  <p className="text-xs text-slate-500">{fmtDate(p.dataInicio)} → {fmtDate(p.dataFim)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_LABEL[p.status]?.color}`}>
                  {STATUS_LABEL[p.status]?.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-slate-400 font-bold">DIAS</p>
                  <p className="font-black text-slate-700">{p.diasFerias}d</p>
                  {p.solicitaAdiantamentoDecimoTerceiro && <p className="text-[9px] text-sky-600 font-bold">13º Solic.</p>}
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-slate-400 font-bold">TIPO</p>
                  <p className="font-black text-slate-600 text-[10px]">{TIPO_LABEL[p.tipoParcelamento]}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2 text-center">
                  <p className="text-slate-400 font-bold">TOTAL</p>
                  <p className="font-black text-emerald-600">{fmt.format(p.valorTotalBruto)}</p>
                </div>
              </div>
              {p.status <= 1 && (
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1 h-9 text-xs border border-slate-200 flex items-center justify-center gap-1" onClick={() => handleOpenEdit(p)}>
                    <Edit2 size={14} /> Editar
                  </Button>
                  <Button className="flex-1 h-9 text-xs bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-1" onClick={() => setCancelingId(p.id)}>
                    <XCircle size={14} /> Cancelar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-4">
            <span className="text-sm text-slate-600">
              {planejamentosFiltrados.length} registro(s)
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="h-9 px-3 !bg-white border border-slate-300 disabled:opacity-50" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm font-bold text-slate-700 px-2">Página {pagina}/{totalPaginas}</span>
              <Button variant="secondary" className="h-9 px-3 !bg-white border border-slate-300 disabled:opacity-50" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Criar/Editar ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditItem(null); reset(); setParcelado(false); }}
        title={editItem ? `Editar Férias — ${editItem.funcionarioNome}` : 'Planejar Férias'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Funcionário */}
          {!editItem && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Funcionário <span className="text-red-500">*</span></label>
              <select
                {...register('funcionarioId', { required: true })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-ember/20 outline-none"
              >
                <option value="">Selecione o funcionário...</option>
                {funcionarios.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
              {errors.funcionarioId && <p className="text-red-500 text-xs">Selecione um funcionário.</p>}
            </div>
          )}

          {/* Info período aquisitivo */}
          {dataAdmissao && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <p className="font-bold mb-1 flex items-center gap-1"><Calendar size={12} /> Informações da CLT</p>
              <p>Data de Admissão: <strong>{fmtDate(dataAdmissao)}</strong></p>
              <p>Período aquisitivo atual: <strong>{fmtDate(new Date(new Date(dataAdmissao).setFullYear(new Date(dataAdmissao).getFullYear() + Math.floor((Date.now() - new Date(dataAdmissao).getTime()) / (365.25*24*3600*1000)))).toISOString())}</strong></p>
              <p className="mt-1 text-blue-600">Data mínima de início: <strong>{new Date(Date.now() + 30*24*3600*1000).toLocaleDateString('pt-BR')}</strong> (Art. 136 §1 — 30 dias de antecedência)</p>
            </div>
          )}

          {/* Tipo: Total ou Parcelado */}
          {!editItem && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setParcelado(false)}
                className={`p-3 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-1 ${!parcelado ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                <Calendar size={20} />
                30 Dias Integral
              </button>
              <button
                type="button"
                onClick={() => setParcelado(true)}
                className={`p-3 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-1 ${parcelado ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                <Split size={20} />
                Parcelado (Art. 148)
              </button>
            </div>
          )}

          {/* Parcela 1 (ou período integral) */}
          <div className="space-y-3">
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider border-b pb-1">
              {parcelado ? '1ª Parcela (mín. 14 dias)' : 'Período de Gozo'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Data de Início"
                type="date"
                required
                {...register('dataInicioP1', { required: true })}
                error={errors.dataInicioP1 ? 'Obrigatório' : undefined}
              />
              <Input
                label={`Dias de Duração ${parcelado ? '(mín. 14)' : ''}`}
                type="number"
                min={parcelado ? 14 : 12}
                max={30}
                required
                {...register('diasDuracaoP1', { required: true, min: parcelado ? 14 : 12 })}
                error={errors.diasDuracaoP1 ? 'Mín. 14 dias na 1ª parcela' : undefined}
              />
            </div>
          </div>

          {/* Parcelas 2 e 3 (se parcelado) */}
          {parcelado && (
            <>
              <div className="space-y-3">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider border-b pb-1">2ª Parcela (mín. 5 dias) <span className="text-red-500">*</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Data de Início" type="date" required {...register('dataInicioP2', { required: parcelado })} />
                  <Input label="Dias de Duração (mín. 5)" type="number" min={5} required {...register('diasDuracaoP2', { required: parcelado, min: 5 })} />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider border-b pb-1">3ª Parcela (mín. 5 dias — opcional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Data de Início" type="date" {...register('dataInicioP3')} />
                  <Input label="Dias de Duração (mín. 5)" type="number" min={5} {...register('diasDuracaoP3', { min: 5 })} />
                </div>
              </div>
            </>
          )}

          {/* Abono Pecuniário — CLT Art. 143 */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('solicitaAbono')}
                className="h-4 w-4 accent-amber-600 rounded"
              />
              <div>
                <span className="font-bold text-sm text-amber-800">Solicitar Abono Pecuniário (CLT Art. 143)</span>
                <p className="text-xs text-amber-700">Converter até 1/3 dos dias de férias em dinheiro (máx. 10 dias)</p>
              </div>
            </label>
            {watchSolicitaAbono && (
              <div className="pl-7">
                <Input
                  label="Quantidade de dias a vender (1 a 10)"
                  type="number"
                  min={1}
                  max={Math.floor(watchDiasP1 / 3)}
                  {...register('diasAbono', { min: 1, max: Math.floor(watchDiasP1 / 3) })}
                />
                <p className="text-xs text-amber-600 mt-1">
                  Máximo permitido: {Math.floor(watchDiasP1 / 3)} dias (1/3 de {watchDiasP1} dias)
                </p>
              </div>
            )}
          </div>

          {/* Adiantamento 13º Salário */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('solicitaAdiantamentoDecimoTerceiro')}
                className="h-4 w-4 accent-blue-600 rounded"
              />
              <div>
                <span className="font-bold text-sm text-blue-800">Solicitar Adiantamento do 13º Salário</span>
                <p className="text-xs text-blue-700">Receber a 1ª parcela (50%) junto com o pagamento de férias</p>
              </div>
            </label>
          </div>

          {/* Preview financeiro */}
          {salarioBase > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Preview Financeiro</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Remuneração Férias ({diasGozo}d)</span>
                  <span className="font-bold">{fmt.format(previewRemFerias)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">1/3 Constitucional (CF Art. 7º XVII)</span>
                  <span className="font-bold">{fmt.format(previewTerco)}</span>
                </div>
                {watchSolicitaAbono && watchDiasAbono > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Abono Pecuniário ({watchDiasAbono}d)</span>
                    <span className="font-bold">{fmt.format(previewAbono)}</span>
                  </div>
                )}
                {watchSolicita13 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Adiantamento 13º Salário (50%)</span>
                    <span className="font-bold text-blue-600">{fmt.format(preview13)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-200 font-black text-emerald-600">
                  <span>Total Bruto</span>
                  <span>{fmt.format(previewTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Observação */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Observação</label>
            <textarea
              {...register('observacao')}
              className="w-full p-3 rounded-lg border border-slate-200 text-sm min-h-[64px] focus:ring-2 focus:ring-ember/20 outline-none resize-none"
              placeholder="Informações adicionais..."
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-fire to-ember h-11"
            disabled={mutationCreate.isPending || mutationUpdate.isPending}
          >
            {mutationCreate.isPending || mutationUpdate.isPending
              ? <><Loader2 size={18} className="animate-spin mr-2" /> Salvando...</>
              : <><CheckCircle size={18} className="mr-2" /> {editItem ? 'Salvar Alterações' : (parcelado ? 'Criar Parcelamentos (CLT Art. 148)' : 'Confirmar Planejamento')}</>
            }
          </Button>
        </form>
      </Modal>

      {/* ── Modal Cancelar ── */}
      <Modal
        isOpen={!!cancelingId}
        onClose={() => { setCancelingId(null); setMotivoCancelamento(''); }}
        title="Cancelar Planejamento de Férias"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Ao cancelar, o planejamento não poderá ser reaberto. O histórico será mantido.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Motivo do Cancelamento</label>
            <textarea
              value={motivoCancelamento}
              onChange={e => setMotivoCancelamento(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-200 text-sm min-h-[80px] focus:ring-2 focus:ring-red-200 outline-none resize-none"
              placeholder="Descreva o motivo..."
            />
          </div>
          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white h-11"
            disabled={mutationCancel.isPending}
            onClick={() => {
              if (!cancelingId) return;
              mutationCancel.mutate({ id: cancelingId, motivo: motivoCancelamento });
            }}
          >
            {mutationCancel.isPending ? <Loader2 size={18} className="animate-spin mr-2" /> : <XCircle size={18} className="mr-2" />}
            Confirmar Cancelamento
          </Button>
        </div>
      </Modal>
    </div>
  );
}
