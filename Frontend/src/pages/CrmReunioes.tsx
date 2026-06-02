import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { CalendarDays, Users, FileText, Loader2, Save, CheckCircle, XCircle, Edit2, ChevronLeft, ChevronRight, LayoutList, Calendar as CalendarIcon, Star, Bell, Sun } from 'lucide-react';
import api from '../services/api';

const getFeriadosNacionais = (ano: number) => [
  { data: `${ano}-01-01`, nome: 'Ano Novo' },
  { data: `${ano}-04-21`, nome: 'Tiradentes' },
  { data: `${ano}-05-01`, nome: 'Dia do Trabalho' },
  { data: `${ano}-09-07`, nome: 'Independência' },
  { data: `${ano}-10-12`, nome: 'Nossa Sra Aparecida' },
  { data: `${ano}-11-02`, nome: 'Finados' },
  { data: `${ano}-11-15`, nome: 'Proclamação República' },
  { data: `${ano}-12-25`, nome: 'Natal' },
  // Carnaval e Sexta-feira Santa variam, para simplicidade podem ser adicionados manualmente via agenda
];

const reuniaoSchema = z.object({
  clienteId: z.string().min(1, 'Selecione o cliente'),
  dataHora: z.string().min(1, 'Informe a data e hora'),
  pauta: z.string().min(5, 'Descreva a pauta'),
});

type ReuniaoForm = z.infer<typeof reuniaoSchema>;

