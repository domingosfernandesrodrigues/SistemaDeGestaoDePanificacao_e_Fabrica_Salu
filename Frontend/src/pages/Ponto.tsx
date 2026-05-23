import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Clock, Loader2, CalendarDays, CheckCircle2, TrendingUp, Timer, FileText, Plus } from 'lucide-react';
import api from '../services/api';

const afastamentoSchema = z.object({
  dataInicio: z.string().min(1, 'Data inicial obrigatória'),
  dataFim: z.string().min(1, 'Data final obrigatória'),
  motivo: z.string().min(1, 'Selecione o motivo'),
  observacao: z.string().optional(),
  anexoNome: z.string().optional().nullable(),
  anexoBase64: z.string().optional().nullable(),
  funcionarioId: z.string().optional()
});

type AfastamentoForm = z.infer<typeof afastamentoSchema>;

const formatarHoras = (decimal: number) => {
  if (!decimal || isNaN(decimal)) return '00h00';
  const isNegative = decimal < 0;
  const abs = Math.abs(decimal);
  const hours = Math.floor(abs);
  const minutes = Math.round((abs - hours) * 60);
  const prefix = isNegative ? '-' : '';
  return `${prefix}${hours.toString().padStart(2, '0')}h${minutes.toString().padStart(2, '0')}`;
};

