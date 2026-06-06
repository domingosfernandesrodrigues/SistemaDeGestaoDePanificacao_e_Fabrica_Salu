// CandidaturasRH.tsx - Recrutamento e Seleção
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Search, Loader2, Download, Trash2, User, Phone, Mail, Calendar, Eye, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

interface Candidatura {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cargoInteresse: string;
  mensagem?: string;
  nomeOriginalArquivo: string;
  dataEnvio: string;
  status: string;
}

export function CandidaturasRH() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cargoFilter, setCargoFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCandidatura, setSelectedCandidatura] = useState<Candidatura | null>(null);

  const queryClient = useQueryClient();

  // Buscar candidaturas
  const { data: candidaturas, isLoading, error } = useQuery<Candidatura[]>({
    queryKey: ['candidaturas'],
    queryFn: async () => (await api.get('/Candidaturas')).data,
  });

  // Alterar Status
  const mutationStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/Candidaturas/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidaturas'] });
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao alterar status da candidatura')
  });

  // Excluir Candidatura
  const mutationDelete = useMutation({
    mutationFn: (id: string) => api.delete(`/Candidaturas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidaturas'] });
      if (selectedCandidatura) setSelectedCandidatura(null);
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao excluir candidatura')
  });

  // Download do Currículo
  const handleDownload = async (candidatura: Candidatura) => {
    try {
      const response = await api.get(`/Candidaturas/${candidatura.id}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = candidatura.nomeOriginalArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Erro ao tentar baixar o arquivo do currículo.');
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Novo':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Em Análise':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'Entrevista':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'Contratado':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'Recusado':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  // Filtrar Candidaturas
  const filtered = candidaturas?.filter((c) => {
    const termLower = searchTerm.toLowerCase();
    const matchesSearch =
      c.nome.toLowerCase().includes(termLower) ||
      c.email.toLowerCase().includes(termLower) ||
      c.telefone.includes(searchTerm);

    const matchesCargo = cargoFilter === '' || c.cargoInteresse === cargoFilter;
    const matchesStatus = statusFilter === '' || c.status === statusFilter;

    return matchesSearch && matchesCargo && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="animate-spin text-ember" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 text-red-500 p-4 rounded-xl border border-red-500/20 text-center">
        Ocorreu um erro ao carregar as candidaturas. Certifique-se de que possui a permissão de acesso correta.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Currículos Recebidos</h2>
        <p className="text-slate-500">Gerencie as candidaturas enviadas pelo formulário público do site.</p>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 w-full md:max-w-xs">
          <Search className="text-slate-400 shrink-0" size={18} />
          <input
            type="text"
            placeholder="Buscar candidato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <select
            value={cargoFilter}
            onChange={(e) => setCargoFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-ember transition-colors"
          >
            <option value="">Todos os cargos</option>
            <option value="Produção / Fábrica">Produção / Fábrica</option>
            <option value="Logística / Motorista">Logística / Motorista</option>
            <option value="Administrativo">Administrativo</option>
            <option value="Comercial / Vendas">Comercial / Vendas</option>
            <option value="Financeiro">Financeiro</option>
            <option value="Outro">Outro</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-ember transition-colors"
          >
            <option value="">Todos os status</option>
            <option value="Novo">Novo</option>
            <option value="Em Análise">Em Análise</option>
            <option value="Entrevista">Entrevista</option>
            <option value="Contratado">Contratado</option>
            <option value="Recusado">Recusado</option>
          </select>
        </div>
      </div>

      {/* Grid de Candidaturas (Responsivo) */}
      <div className="grid grid-cols-1 gap-4">
        {filtered && filtered.length > 0 ? (
          filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-ember/10 flex items-center justify-center text-ember shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{c.nome}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Mail size={12} /> {c.email}</span>
                    <span className="flex items-center gap-1"><Phone size={12} /> {c.telefone}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> Recebido em: {new Date(c.dataEnvio).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                <div className="text-sm">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Cargo de Interesse</span>
                  <span className="font-semibold text-slate-700">{c.cargoInteresse}</span>
                </div>

                <div className="text-sm">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Status</span>
                  <select
                    value={c.status}
                    onChange={(e) => mutationStatus.mutate({ id: c.id, status: e.target.value })}
                    className={`text-xs font-bold rounded-full px-2.5 py-1 outline-none border transition-all ${getStatusClass(c.status)}`}
                  >
                    <option value="Novo">Novo</option>
                    <option value="Em Análise">Em Análise</option>
                    <option value="Entrevista">Entrevista</option>
                    <option value="Contratado">Contratado</option>
                    <option value="Recusado">Recusado</option>
                  </select>
                </div>

                <div className="flex gap-2 justify-end mt-2 sm:mt-0">
                  {c.mensagem && (
                    <button
                      onClick={() => setSelectedCandidatura(c)}
                      className="p-2 text-slate-400 hover:text-ember hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                      title="Ver mensagem de apresentação"
                    >
                      <Eye size={18} />
                    </button>
                  )}

                  <button
                    onClick={() => handleDownload(c)}
                    className="p-2 text-slate-400 hover:text-green-600 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200 flex items-center gap-1 text-xs"
                    title="Baixar currículo"
                  >
                    <Download size={18} />
                  </button>

                  <button
                    onClick={() => confirm('Excluir esta candidatura permanentemente?') && mutationDelete.mutate(c.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                    title="Excluir candidatura"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-12 text-center text-slate-500 rounded-xl border border-slate-200">
            Nenhuma candidatura encontrada com os filtros selecionados.
          </div>
        )}
      </div>

      {/* Modal para Visualizar a Mensagem */}
      <Modal
        isOpen={selectedCandidatura !== null}
        onClose={() => setSelectedCandidatura(null)}
        title="Apresentação do Candidato"
      >
        {selectedCandidatura && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">Nome do Candidato</h4>
              <p className="text-slate-800 font-semibold text-lg">{selectedCandidatura.nome}</p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">Mensagem</h4>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                {selectedCandidatura.mensagem || 'Nenhuma mensagem enviada.'}
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                onClick={() => handleDownload(selectedCandidatura)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white flex justify-center gap-2 items-center"
              >
                <Download size={18} /> Baixar Currículo
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSelectedCandidatura(null)}
                className="flex-1"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
