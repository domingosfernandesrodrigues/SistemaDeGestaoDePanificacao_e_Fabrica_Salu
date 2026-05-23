import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Package, 
  Factory, 
  Loader2, 
  Search, 
  Truck, 
  ArrowRightLeft, 
  AlertCircle, 
  ChevronRight, 
  Filter, 
  RefreshCw, 
  Clock, 
  Briefcase, 
  Users, 
  ShoppingCart, 
  LayoutDashboard as LayoutDashboardIcon 
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import api from '../services/api';

interface DashboardData {
  sales: { 
    totalSales: number; 
    orderCount: number; 
    averageTicket: number; 
    byPaymentMethod: { label: string; value: number }[];
    topProducts: { name: string; quantity: number; totalRevenue: number; totalProfit: number }[];
    growthMoM: number;
    growthYoY: number;
  };
  production: { totalProduced: number; opCount: number; efficiency: number; averageLeadTimeHours: number; byStatus: { label: string; value: number }[] };
  inventory: { totalProducts: number; lowStockCount: number; inventoryValue: number; totalPurchases: number };
  fleet: { totalVehicles: number; activeDeliveries: number; maintenanceCost: number; totalFuelCost: number };
  expenses: { totalExpenses: number; totalPayroll: number; totalOvertime: number; byCategory: { label: string; value: number }[] };
  exchanges: { totalLoss: number; exchangeCount: number; topProducts: { label: string; value: number }[]; topClients: { label: string; value: number }[] };
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('Geral');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterDay, setFilterDay] = useState<number | string>('');
  const [filterCliente, setFilterCliente] = useState('');
  
  const userRole = localStorage.getItem('sgpf_role') || 'Operador';
  if (userRole === 'Cliente') return <Navigate to="/vendas" replace />;

  const { data: clientes } = useQuery<any[]>({
    queryKey: ['clientes'],
    queryFn: async () => (await api.get('/Clientes')).data,
  });

  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard-data', filterYear, filterMonth, filterDay, filterCliente],
    queryFn: async () => {
      const dayParam = filterDay ? `&day=${filterDay}` : '';
      const clienteParam = filterCliente ? `&clienteId=${filterCliente}` : '';
      const response = await api.get(`/Dashboard?year=${filterYear}&month=${filterMonth}${dayParam}${clienteParam}`);
      return response.data;
    },
  });

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const formatNumber = (value: number) => 
    new Intl.NumberFormat('pt-BR').format(value || 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="animate-spin text-ember" size={48} />
        <p className="text-slate-500 font-medium animate-pulse">Consolidando indicadores...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-inner">
          <AlertCircle size={40} />
        </div>
        <div className="max-w-md">
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Erro ao carregar indicadores</h3>
          <p className="text-slate-500 mb-6">Não conseguimos conectar ao servidor para buscar os dados. Verifique sua conexão ou tente novamente mais tarde.</p>
          <Button onClick={() => refetch()} className="bg-slate-800 hover:bg-slate-900 flex items-center gap-2 mx-auto">
            <RefreshCw size={18} /> Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = userRole === 'Admin' || userRole === 'Gestor';

  const tabs = [
    { id: 'Geral', icon: LayoutDashboardIcon, roles: ['Admin', 'Gestor', 'Operador'] },
    { id: 'Vendas', icon: DollarSign, roles: ['Admin', 'Gestor'] },
    { id: 'Produção', icon: Factory, roles: ['Admin', 'Gestor', 'Operador'] },
    { id: 'Estoque', icon: Package, roles: ['Admin', 'Gestor', 'Operador'] },
    { id: 'Logística', icon: Truck, roles: ['Admin', 'Gestor', 'Operador'] },
    { id: 'Financeiro', icon: Activity, roles: ['Admin', 'Gestor'] },
  ];

  const filteredTabs = tabs.filter(t => t.roles.includes(userRole));

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Header com Filtros Modernos */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Painel Executivo</h2>
          <p className="text-slate-500 text-sm">Monitoramento de indicadores em tempo real para a fábrica.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 px-2 border-r border-slate-200 mr-2">
            <Filter size={16} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Filtros</span>
          </div>
          
          <select 
            value={filterCliente} 
            onChange={(e) => setFilterCliente(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 outline-none cursor-pointer max-w-[150px]"
          >
            <option value="">Todos Clientes</option>
            {clientes?.map(c => <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>)}
          </select>

          <select 
            value={filterYear} 
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 outline-none cursor-pointer"
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          
          <select 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 outline-none cursor-pointer"
          >
            <option value={0}>Todos os meses</option>
            {Array.from({length: 12}).map((_, i) => (
              <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>
            ))}
          </select>

          <input 
            type="number" 
            placeholder="Dia"
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="w-16 bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 outline-none placeholder:text-slate-300"
            min={1}
            max={31}
          />
          
          <button 
            onClick={() => refetch()} 
            className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all active:scale-95 text-ember"
            title="Atualizar Dados"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Tabs de Navegação Estilo Mobile/Moderno */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {filteredTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                isActive 
                  ? 'bg-gradient-to-r from-fire to-ember text-white shadow-lg shadow-fire/20 scale-105' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon size={18} />
              {tab.id}
            </button>
          );
        })}
      </div>

      {/* Conteúdo Baseado na Tab */}
      <div className="space-y-8 transition-all duration-300">
        {activeTab === 'Geral' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <KPIChip label="Vendas Totais" value={formatCurrency(data?.sales.totalSales || 0)} icon={DollarSign} color="bg-emerald-600" />
              <KPIChip label="Ordens Finalizadas" value={data?.production.opCount || 0} icon={Factory} color="bg-ember" />
              <KPIChip label="Produtos em Estoque" value={data?.inventory.totalProducts || 0} icon={Package} color="bg-mid" />
              <KPIChip label="Despesas Gerais" value={formatCurrency(data?.expenses.totalExpenses || 0)} icon={Activity} color="bg-fire" />
              <KPIChip label="Lucro Estimado" value={formatCurrency((data?.sales.totalSales || 0) - (data?.expenses.totalExpenses || 0))} icon={TrendingUp} color="bg-gold" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                   <TrendingUp size={200} className="text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-6">Eficiência da Produção</h3>
                <div className="flex items-center gap-8 mb-8">
                  <div className="w-32 h-32 rounded-full border-8 border-slate-100 flex flex-col items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border-8 border-orange-500 border-t-transparent animate-spin-slow"></div>
                    <span className="text-2xl font-bold text-slate-800">{Math.round(data?.production.efficiency || 0)}%</span>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                      Sua eficiência é baseada na relação entre o que foi planejado vs o que foi realmente realizado nas Ordens de Produção deste período.
                    </p>
                    <div className="mt-4 flex gap-4">
                       <div className="bg-orange-50 px-3 py-1 rounded text-xs font-bold text-orange-700">Alta Produtividade</div>
                       <div className="bg-emerald-50 px-3 py-1 rounded text-xs font-bold text-emerald-700">Baixo Desperdício</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 text-white p-8 rounded-3xl shadow-xl">
                <h3 className="text-xl font-bold text-white mb-6">Alertas Críticos</h3>
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="text-amber-400" size={24} />
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estoque Crítico</p>
                          <p className="text-lg font-bold text-white">{data?.inventory.lowStockCount} Itens</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-slate-500" />
                   </div>
                   
                   <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-3">
                        <Clock className="text-orange-400" size={24} />
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entrega Hoje</p>
                          <p className="text-lg font-bold text-white">{data?.fleet.activeDeliveries} Veículos</p>
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Vendas' && (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPIChip label="Ticket Médio" value={formatCurrency(data?.sales.averageTicket || 0)} icon={Briefcase} color="bg-fire" />
                <KPIChip label="Total de Pedidos" value={data?.sales.orderCount || 0} icon={ShoppingCart} color="bg-ember" />
                <KPIChip label="Faturamento Total" value={formatCurrency(data?.sales.totalSales || 0)} icon={DollarSign} color="bg-emerald-600" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DataCard title="Vendas por Forma de Pagamento" items={(data?.sales.byPaymentMethod || []).map(i => ({
                  ...i, label: i.label === 'CartaoCredito' ? 'Cartão de Crédito' : i.label
                }))} />
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
                   <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${(data?.sales.growthMoM || 0) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      <TrendingUp size={32} className={(data?.sales.growthMoM || 0) < 0 ? 'rotate-180' : ''} />
                   </div>
                   <h4 className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">Crescimento (Vs Mês Anterior)</h4>
                   <p className={`text-3xl font-bold ${(data?.sales.growthMoM || 0) >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>
                     {(data?.sales.growthMoM || 0) > 0 ? '+' : ''}{(data?.sales.growthMoM || 0).toFixed(1)}%
                   </p>
                   <p className="text-slate-400 text-xs mt-2 font-bold">Vs Ano Passado: {(data?.sales.growthYoY || 0) > 0 ? '+' : ''}{(data?.sales.growthYoY || 0).toFixed(1)}%</p>
                </div>
             </div>

             <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-xl font-bold text-slate-800">Ranking de Produtos</h3>
                   <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase">Top {data?.sales.topProducts?.length || 0}</span>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="border-b border-slate-100">
                            <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pos.</th>
                            <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Produto</th>
                            <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Qtd.</th>
                            <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Faturamento</th>
                            <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Lucro Est.</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {data?.sales.topProducts?.map((p, idx) => (
                            <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                               <td className="py-4">
                                  <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-bold ${
                                     idx === 0 ? 'bg-amber-100 text-amber-700' : 
                                     idx === 1 ? 'bg-slate-200 text-slate-600' :
                                     idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                     {idx + 1}
                                  </span>
                               </td>
                               <td className="py-4"><p className="text-sm font-bold text-slate-700">{p.name}</p></td>
                               <td className="py-4 text-right"><p className="text-sm text-slate-500">{formatNumber(p.quantity)}</p></td>
                               <td className="py-4 text-right"><p className="text-sm font-bold text-slate-800">{formatCurrency(p.totalRevenue)}</p></td>
                               <td className="py-4 text-right">
                                  <p className={`text-sm font-bold ${p.totalProfit > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatCurrency(p.totalProfit)}</p>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                   {data?.sales.topProducts.length === 0 && (
                      <div className="text-center py-12">
                         <Package size={40} className="mx-auto text-slate-200 mb-4" />
                         <p className="text-slate-400 text-sm italic">Nenhum dado de vendas encontrado.</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'Produção' && (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPIChip label="Lead Time Médio" value={`${Math.round(data?.production.averageLeadTimeHours || 0)}h`} icon={Clock} color="bg-gold" />
                <KPIChip label="Volume Produzido" value={formatNumber(data?.production.totalProduced || 0)} icon={Factory} color="bg-fire" />
                <KPIChip label="Eficiência Geral" value={`${Math.round(data?.production.efficiency || 0)}%`} icon={Activity} color="bg-emerald-600" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DataCard title="Status das OPs" items={(data?.production.byStatus || []).map(i => ({
                  ...i, label: (i.label === 'EmAndamento' || i.label === 'EmAdamento') ? 'Em Andamento' : i.label
                }))} isNumber />
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
                   <h4 className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-4">Meta de Produção</h4>
                   <div className="w-40 h-40 rounded-full border-[12px] border-slate-100 flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full border-[12px] border-orange-500 border-t-transparent" style={{transform: `rotate(${((data?.production.efficiency || 0) * 3.6)}deg)`}}></div>
                      <span className="text-3xl font-bold text-slate-800">{Math.round(data?.production.efficiency || 0)}%</span>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'Estoque' && (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPIChip label="Total em Compras" value={formatCurrency(data?.inventory.totalPurchases || 0)} icon={ShoppingCart} color="bg-fire" />
                <KPIChip label="Valor em Estoque" value={formatCurrency(data?.inventory.inventoryValue || 0)} icon={Package} color="bg-mid" />
                <KPIChip label="Alertas de Ruptura" value={data?.inventory.lowStockCount || 0} icon={AlertCircle} color="bg-rose-500" />
             </div>
          </div>
        )}

        {activeTab === 'Logística' && (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <KPIChip label="Frota Total" value={data?.fleet.totalVehicles || 0} icon={Truck} color="bg-slate-700" />
                 <KPIChip label="Entregas Ativas" value={data?.fleet.activeDeliveries || 0} icon={Clock} color="bg-blue-500" />
                 <KPIChip label="Custo Manutenção" value={formatCurrency(data?.fleet.maintenanceCost || 0)} icon={AlertCircle} color="bg-rose-500" />
                 <KPIChip label="Custo Abastecimento" value={formatCurrency(data?.fleet.totalFuelCost || 0)} icon={Truck} color="bg-amber-500" />
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                 <h3 className="text-xl font-bold text-slate-800 mb-4">Índice de Trocas e Avarias</h3>
                 <div className="flex items-center gap-6">
                    <div className="flex-1">
                       <p className="text-slate-500 text-sm mb-4">O índice de trocas impacta diretamente na margem de lucro operacional.</p>
                       <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                             <span>Perda Financeira Estimada</span>
                             <span className="text-rose-500">{formatCurrency(data?.exchanges.totalLoss || 0)}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-rose-500 w-1/3"></div>
                          </div>
                       </div>
                    </div>
                    <div className="text-center p-6 bg-rose-50 rounded-2xl border border-rose-100">
                       <p className="text-rose-600 font-black text-2xl">{data?.exchanges.exchangeCount}</p>
                       <p className="text-rose-400 text-[10px] font-bold uppercase">Ocorrências</p>
                    </div>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                 <DataCard title="Produtos com Mais Trocas/Avarias" items={data?.exchanges.topProducts || []} isNumber />
                 <DataCard title="Clientes com Mais Trocas" items={data?.exchanges.topClients || []} isNumber />
              </div>
          </div>
        )}

        {activeTab === 'Financeiro' && (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPIChip label="Folha de Pagamento" value={formatCurrency(data?.expenses.totalPayroll || 0)} icon={Users} color="bg-mid" />
                <KPIChip label="Horas Extras" value={formatCurrency(data?.expenses.totalOvertime || 0)} icon={Clock} color="bg-gold" />
                <KPIChip label="Total Despesas" value={formatCurrency(data?.expenses.totalExpenses || 0)} icon={Activity} color="bg-fire" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DataCard title="Maiores Gastos por Categoria" items={data?.expenses.byCategory || []} />
                <div className="bg-slate-800 text-white p-8 rounded-3xl shadow-xl flex flex-col justify-center items-center text-center">
                   <h4 className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-2">Lucratividade Estimada</h4>
                   <p className="text-4xl font-bold text-emerald-400">{Math.round(((data?.sales.totalSales || 0) - (data?.expenses.totalExpenses || 0)) / (data?.sales.totalSales || 1) * 100)}%</p>
                   <p className="text-xl font-bold text-emerald-500 mt-2">{formatCurrency((data?.sales.totalSales || 0) - (data?.expenses.totalExpenses || 0))}</p>
                   <p className="text-slate-400 text-xs mt-4">Margem sobre o faturamento bruto</p>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KPIChip({ label, value, icon: Icon, color, trend }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-xl hover:scale-[1.02] transition-all cursor-default group relative overflow-hidden">
       <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-5 rounded-bl-full group-hover:scale-150 transition-transform`}></div>
       <div className="flex items-center gap-4">
          <div className={`${color} text-white p-3 rounded-xl shadow-lg`}>
             <Icon size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            <h4 className="text-lg font-bold text-slate-800 leading-none mt-1">{value}</h4>
            {trend && <span className="text-[10px] font-bold text-emerald-600">{trend} vs mês ant.</span>}
          </div>
       </div>
    </div>
  );
}

function DataCard({ title, items, isNumber }: { title: string; items: any[]; isNumber?: boolean }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
      <h3 className="text-xl font-bold text-slate-800 mb-8">{title}</h3>
      <div className="space-y-6">
        {items.map((item, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex justify-between text-sm font-bold text-slate-600">
              <span>{item.label}</span>
              <span>{isNumber ? item.value : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${idx % 3 === 0 ? 'bg-orange-500' : idx % 3 === 1 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${(item.value / max) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-slate-400 py-8 italic">Sem dados para este período.</p>}
      </div>
    </div>
  );
}