export function CrmReunioes() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAtaModalOpen, setIsAtaModalOpen] = useState(false);
  const [isEventoModalOpen, setIsEventoModalOpen] = useState(false);
  const [isEditEvento, setIsEditEvento] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<any>(null);
  const [selectedReuniao, setSelectedReuniao] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [ataText, setAtaText] = useState('');
  
  // Controle de Visualização
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Estados dos Filtros e Paginação
  const [filterCliente, setFilterCliente] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ReuniaoForm>({
    resolver: zodResolver(reuniaoSchema)
  });

  const { data: reunioes, isLoading: loadingReunioes } = useQuery<any[]>({
    queryKey: ['reunioes'],
    queryFn: async () => {
      const response = await api.get('/Reunioes');
      return response.data;
    },
  });

  const { data: agendaEventos } = useQuery<any[]>({
    queryKey: ['agendaEventos'],
    queryFn: async () => {
      const response = await api.get('/AgendaEventos');
      return response.data;
    },
  });

  // Férias dos funcionários — leitura apenas para o calendário
  const { data: feriasCalendario = [] } = useQuery<any[]>({
    queryKey: ['planejamento-ferias'],
    queryFn: async () => (await api.get('/planejamento-ferias')).data,
  });

  const { data: clientes } = useQuery<any[]>({
    queryKey: ['clientes'],
    queryFn: async () => {
      const response = await api.get('/Clientes');
      return response.data;
    },
  });

  // Lógica de Filtro e Ordenação
  const filteredAndSortedReunioes = (reunioes || []).filter(r => {
    const matchCliente = filterCliente ? (r.clienteId === filterCliente || r.ClienteId === filterCliente) : true;
    const matchDate = filterDate ? new Date(r.dataHora || r.DataHora).toISOString().split('T')[0] === filterDate : true;
    return matchCliente && matchDate;
  }).sort((a, b) => {
    const statusA = Number(a.status ?? a.Status);
    const statusB = Number(b.status ?? b.Status);
    
    // Status 0 (Agendada) vem primeiro
    if (statusA === 0 && statusB !== 0) return -1;
    if (statusA !== 0 && statusB === 0) return 1;
    
    // Se o status for igual, ordena por data (mais próxima primeiro)
    return new Date(a.dataHora || a.DataHora).getTime() - new Date(b.dataHora || b.DataHora).getTime();
  });

  // Lógica de Paginação
  const totalPages = Math.ceil(filteredAndSortedReunioes.length / itemsPerPage);
  const paginatedReunioes = filteredAndSortedReunioes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const mutationCreate = useMutation({
    mutationFn: (newReuniao: ReuniaoForm) => api.post('/Reunioes', newReuniao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reunioes'] });
      setIsModalOpen(false);
      reset();
      alert('Reunião agendada com sucesso!');
    },
    onError: (error: any) => {
      alert(`Falha ao agendar: ${error.response?.data?.message || error.message}`);
    }
  });

  const mutationUpdate = useMutation({
    mutationFn: (data: ReuniaoForm) => {
      const id = selectedReuniao?.id || selectedReuniao?.Id;
      console.log('Tentando atualizar reunião ID:', id);
      return api.put(`/Reunioes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reunioes'] });
      setIsEditModalOpen(false);
      alert('Reunião atualizada com sucesso!');
    },
    onError: (error: any) => {
      alert(`Erro ao atualizar: ${error.response?.data?.message || error.message}`);
    }
  });

  const mutationCancel = useMutation({
    mutationFn: (id: string) => api.post(`/Reunioes/${id}/cancelar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reunioes'] });
      alert('Reunião cancelada com sucesso.');
    },
    onError: (error: any) => {
      alert(`Erro ao cancelar: ${error.response?.data?.message || error.message}`);
    }
  });

  const mutationConcluir = useMutation({
    mutationFn: () => {
      const id = selectedReuniao?.id || selectedReuniao?.Id;
      return api.post(`/Reunioes/${id}/concluir`, JSON.stringify(ataText), {
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reunioes'] });
      setIsAtaModalOpen(false);
      setAtaText('');
      alert('Reunião concluída e ata registrada!');
    },
    onError: (error: any) => {
      alert(`Erro ao concluir: ${error.response?.data?.message || error.message}`);
    }
  });

  const mutationCreateEvento = useMutation({
    mutationFn: (newEvento: any) => api.post('/AgendaEventos', newEvento),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendaEventos'] });
      setIsEventoModalOpen(false);
      resetEvento();
      alert('Evento adicionado com sucesso!');
    },
    onError: (error: any) => {
      alert(`Falha ao adicionar evento: ${error.response?.data?.message || error.message}`);
    }
  });

  const mutationUpdateEvento = useMutation({
    mutationFn: (data: any) => api.put(`/AgendaEventos/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendaEventos'] });
      setIsEventoModalOpen(false);
      setIsEditEvento(false);
      resetEvento();
      alert('Evento atualizado com sucesso!');
    },
    onError: (error: any) => {
      alert(`Falha ao atualizar evento: ${error.response?.data?.message || error.message}`);
    }
  });

  const mutationDeleteEvento = useMutation({
    mutationFn: (id: string) => api.delete(`/AgendaEventos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendaEventos'] });
    }
  });

  const { register: regEvento, handleSubmit: handleSubEvento, reset: resetEvento } = useForm({
    defaultValues: { titulo: '', tipo: 'Feriado', data: '', descricao: '' }
  });

  const handleEdit = (reuniao: any) => {
    setSelectedReuniao(reuniao);
    setValue('clienteId', reuniao.clienteId || reuniao.ClienteId);
    setValue('dataHora', new Date(reuniao.dataHora || reuniao.DataHora).toISOString().slice(0, 16));
    setValue('pauta', reuniao.pauta || reuniao.Pauta);
    setIsEditModalOpen(true);
  };

  const handleAta = (reuniao: any) => {
    setSelectedReuniao(reuniao);
    setIsAtaModalOpen(true);
  };

  const handleEditEvento = (ev: any) => {
    setSelectedEvento(ev);
    setIsEditEvento(true);
    setIsEventoModalOpen(true);
    resetEvento({
      titulo: ev.titulo || ev.Titulo,
      tipo: ev.tipo || ev.Tipo,
      descricao: ev.descricao || ev.Descricao,
      data: (ev.data || ev.Data).split('T')[0]
    });
  };

  // Funções Auxiliares do Calendário
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    // Espaços vazios do mês anterior
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const setToday = () => setCurrentDate(new Date());

  if (loadingReunioes) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-ember" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">CRM & Agenda</h2>
          <p className="text-slate-500">Gestão de relacionamento e compromissos comerciais.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-lg flex mr-2">
            <button 
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-ember' : 'text-slate-500 hover:text-slate-700'}`}
              title="Visão de Agenda"
            >
              <CalendarIcon size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-ember' : 'text-slate-500 hover:text-slate-700'}`}
              title="Visão de Lista"
            >
              <LayoutList size={20} />
            </button>
          </div>
          <Button onClick={() => { reset(); setIsModalOpen(true); }} className="flex items-center gap-2 bg-gradient-to-r from-fire to-ember h-11 px-6 shadow-md">
            <CalendarDays size={18} /> Novo Agendamento
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Cabeçalho da Agenda */}
          <div className="bg-slate-50 p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                <button onClick={prevMonth} className="p-1.5 hover:bg-slate-50 rounded text-slate-600"><ChevronLeft size={20} /></button>
                <button onClick={setToday} className="px-3 text-xs font-bold hover:bg-slate-50 rounded text-slate-600 border-x border-slate-100">HOJE</button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-slate-50 rounded text-slate-600"><ChevronRight size={20} /></button>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-ember"></div> REUNIÕES</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> FERIADOS</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> REALIZADAS</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div> FÉRIAS</div>
            </div>
          </div>

          {/* Legenda e Dica */}
          <div className="bg-amber-50/50 p-4 border-b border-amber-100 flex items-start gap-3">
            <div className="bg-amber-500 text-white p-1.5 rounded-lg shrink-0"><Bell size={16} /></div>
            <p className="text-xs text-amber-800 leading-relaxed italic">
              <strong>Dica:</strong> Você pode usar os "Lembretes" para marcar dias de manutenção de máquinas ou inventário da fábrica, eles ficarão salvos e visíveis para toda a administração!
            </p>
          </div>

          {/* Grid do Calendário */}
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 bg-slate-200 gap-px min-w-[800px]">
              {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(dia => (
                <div key={dia} className="bg-slate-50 p-3 text-center text-[10px] font-black text-slate-400 tracking-widest">{dia}</div>
              ))}
              
              {getDaysInMonth(currentDate).map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="bg-slate-50/50 min-h-[120px]"></div>;
                
                const dateStr = day.toISOString().split('T')[0];
                const isToday = new Date().toDateString() === day.toDateString();
                
                const reunioesNoDia = (reunioes || []).filter(r => 
                  new Date(r.dataHora || r.DataHora).toISOString().split('T')[0] === dateStr
                );
                
                const eventosNoDia = (agendaEventos || []).filter(e => 
                  new Date(e.data || e.Data).toISOString().split('T')[0] === dateStr
                );

                // Férias ocorrendo neste dia (read-only — respeitando dias de gozo com abono)
                const feriasNoDia = feriasCalendario.filter((f: any) => {
                  if (!f.dataInicio || !f.dataFim) return false;
                  
                  const parts = f.dataInicio.split('T')[0].split('-');
                  const year = parseInt(parts[0], 10);
                  const month = parseInt(parts[1], 10) - 1;
                  const day = parseInt(parts[2], 10);
                  
                  const inicioDate = new Date(Date.UTC(year, month, day));
                  const diasGozo = f.diasEfetivosGozo ?? (f.diasFerias - (f.solicitaAbono ? f.diasAbono : 0));
                  
                  const fimDate = new Date(inicioDate);
                  fimDate.setUTCDate(inicioDate.getUTCDate() + diasGozo - 1);
                  
                  const inicio = f.dataInicio.split('T')[0];
                  const fim = fimDate.toISOString().split('T')[0];
                  
                  return dateStr >= inicio && dateStr <= fim && f.status !== 4; // não cancelada
                });
                
                const feriadoFixo = getFeriadosNacionais(currentDate.getFullYear()).find(f => f.data === dateStr);

                return (
                  <div 
                    key={dateStr} 
                    className={`bg-white min-h-[120px] p-2 hover:bg-slate-50 transition-colors group cursor-pointer relative ${isToday ? 'bg-orange-50/30' : ''}`}
                    onClick={() => {
                      setSelectedDay(dateStr);
                      setValue('dataHora', `${dateStr}T10:00`);
                      setIsEventoModalOpen(true);
                    }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-sm font-bold ${isToday ? 'bg-ember text-white w-7 h-7 flex items-center justify-center rounded-full shadow-md' : 'text-slate-400'}`}>
                        {day.getDate()}
                      </span>
                      {feriadoFixo && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded leading-none">{feriadoFixo.nome}</span>}
                    </div>

                    <div className="space-y-1">
                      {/* Eventos Dinâmicos do Banco */}
                      {eventosNoDia.map((ev: any) => (
                        <div 
                          key={ev.id || ev.Id} 
                          className="flex items-center justify-between gap-1 bg-amber-100 border border-amber-200 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-bold group/ev relative hover:bg-amber-200 transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleEditEvento(ev); }}
                        >
                          <span className="flex items-center gap-1 truncate"><Star size={8} /> {ev.titulo || ev.Titulo}</span>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if(confirm('Excluir este evento?')) mutationDeleteEvento.mutate(ev.id || ev.Id); 
                            }}
                            className="opacity-0 group-hover/ev:opacity-100 text-red-600 hover:text-red-800 transition-opacity"
                          >
                            <XCircle size={10} />
                          </button>
                        </div>
                      ))}

                      {/* Férias (read-only — somente visualização) */}
                      {feriasNoDia.map((f: any) => {
                        const diasGozo = f.diasEfetivosGozo ?? (f.diasFerias - (f.solicitaAbono ? f.diasAbono : 0));
                        return (
                          <div
                            key={f.id}
                            className="flex items-center gap-1 bg-blue-100 border border-blue-200 text-blue-800 text-[9px] px-1.5 py-0.5 rounded font-bold truncate"
                            onClick={e => e.stopPropagation()}
                            title={`Férias: ${f.funcionarioNome} \u2014 ${f.diasFerias} dias${f.solicitaAbono ? ` (Gozo: ${diasGozo}d, Abono: ${f.diasAbono}d)` : ''}. Alterar em: RH > Férias`}
                          >
                            <Sun size={8} className="shrink-0" />
                            <span className="truncate">{f.funcionarioNome?.split(' ')[0]}</span>
                          </div>
                        );
                      })}

                      {reunioesNoDia.slice(0, 3).map((r: any) => {
                        const status = Number(r.status ?? r.Status);
                        const cliente = clientes?.find(c => c.id === (r.clienteId || r.ClienteId));
                        return (
                          <div 
                            key={r.id || r.Id} 
                            className={`text-[10px] p-1 rounded border truncate font-medium ${
                              status === 1 ? 'bg-green-50 border-green-200 text-green-700' :
                              status === 2 ? 'bg-red-50 border-red-200 text-red-700' :
                              'bg-amber-50 border-amber-200 text-amber-700'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(r);
                            }}
                          >
                            {new Date(r.dataHora || r.DataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {cliente?.nomeFantasia}
                          </div>
                        );
                      })}
                      {reunioesNoDia.length > 3 && (
                        <div className="text-[9px] font-bold text-slate-400 text-center">+ {reunioesNoDia.length - 3} reuniões</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Barra de Filtros (apenas visão lista) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-end">
            <div className="flex-1 min-w-0 sm:min-w-[200px] space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Filtrar por Cliente</label>
              <select 
                value={filterCliente} 
                onChange={(e) => setFilterCliente(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Todos os Clientes</option>
                {clientes?.map(c => <option key={c.id} value={c.id}>{c.nomeFantasia}</option>)}
              </select>
            </div>
            <div className="w-full sm:w-48 space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Filtrar por Data</label>
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <Button variant="secondary" onClick={() => { setFilterCliente(''); setFilterDate(''); }} className="h-10 shrink-0">
              Limpar
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Users size={20} className="text-ember" /> Histórico de Agendas
            </h3>
            
            <div className="space-y-4">
              {paginatedReunioes.length === 0 && <p className="text-center text-slate-400 py-8 font-medium">Nenhuma reunião encontrada.</p>}
              {paginatedReunioes.map((reuniao) => {
                const date = new Date(reuniao.dataHora || reuniao.DataHora);
                const cliente = clientes?.find(c => c.id === (reuniao.clienteId || reuniao.ClienteId));
                const status = Number(reuniao.status ?? reuniao.Status);
                
                return (
                  <div key={reuniao.id || reuniao.Id} className={`flex flex-col sm:flex-row items-start gap-4 p-4 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors ${status !== 0 ? 'opacity-60 shadow-inner' : 'shadow-sm bg-white'}`}>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className={`${status === 1 ? 'bg-green-50 text-green-700' : status === 2 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'} w-14 h-14 sm:w-16 sm:h-16 rounded-lg flex flex-col items-center justify-center shrink-0 border border-current/10`}>
                        <span className="text-[10px] sm:text-xs font-bold uppercase">{date.toLocaleString('pt-BR', { month: 'short' })}</span>
                        <span className="text-lg sm:text-xl font-black">{date.getDate()}</span>
                      </div>
                      <div className="sm:hidden flex-1">
                        <h4 className={`font-bold text-slate-800 text-base leading-tight ${status !== 0 ? 'line-through text-slate-400' : ''}`}>
                          {cliente?.nomeFantasia || 'Cliente'}
                        </h4>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          status === 0 ? 'bg-blue-100 text-blue-700' : 
                          status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {status === 0 ? 'Agendada' : status === 1 ? 'Realizada' : 'Cancelada'}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className={`hidden sm:block font-bold text-slate-800 text-lg ${status !== 0 ? 'line-through text-slate-400' : ''}`}>
                        {cliente?.nomeFantasia || 'Cliente'}
                      </h4>
                      <div className="bg-slate-50/50 p-2 sm:p-0 rounded-md sm:bg-transparent mt-1">
                        <p className="text-sm text-slate-600 font-medium">Pauta: <span className="font-normal text-slate-500">{reuniao.pauta || reuniao.Pauta}</span></p>
                        {status === 1 && <p className="text-xs text-green-600 mt-1 font-semibold flex items-center gap-1"><FileText size={12} /> Ata: {reuniao.ata || reuniao.Ata}</p>}
                      </div>
                    </div>

                    <div className="flex flex-col items-stretch sm:items-end gap-3 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <span className={`hidden sm:block px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        status === 0 ? 'bg-amber-100 text-amber-700' : 
                        status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {status === 0 ? 'Agendada' : status === 1 ? 'Realizada' : 'Cancelada'}
                      </span>
                      
                      {status === 0 && (
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                          <Button size="sm" className="h-9 sm:h-8 bg-ember hover:bg-fire text-white flex items-center justify-center gap-1 px-3 shadow-sm active:scale-95 transition-transform" onClick={() => handleEdit(reuniao)}><Edit2 size={14} /> <span className="sm:hidden">Editar</span></Button>
                          <Button size="sm" className="h-9 sm:h-8 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1 px-3 shadow-sm active:scale-95 transition-transform" onClick={() => { const id = reuniao.id || reuniao.Id; if(confirm('Deseja realmente cancelar esta reunião?')) { mutationCancel.mutate(id); } }}><XCircle size={14} /> <span className="sm:hidden">Excluir</span></Button>
                          <Button size="sm" className="col-span-2 h-9 sm:h-8 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1 px-4 shadow-sm active:scale-95 transition-transform" onClick={() => handleAta(reuniao)}><CheckCircle size={14} /> Concluir Reunião</Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Controles de Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100">
                <div className="flex flex-1 justify-between sm:hidden">
                  <Button variant="secondary" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
                  <Button variant="secondary" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Próxima</Button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-600">
                      Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> até <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAndSortedReunioes.length)}</span> de <span className="font-medium">{filteredAndSortedReunioes.length}</span> reuniões
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-ember text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{page}</button>
                      ))}
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Próxima</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Agendar/Editar */}
      <Modal isOpen={isModalOpen || isEditModalOpen} onClose={() => { setIsModalOpen(false); setIsEditModalOpen(false); }} title={isEditModalOpen ? "Editar Reunião" : "Agendar Reunião"}>
        <form onSubmit={handleSubmit((data) => isEditModalOpen ? mutationUpdate.mutate(data) : mutationCreate.mutate(data))} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Cliente <span className="text-red-500">*</span></label>
            <select {...register('clienteId')} className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm">
              <option value="">Selecione...</option>
              {clientes?.map(c => <option key={c.id} value={c.id}>{c.nomeFantasia}</option>)}
            </select>
          </div>
          <Input label="Data e Hora" required type="datetime-local" {...register('dataHora')} error={errors.dataHora?.message} />
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Pauta <span className="text-red-500">*</span></label>
            <textarea {...register('pauta')} className="w-full p-3 rounded-lg border border-slate-200 text-sm min-h-24" />
          </div>
          <Button type="submit" className="w-full bg-gradient-to-r from-fire to-ember" disabled={mutationCreate.isPending || mutationUpdate.isPending}>
            <Save size={18} className="mr-2" /> {isEditModalOpen ? 'Salvar Alterações' : 'Confirmar Agendamento'}
          </Button>
        </form>
      </Modal>

      {/* Modal Ata */}
      <Modal isOpen={isAtaModalOpen} onClose={() => setIsAtaModalOpen(false)} title="Concluir Reunião - Registro de Ata">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">O que foi decidido na reunião? <span className="text-red-500">*</span></label>
            <textarea value={ataText} onChange={(e) => setAtaText(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 text-sm min-h-32" placeholder="Digite aqui o resumo da reunião..." />
          </div>
          <Button onClick={() => mutationConcluir.mutate()} className="w-full bg-green-600" disabled={mutationConcluir.isPending}>
            <CheckCircle size={18} className="mr-2" /> Finalizar Reunião
          </Button>
        </div>
      </Modal>

      {/* Modal Escolha / Adicionar Evento */}
      <Modal 
        isOpen={isEventoModalOpen} 
        onClose={() => { 
          setIsEventoModalOpen(false); 
          setIsEditEvento(false); 
          resetEvento({ titulo: '', tipo: 'Feriado', data: '', descricao: '' }); 
        }} 
        title={isEditEvento ? "Editar Evento" : `Opções para o dia ${selectedDay.split('-').reverse().join('/')}`}
      >
        <div className="grid grid-cols-1 gap-4">
          {!isEditEvento && (
            <div className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-4"
                onClick={() => { setIsEventoModalOpen(false); setIsModalOpen(true); }}>
              <div className="bg-amber-100 text-amber-700 p-3 rounded-lg"><CalendarDays size={24} /></div>
              <div>
                <p className="font-bold text-slate-800">Agendar Nova Reunião</p>
                <p className="text-xs text-slate-500">Marcar compromisso com um cliente B2B.</p>
              </div>
            </div>
          )}

          <div className={`${!isEditEvento ? 'p-6 border-t border-slate-100 mt-2' : ''}`}>
            <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Star size={16} className="text-amber-500" /> {isEditEvento ? 'Atualizar Detalhes' : 'Cadastrar Feriado ou Lembrete'}
            </h4>
            <form onSubmit={handleSubEvento((data) => isEditEvento ? mutationUpdateEvento.mutate({ ...data, id: selectedEvento.id || selectedEvento.Id }) : mutationCreateEvento.mutate({ ...data, data: selectedDay }))} className="space-y-3">
              <Input label="Título do Evento" required placeholder="Ex: Feriado Municipal, Inventário..." {...regEvento('titulo', { required: true })} />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">Tipo</label>
                  <select {...regEvento('tipo')} className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm">
                    <option value="Feriado">Feriado</option>
                    <option value="Lembrete">Lembrete</option>
                    <option value="Aviso">Aviso</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 h-10 text-xs shadow-md shadow-amber-100" disabled={mutationCreateEvento.isPending || mutationUpdateEvento.isPending}>
                    <Save size={14} className="mr-2" /> {isEditEvento ? 'Salvar Alterações' : 'Salvar Evento'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </Modal>
      {/* ... modais ... */}
    </div>
  );
}
