import { useState } from 'react';
import { ShoppingCart, LogOut, PackageSearch, ListOrdered } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function PortalCliente() {
  const [activeTab, setActiveTab] = useState<'catalogo' | 'pedidos'>('catalogo');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header do Portal */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SP</span>
            </div>
            <span className="font-bold text-slate-800 text-xl tracking-tight">SGP-F Portal B2B</span>
          </div>
          
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium text-slate-600">Olá, Supermercado XYZ</span>
            <Button variant="secondary" size="sm" className="text-slate-500 hover:text-slate-700">
              <LogOut size={16} className="mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Navegação Secundária */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 flex">
          <button 
            onClick={() => setActiveTab('catalogo')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'catalogo' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <PackageSearch size={18} />
            Catálogo de Produtos
          </button>
          <button 
             onClick={() => setActiveTab('pedidos')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'pedidos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <ListOrdered size={18} />
            Meus Pedidos
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        {activeTab === 'catalogo' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Produtos Disponíveis</h2>
                <Button className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2">
                   <ShoppingCart size={18} />
                   Ver Carrinho (0)
                </Button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="h-40 bg-slate-100 rounded-lg mb-4 flex items-center justify-center">
                      <span className="text-slate-300">Sem Imagem</span>
                    </div>
                    <h3 className="font-bold text-slate-800">Pão Francês Congelado (Cxa 5kg)</h3>
                    <p className="text-lg font-bold text-indigo-600 mt-2">R$ 45,00</p>
                    <Button size="sm" className="w-full mt-4 bg-slate-800 hover:bg-slate-900">
                      Adicionar
                    </Button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'pedidos' && (
          <div className="space-y-6">
             <h2 className="text-2xl font-bold text-slate-800">Histórico de Pedidos</h2>
             <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Pedido</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-6 py-4 font-medium text-indigo-600">#PED-0099</td>
                      <td className="px-6 py-4 text-slate-600">25/04/2026</td>
                      <td className="px-6 py-4 font-bold text-slate-800">R$ 450,00</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">Aguardando Aprovação</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
