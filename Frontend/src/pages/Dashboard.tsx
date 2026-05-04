import { useQuery } from '@tanstack/react-query';
import { TrendingUp, DollarSign, Activity, Package, Factory, Loader2 } from 'lucide-react';
import api from '../services/api';

export function Dashboard() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const { data: dre, isLoading: loadingDre } = useQuery({
    queryKey: ['dre', currentMonth, currentYear],
    queryFn: async () => {
      const response = await api.get(`/Financeiro/dre?mes=${currentMonth}&ano=${currentYear}`);
      return response.data;
    },
  });

  const { data: resumo, isLoading: loadingResumo } = useQuery({
    queryKey: ['resumo-financeiro'],
    queryFn: async () => {
      const response = await api.get('/Financeiro/resumo');
      return response.data;
    },
  });

  const { data: ops } = useQuery<any[]>({
    queryKey: ['ops'],
    queryFn: async () => {
      const response = await api.get('/ordens-producao');
      return response.data;
    },
  });

  if (loadingDre || loadingResumo) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  const opsFinalizadas = ops?.filter(o => o.status === 2).length || 0; // 2: Finalizada
  const opsEmAndamento = ops?.filter(o => o.status === 1).length || 0; // 1: EmExecucao

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Dashboard de Resultados</h2>
        <p className="text-slate-500">Visão consolidada do SGP-F (Fábrica, RH e Financeiro)</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Lucro Líquido Mensal</p>
              <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(dre?.lucroLiquidoOperacional)}</h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600 font-medium">
            <span>Resultados de {currentMonth}/{currentYear}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Receita Bruta</p>
              <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(dre?.receitaBrutaVendas)}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-blue-600 font-medium">
            <span>Vendas B2B e Revenda</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Ordens de Produção</p>
              <h3 className="text-2xl font-bold text-slate-800">{opsFinalizadas} Finalizadas</h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <Factory size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-slate-500 font-medium">
            <span>{opsEmAndamento} OPs em andamento</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Saúde do Estoque</p>
              <h3 className="text-2xl font-bold text-slate-800">Normal</h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Package size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-purple-600 font-medium">
            <span>Monitoramento ativo</span>
          </div>
        </div>
      </div>

      {/* DRE e Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Activity size={20} className="text-indigo-600" /> 
            DRE (Demonstrativo de Resultado)
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Receita Bruta Vendas</span>
              <span className="font-semibold text-slate-800">{formatCurrency(dre?.receitaBrutaVendas)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">(-) Custos de Produção</span>
              <span className="font-semibold text-red-500">-{formatCurrency(dre?.custosProducao)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">(-) Custos de Trocas (Avarias)</span>
              <span className="font-semibold text-red-500">-{formatCurrency(dre?.custosTrocaAvaria)}</span>
            </div>
            <div className="flex justify-between py-2 bg-slate-50 px-3 rounded-lg font-bold">
              <span className="text-slate-800">= Lucro Bruto</span>
              <span className="text-indigo-600">{formatCurrency(dre?.lucroBruto)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 mt-4">
              <span className="text-slate-600">(-) Despesas Folha de Pagamento</span>
              <span className="font-semibold text-red-500">-{formatCurrency(dre?.despesasFolhaPagamento)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">(-) Despesas Manutenção Frota</span>
              <span className="font-semibold text-red-500">-{formatCurrency(dre?.despesasManutencaoFrota)}</span>
            </div>
            <div className="flex justify-between py-3 bg-green-50 border border-green-200 px-3 rounded-lg font-bold mt-4">
              <span className="text-green-800">= Lucro Líquido Operacional</span>
              <span className="text-green-600">{formatCurrency(dre?.lucroLiquidoOperacional)}</span>
            </div>
          </div>
        </div>

        {/* Resumo Caixa */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 opacity-10">
              <DollarSign size={150} />
           </div>
           <h3 className="text-lg font-bold mb-8 text-slate-100 relative z-10">Resumo de Caixa</h3>
           
           <div className="space-y-6 relative z-10">
              <div>
                <p className="text-slate-400 text-sm mb-1">Contas a Receber (Pendentes)</p>
                <p className="text-3xl font-light text-blue-400">{formatCurrency(resumo?.contasReceberPendentes)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Contas a Pagar (Pendentes)</p>
                <p className="text-3xl font-light text-red-400">{formatCurrency(resumo?.contasPagarPendentes)}</p>
              </div>
              <div className="pt-6 border-t border-slate-800">
                <p className="text-slate-400 text-sm mb-1">Saldo em Caixa Atual</p>
                <p className="text-4xl font-bold text-white">{formatCurrency(resumo?.saldoEmCaixa)}</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
