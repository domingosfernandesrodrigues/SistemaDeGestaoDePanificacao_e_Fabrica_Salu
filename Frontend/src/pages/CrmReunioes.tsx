import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { CalendarDays, Users, FileText, Loader2, Save, CheckCircle, XCircle, Edit2 } from 'lucide-react';
import api from '../services/api';

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
  const [selectedReuniao, setSelectedReuniao] = useState<any>(null);
  const [ataText, setAtaText] = useState('');

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

  if (loadingReunioes) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">CRM & Reuniões</h2>
          <p className="text-slate-500">Gestão de relacionamento com a carteira de clientes B2B.</p>
        </div>
        <Button onClick={() => { reset(); setIsModalOpen(true); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
          <CalendarDays size={18} /> Agendar Reunião
        </Button>
      </div>

      {/* Barra de Filtros */}
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
          <Users size={20} className="text-indigo-600" /> Histórico de Agendas
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
                  <div className={`${status === 1 ? 'bg-green-50 text-green-700' : status === 2 ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'} w-14 h-14 sm:w-16 sm:h-16 rounded-lg flex flex-col items-center justify-center shrink-0 border border-current/10`}>
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
                    status === 0 ? 'bg-blue-100 text-blue-700' : 
                    status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {status === 0 ? 'Agendada' : status === 1 ? 'Realizada' : 'Cancelada'}
                  </span>
                  
                  {status === 0 && (
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        className="h-9 sm:h-8 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1 px-3 shadow-sm active:scale-95 transition-transform" 
                        onClick={() => handleEdit(reuniao)}
                      >
                        <Edit2 size={14} /> <span className="sm:hidden">Editar</span>
                      </Button>
                      
                      <Button 
                        size="sm" 
                        className="h-9 sm:h-8 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1 px-3 shadow-sm active:scale-95 transition-transform" 
                        onClick={() => {
                          const id = reuniao.id || reuniao.Id;
                          if(confirm('Deseja realmente cancelar esta reunião?')) {
                            mutationCancel.mutate(id);
                          }
                        }}
                      >
                        <XCircle size={14} /> <span className="sm:hidden">Excluir</span>
                      </Button>

                      <Button 
                        size="sm" 
                        className="col-span-2 h-9 sm:h-8 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1 px-4 shadow-sm active:scale-95 transition-transform" 
                        onClick={() => handleAta(reuniao)}
                      >
                        <CheckCircle size={14} /> Concluir Reunião
                      </Button>
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
                    <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{page}</button>
                  ))}
                </div>
                <Button variant="secondary" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Próxima</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Agendar/Editar */}
      <Modal isOpen={isModalOpen || isEditModalOpen} onClose={() => { setIsModalOpen(false); setIsEditModalOpen(false); }} title={isEditModalOpen ? "Editar Reunião" : "Agendar Reunião"}>
        <form onSubmit={handleSubmit((data) => isEditModalOpen ? mutationUpdate.mutate(data) : mutationCreate.mutate(data))} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Cliente</label>
            <select {...register('clienteId')} className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm">
              <option value="">Selecione...</option>
              {clientes?.map(c => <option key={c.id} value={c.id}>{c.nomeFantasia}</option>)}
            </select>
          </div>
          <Input label="Data e Hora" type="datetime-local" {...register('dataHora')} error={errors.dataHora?.message} />
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Pauta</label>
            <textarea {...register('pauta')} className="w-full p-3 rounded-lg border border-slate-200 text-sm min-h-24" />
          </div>
          <Button type="submit" className="w-full bg-indigo-600" disabled={mutationCreate.isPending || mutationUpdate.isPending}>
            <Save size={18} className="mr-2" /> {isEditModalOpen ? 'Salvar Alterações' : 'Confirmar Agendamento'}
          </Button>
        </form>
      </Modal>

      {/* Modal Ata */}
      <Modal isOpen={isAtaModalOpen} onClose={() => setIsAtaModalOpen(false)} title="Concluir Reunião - Registro de Ata">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">O que foi decidido na reunião?</label>
            <textarea value={ataText} onChange={(e) => setAtaText(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 text-sm min-h-32" placeholder="Digite aqui o resumo da reunião..." />
          </div>
          <Button onClick={() => mutationConcluir.mutate()} className="w-full bg-green-600" disabled={mutationConcluir.isPending}>
            <CheckCircle size={18} className="mr-2" /> Finalizar Reunião
          </Button>
        </div>
      </Modal>
    </div>
  );
}
