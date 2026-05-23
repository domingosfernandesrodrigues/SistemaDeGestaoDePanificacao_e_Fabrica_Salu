import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import { Calculator, Download, CheckCircle, Loader2, Filter, ChevronLeft, ChevronRight, User, Calendar } from 'lucide-react';
import api from '../services/api';

export function FolhaPagamento() {
  const queryClient = useQueryClient();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Abas
  const [abaAtiva, setAbaAtiva] = useState<'abertas' | 'fechadas'>('abertas');

  // Filtros
  const [filtroFuncionario, setFiltroFuncionario] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAno, setFiltroAno] = useState('');

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  const { data: funcionários } = useQuery<any[]>({
    queryKey: ['funcionarios'],
    queryFn: async () => (await api.get('/Funcionarios')).data,
  });

  const { data: folhas, isLoading } = useQuery<any[]>({
    queryKey: ['folhas-pagamento'],
    queryFn: async () => {
      const response = await api.get('/folha-pagamento/funcionarios');
      return response.data;
    },
  });

  const mutationProcess = useMutation({
    mutationFn: () => api.post(`/folha-pagamento/processar?mes=${currentMonth}&ano=${currentYear}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folhas-pagamento'] });
      alert('Folha processada com sucesso!');
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao processar folha')
  });

  const mutationClose = useMutation({
    mutationFn: (id: string) => api.post(`/folha-pagamento/${id}/fechar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folhas-pagamento'] });
      queryClient.invalidateQueries({ queryKey: ['resumo-financeiro'] });
    },
  });

  // Rastreia quais IDs estão sendo baixados para impedir cliques duplos
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const downloadContracheque = async (id: string) => {
    // Guard: ignora se já está baixando este ID
    if (downloadingIds.has(id)) return;

    setDownloadingIds(prev => new Set(prev).add(id));
    try {
      const response = await api.get(`/folha-pagamento/${id}/contracheque`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contracheque_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
            const json = JSON.parse(text);
            alert(json.message || 'Erro ao gerar contracheque');
        } catch {
            alert('Erro ao gerar contracheque');
        }
      } else {
        alert('Erro de conexão ao gerar contracheque');
      }
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };


  // Reset da página ao filtrar
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroFuncionario, filtroMes, filtroAno]);

  // Aplicação de filtros e ordenação decrescente
  const folhasFiltradas = (folhas || [])
    .filter(f => {
      // Filtro por Aba (Suporta número ou string vinda do DTO)
      const statusAlvo = abaAtiva === 'abertas' ? [0, 'Aberta'] : [1, 'Fechada'];
      if (!statusAlvo.includes(f.status)) return false;

      if (filtroFuncionario && f.funcionarioNome !== filtroFuncionario) return false;
      if (filtroMes && f.mesReferencia !== parseInt(filtroMes)) return false;
      if (filtroAno && f.anoReferencia !== parseInt(filtroAno)) return false;
      return true;
    })
    .sort((a, b) => {
      if (b.anoReferencia !== a.anoReferencia) return b.anoReferencia - a.anoReferencia;
      return b.mesReferencia - a.mesReferencia;
    });

  const totalPaginas = Math.ceil(folhasFiltradas.length / itensPorPagina) || 1;
  const folhasPaginadas = folhasFiltradas.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-ember" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Folha de Pagamento</h2>
          <p className="text-slate-500">Gestão de salários, horas extras e contracheques.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            className="flex items-center gap-2 bg-gradient-to-r from-fire to-ember h-11 px-6 shadow-md"
            onClick={() => mutationProcess.mutate()}
            disabled={mutationProcess.isPending}
          >
            {mutationProcess.isPending ? <Loader2 className="animate-spin" size={18} /> : <Calculator size={18} />}
            Processar Mês Atual ({currentMonth}/{currentYear})
          </Button>
        </div>
      </div>

      {/* Navegação por Abas Responsiva */}
      <div className="grid grid-cols-2 sm:flex border-b border-slate-200">
        <button 
          onClick={() => setAbaAtiva('abertas')}
          className={`px-2 sm:px-6 py-3 text-xs sm:text-sm font-bold transition-all border-b-2 ${
            abaAtiva === 'abertas' 
            ? 'border-ember text-ember bg-ember/5' 
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span className="hidden sm:inline">Folhas em Aberto</span>
          <span className="sm:hidden">Em Aberto</span>
        </button>
        <button 
          onClick={() => setAbaAtiva('fechadas')}
          className={`px-2 sm:px-6 py-3 text-xs sm:text-sm font-bold transition-all border-b-2 ${
            abaAtiva === 'fechadas' 
            ? 'border-ember text-ember bg-ember/5' 
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span className="hidden sm:inline">Histórico de Fechadas</span>
          <span className="sm:hidden">Histórico</span>
        </button>
      </div>

      {/* Painel de Filtros Otimizado */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-5 items-end">
        <div className="flex-1 w-full space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><User size={12} /> Funcionário</label>
          <select 
            value={filtroFuncionario} 
            onChange={e => setFiltroFuncionario(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-ember/20 focus:border-ember outline-none transition-all"
          >
            <option value="">Todos os funcionários</option>
            {funcionários?.map(f => (
              <option key={f.id} value={f.nome}>{f.nome}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full lg:w-80">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Calendar size={12} /> Mês</label>
            <select 
              value={filtroMes} 
              onChange={e => setFiltroMes(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-ember/20 focus:border-ember outline-none transition-all"
            >
              <option value="">Todos</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Calendar size={12} /> Ano</label>
            <select 
              value={filtroAno} 
              onChange={e => setFiltroAno(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-ember/20 focus:border-ember outline-none transition-all"
            >
              <option value="">Todos</option>
              {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <Button variant="secondary" className="h-11 px-5 font-bold w-full lg:w-auto rounded-xl border-slate-200" onClick={() => { setFiltroFuncionario(''); setFiltroMes(''); setFiltroAno(''); }}>
          Limpar
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* View para Desktop e Notebooks Grandes (Tabela Compacta) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-4 py-4">Funcionário</th>
                <th className="px-3 py-4">Ref.</th>
                <th className="px-3 py-4 text-center">H. Extras (50/100%)</th>
                <th className="px-3 py-4 text-center">Adic. Noturno</th>
                <th className="px-3 py-4 text-center">Descontos</th>
                <th className="px-4 py-4 text-right">Salário Líquido</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-4 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {folhasPaginadas.length === 0 && <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400 font-medium">Nenhuma folha encontrada.</td></tr>}
              {folhasPaginadas.map((folha) => (
                <tr key={folha.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800">{folha.funcionarioNome}</td>
                  <td className="px-3 py-3 text-slate-500 font-black">{folha.mesReferencia.toString().padStart(2, '0')}/{folha.anoReferencia}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-center leading-tight">
                      <span className="text-slate-500 text-[10px]">50%: {folha.totalHorasExtras50}h</span>
                      <span className="text-amber-600 font-bold text-[10px]">100%: {folha.totalHorasExtras100}h</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-fire font-bold">
                    {folha.valorAdicionalNoturno > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(folha.valorAdicionalNoturno) : '-'}
                  </td>
                  <td className="px-3 py-3 text-center text-red-500 font-bold">
                    - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(folha.totalDescontos)}
                  </td>
                  <td className="px-4 py-3 font-black text-green-600 text-right text-base">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(folha.salarioLiquido)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                      folha.status === 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {folha.status === 0 ? 'Aberta' : 'Fechada'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        className="h-9 w-9 flex items-center justify-center bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                        title={downloadingIds.has(folha.id) ? 'Gerando PDF...' : 'Baixar Contracheque'}
                        onClick={() => downloadContracheque(folha.id)}
                        disabled={downloadingIds.has(folha.id)}
                      >
                        {downloadingIds.has(folha.id) ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                      </button>
                      {folha.status === 0 && (
                        <button 
                          className="h-9 w-9 flex items-center justify-center bg-ember text-white hover:bg-fire rounded-lg shadow-sm transition-all disabled:opacity-50" 
                          title="Fechar Folha (Gera Contas a Pagar)"
                          onClick={() => mutationClose.mutate(folha.id)}
                          disabled={mutationClose.isPending}
                        >
                          {mutationClose.isPending ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* View para Tablets e Mobile (Cards) */}
        <div className="lg:hidden divide-y divide-slate-100">
          {folhasPaginadas.length === 0 && <p className="p-8 text-center text-slate-400">Nenhuma folha encontrada.</p>}
          {folhasPaginadas.map((folha) => (
            <div key={folha.id} className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{folha.funcionarioNome}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{folha.mesReferencia.toString().padStart(2, '0')}/{folha.anoReferencia}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      folha.status === 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {folha.status === 0 ? 'Aberta' : 'Fechada'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Salário Líquido</p>
                  <p className="text-lg font-black text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(folha.salarioLiquido)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50">
                <div className="col-span-2 space-y-2">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Detalhamento CLT</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold">HE 50%</p>
                      <p className="text-sm font-black text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(folha.valorHorasExtras50)}</p>
                    </div>
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                      <p className="text-[10px] text-amber-600 font-bold">HE 100%</p>
                      <p className="text-sm font-black text-amber-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(folha.valorHorasExtras100)}</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold">Noturno</p>
                      <p className="text-sm font-black text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(folha.valorAdicionalNoturno)}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Descontos</p>
                  <p className="text-sm text-red-500 font-medium">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(folha.totalDescontos)}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="secondary" 
                  className="flex-1 h-10 border border-slate-200 flex items-center justify-center gap-2 text-xs font-bold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => downloadContracheque(folha.id)}
                  disabled={downloadingIds.has(folha.id)}
                >
                  {downloadingIds.has(folha.id) 
                    ? <><Loader2 size={16} className="animate-spin" /> Gerando...</>
                    : <><Download size={18} className="text-slate-700" /> Contracheque</>}
                </Button>
                {folha.status === 0 && (
                  <Button 
                    className="flex-1 h-10 bg-gradient-to-r from-fire to-ember text-white flex items-center justify-center gap-2 text-xs"
                    onClick={() => mutationClose.mutate(folha.id)}
                    disabled={mutationClose.isPending}
                  >
                    {mutationClose.isPending ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                    Fechar Folha
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Controles de Paginação */}
        {totalPaginas > 1 && (
          <div className="bg-slate-100 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-slate-600 font-medium">
              Mostrando {Math.min(folhasFiltradas.length, (paginaAtual - 1) * itensPorPagina + 1)} a {Math.min(paginaAtual * itensPorPagina, folhasFiltradas.length)} de {folhasFiltradas.length} registros
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                className="h-10 px-4 flex items-center gap-2 !bg-white !text-slate-700 border border-slate-300 shadow-sm hover:!bg-slate-50 disabled:opacity-50" 
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
              >
                <ChevronLeft size={16} /> Anterior
              </Button>
              <div className="h-10 px-4 flex items-center bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 shadow-sm">
                Página {paginaAtual} de {totalPaginas}
              </div>
              <Button 
                variant="secondary" 
                className="h-10 px-4 flex items-center gap-2 !bg-white !text-slate-700 border border-slate-300 shadow-sm hover:!bg-slate-50 disabled:opacity-50" 
                onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas}
              >
                Próximo <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Legenda de Cálculos (Metodologia CLT) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Calculator size={16} className="text-ember" /> Metodologia de Cálculo (CLT + SGP-F)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Horas Extras 50%</p>
            <p className="text-xs text-slate-600 leading-relaxed">Aplicadas sobre horas que excedem a jornada de 8h em dias úteis e sábados.</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-amber-600 uppercase">Horas Extras 100%</p>
            <p className="text-xs text-slate-600 leading-relaxed">Aplicadas integralmente em Domingos e **Feriados** (conforme cadastrado na Agenda CRM).</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-600 uppercase">Adicional Noturno</p>
            <p className="text-xs text-slate-600 leading-relaxed">Acréscimo de 20% sobre o valor da hora para trabalhos realizados entre **22:00 e 05:00**.</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Base e Descontos</p>
            <p className="text-xs text-slate-600 leading-relaxed">Base de 220h mensais. Descontos incluem INSS (8%) e afastamentos não remunerados.</p>
          </div>
        </div>
      </div>

      {abaAtiva === 'abertas' && (
        <div className="p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-100 text-xs flex items-start gap-3">
          <Filter size={16} className="mt-0.5 shrink-0" />
          <p>
            As folhas listadas acima estão em processamento. Ao clicar em <strong>"Fechar"</strong>, o status mudará para fechada e você poderá consultá-la permanentemente na aba de <strong>Histórico</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
