import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { 
  History, Search, Filter, Calendar, ChevronLeft, ChevronRight, 
  Loader2, Eye, RefreshCw, ShieldAlert, ArrowRight, FileJson, Database
} from 'lucide-react';
import { auditoriaService } from '../services/auditoriaService';
import type { AuditLog, AuditFilters } from '../services/auditoriaService';

export function Auditoria() {
  // Filtros de busca
  const [filtroTabela, setFiltroTabela] = useState('');
  const [filtroAcao, setFiltroAcao] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 12;

  // Active filters a serem enviados para a query
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>({
    page: 1,
    pageSize: itensPorPagina
  });

  // Modal de Detalhes
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Busca de tabelas auditadas para o dropdown
  const { data: tabelas } = useQuery<string[]>({
    queryKey: ['auditedTables'],
    queryFn: auditoriaService.getAuditedTables
  });

  // Busca dos logs com filtros aplicados
  const { data: logsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['auditLogs', appliedFilters],
    queryFn: () => auditoriaService.getLogs(appliedFilters),
    placeholderData: (previousData) => previousData
  });

  // Aplicar filtros
  const handleApplyFilters = () => {
    setPaginaAtual(1);
    setAppliedFilters({
      tableName: filtroTabela || undefined,
      action: filtroAcao || undefined,
      userName: filtroUsuario || undefined,
      startDate: filtroDataInicio || undefined,
      endDate: filtroDataFim || undefined,
      page: 1,
      pageSize: itensPorPagina
    });
  };

  // Limpar filtros
  const handleClearFilters = () => {
    setFiltroTabela('');
    setFiltroAcao('');
    setFiltroUsuario('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setPaginaAtual(1);
    setAppliedFilters({
      page: 1,
      pageSize: itensPorPagina
    });
  };

  // Efeito para tratar a paginação
  useEffect(() => {
    setAppliedFilters(prev => ({
      ...prev,
      page: paginaAtual
    }));
  }, [paginaAtual]);

  // Formatar data e hora
  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Formatar chave primária de visualização
  const formatKeyValues = (jsonStr: string) => {
    try {
      const obj = JSON.parse(jsonStr);
      return Object.entries(obj).map(([key, value]) => `${key}: ${value}`).join(', ');
    } catch {
      return jsonStr;
    }
  };

  // Obter Badge de Ação
  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'added':
      case 'insert':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'modified':
      case 'update':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'deleted':
      case 'delete':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  // Traduzir nome da Ação
  const translateAction = (action: string) => {
    switch (action.toLowerCase()) {
      case 'added':
      case 'insert':
        return 'Inclusão';
      case 'modified':
      case 'update':
        return 'Alteração';
      case 'deleted':
      case 'delete':
        return 'Exclusão';
      default:
        return action;
    }
  };

  // Traduzir nome da Tabela para algo amigável
  const translateTableName = (name: string) => {
    const dict: Record<string, string> = {
      'Empresas': 'Empresas',
      'Funcionarios': 'Funcionários',
      'Clientes': 'Clientes',
      'Fornecedores': 'Fornecedores',
      'Usuarios': 'Usuários do Sistema',
      'Produtos': 'Produtos',
      'MovimentacoesEstoque': 'Movimentações de Estoque',
      'FichasTecnicas': 'Fichas Técnicas (BOM)',
      'FichaTecnicaInsumos': 'Insumos da Ficha Técnica',
      'OrdensProducao': 'Ordens de Produção',
      'OrdemProducaoInsumos': 'Insumos da Ordem de Produção',
      'RegistrosPonto': 'Registros de Ponto',
      'FolhasPagamento': 'Folhas de Pagamento',
      'ContasPagar': 'Contas a Pagar',
      'Afastamentos': 'Afastamentos / Licenças',
      'LancamentosAlimentacao': 'Alimentação de Funcionários',
      'ContasReceber': 'Contas a Receber',
      'PedidosVenda': 'Pedidos de Venda',
      'PedidoVendaItens': 'Itens do Pedido de Venda',
      'Veiculos': 'Veículos da Frota',
      'Abastecimentos': 'Abastecimentos de Veículos',
      'ManutencoesVeiculo': 'Manutenções de Veículos',
      'TrocasAvaria': 'Trocas e Avarias',
      'Reunioes': 'Reuniões de CRM',
      'AgendaEventos': 'Agenda de Eventos',
      'PlanejamentosFerias': 'Planejamentos de Férias',
      'Compras': 'Compras de Insumos',
      'CompraItems': 'Itens da Compra',
      'HistoricoPrecos': 'Histórico de Preços',
      'ContasBancarias': 'Contas Bancárias',
      'MovimentacoesBancarias': 'Movimentações Bancárias'
    };
    return dict[name] || name;
  };

  // Processar diferença entre oldValues e newValues
  const getDiff = (log: AuditLog) => {
    let oldObj: Record<string, any> = {};
    let newObj: Record<string, any> = {};

    try {
      if (log.oldValues) oldObj = JSON.parse(log.oldValues);
    } catch {}

    try {
      if (log.newValues) newObj = JSON.parse(log.newValues);
    } catch {}

    const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

    return keys.map(key => {
      // Ignorar chaves comuns do EF e metadados irrelevantes
      const valAntigo = oldObj[key];
      const valNovo = newObj[key];

      const toStringVal = (v: any) => {
        if (v === undefined || v === null) return '';
        if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
        if (typeof v === 'object') return JSON.stringify(v, null, 2);
        return String(v);
      };

      const oldStr = toStringVal(valAntigo);
      const newStr = toStringVal(valNovo);
      const isChanged = oldStr !== newStr;

      return {
        key,
        oldStr,
        newStr,
        isChanged
      };
    });
  };
  
  const renderFormattedJson = (label: string, jsonStr: string | null | undefined, colorClass: string) => {
    if (!jsonStr) {
      return (
        <div>
          <span className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1">{label}:</span>
          <pre className="p-2 bg-slate-100 rounded text-slate-500 italic border border-slate-200">Nenhum valor registrado</pre>
        </div>
      );
    }
    try {
      const parsed = JSON.parse(jsonStr);
      return (
        <div>
          <span className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1">{label}:</span>
          <pre className={`p-2 bg-slate-100 rounded ${colorClass} overflow-x-auto max-h-[250px] border border-slate-200`}>{JSON.stringify(parsed, null, 2)}</pre>
        </div>
      );
    } catch {
      return (
        <div>
          <span className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1">{label}:</span>
          <pre className="p-2 bg-slate-100 rounded text-amber-600 break-all whitespace-pre-wrap overflow-x-auto max-h-[250px] border border-slate-200">{jsonStr}</pre>
        </div>
      );
    }
  };

  const totalItens = logsData?.totalItems || 0;
  const totalPaginas = logsData?.totalPages || 1;
  const logs = logsData?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <History className="text-ember" /> Auditoria do Sistema
          </h2>
          <p className="text-slate-500 text-sm">
            Rastreabilidade completa de todas as inserções, alterações e exclusões de dados efetuadas no sistema.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetch()} 
          className="flex items-center gap-2"
          disabled={isFetching}
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} /> Atualizar Logs
        </Button>
      </div>

      {/* Painel de Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-sm font-semibold text-slate-700">
          <Filter size={16} className="text-ember" /> Filtros de Pesquisa
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Usuário */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Search size={12} /> Usuário
            </label>
            <input 
              type="text"
              placeholder="Nome do usuário..."
              value={filtroUsuario} 
              onChange={e => setFiltroUsuario(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-bg-card text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-ember transition-all"
            />
          </div>

          {/* Tabela */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Database size={12} /> Tabela/Entidade
            </label>
            <select 
              value={filtroTabela} 
              onChange={e => setFiltroTabela(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-bg-card text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-ember transition-all"
            >
              <option value="">Todas as tabelas</option>
              {[...(tabelas || [])]
                .sort((a, b) => translateTableName(a).localeCompare(translateTableName(b)))
                .map(t => (
                  <option key={t} value={t}>{translateTableName(t)}</option>
                ))
              }
            </select>
          </div>

          {/* Ação */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <ShieldAlert size={12} /> Ação Efetuada
            </label>
            <select 
              value={filtroAcao} 
              onChange={e => setFiltroAcao(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-bg-card text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-ember transition-all"
            >
              <option value="">Todas as ações</option>
              <option value="Added">Inclusão (Added)</option>
              <option value="Modified">Alteração (Modified)</option>
              <option value="Deleted">Exclusão (Deleted)</option>
            </select>
          </div>

          {/* Período de Datas */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                <Calendar size={12} /> Início
              </label>
              <input 
                type="date"
                value={filtroDataInicio} 
                onChange={e => setFiltroDataInicio(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-bg-card text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-ember transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                <Calendar size={12} /> Fim
              </label>
              <input 
                type="date"
                value={filtroDataFim} 
                onChange={e => setFiltroDataFim(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-bg-card text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-ember transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={handleClearFilters} className="h-10">
            Limpar Filtros
          </Button>
          <Button onClick={handleApplyFilters} className="h-10 px-6">
            Aplicar Filtros
          </Button>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3">
              <Loader2 className="animate-spin text-ember" size={36} />
              <span className="text-sm font-semibold text-slate-600">Carregando logs de auditoria...</span>
            </div>
          ) : (
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Data/Hora</th>
                  <th className="px-6 py-4 font-semibold">Tabela/Entidade</th>
                  <th className="px-6 py-4 font-semibold">Ação</th>
                  <th className="px-6 py-4 font-semibold">Usuário Responsável</th>
                  <th className="px-6 py-4 font-semibold">ID do Registro</th>
                  <th className="px-6 py-4 font-semibold text-center">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {translateTableName(log.tableName)}
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{log.tableName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getActionBadge(log.action)}`}>
                        {translateAction(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {log.userName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-ember/10 border border-ember/20 flex items-center justify-center text-[10px] font-bold text-ember">
                            {log.userName.charAt(0).toUpperCase()}
                          </div>
                          <span>{log.userName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Sistema / Rotina</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                      {formatKeyValues(log.keyValues)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          setSelectedLog(log);
                          setIsModalOpen(true);
                        }}
                        className="h-8 px-2.5 flex items-center gap-1.5 hover:border-ember hover:text-ember transition-colors"
                      >
                        <Eye size={14} /> Ver Alterações
                      </Button>
                    </td>
                  </tr>
                ))}
                
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                      Nenhum registro de auditoria encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginador */}
        {!isLoading && totalPaginas > 1 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-slate-600 order-2 sm:order-1 font-medium">
              Exibindo <span className="font-bold text-slate-800">{logs.length}</span> de <span className="font-bold text-slate-800">{totalItens}</span> registros
            </span>
            <div className="flex items-center gap-3 order-1 sm:order-2">
              <button 
                className={`flex items-center gap-1 px-3 h-9 rounded-lg text-sm font-bold transition-all ${paginaAtual === 1 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm'}`}
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))} 
                disabled={paginaAtual === 1}
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              
              <div className="flex items-center justify-center min-w-[80px] h-9 bg-slate-800 text-white rounded-lg text-xs font-bold shadow-inner">
                {paginaAtual} / {totalPaginas}
              </div>

              <button 
                className={`flex items-center gap-1 px-3 h-9 rounded-lg text-sm font-bold transition-all ${paginaAtual === totalPaginas ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-ember text-white hover:bg-fire shadow-md'}`}
                onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))} 
                disabled={paginaAtual === totalPaginas}
              >
                Próximo <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Auditoria */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLog(null);
        }} 
        title="Histórico de Alterações"
      >
        {selectedLog && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Metadados Básicos */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs text-slate-400 uppercase tracking-wider font-bold">Data da Operação</span>
                <span className="font-medium text-slate-800">{formatDateTime(selectedLog.timestamp)}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-400 uppercase tracking-wider font-bold">Usuário Responsável</span>
                <span className="font-medium text-slate-800">{selectedLog.userName || 'Sistema / Rotina Automática'}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-400 uppercase tracking-wider font-bold">Tabela / Entidade</span>
                <span className="font-medium text-slate-800">{translateTableName(selectedLog.tableName)} ({selectedLog.tableName})</span>
              </div>
              <div>
                <span className="block text-xs text-slate-400 uppercase tracking-wider font-bold">Operação</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 ${getActionBadge(selectedLog.action)}`}>
                  {translateAction(selectedLog.action)}
                </span>
              </div>
            </div>

            {/* Chaves Primárias */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                Identificador do Registro
              </span>
              <div className="p-3 bg-slate-100 rounded-lg font-mono text-xs text-slate-700 border border-slate-200">
                {formatKeyValues(selectedLog.keyValues)}
              </div>
            </div>

            {/* Comparação dos Campos Alterados */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Propriedades Modificadas
              </span>

              {selectedLog.action.toLowerCase() === 'added' || selectedLog.action.toLowerCase() === 'insert' ? (
                // Inclusão - Mostra apenas valores novos
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Campo</th>
                        <th className="px-4 py-3 font-semibold text-emerald-600">Valor Adicionado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-mono">
                      {getDiff(selectedLog).map(diff => (
                        <tr key={diff.key} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-sans font-bold text-slate-700">{diff.key}</td>
                          <td className="px-4 py-2.5 text-emerald-600 break-all whitespace-pre-wrap">{diff.newStr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : selectedLog.action.toLowerCase() === 'deleted' || selectedLog.action.toLowerCase() === 'delete' ? (
                // Exclusão - Mostra apenas valores removidos
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Campo</th>
                        <th className="px-4 py-3 font-semibold text-red-600">Valor Removido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-mono">
                      {getDiff(selectedLog).map(diff => (
                        <tr key={diff.key} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-sans font-bold text-slate-700">{diff.key}</td>
                          <td className="px-4 py-2.5 text-red-600 break-all whitespace-pre-wrap">{diff.oldStr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                // Alteração - Mostra antes e depois
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Campo</th>
                        <th className="px-4 py-3 font-semibold">Valor Antigo</th>
                        <th className="px-2 py-3 text-center"></th>
                        <th className="px-4 py-3 font-semibold">Valor Novo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-mono">
                      {getDiff(selectedLog).map(diff => (
                        <tr 
                          key={diff.key} 
                          className={`hover:bg-slate-50/50 ${
                            diff.isChanged ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          <td className="px-4 py-2.5 font-sans font-bold text-slate-700">
                            {diff.key}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 break-all whitespace-pre-wrap line-through opacity-70">
                            {diff.oldStr}
                          </td>
                          <td className="px-2 py-2.5 text-center text-slate-400">
                            {diff.isChanged && <ArrowRight size={14} className="text-amber-500 inline" />}
                          </td>
                          <td className={`px-4 py-2.5 break-all whitespace-pre-wrap ${diff.isChanged ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                            {diff.newStr}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* RAW JSON Toggle */}
            <div className="space-y-2 pt-2">
              <details className="group border border-slate-200 rounded-lg overflow-hidden">
                <summary className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 cursor-pointer font-bold text-xs text-slate-600 select-none transition-colors">
                  <FileJson size={14} className="text-ember" /> Visualizar JSON Bruto
                </summary>
                <div className="p-4 bg-slate-50 text-slate-800 text-xs font-mono space-y-4 overflow-x-auto max-h-[400px] border-t border-slate-200 custom-scrollbar">
                  {/* Registro Completo */}
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1">Registro de Auditoria Completo (Metadados + Valores):</span>
                    <pre className="p-2 bg-slate-100 rounded text-slate-700 border border-slate-200 overflow-x-auto max-h-[250px]">{JSON.stringify(selectedLog, null, 2)}</pre>
                  </div>
                  
                  {/* Divisor */}
                  <hr className="border-slate-200" />

                  {/* Valores Individuais Formatados de Forma Segura */}
                  {renderFormattedJson("Antes (oldValues)", selectedLog.oldValues, "text-slate-700")}
                  {renderFormattedJson("Depois (newValues)", selectedLog.newValues, "text-slate-700")}
                </div>
              </details>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedLog(null);
                }} 
                className="w-full sm:w-auto"
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
