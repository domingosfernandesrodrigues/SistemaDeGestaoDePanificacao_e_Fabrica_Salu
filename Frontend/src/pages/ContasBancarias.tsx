import { useState } from 'react';
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
  Info
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
  const [movData, setMovData] = useState({ tipo: 'entrada', valor: 0, descricao: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: contas, isLoading } = useQuery<any[]>({
    queryKey: ['contas-bancarias'],
    queryFn: async () => (await api.get('/ContasBancarias')).data
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ContaForm>({
    resolver: zodResolver(contaSchema)
  });

  const mutationCreate = useMutation({
    mutationFn: (data: ContaForm) => api.post('/ContasBancarias', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      handleCloseModal();
    }
  });

  const mutationUpdate = useMutation({
    mutationFn: ({ id, data }: { id: string, data: ContaForm }) => api.put(`/ContasBancarias/${id}`, { id, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      handleCloseModal();
    }
  });


  const mutationMovimentar = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => api.post(`/ContasBancarias/${id}/movimentar`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      setIsMovimentacaoOpen(false);
      setMovData({ tipo: 'entrada', valor: 0, descricao: '' });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Contas Bancárias e Saldos</h2>
          <p className="text-slate-500 text-sm">Gerencie os saldos iniciais e atuais das suas contas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 px-6">
            <Plus size={18} /> Adicionar Conta / Saldo
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="text-emerald-600" size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Saldo Consolidado</span>
          </div>
          <p className="text-2xl font-black text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSaldo)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Building2 className="text-amber-600" size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Contas Ativas</span>
          </div>
          <p className="text-2xl font-black text-slate-800">
            {contas?.filter(c => c.ativa).length || 0}
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
                          onClick={() => { setSelectedContaMov(conta); setIsMovimentacaoOpen(true); }}
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
                type="number"
                step="0.01"
                value={movData.valor}
                onChange={(e) => setMovData({ ...movData, valor: Number(e.target.value) })}
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
              onClick={() => mutationMovimentar.mutate({ id: selectedContaMov.id, data: movData })}
              disabled={mutationMovimentar.isPending || movData.valor <= 0}
            >
              {mutationMovimentar.isPending ? <Loader2 className="animate-spin" size={18} /> : 'Confirmar Lançamento'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
