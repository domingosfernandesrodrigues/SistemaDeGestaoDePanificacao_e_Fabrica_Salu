import { useState, useEffect } from 'react';
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

  const [searchFuncionario, setSearchFuncionario] = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [dataInicioFiltro, setDataInicioFiltro] = useState('');
  const [dataFimFiltro, setDataFimFiltro] = useState('');

  const filteredAfastamentos = afastamentos?.filter(af => {
    const matchFuncionario = af.nomeFuncionario?.toLowerCase().includes(searchFuncionario.toLowerCase());
    const matchMotivo = filtroMotivo ? af.motivo === filtroMotivo : true;
    const matchStatus = filtroStatus ? af.status === filtroStatus : true;
    
    let matchPeriodo = true;
    if (dataInicioFiltro || dataFimFiltro) {
      const afInicio = new Date(af.dataInicio).getTime();
      const afFim = new Date(af.dataFim).getTime();
      
      const filtroInicio = dataInicioFiltro ? new Date(dataInicioFiltro).getTime() : 0;
      const filtroFim = dataFimFiltro ? new Date(dataFimFiltro).setHours(23, 59, 59, 999) : Infinity;

      if (dataInicioFiltro && afInicio < filtroInicio) matchPeriodo = false;
      if (dataFimFiltro && afFim > filtroFim) matchPeriodo = false;
    }

    return matchFuncionario && matchMotivo && matchStatus && matchPeriodo;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil((filteredAfastamentos?.length || 0) / itemsPerPage);
  const paginatedAfastamentos = filteredAfastamentos?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchFuncionario, filtroMotivo, filtroStatus, dataInicioFiltro, dataFimFiltro]);

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

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3">
        <input 
          type="text" 
          placeholder="Buscar por funcionário..." 
          value={searchFuncionario}
          onChange={(e) => setSearchFuncionario(e.target.value)}
          className="flex-1 min-w-[200px] h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <select 
          value={filtroMotivo} 
          onChange={(e) => setFiltroMotivo(e.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none max-w-xs"
        >
          <option value="">Todos os Motivos</option>
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
            <option value="Falta Justificada">Falta Justificada</option>
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
        <select 
          value={filtroStatus} 
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">Todos os Status</option>
          <option value="Pendente">Pendente</option>
          <option value="Aprovado">Aprovado</option>
          <option value="Reprovado">Reprovado</option>
        </select>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input 
            type="date" 
            value={dataInicioFiltro}
            onChange={(e) => setDataInicioFiltro(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <span className="text-slate-400 hidden sm:block">até</span>
          <input 
            type="date" 
            value={dataFimFiltro}
            onChange={(e) => setDataFimFiltro(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        {(searchFuncionario || filtroMotivo || filtroStatus || dataInicioFiltro || dataFimFiltro) && (
          <Button 
            variant="secondary" 
            className="h-10 text-slate-500 whitespace-nowrap"
            onClick={() => {
              setSearchFuncionario('');
              setFiltroMotivo('');
              setFiltroStatus('');
              setDataInicioFiltro('');
              setDataFimFiltro('');
            }}
          >
            Limpar Filtros
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[900px]">
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
              <tr><td colSpan={7} className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-ember" /></td></tr>
            ) : paginatedAfastamentos?.map((af) => (
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
                      className="text-ember hover:text-fire flex items-center gap-1 text-xs font-medium"
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
            {!isLoading && filteredAfastamentos?.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-slate-400 italic">Nenhum afastamento encontrado para estes filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button 
              variant="secondary" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Próxima
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700">
                Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> até <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAfastamentos?.length || 0)}</span> de <span className="font-medium">{filteredAfastamentos?.length || 0}</span> resultados
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page 
                      ? 'bg-ember text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
