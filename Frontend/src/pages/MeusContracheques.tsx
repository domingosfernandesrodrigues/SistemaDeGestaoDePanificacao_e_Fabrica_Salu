import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import { Download, Loader2, FileText, Calendar } from 'lucide-react';
import api from '../services/api';

export function MeusContracheques() {
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAno, setFiltroAno] = useState('');

  const { data: contracheques, isLoading } = useQuery<any[]>({
    queryKey: ['meus-contracheques'],
    queryFn: async () => (await api.get('/folha-pagamento/meus-contracheques')).data,
  });

  const downloadContracheque = async (id: string, ref: string) => {
    try {
      const response = await api.get(`/folha-pagamento/${id}/contracheque`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contracheque_${ref.replace('/', '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
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
        alert('Erro de conexão ao baixar contracheque. Tente novamente.');
      }
    }
  };

  const contrachequesFiltrados = contracheques?.filter(c => {
    if (filtroMes && c.mesReferencia.toString() !== filtroMes) return false;
    if (filtroAno && c.anoReferencia.toString() !== filtroAno) return false;
    return true;
  });

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
      <p className="text-slate-500 font-medium">Carregando seus documentos...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Meus Contracheques</h2>
          <p className="text-slate-500">Acesse seus comprovantes de pagamento mensais.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-end">
        <div className="space-y-1 w-full sm:w-48">
          <label className="text-xs font-bold text-slate-400 uppercase">Mês</label>
          <select 
            value={filtroMes} 
            onChange={e => setFiltroMes(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          >
            <option value="">Todos</option>
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m.toString()}>{m.toString().padStart(2, '0')}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1 w-full sm:w-48">
          <label className="text-xs font-bold text-slate-400 uppercase">Ano</label>
          <select 
            value={filtroAno} 
            onChange={e => setFiltroAno(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          >
            <option value="">Todos</option>
            {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(a => (
              <option key={a} value={a.toString()}>{a}</option>
            ))}
          </select>
        </div>
        <Button variant="secondary" className="h-10 px-4 w-full sm:w-auto" onClick={() => { setFiltroMes(''); setFiltroAno(''); }}>
          Limpar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {contrachequesFiltrados?.length === 0 && (
          <div className="col-span-full bg-white p-8 md:p-12 rounded-xl border border-dashed border-slate-300 flex flex-col items-center text-center">
            <FileText size={48} className="text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">Nenhum contracheque encontrado</h3>
            <p className="text-slate-500 max-w-xs mx-auto text-sm">
              Seus contracheques aparecerão aqui assim que forem processados e fechados pelo RH.
            </p>
          </div>
        )}

        {contrachequesFiltrados?.map((c) => {
          const ref = `${c.mesReferencia.toString().padStart(2, '0')}/${c.anoReferencia}`;
          return (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 hover:border-indigo-400 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:bg-indigo-100/50" />
              
              <div className="flex items-start justify-between mb-6 relative">
                <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200">
                  <Calendar size={20} />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-tight ${
                    c.status === 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {c.status === 0 ? 'Processando' : 'Liberado'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                    c.tipo === 1 ? 'bg-blue-100 text-blue-800' :
                    c.tipo === 2 ? 'bg-emerald-100 text-emerald-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {c.tipo === 1 ? '13º Adiant.' :
                     c.tipo === 2 ? '13º Final' :
                     'Mensal'}
                  </span>
                </div>
              </div>
              
              <div className="mb-6 relative">
                <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Mês de Referência</h3>
                <p className="text-3xl font-black text-slate-800 tracking-tight">{ref}</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 relative">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Valor Líquido</span>
                  <span className="text-xl font-black text-indigo-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.salarioLiquido)}
                  </span>
                </div>
              </div>

              <Button 
                className="w-full mt-6 flex items-center justify-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white h-12 rounded-xl font-bold transition-all transform active:scale-95"
                onClick={() => downloadContracheque(c.id, ref)}
                disabled={c.status === 0}
              >
                <Download size={18} />
                Baixar PDF
              </Button>
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 flex gap-3">
        <div className="text-amber-600 mt-0.5">
          <FileText size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-900">Dúvidas sobre os valores?</h4>
          <p className="text-xs text-amber-800 leading-relaxed">
            Se você identificar qualquer divergência nos valores de adicionais ou descontos, 
            por favor procure o setor de RH para esclarecimentos.
          </p>
        </div>
      </div>
    </div>
  );
}