export function Ponto() {
  const [time, setTime] = useState(new Date());
  const [tab, setTab] = useState<'ponto' | 'historico' | 'afastamentos'>('ponto');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [selectedFuncId, setSelectedFuncId] = useState<string>('');

  const userRole = localStorage.getItem('sgpf_role') || 'Operador';
  const isAdminOrGestor = userRole === 'Admin' || userRole === 'Gestor';

  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<AfastamentoForm>({
    resolver: zodResolver(afastamentoSchema)
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: funcionarios } = useQuery<any[]>({
    queryKey: ['funcionarios-simples'],
    queryFn: async () => (await api.get('/Funcionarios')).data,
    enabled: isAdminOrGestor
  });

  const { data: registros, isLoading } = useQuery<any[]>({
    queryKey: ['ponto-hoje'],
    queryFn: async () => (await api.get('/Ponto/hoje')).data,
  });

  const { data: historico, isLoading: loadingHistorico } = useQuery<any[]>({
    queryKey: ['ponto-historico', mes, ano, selectedFuncId],
    queryFn: async () => {
      const url = isAdminOrGestor && selectedFuncId
        ? `/Ponto/historico-funcionario/${selectedFuncId}?mes=${mes}&ano=${ano}`
        : `/Ponto/historico?mes=${mes}&ano=${ano}`;
      return (await api.get(url)).data;
    },
    enabled: tab === 'historico',
  });

  const { data: afastamentos, isLoading: loadingAfastamentos } = useQuery<any[]>({
    queryKey: ['afastamentos-view', selectedFuncId],
    queryFn: async () => {
      const url = isAdminOrGestor && selectedFuncId
        ? `/Afastamentos/funcionario/${selectedFuncId}`
        : `/Afastamentos/meus`;
      return (await api.get(url)).data;
    },
    enabled: tab === 'afastamentos',
  });

  const mutationPonto = useMutation({
    mutationFn: () => api.post('/Ponto/registrar'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ponto-hoje'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao registrar ponto')
  });

  const mutationAfastamento = useMutation({
    mutationFn: (data: AfastamentoForm) => {
      const payload = { ...data };
      if (isAdminOrGestor && selectedFuncId) {
        payload.funcionarioId = selectedFuncId;
      }
      return api.post('/Afastamentos', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['afastamentos-view'] });
      setIsModalOpen(false);
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao registrar afastamento')
  });

  const mutationRecalcular = useMutation({
    mutationFn: () => api.post(`/Ponto/recalculo-manual?funcionarioId=${selectedFuncId}&mes=${mes}&ano=${ano}`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ponto-historico'] });
      alert(data.data.message);
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao recalcular histórico')
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setValue('anexoNome', file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setValue('anexoBase64', base64String);
      };
      reader.readAsDataURL(file);
    } else {
      setFileName('');
      setValue('anexoNome', null);
      setValue('anexoBase64', null);
    }
  };

  const registroAberto = registros?.find(r => !r.dataHoraSaida);

  const totalHoras = historico?.reduce((acc, r) => acc + Number(r.totalHorasTrabalhadas || 0), 0) || 0;

  // Calcular horas extras agrupando por DIA para precisão total (mesma lógica da folha)
  const extrasPorDia = historico?.reduce((acc: Record<string, number>, r) => {
    const date = new Date(r.dataHoraEntrada).toDateString();
    acc[date] = (acc[date] || 0) + Number(r.totalHorasTrabalhadas || 0);
    return acc;
  }, {});

  const totalExtras = Object.values(extrasPorDia || {}).reduce((acc: number, totalDia: number) => {
    return acc + (totalDia > 8 ? totalDia - 8 : 0);
  }, 0);

  // Contar dias únicos trabalhados
  const diasTrabalhados = new Set(
    historico?.filter(r => r.dataHoraSaida).map(r => new Date(r.dataHoraEntrada).toDateString())
  ).size;

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const afastamentosFiltrados = afastamentos?.filter((af: any) => {
    const afStart = new Date(af.dataInicio);
    const afEnd = new Date(af.dataFim);
    const filterStart = new Date(ano, mes - 1, 1);
    const filterEnd = new Date(ano, mes, 0, 23, 59, 59);
    return afStart <= filterEnd && afEnd >= filterStart;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit mx-auto">
        <button
          onClick={() => setTab('ponto')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'ponto' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Clock size={16} /> Registrar Ponto</span>
        </button>
        <button
          onClick={() => setTab('historico')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'historico' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><CalendarDays size={16} /> Histórico</span>
        </button>
        <button
          onClick={() => setTab('afastamentos')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'afastamentos' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><FileText size={16} /> Afastamentos</span>
        </button>
      </div>

      {tab === 'ponto' && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-6">
              <Clock size={40} />
            </div>
            <h2 className="text-3xl font-light text-slate-800 mb-1">Relógio de Ponto</h2>
            <p className="text-slate-500 mb-6 text-sm">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <div className="text-6xl font-extrabold text-slate-900 tracking-tighter mb-10 font-mono">
              {time.toLocaleTimeString('pt-BR')}
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
              <Button
                size="lg"
                className="w-full text-lg py-6 bg-green-600 hover:bg-green-700"
                disabled={mutationPonto.isPending || !!registroAberto}
                onClick={() => mutationPonto.mutate()}
              >
                {mutationPonto.isPending && !registroAberto ? <Loader2 className="animate-spin mr-2" /> : 'Registrar Entrada'}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="w-full text-lg py-6 bg-slate-800 text-white hover:bg-slate-700"
                disabled={mutationPonto.isPending || !registroAberto}
                onClick={() => mutationPonto.mutate()}
              >
                {mutationPonto.isPending && registroAberto ? <Loader2 className="animate-spin mr-2" /> : 'Registrar Saída'}
              </Button>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">Meus Registros de Hoje</h3>
            {isLoading ? <Loader2 className="animate-spin mx-auto" /> : (
              <div className="space-y-3">
                {registros?.map((reg) => (
                  <div key={reg.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-600">Entrada</span>
                      <span className="font-mono text-slate-900">{new Date(reg.dataHoraEntrada).toLocaleTimeString()}</span>
                    </div>
                    {reg.dataHoraSaida ? (
                      <>
                        <div className="flex justify-between items-center border-t pt-2">
                          <span className="text-sm font-medium text-slate-600">Saída</span>
                          <span className="font-mono text-slate-900">{new Date(reg.dataHoraSaida).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-xs text-slate-500">Total trabalhado</span>
                          <span className="text-sm font-bold text-fire">{formatarHoras(Number(reg.totalHorasTrabalhadas))}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between p-2 rounded-lg border border-dashed border-amber-300 bg-amber-50">
                        <span className="text-sm text-amber-600 animate-pulse">Em andamento...</span>
                        <CheckCircle2 size={16} className="text-amber-400" />
                      </div>
                    )}
                  </div>
                ))}
                {registros?.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-4">Nenhum registro hoje.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'historico' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            {isAdminOrGestor && (
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Filtrar por Funcionário</label>
                <select
                  value={selectedFuncId}
                  onChange={(e) => setSelectedFuncId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">Meu Histórico (Próprio)</option>
                  {funcionarios?.map(f => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 flex-shrink-0">
              <div className="min-w-[120px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Mês</label>
                <select
                  value={mes}
                  onChange={(e) => setMes(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {meses.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[100px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ano</label>
                <select
                  value={ano}
                  onChange={(e) => setAno(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {[2024, 2025, 2026, 2027].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
            {isAdminOrGestor && selectedFuncId && (
              <Button 
                onClick={() => {
                  if (confirm("Deseja recalcular todas as horas trabalhadas e extras deste funcionário no mês selecionado?")) {
                    mutationRecalcular.mutate();
                  }
                }}
                variant="secondary"
                disabled={mutationRecalcular.isPending}
                className="flex items-center gap-2 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 h-10 px-4"
              >
                {mutationRecalcular.isPending ? <Loader2 className="animate-spin" size={16} /> : <Timer size={16} />} 
                Recalcular Valores
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 text-center">
              <CalendarDays className="text-ember mx-auto mb-1.5 sm:mb-2" size={20} />
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{diasTrabalhados}</p>
              <p className="text-[10px] sm:text-xs text-slate-500">Dias</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 text-center">
              <Timer className="text-green-500 mx-auto mb-1.5 sm:mb-2" size={20} />
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{formatarHoras(totalHoras)}</p>
              <p className="text-[10px] sm:text-xs text-slate-500">Horas</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 text-center">
              <TrendingUp className="text-amber-500 mx-auto mb-1.5 sm:mb-2" size={20} />
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{formatarHoras(totalExtras)}</p>
              <p className="text-[10px] sm:text-xs text-slate-500">Extras</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Entrada</th>
                    <th className="px-4 py-3 font-medium">Saída</th>
                    <th className="px-4 py-3 font-medium text-right">Horas</th>
                    <th className="px-4 py-3 font-medium text-right">Extras</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingHistorico ? (
                    <tr><td colSpan={6} className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-ember" /></td></tr>
                  ) : historico?.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {new Date(reg.dataHoraEntrada).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' })}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {new Date(reg.dataHoraEntrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {reg.dataHoraSaida
                          ? new Date(reg.dataHoraSaida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                          : <span className="text-amber-500 text-xs animate-pulse">Em aberto</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {reg.totalHorasTrabalhadas ? formatarHoras(Number(reg.totalHorasTrabalhadas)) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {reg.totalHorasExtras > 0
                          ? <span className="text-amber-600 font-medium">+{formatarHoras(Number(reg.totalHorasExtras))}</span>
                          : <span className="text-slate-400">-</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${reg.status === 'Aberto' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                          }`}>
                          {reg.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!loadingHistorico && historico?.length === 0 && (
                    <tr><td colSpan={6} className="py-10 text-center text-slate-400 italic">Nenhum registro no período selecionado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {loadingHistorico ? (
                <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-ember" /></div>
              ) : historico?.map((reg) => (
                <div key={reg.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">
                      {new Date(reg.dataHoraEntrada).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'long' })}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${reg.status === 'Aberto' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                      {reg.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Entrada</p>
                      <p className="text-sm font-mono font-bold text-slate-700">
                        {new Date(reg.dataHoraEntrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Saída</p>
                      <p className="text-sm font-mono font-bold text-slate-700">
                        {reg.dataHoraSaida
                          ? new Date(reg.dataHoraSaida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                          : <span className="text-amber-500 text-xs animate-pulse font-sans">Aberto</span>
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Horas</p>
                        <p className="text-sm font-bold text-slate-800">
                          {reg.totalHorasTrabalhadas ? formatarHoras(Number(reg.totalHorasTrabalhadas)) : '-'}
                        </p>
                      </div>
                      {reg.totalHorasExtras > 0 && (
                        <div>
                          <p className="text-[10px] text-amber-500 font-bold uppercase">Extras</p>
                          <p className="text-sm font-bold text-amber-600">
                            +{formatarHoras(Number(reg.totalHorasExtras))}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!loadingHistorico && historico?.length === 0 && (
                <div className="py-10 text-center text-slate-400 italic">Nenhum registro encontrado.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'afastamentos' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] flex items-center gap-3 flex-wrap">
              {isAdminOrGestor && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex-1 min-w-[200px]">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Visualizar Afastamentos de:</label>
                  <select
                    value={selectedFuncId}
                    onChange={(e) => setSelectedFuncId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">Meus Afastamentos</option>
                    {funcionarios?.map(f => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 flex-wrap">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Mês</label>
                  <select
                    value={mes}
                    onChange={(e) => setMes(Number(e.target.value))}
                    className="h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {meses.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ano</label>
                  <select
                    value={ano}
                    onChange={(e) => setAno(Number(e.target.value))}
                    className="h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[2024, 2025, 2026, 2027].map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <Button onClick={() => {
              if (isAdminOrGestor && !selectedFuncId) {
                alert("Por favor, selecione um funcionário no filtro acima antes de lançar o afastamento/falta.");
                return;
              }
              setIsModalOpen(true);
            }} className="flex items-center gap-2 bg-gradient-to-r from-fire to-ember h-12 px-6">
              <Plus size={16} /> Solicitar Novo Afastamento
            </Button>
          </div>

          <div className="space-y-4">
            {loadingAfastamentos ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="animate-spin text-ember" size={32} />
                <p className="text-slate-500 text-sm">Carregando registros...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {afastamentosFiltrados?.map((af: any) => (
                  <div key={af.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-ember/40 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-ember/5 group-hover:text-ember transition-colors">
                          <FileText size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{af.motivo}</h4>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{af.nomeFuncionario}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${af.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-800' :
                          af.status === 'Reprovado' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                        }`}>
                        {af.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Início</p>
                        <p className="text-sm font-semibold text-slate-700">{new Date(af.dataInicio).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Fim</p>
                        <p className="text-sm font-semibold text-slate-700">{new Date(af.dataFim).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Plus size={14} />
                        Criado em {new Date(af.dataCriacao).toLocaleDateString()}
                      </div>
                      {af.anexoNome && (
                        <div className="flex items-center gap-1 text-[11px] text-ember font-bold">
                          <CheckCircle2 size={14} />
                          Com Anexo
                        </div>
                      )}
                    </div>

                    {af.observacao && (
                      <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-xs text-slate-500 italic">
                        "{af.observacao}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!loadingAfastamentos && afastamentosFiltrados?.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                  <FileText size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Nenhum afastamento</h3>
                <p className="text-sm text-slate-400 max-w-xs">Não encontramos registros para os filtros selecionados.</p>
              </div>
            )}
          </div>

          <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setFileName(''); reset(); }} title="Solicitar Afastamento">
            <form onSubmit={handleSubmit((data) => mutationAfastamento.mutate(data))} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Motivo do Afastamento <span className="text-red-500">*</span></label>
                <select
                  {...register('motivo')}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione...</option>

                  <optgroup label="Afastamentos por saúde">
                    <option value="Atestado Médico">Atestado Médico</option>
                    <option value="Licença médica (auxílio-doença)">Licença médica (auxílio-doença)</option>
                    <option value="Acidente de trabalho">Acidente de trabalho</option>
                    <option value="Doença ocupacional">Doença ocupacional</option>
                  </optgroup>

                  <optgroup label="Afastamentos familiares">
                    <option value="Licença-maternidade">Licença-maternidade</option>
                    <option value="Licença-paternidade">Licença-paternidade</option>
                    <option value="Licença por adoção">Licença por adoção</option>
                    <option value="Licença por falecimento (nojo)">Licença por falecimento (nojo)</option>
                    <option value="Licença por casamento (gala)">Licença por casamento (gala)</option>
                  </optgroup>

                  <optgroup label="Afastamentos legais / obrigações">
                    <option value="Serviço militar">Serviço militar</option>
                    <option value="Júri e outras obrigações legais">Júri e outras obrigações legais</option>
                    <option value="Doação de sangue">Doação de sangue</option>
                    <option value="Vestibular">Vestibular</option>
                    <option value="Alistamento eleitoral">Alistamento eleitoral</option>
                  </optgroup>

                  <optgroup label="Afastamentos por convenção ou acordo">
                    <option value="Licença remunerada">Licença remunerada</option>
                    <option value="Licença não remunerada">Licença não remunerada</option>
                    <option value="Afastamento para capacitação">Afastamento para capacitação</option>
                  </optgroup>

                  <optgroup label="Afastamentos sem remuneração / Desconto">
                    <option value="Falta não justificada">Falta não justificada</option>
                    <option value="Suspensão disciplinar">Suspensão disciplinar</option>
                    <option value="Afastamento acima do período legal sem cobertura">Afastamento acima do período legal sem cobertura</option>
                    <option value="Licença não remunerada">Licença não remunerada</option>
                    <option value="Suspensão do contrato (layoff)">Suspensão do contrato (layoff)</option>
                  </optgroup>

                  <optgroup label="Outros">
                    <option value="Reabilitação profissional">Reabilitação profissional</option>
                    <option value="Aposentadoria por invalidez">Aposentadoria por invalidez</option>
                    <option value="Outros">Outros</option>
                  </optgroup>
                </select>
                {errors.motivo && <p className="text-xs text-red-500">{errors.motivo.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Data Inicial" required type="date" {...register('dataInicio')} error={errors.dataInicio?.message} />
                <Input label="Data Final" required type="date" {...register('dataFim')} error={errors.dataFim?.message} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Anexar Documento (opcional)</label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer bg-slate-50 border border-slate-200 border-dashed rounded-lg px-4 py-2 text-sm text-center hover:bg-slate-100 transition-colors">
                    <span className="text-slate-500">{fileName || 'Clique para anexar arquivo (PDF, JPG, PNG)'}</span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
                  </label>
                  {fileName && (
                    <button type="button" onClick={() => { setFileName(''); setValue('anexoNome', null); setValue('anexoBase64', null); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      Limpar
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400">Ex: Atestado médico, certidão de casamento, declaração, etc.</p>
              </div>

              <Input label="Observação (opcional)" {...register('observacao')} placeholder="Detalhes adicionais..." />

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => { setIsModalOpen(false); setFileName(''); reset(); }}>Cancelar</Button>
                <Button type="submit" className="flex-1 bg-gradient-to-r from-fire to-ember flex justify-center" disabled={mutationAfastamento.isPending}>
                  {mutationAfastamento.isPending ? <Loader2 className="animate-spin" size={18} /> : 'Solicitar'}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}
    </div>
  );
}

