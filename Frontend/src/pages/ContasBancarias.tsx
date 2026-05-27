import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Pencil,
  Wallet, 
  Building2, 
  CreditCard, 
  TrendingUp,
  AlertCircle,
  ArrowRightLeft,
  ArrowUpCircle,
  ArrowDownCircle,
  Save,
  X,
  Loader2,
  Info,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const contaSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  tipo: z.coerce.number(),
  saldoInicial: z.coerce.number().min(0, 'Saldo não pode ser negativo'),
  ativa: z.boolean().default(true),
  isPadrao: z.boolean().default(false),
  pixChave: z.string().optional(),
  bancoNome: z.string().optional(),
  agencia: z.string().optional(),
  numeroConta: z.string().optional(),
  gatewayToken: z.string().optional()
});

type ContaForm = z.infer<typeof contaSchema>;

export function ContasBancarias() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMovimentacaoOpen, setIsMovimentacaoOpen] = useState(false);
  const [selectedContaMov, setSelectedContaMov] = useState<any>(null);
  const [movData, setMovData] = useState<any>({ tipo: 'entrada', valor: '', descricao: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();

  // Filtros do extrato
  const [extratoDataFiltro, setExtratoDataFiltro] = useState('');
  const [extratoOrigemFiltro, setExtratoOrigemFiltro] = useState('todos');

  // Paginação do extrato
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [extratoDataFiltro, extratoOrigemFiltro, filtroMes, filtroAno]);

  const { data: contas, isLoading } = useQuery<any[]>({
    queryKey: ['contas-bancarias', filtroMes, filtroAno],
    queryFn: async () => (await api.get(`/ContasBancarias/saldos-periodo?mes=${filtroMes}&ano=${filtroAno}`)).data
  });

  const { data: extrato, isLoading: isLoadingExtrato } = useQuery<any[]>({
    queryKey: ['extrato-bancario', filtroMes, filtroAno],
    queryFn: async () => (await api.get(`/ContasBancarias/extrato?mes=${filtroMes}&ano=${filtroAno}`)).data
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ContaForm>({
    resolver: zodResolver(contaSchema)
  });

  const mutationCreate = useMutation({
    mutationFn: (data: ContaForm) => api.post('/ContasBancarias', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['extrato-bancario'] });
      handleCloseModal();
    }
  });

  const mutationUpdate = useMutation({
    mutationFn: ({ id, data }: { id: string, data: ContaForm }) => api.put(`/ContasBancarias/${id}`, { id, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['extrato-bancario'] });
      handleCloseModal();
    }
  });


  const mutationMovimentar = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => api.post(`/ContasBancarias/${id}/movimentar`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['extrato-bancario'] });
      setIsMovimentacaoOpen(false);
      setMovData({ tipo: 'entrada', valor: '', descricao: '' });
    }
  });

  const handleEdit = (conta: any) => {
    setEditId(conta.id);
    setValue('nome', conta.nome);
    setValue('tipo', conta.tipo);
    setValue('saldoInicial', conta.saldoInicial);
    setValue('ativa', conta.ativa);
    setValue('isPadrao', conta.isPadrao);
    setValue('pixChave', conta.pixChave || '');
    setValue('bancoNome', conta.bancoNome || '');
    setValue('agencia', conta.agencia || '');
    setValue('numeroConta', conta.numeroConta || '');
    setValue('gatewayToken', conta.gatewayToken || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    reset();
  };

  const onSubmit = (data: ContaForm) => {
    if (editId) {
      mutationUpdate.mutate({ id: editId, data });
    } else {
      mutationCreate.mutate(data);
    }
  };

  const filteredContas = contas?.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTipoLabel = (tipo: number) => {
    switch(tipo) {
      case 0: return 'Caixa Físico';
      case 1: return 'Conta Corrente';
      case 2: return 'Poupança';
      case 3: return 'Investimento';
      default: return 'Outro';
    }
  };

  const getTipoIcon = (tipo: number) => {
    switch(tipo) {
      case 0: return <Wallet className="text-amber-500" size={18} />;
      case 1: return <Building2 className="text-amber-500" size={18} />;
      case 2: return <TrendingUp className="text-emerald-500" size={18} />;
      default: return <CreditCard className="text-slate-500" size={18} />;
    }
  };

  const totalSaldo = contas?.reduce((acc, c) => acc + c.saldoAtual, 0) || 0;
  const totalEntradas = extrato?.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.valor, 0) || 0;
  const totalSaidas = extrato?.filter(m => m.tipo === 'saida').reduce((acc, m) => acc + m.valor, 0) || 0;
  const resultadoPeriodo = totalEntradas - totalSaidas;

  // Lógica de filtragem do extrato
  const filteredExtrato = extrato?.filter((mov: any) => {
    if (extratoDataFiltro) {
      const dataMovStr = mov.dataMovimentacao.split('T')[0];
      if (dataMovStr !== extratoDataFiltro) {
        return false;
      }
    }
    if (extratoOrigemFiltro !== 'todos') {
      if (mov.origem !== Number(extratoOrigemFiltro)) {
        return false;
      }
    }
    return true;
  }) || [];

  // Lógica de paginação do extrato
  const totalItems = filteredExtrato.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedExtrato = filteredExtrato.slice(startIndex, startIndex + itemsPerPage);

  const handleMesAnterior = () => {
    if (filtroMes === 1) {
      setFiltroMes(12);
      setFiltroAno(prev => prev - 1);
    } else {
      setFiltroMes(prev => prev - 1);
    }
  };

  const handleMesSeguinte = () => {
    if (filtroMes === 12) {
      setFiltroMes(1);
      setFiltroAno(prev => prev + 1);
    } else {
      setFiltroMes(prev => prev + 1);
    }
  };

  const getMesNome = (m: number) => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[m - 1];
  };

  const getOrigemLabel = (origem: number) => {
    switch(origem) {
      case 0: return 'Manual';
      case 1: return 'Despesa';
      case 2: return 'Receita';
      case 3: return 'Venda';
      case 4: return 'Combustível';
      case 5: return 'Manutenção';
      case 6: return 'Abertura';
      default: return 'Outro';
    }
  };

  const getOrigemBadgeClass = (origem: number) => {
    switch(origem) {
      case 0: return 'bg-blue-50 border border-blue-100 text-blue-700';
      case 1: return 'bg-red-50 border border-red-100 text-red-700';
      case 2: return 'bg-emerald-50 border border-emerald-100 text-emerald-700';
      case 3: return 'bg-amber-50 border border-amber-100 text-amber-700';
      case 4: return 'bg-slate-50 border border-slate-200 text-slate-700';
      case 5: return 'bg-orange-50 border border-orange-100 text-orange-700';
      case 6: return 'bg-teal-50 border border-teal-100 text-teal-700';
      default: return 'bg-slate-50 border border-slate-100 text-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Contas Bancárias e Saldos</h2>
          <p className="text-slate-500 text-sm">Gerencie os saldos iniciais e atuais das suas contas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Navegação de Mês/Ano */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button 
              onClick={handleMesAnterior}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 transition-all"
              title="Mês Anterior"
            >
              <ArrowLeft size={16} />
            </button>
            <span className="px-4 text-sm font-bold text-slate-700 select-none min-w-[120px] text-center">
              {getMesNome(filtroMes)}
            </span>
            <button 
              onClick={handleMesSeguinte}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 transition-all"
              title="Mês Seguinte"
            >
              <ArrowRight size={16} />
            </button>
            
            <div className="h-4 w-px bg-slate-200 mx-2" />

            <select
              value={filtroAno}
              onChange={(e) => setFiltroAno(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none pr-2 cursor-pointer border-0 ring-0 focus:ring-0 focus:border-0"
            >
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 3 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 px-6">
            <Plus size={18} /> Adicionar Conta / Saldo
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Consolidado */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Saldo Consolidado</span>
            <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
              <TrendingUp className="text-emerald-600" size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSaldo)}
          </p>
        </div>

        {/* Card 2: Entradas no Período */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Entradas no Período</span>
            <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
              <ArrowUpCircle className="text-emerald-500" size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalEntradas)}
          </p>
        </div>

        {/* Card 3: Saídas no Período */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-red-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Saídas no Período</span>
            <div className="p-2 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
              <ArrowDownCircle className="text-red-500" size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-red-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSaidas)}
          </p>
        </div>

        {/* Card 4: Resultado Operacional */}
        <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group transition-all ${
          resultadoPeriodo >= 0 ? 'hover:border-emerald-300' : 'hover:border-red-300'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Resultado Operacional</span>
            <div className={`p-2 rounded-lg transition-colors ${
              resultadoPeriodo >= 0 ? 'bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600' : 'bg-red-50 group-hover:bg-red-100 text-red-600'
            }`}>
              <Building2 size={18} />
            </div>
          </div>
          <p className={`text-2xl font-black ${resultadoPeriodo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resultadoPeriodo)}
          </p>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Filtrar por nome da conta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Tabela de Contas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conta / Caixa</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Inicial</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Atual</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" size={32} />
                    <p className="text-slate-500 text-sm">Carregando contas...</p>
                  </td>
                </tr>
              ) : filteredContas?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma conta encontrada.
                  </td>
                </tr>
              ) : (
                filteredContas?.map((conta) => (
                  <tr key={conta.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          {getTipoIcon(conta.tipo)}
                        </div>
                        <span className="font-bold text-slate-700">{conta.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-500">{getTipoLabel(conta.tipo)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-slate-500">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.saldoInicial)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold font-mono ${conta.saldoAtual >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.saldoAtual)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${conta.ativa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {conta.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                        {conta.isPadrao && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded-full w-fit">Padrão</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { 
                            setSelectedContaMov(conta); 
                            setMovData({ tipo: 'entrada', valor: '', descricao: '' });
                            setIsMovimentacaoOpen(true); 
                          }}
                          className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Lançar Movimentação"
                        >
                          <ArrowRightLeft size={16} />
                        </button>
                        <button 
                          onClick={() => handleEdit(conta)}
                          className="p-2 text-slate-400 hover:text-ember hover:bg-ember/5 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seção de Extrato do Período */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Extrato de Movimentações</h3>
            <p className="text-xs text-slate-500">Histórico de todas as entradas e saídas financeiras do período de {getMesNome(filtroMes)} de {filtroAno}.</p>
          </div>
          <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 w-fit">
            {filteredExtrato.length} lançamentos
          </div>
        </div>

        {/* Barra de Filtros do Extrato */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Search size={14} className="text-slate-400" />
            Filtrar por:
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Data:</span>
            <input 
              type="date" 
              value={extratoDataFiltro}
              onChange={(e) => setExtratoDataFiltro(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-700 bg-white cursor-pointer font-semibold transition-all hover:border-slate-350"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Origem:</span>
            <select
              value={extratoOrigemFiltro}
              onChange={(e) => setExtratoOrigemFiltro(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-700 bg-white font-semibold cursor-pointer transition-all hover:border-slate-350"
            >
              <option value="todos">Todas as Origens</option>
              <option value="0">Manual</option>
              <option value="1">Despesa (Baixa)</option>
              <option value="2">Receita (Baixa)</option>
              <option value="3">Venda (Faturamento)</option>
              <option value="4">Frota (Combustível)</option>
              <option value="5">Frota (Manutenção)</option>
              <option value="6">Abertura de Conta</option>
            </select>
          </div>

          {(extratoDataFiltro || extratoOrigemFiltro !== 'todos') && (
            <button
              onClick={() => {
                setExtratoDataFiltro('');
                setExtratoOrigemFiltro('todos');
              }}
              className="h-9 px-3 text-xs font-bold text-red-650 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1.5 ml-auto active:scale-95 border border-transparent hover:border-red-100"
            >
              <X size={14} /> Limpar Filtros
            </button>
          )}
        </div>

        {isLoadingExtrato ? (
          <div className="py-12 text-center">
            <Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" size={32} />
            <p className="text-slate-500 text-sm">Carregando extrato...</p>
          </div>
        ) : !extrato || extrato.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Nenhuma movimentação registrada neste período.
          </div>
        ) : filteredExtrato.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
            <Info size={24} className="text-slate-300" />
            <span>Nenhuma movimentação encontrada com os filtros aplicados.</span>
            {(extratoDataFiltro || extratoOrigemFiltro !== 'todos') && (
              <Button 
                onClick={() => { setExtratoDataFiltro(''); setExtratoOrigemFiltro('todos'); }}
                variant="outline" 
                size="sm"
                className="mt-2 text-xs"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto space-y-4">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conta</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origem</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedExtrato.map((mov: any) => {
                  const contaAssociada = contas?.find(c => c.id === mov.contaBancariaId);
                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">
                        {new Date(mov.dataMovimentacao).toLocaleDateString('pt-BR')} {new Date(mov.dataMovimentacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-600">
                        {contaAssociada?.nome || 'Conta Excluída'}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getOrigemBadgeClass(mov.origem)}`}>
                          {getOrigemLabel(mov.origem)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs truncate" title={mov.descricao}>
                        {mov.descricao}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          {mov.tipo === 'entrada' ? (
                            <ArrowUpCircle className="text-emerald-500" size={14} />
                          ) : (
                            <ArrowDownCircle className="text-red-500" size={14} />
                          )}
                          <span className={mov.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}>
                            {mov.tipo === 'entrada' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mov.valor)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-4 px-4 pb-2 gap-4">
                <div className="text-xs text-slate-500 font-medium">
                  Mostrando <span className="font-bold text-slate-700">{startIndex + 1}</span> a <span className="font-bold text-slate-700">{Math.min(startIndex + itemsPerPage, totalItems)}</span> de <span className="font-bold text-slate-700">{totalItems}</span> lançamentos
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={activePage === 1}
                    className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent transition-all active:scale-95"
                    title="Página Anterior"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all active:scale-95 ${
                        page === activePage 
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-100' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={activePage === totalPages}
                    className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent transition-all active:scale-95"
                    title="Próxima Página"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editId ? 'Editar Conta / Caixa' : 'Nova Conta / Caixa'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 mb-2">
            <AlertCircle className="text-amber-600 shrink-0" size={20} />
            <p className="text-xs text-amber-800 leading-relaxed">
              Informe o <strong>Saldo Inicial</strong> da sua conta. Esse valor representa o montante exato que você possui no banco ou em mãos neste momento.
            </p>
          </div>

          <Input 
            label="Nome da Conta"
            required
            placeholder="Ex: Banco do Brasil, Itaú, Caixa Geral..."
            {...register('nome')}
            error={errors.nome?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Tipo de Conta <span className="text-red-500">*</span></label>
              <select 
                {...register('tipo')}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="1">Conta Corrente</option>
                <option value="2">Poupança</option>
                <option value="3">Investimento</option>
                <option value="0">Outros / Caixa Geral</option>
              </select>
            </div>

            <Input 
              label="Saldo Inicial (R$)"
              required
              type="number"
              step="0.01"
              placeholder="0,00"
              {...register('saldoInicial')}
              error={errors.saldoInicial?.message}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
            <div className="flex items-center gap-3 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-lg border border-slate-100 sm:border-0">
              <input 
                type="checkbox" 
                id="ativa" 
                {...register('ativa')}
                className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor="ativa" className="text-sm font-medium text-slate-700">Conta Ativa</label>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-lg border border-slate-100 sm:border-0">
              <input 
                type="checkbox" 
                id="isPadrao" 
                {...register('isPadrao')}
                className="w-5 h-5 text-ember border-slate-300 rounded focus:ring-ember/30"
              />
              <label htmlFor="isPadrao" className="text-sm font-medium text-slate-700">Conta Padrão</label>
            </div>
          </div>

          <div className="pt-4 space-y-4 border-t border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configurações de Recebimento</h4>
            
            <Input 
              label="Chave Pix"
              placeholder="E-mail, CPF, CNPJ ou Chave Aleatória"
              {...register('pixChave')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                label="Nome do Banco"
                placeholder="Ex: Itaú, Nubank..."
                {...register('bancoNome')}
              />
              <Input 
                label="Agência"
                placeholder="0001"
                {...register('agencia')}
              />
            </div>
            <Input 
              label="Número da Conta"
              placeholder="12345-6"
              {...register('numeroConta')}
            />
            <Input 
              label="Token de API do Gateway (Opcional)"
              placeholder="Token para integração"
              {...register('gatewayToken')}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={handleCloseModal} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 px-8"
              disabled={mutationCreate.isPending || mutationUpdate.isPending}
            >
              {(mutationCreate.isPending || mutationUpdate.isPending) ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              {editId ? 'Salvar Alterações' : 'Cadastrar Conta'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Movimentação (Lançar Caixa) */}
      <Modal
        isOpen={isMovimentacaoOpen}
        onClose={() => setIsMovimentacaoOpen(false)}
        title={`Movimentação - ${selectedContaMov?.nome}`}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMovData({ ...movData, tipo: 'entrada' })}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                movData.tipo === 'entrada' 
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100' 
                : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
              }`}
            >
              <ArrowUpCircle size={24} />
              <span className="text-xs font-black uppercase">Entrada</span>
            </button>
            <button
              onClick={() => setMovData({ ...movData, tipo: 'saida' })}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                movData.tipo === 'saida' 
                ? 'border-red-500 bg-red-50 text-red-700 shadow-sm shadow-red-100' 
                : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
              }`}
            >
              <ArrowDownCircle size={24} />
              <span className="text-xs font-black uppercase">Saída</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor do Lançamento (R$)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">R$</span>
              <input
                type="text"
                value={movData.valor}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/[^0-9.,]/g, '');
                  setMovData({ ...movData, valor: cleanVal });
                }}
                className="w-full h-14 pl-12 pr-4 rounded-xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-2xl font-black text-slate-800 transition-all"
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição / Motivo</label>
            <textarea
              value={movData.descricao}
              onChange={(e) => setMovData({ ...movData, descricao: e.target.value })}
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-sm min-h-[120px] transition-all"
              placeholder="Ex: Reforço de caixa, Sangria, Pequena despesa..."
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsMovimentacaoOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button 
              className={`w-full sm:w-auto ${movData.tipo === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} px-8 h-12 shadow-md`}
              onClick={() => {
                const numericVal = Number(movData.valor.replace(',', '.'));
                mutationMovimentar.mutate({ 
                  id: selectedContaMov.id, 
                  data: { ...movData, valor: numericVal } 
                });
              }}
              disabled={mutationMovimentar.isPending || !movData.valor || Number(movData.valor.replace(',', '.')) <= 0}
            >
              {mutationMovimentar.isPending ? <Loader2 className="animate-spin" size={18} /> : 'Confirmar Lançamento'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
