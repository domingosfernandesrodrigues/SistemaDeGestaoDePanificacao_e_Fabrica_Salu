import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import { Loader2, Check, X, Clock, FileText } from 'lucide-react';
import api from '../services/api';

export default function AfastamentosRH() {
  const queryClient = useQueryClient();

  const { data: afastamentos, isLoading } = useQuery<any[]>({
    queryKey: ['afastamentos-rh'],
    queryFn: async () => (await api.get('/Afastamentos')).data,
  });

  const mutationAprovar = useMutation({
    mutationFn: (id: string) => api.patch(`/Afastamentos/${id}/aprovar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['afastamentos-rh'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao aprovar afastamento')
  });

  const mutationReprovar = useMutation({
    mutationFn: (id: string) => api.patch(`/Afastamentos/${id}/reprovar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['afastamentos-rh'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao reprovar afastamento')
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Aprovação de Afastamentos</h2>
          <p className="text-slate-500">Gestão de férias, atestados e licenças dos funcionários.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-medium">Funcionário</th>
              <th className="px-4 py-3 font-medium">Motivo</th>
              <th className="px-4 py-3 font-medium">Período</th>
              <th className="px-4 py-3 font-medium">Observação</th>
              <th className="px-4 py-3 font-medium">Anexo</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={7} className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></td></tr>
            ) : afastamentos?.map((af) => (
              <tr key={af.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{af.nomeFuncionario}</td>
                <td className="px-4 py-3 text-slate-700">{af.motivo}</td>
                <td className="px-4 py-3 text-slate-700">
                  {new Date(af.dataInicio).toLocaleDateString()} até {new Date(af.dataFim).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate" title={af.observacao}>
                  {af.observacao || '-'}
                </td>
                <td className="px-4 py-3">
                  {af.anexoBase64 ? (
                    <a
                      href={af.anexoBase64}
                      download={af.anexoNome || 'anexo'}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-xs font-medium"
                      title={af.anexoNome}
                    >
                      <FileText size={14} />
                      Baixar
                    </a>
                  ) : (
                    <span className="text-slate-400 text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center w-fit gap-1 ${
                    af.status === 'Aprovado' ? 'bg-green-100 text-green-700' :
                    af.status === 'Reprovado' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {af.status === 'Pendente' && <Clock size={10} />}
                    {af.status === 'Aprovado' && <Check size={10} />}
                    {af.status === 'Reprovado' && <X size={10} />}
                    {af.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {af.status === 'Pendente' ? (
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => confirm('Aprovar afastamento?') && mutationAprovar.mutate(af.id)}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title="Aprovar"
                      >
                        <Check size={18} />
                      </button>
                      <button 
                        onClick={() => confirm('Reprovar afastamento?') && mutationReprovar.mutate(af.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Reprovar"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                     <span className="text-slate-300 text-xs">-</span>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && afastamentos?.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-slate-400 italic">Nenhum afastamento encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
