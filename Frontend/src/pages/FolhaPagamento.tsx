import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import { Calculator, Download, CheckCircle, Loader2, Filter, ChevronLeft, ChevronRight, User, Calendar } from 'lucide-react';
import api from '../services/api';

export function FolhaPagamento() {
  const queryClient = useQueryClient();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

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

  const downloadContracheque = async (id: string) => {
    const response = await api.get(`/folha-pagamento/${id}/contracheque`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contracheque_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
  };

  // Reset da página ao filtrar
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroFuncionario, filtroMes, filtroAno]);

  // Aplicação de filtros e ordenação decrescente
  const folhasFiltradas = (folhas || [])
    .filter(f => {
      if (filtroFuncionario && f.funcionarioNome !== filtroFuncionario) return false;
      if (filtroMes && f.mesReferencia !== parseInt(filtroMes)) return false;
      if (filtroAno && f.anoReferencia !== parseInt(filtroAno)) return false;
      return true;
    })
    .sort((a, b) => {
      // Ordenação decrescente por Ano e depois Mês
      if (b.anoReferencia !== a.anoReferencia) return b.anoReferencia - a.anoReferencia;
      return b.mesReferencia - a.mesReferencia;
    });

  const totalPaginas = Math.ceil(folhasFiltradas.length / itensPorPagina) || 1;
  const folhasPaginadas = folhasFiltradas.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Folha de Pagamento</h2>
          <p className="text-slate-500">Gestão de salários, horas extras e contracheques.</p>
        </div>
        <Button 
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 h-12 px-6"
          onClick={() => mutationProcess.mutate()}
          disabled={mutationProcess.isPending}
        >
          {mutationProcess.isPending ? <Loader2 className="animate-spin" size={20} /> : <Calculator size={20} />}
          Processar Mês Atual ({currentMonth}/{currentYear})
        </Button>
      </div>

      {/* Painel de Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600 flex items-center gap-1"><User size={14} /> Funcionário</label>
          <select 
            value={filtroFuncionario} 
            onChange={e => setFiltroFuncionario(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos os funcionários</option>
            {funcionários?.map(f => (
              <option key={f.id} value={f.nome}>{f.nome}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600 flex items-center gap-1"><Calendar size={14} /> Mês</label>
          <select 
            value={filtroMes} 
            onChange={e => setFiltroMes(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos os meses</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600 flex items-center gap-1"><Calendar size={14} /> Ano</label>
          <select 
            value={filtroAno} 
            onChange={e => setFiltroAno(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos os anos</option>
            {[currentYear, currentYear - 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 h-10">
          <Button variant="secondary" className="w-full" onClick={() => { setFiltroFuncionario(''); setFiltroMes(''); setFiltroAno(''); }}>
            Limpar Filtros
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* View para Desktop (Tabela) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">Funcionário</th>
                <th className="px-6 py-4 font-medium">Ref.</th>
                <th className="px-6 py-4 font-medium">Horas Extras</th>
                <th className="px-6 py-4 font-medium">Descontos</th>
                <th className="px-6 py-4 font-medium">Salário Líquido</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {folhasPaginadas.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Nenhuma folha encontrada com os filtros atuais.</td></tr>}
              {folhasPaginadas.map((folha) => (
                <tr key={folha.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{folha.funcionarioNome}</td>
                  <td className="px-6 py-4 text-slate-500 font-bold">{folha.mesReferencia.toString().padStart(2, '0')}/{folha.anoReferencia}</td>
                  <td className="px-6 py-4 text-slate-600">{folha.totalHorasExtras}h ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(folha.valorHorasExtras)})</td>
                  <td className="px-6 py-4 text-red-500">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(folha.totalDescontos)}</td>
                  <td className="px-6 py-4 font-bold text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(folha.salarioLiquido)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      folha.status === 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {folha.status === 0 ? 'Aberta' : 'Fechada'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="text-xs bg-slate-100" 
                      title="Baixar Contracheque"
                      onClick={() => downloadContracheque(folha.id)}
                    >
                      <Download size={14} />
                    </Button>
                    {folha.status === 0 && (
                      <Button 
                        size="sm" 
                        className="text-xs bg-blue-600" 
                        title="Fechar Folha (Gera Contas a Pagar)"
                        onClick={() => mutationClose.mutate(folha.id)}
                        disabled={mutationClose.isPending}
                      >
                        {mutationClose.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle size={14} className="mr-1" />} Fechar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* View para Mobile (Cards) */}
        <div className="md:hidden divide-y divide-slate-100">
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
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">H. Extras</p>
                  <p className="text-sm text-slate-700 font-medium">{folha.totalHorasExtras}h ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(folha.valorHorasExtras)})</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold text-right">Descontos</p>
                  <p className="text-sm text-red-500 font-medium text-right">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(folha.totalDescontos)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  className="flex-1 h-10 bg-slate-100 text-slate-700 flex items-center justify-center gap-2"
                  onClick={() => downloadContracheque(folha.id)}
                >
                  <Download size={16} /> Contracheque PDF
                </Button>
                {folha.status === 0 && (
                  <Button 
                    className="flex-[1.5] h-10 bg-blue-600 text-white flex items-center justify-center gap-2"
                    onClick={() => mutationClose.mutate(folha.id)}
                    disabled={mutationClose.isPending}
                  >
                    {mutationClose.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle size={16} />}
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
      
      <div className="p-4 bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-100 text-sm">
        <strong>Integração Financeira:</strong> Ao "Fechar" a folha de um funcionário, o sistema criará automaticamente um registro no módulo <strong>Contas a Pagar</strong>.
      </div>
    </div>
  );
}
