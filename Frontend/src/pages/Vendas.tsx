import { useState, TouchEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { ShoppingCart, Truck, CheckCircle, Loader2, Plus, Trash2, Save, PowerOff, Edit3, Search, CreditCard, Banknote, QrCode, FileText, QrCode as PixIcon, Printer, AlertTriangle } from 'lucide-react';
import api from '../services/api';

const pedidoSchema = z.object({
  clienteId: z.string().min(1, 'Selecione um cliente'),
  motoristaId: z.string().optional().nullable(),
  formaPagamento: z.coerce.number().default(0),
  itens: z.array(z.object({
    produtoId: z.string().min(1, 'Selecione um produto'),
    quantidade: z.coerce.number().min(1, 'Mínimo 1'),
    desconto: z.coerce.number().min(0, 'Desconto inválido').default(0),
  })).min(1, 'Adicione pelo menos um item'),
});

type PedidoForm = z.infer<typeof pedidoSchema>;

function crc16Ccitt(str: string): string {
  let crc = 0xFFFF;
  const bytes = new TextEncoder().encode(str);
  for (const b of bytes) {
    crc ^= (b << 8);
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function sanitizarChavePix(chave: string): string {
  const clean = chave.trim();
  if (clean.includes('@')) {
    return clean;
  }
  const isRandomKey = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(clean);
  if (isRandomKey) {
    return clean.toLowerCase();
  }
  
  // Se for celular, remove não-dígitos mas assegura o sinal '+' inicial
  const apenasDigitos = clean.replace(/\D/g, '');
  if (clean.startsWith('+') || (apenasDigitos.length >= 12 && apenasDigitos.startsWith('55'))) {
    return `+${apenasDigitos}`;
  }
  
  return apenasDigitos;
}

function validarChavePix(chave: string): boolean {
  const clean = chave.trim();
  if (clean === 'CHAVE-PIX-NAO-CONFIGURADA' || clean === 'sgpf-fabrica-pix-key-12345' || !clean) {
    return false;
  }
  const sanitizada = sanitizarChavePix(clean);
  if (sanitizada.includes('@')) {
    return sanitizada.length >= 5;
  }
  return sanitizada.replace('+', '').length >= 8;
}

function gerarBrCodePix(chave: string, valor: number, nomeRecebedor: string): string {
  const cleanChave = sanitizarChavePix(chave);
  let cleanNome = nomeRecebedor.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  cleanNome = cleanNome.substring(0, 25);

  const pixKey = `0014BR.GOV.BCB.PIX01${cleanChave.length.toString().padStart(2, '0')}${cleanChave}`;
  const mai = `26${pixKey.length.toString().padStart(2, '0')}${pixKey}`;

  const valorStr = valor.toFixed(2);
  const valorField = `54${valorStr.length.toString().padStart(2, '0')}${valorStr}`;

  const payload = 
    "000201" +
    "010211" +
    mai +
    "52040000" +
    "5303986" +
    valorField +
    "5802BR" +
    `59${cleanNome.length.toString().padStart(2, '0')}${cleanNome}` +
    "6009SAO PAULO" +
    "62070503***" +
    "6304";

  const crc = crc16Ccitt(payload);
  return payload + crc;
}

interface Venda {
  id: string;
  numeroPedido: string;
  cliente: { nomeFantasia: string };
  valorTotal: number;
  status: number;
  dataPedido: string;
  formaPagamento: number;
  pago: boolean;
  clienteId: string;
  motoristaId?: string;
  motorista?: { nome: string };
  pixQrCode?: string;
  boletoCodigoBarras?: string;
}

function obterDadosBoleto(linhaDigitavel: string) {
  let clean = linhaDigitavel.replace(/\D/g, '');
  if (!clean) return { barcode: '', linha: linhaDigitavel };
  
  // Se tiver 46 dígitos (caso de boletos antigos gerados com bug de arredondamento no final)
  if (clean.length === 46) {
    clean = clean.substring(0, 37) + '0' + clean.substring(37);
  }
  
  if (clean.length !== 47) return { barcode: clean, linha: linhaDigitavel };
  
  const banco = clean.substring(0, 3);
  const moeda = clean.substring(3, 4);
  const vencimentoEValor = clean.substring(33, 47);
  const campoLivre = clean.substring(4, 9) + clean.substring(10, 20) + clean.substring(21, 31);
  
  // Calcular DV do código de barras (módulo 11) de forma dinâmica para validação de apps
  const digitosParaCalculo = `${banco}${moeda}${vencimentoEValor}${campoLivre}`;
  let soma = 0;
  let peso = 2;
  for (let i = digitosParaCalculo.length - 1; i >= 0; i--) {
    soma += parseInt(digitosParaCalculo.charAt(i), 10) * peso;
    peso++;
    if (peso > 9) peso = 2;
  }
  
  const resto = soma % 11;
  let dv = 11 - resto;
  if (dv === 0 || dv === 10 || dv === 11) {
    dv = 1;
  }
  
  const barcode = `${banco}${moeda}${dv}${vencimentoEValor}${campoLivre}`;
  
  // Sincronizar a linha digitável impressa com o DV calculado para validação visual/manual
  const partes = linhaDigitavel.split(' ');
  if (partes.length === 5) {
    partes[3] = dv.toString();
    const linha = partes.join(' ');
    return { barcode, linha };
  }
  
  return { barcode, linha: linhaDigitavel };
}

export function Vendas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  // Estados dos Filtros (Voltando ao padrão de Ano e Mês atual conforme solicitado)
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroMotorista, setFiltroMotorista] = useState('');
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());
  const [filtroMes, setFiltroMes] = useState((new Date().getMonth() + 1).toString());
  const [filtroData, setFiltroData] = useState('');
  const [filtroPago, setFiltroPago] = useState<string>('');
  const userRole = localStorage.getItem('sgpf_role') || 'Cliente';
  const userClienteId = localStorage.getItem('sgpf_cliente_id');
  const isCliente = userRole === 'Cliente';

  const [selectedVendaDocs, setSelectedVendaDocs] = useState<Venda | null>(null);
  const [selectedContaId, setSelectedContaId] = useState<string | null>(null);
  const [abaDocumento, setAbaDocumento] = useState<1 | 4>(1); // 1=Pix, 4=Boleto

  const queryClient = useQueryClient();

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<PedidoForm>({
    resolver: zodResolver(pedidoSchema),
    defaultValues: { itens: [{ produtoId: '', quantidade: 1, desconto: 0 }] }
  });

  const watchItens = watch('itens');
  const watchClienteId = watch('clienteId');

  const calcularTotal = () => {
    return watchItens?.reduce((acc, item) => {
      const prod = produtos?.find(p => p.id === item.produtoId);
      const preco = prod?.precoVenda || 0;
      const subtotalBase = (item.quantidade || 0) * preco;
      const descontoValor = subtotalBase * ((item.desconto || 0) / 100);
      const subtotal = subtotalBase - descontoValor;
      return acc + Math.max(0, subtotal);
    }, 0) || 0;
  };

  const canGiveDiscount = (userRole === 'Admin' || userRole === 'Gestor' || userRole === 'Operador');

  const { fields, append, remove } = useFieldArray({
    control,
    name: "itens"
  });

  const { data: vendas, isLoading: loadingVendas } = useQuery<Venda[]>({
    queryKey: ['vendas'],
    queryFn: async () => {
      const response = await api.get('/Vendas');
      return response.data;
    },
    refetchInterval: 5000, // Atualiza a cada 5 segundos para mostrar confirmações automáticas
  });

  // Verifica inadimplência: >= 3 comandas pendentes (não pagas, não canceladas) para o cliente selecionado
  const LIMITE_INADIMPLENCIA = 3;
  const comandasPendentesCliente = vendas?.filter(
    v => v.clienteId === watchClienteId && !v.pago && v.status !== 4
  ) ?? [];
  const isInadimplente = !editId && comandasPendentesCliente.length >= LIMITE_INADIMPLENCIA;

  const { data: clientes } = useQuery<any[]>({
    queryKey: ['clientes'],
    queryFn: async () => {
      const response = await api.get('/Clientes');
      return response.data;
    },
  });

  const { data: empresa } = useQuery<any>({
    queryKey: ['empresa-config'],
    queryFn: async () => {
      const response = await api.get('/Empresas');
      return response.data[0];
    },
  });

  const { data: contasBancarias } = useQuery<any[]>({
    queryKey: ['contas-bancarias'],
    queryFn: async () => (await api.get('/ContasBancarias')).data,
  });
  
  const { data: funcionarios } = useQuery<any[]>({
    queryKey: ['funcionarios'],
    queryFn: async () => (await api.get('/Funcionarios')).data,
  });

  const { data: produtos } = useQuery<any[]>({
    queryKey: ['produtos'],
    queryFn: async () => {
      const response = await api.get('/Produtos');
      return response.data;
    },
  });

  const mutationCreate = useMutation({
    mutationFn: (newPedido: PedidoForm) => api.post('/Vendas', newPedido),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      handleCloseModal();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao criar pedido')
  });

  const mutationUpdatePedido = useMutation({
    mutationFn: ({ id, data }: { id: string, data: PedidoForm }) => api.put(`/Vendas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      handleCloseModal();
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao atualizar pedido')
  });

  const handleEdit = async (venda: any) => {
    try {
      const response = await api.get(`/Produtos`); // Garantir produtos carregados
      const pedidoFull = await api.get(`/Vendas/${venda.id}`); 
      // Nota: Como o GetAll já traz quase tudo, podemos tentar carregar direto se o GetAll incluir itens
      // Se não, precisamos de um GetById no controller.
      
      setEditId(venda.id);
      const dados = pedidoFull.data;
      
      setValue('clienteId', dados.clienteId);
      setValue('motoristaId', dados.motoristaId);
      setValue('formaPagamento', dados.formaPagamento);
      reset({ 
        clienteId: dados.clienteId, 
        motoristaId: dados.motoristaId,
        formaPagamento: dados.formaPagamento,
        itens: dados.itens.map((i: any) => {
          const preco = i.precoUnitario || 0;
          const qtd = i.quantidade || 0;
          const descFixo = i.desconto || 0;
          const percDesc = preco > 0 ? (descFixo / (preco * qtd)) * 100 : 0;
          
          return {
            produtoId: i.produtoId,
            quantidade: i.quantidade,
            desconto: Math.round(percDesc * 100) / 100 // Arredondar para 2 casas
          };
        }) 
      });
      setIsModalOpen(true);
    } catch (e: any) {
      console.error(e);
      alert("Erro ao carregar detalhes para edição: " + (e.response?.data?.message || e.message));
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    reset({ clienteId: '', motoristaId: null, itens: [{ produtoId: '', quantidade: 1, desconto: 0 }] });
  };

  const mutationUpdateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string, status: number }) => api.patch(`/Vendas/${id}/status`, status, { headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao mover pedido')
  });

  const handleDownloadComanda = async (id: string) => {
    try {
      const response = await api.get(`/Vendas/${id}/comanda`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Comanda_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Erro ao baixar Comanda');
    }
  };

  const mutationTogglePagamento = useMutation({
    mutationFn: (id: string) => api.patch(`/Vendas/${id}/toggle-pagamento`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendas'] }),
  });

  const mutationCancel = useMutation({
    mutationFn: (id: string) => api.post(`/Vendas/${id}/cancelar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao cancelar pedido')
  });

  const mutationDeleteOrder = useMutation({
    mutationFn: (id: string) => api.delete(`/Vendas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Erro ao excluir pedido')
  });

  const handleDragStart = (id: string) => {
    if (isCliente) return;
    setDraggedId(id);
  };

  const handleDrop = (status: number) => {
    if (isCliente) return;
    if (draggedId) {
      mutationUpdateStatus.mutate({ id: draggedId, status });
      setDraggedId(null);
    }
  };

  const handleTouchStart = (e: TouchEvent, id: string) => {
    if (isCliente) return;
    setDraggedId(id);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isCliente || !draggedId) return;
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropZone = element?.closest('.drop-zone');
    
    document.querySelectorAll('.drop-zone').forEach(el => {
      el.classList.remove('bg-indigo-50/50', 'border-indigo-300', 'ring-2', 'ring-ember/30');
    });
    if (dropZone) {
      dropZone.classList.add('bg-indigo-50/50', 'border-indigo-300', 'ring-2', 'ring-ember/30');
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (isCliente || !draggedId) return;
    
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropZone = element?.closest('.drop-zone');
    
    document.querySelectorAll('.drop-zone').forEach(el => {
      el.classList.remove('bg-indigo-50/50', 'border-indigo-300', 'ring-2', 'ring-ember/30');
    });
    
    if (dropZone) {
      const newStatus = Number(dropZone.getAttribute('data-status'));
      mutationUpdateStatus.mutate({ id: draggedId, status: newStatus });
    }
    
    setDraggedId(null);
  };

  const onSubmit = (data: PedidoForm) => {
    // Converter desconto de % para valor fixo para o Backend
    const dataFormatted = {
      ...data,
      itens: data.itens.map(item => {
        const prod = produtos?.find(p => p.id === item.produtoId);
        const preco = prod?.precoVenda || 0;
        const valorDesconto = (item.quantidade * preco) * (item.desconto / 100);
        return {
          ...item,
          desconto: valorDesconto
        };
      })
    };

    if (editId) {
      mutationUpdatePedido.mutate({ id: editId, data: dataFormatted as any });
    } else {
      mutationCreate.mutate(dataFormatted as any);
    }
  };

  if (loadingVendas) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-ember" size={32} />
      </div>
    );
  }

  const renderVendasPorStatus = (statusValue: number, title: string, dotColor: string) => {
    const filtradas = vendas?.filter(v => {
      const matchesStatus = v.status === statusValue;
      const matchesCliente = (v.cliente?.nomeFantasia || '').toLowerCase().includes(filtroCliente.toLowerCase());
      
      const dataVenda = v.dataPedido ? new Date(v.dataPedido) : null;
      const isInvalidDate = !dataVenda || isNaN(dataVenda.getTime());

      // Se a data for inválida e houver filtro de tempo, não exibe. Se não houver filtro, exibe.
      const matchesAno = filtroAno === '' || (!isInvalidDate && dataVenda!.getFullYear().toString() === filtroAno);
      const matchesMes = filtroMes === '' || (!isInvalidDate && (dataVenda!.getMonth() + 1).toString() === filtroMes);
      const matchesData = filtroData === '' || (dataVenda && dataVenda.toISOString().split('T')[0] === filtroData);
      const matchesPago = filtroPago === '' || v.pago.toString() === filtroPago;
      const matchesMotorista = filtroMotorista === '' || v.motoristaId === filtroMotorista;
      const matchesUserCliente = !isCliente || v.clienteId === userClienteId;

      return matchesStatus && matchesCliente && matchesAno && matchesMes && matchesData && matchesPago && matchesMotorista && matchesUserCliente;
    }) || [];

    // Ordenação: Do mais recente (maior data) para o mais antigo
    const ordenadas = [...filtradas].sort((a, b) => {
      return new Date(b.dataPedido).getTime() - new Date(a.dataPedido).getTime();
    });
    
    return (
      <div 
        data-status={statusValue}
        className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 min-h-[500px] transition-colors drop-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDrop(statusValue)}
      >
        <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${dotColor}`}></span>
            {title}
          </div>
          <span className="bg-white text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold">{ordenadas.length}</span>
        </h3>
        
        <div className="space-y-4">
          {ordenadas.length === 0 && <p className="text-xs text-slate-400 text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">Arraste aqui</p>}
          {ordenadas.map(venda => (
            <div
              key={venda.id}
              draggable={!isCliente}
              onDragStart={() => handleDragStart(venda.id)}
              onTouchStart={(e) => handleTouchStart(e, venda.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`bg-white rounded-xl border overflow-hidden transition-all group ${
                !isCliente ? 'cursor-grab active:cursor-grabbing' : ''
              } ${
                draggedId === venda.id ? 'opacity-50 scale-95' : 'hover:shadow-md hover:border-ember/40'
              } ${
                statusValue === 4 ? 'border-red-200 opacity-70' : 'border-slate-200'
              }`}
            >
              {/* Faixa de cor no topo */}
              <div className={`h-1 w-full ${dotColor}`} />
              {/* Header: número + ações */}
              <div className="flex justify-between items-center px-3 pt-2 pb-1">
                <span className="text-[10px] font-semibold text-slate-400 tracking-wide">{venda.numeroPedido}</span>
                <div className="flex gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {((!isCliente && (statusValue === 0 || statusValue === 1)) || (isCliente && statusValue === 0)) && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(venda); }}
                          className="p-1 text-ember hover:text-fire rounded bg-surface/30 border border-ember/10"
                          title="Editar Pedido"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); if (confirm('Excluir permanentemente?')) mutationDeleteOrder.mutate(venda.id); }}
                          className="p-1 text-red-400 hover:text-red-600 rounded bg-red-50/30 border border-red-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    {(statusValue >= 1 && statusValue <= 3) && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownloadComanda(venda.id); }}
                        className="p-1 text-mid hover:text-salu-text rounded bg-surface/30 border border-ember/10"
                        title="Imprimir Comanda"
                      >
                        <Printer size={14} />
                      </button>
                    )}
                   {!isCliente && statusValue !== 4 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); if (confirm('Deseja realmente cancelar este pedido?')) mutationCancel.mutate(venda.id); }}
                      className="p-1 text-amber-500 hover:text-amber-700 rounded bg-slate-50 border border-slate-100"
                      title="Cancelar Pedido"
                    >
                      <PowerOff size={14} />
                    </button>
                   )}
                   {!isCliente && statusValue === 4 && (
                     <button 
                        onClick={(e) => { e.stopPropagation(); if (confirm('Deseja excluir permanentemente este pedido cancelado?')) mutationDeleteOrder.mutate(venda.id); }}
                        className="p-1 text-red-500 hover:text-red-700 rounded bg-red-50 border border-red-100"
                        title="Excluir Permanentemente"
                      >
                        <Trash2 size={14} />
                      </button>
                   )}
                </div>
              </div>
              {/* Body: cliente + motorista */}
              <div className="px-3 pb-2.5">
                <h4 className="font-bold text-slate-800 text-sm leading-snug">{venda.cliente?.nomeFantasia || 'Cliente'}</h4>
              
                {venda.motorista && (
                  <div className="flex items-center gap-1 mt-1">
                    <Truck size={11} className="text-ember shrink-0" />
                    <span className="text-[11px] font-semibold text-ember">{venda.motorista.nome.split(' ')[0]}</span>
                  </div>
                )}

                {/* Seletor de status para mobile/touch */}
                {!isCliente && (
                  <div className="md:hidden mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status:</span>
                    <select
                      value={venda.status}
                      onChange={(e) => {
                        const newStatus = Number(e.target.value);
                        mutationUpdateStatus.mutate({ id: venda.id, status: newStatus });
                      }}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer transition-all ${
                        venda.status === 0 ? 'bg-ember/10 text-ember border-ember/20' :
                        venda.status === 1 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        venda.status === 2 ? 'bg-fire/10 text-fire border-fire/20' :
                        venda.status === 3 ? 'bg-green-100 text-green-700 border-green-200' :
                        'bg-red-50 text-red-500 border-red-100'
                      }`}
                    >
                      <option value={0}>Aprovação</option>
                      <option value={1}>Em Separação</option>
                      <option value={2}>Em Rota</option>
                      <option value={3}>Entregue</option>
                      <option value={4}>Cancelado</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Footer: valor + pagamento + hora */}
              <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-fire text-sm leading-none block">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.valorTotal)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {Number(venda.formaPagamento) === 0 ? 'Dinheiro' : Number(venda.formaPagamento) === 1 ? 'Pix' : Number(venda.formaPagamento) === 2 ? 'Crédito' : Number(venda.formaPagamento) === 3 ? 'Débito' : 'Boleto'}
                    {' · '}
                    {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(venda.dataPedido))}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); if (isCliente) return; mutationTogglePagamento.mutate(venda.id); }}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase transition-colors ${
                      venda.pago
                        ? 'bg-green-100 text-green-700'
                        : `bg-amber-100 text-amber-700 ${!isCliente ? 'hover:bg-amber-200' : ''}`
                    } ${isCliente ? 'cursor-default' : 'cursor-pointer'}`}
                    title={isCliente ? '' : 'Alternar pagamento'}
                  >
                    {venda.pago ? '✓ Pago' : 'Pendente'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedVendaDocs(venda); setAbaDocumento(Number(venda.formaPagamento) === 4 ? 4 : 1); }} className="p-1 text-slate-400 hover:text-ember hover:bg-white rounded" title="Gerar Pix ou Boleto">
                    <FileText size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-salu-text">Painel de Vendas B2B</h2>
          <p className="text-muted">Acompanhe os pedidos desde a separação até a entrega no cliente.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-fire to-ember shadow-lg shadow-fire/20">
          <ShoppingCart size={18} />
          Novo Pedido
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${isCliente ? 'lg:grid-cols-4' : 'lg:grid-cols-7'} gap-4 items-end`}>
        {!isCliente && (
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Buscar Cliente</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Nome do cliente..."
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        )}

        {!isCliente && (
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Motorista</label>
            <select
              value={filtroMotorista}
              onChange={(e) => setFiltroMotorista(e.target.value)}
              className="w-full h-10 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Todos</option>
              {funcionarios
                ?.filter(f => vendas?.some(v => v.motoristaId === f.id))
                .map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
            </select>
          </div>
        )}
        
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Ano / Mês</label>
          <div className="flex gap-2">
            <select 
              value={filtroAno}
              onChange={(e) => setFiltroAno(e.target.value)}
              className="flex-1 h-10 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Anos</option>
              {[2024, 2025, 2026].map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
            <select 
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="flex-1 h-10 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Meses</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => (
                <option key={mes} value={mes}>
                  {new Date(0, mes - 1).toLocaleString('pt-BR', { month: 'short' })}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Data Específica</label>
          <input 
            type="date"
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Pagamento</label>
          <select 
            value={filtroPago}
            onChange={(e) => setFiltroPago(e.target.value)}
            className="w-full h-10 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Todos (Pagto)</option>
            <option value="true">Pago</option>
            <option value="false">Pendente</option>
          </select>
        </div>

        <div>
          <Button 
            variant="secondary" 
            className="w-full h-10 text-xs"
            onClick={() => {
              setFiltroCliente('');
              setFiltroMotorista('');
              setFiltroAno(new Date().getFullYear().toString());
              setFiltroMes((new Date().getMonth() + 1).toString());
              setFiltroData('');
              setFiltroPago('');
            }}
          >
            Limpar Filtros
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {renderVendasPorStatus(0, 'Aprovação (Portal)', 'bg-ember')}
        {renderVendasPorStatus(1, 'Em Separação', 'bg-gold')}
        {renderVendasPorStatus(2, 'Em Rota de Entrega', 'bg-fire')}
        {renderVendasPorStatus(3, 'Entregues (Hoje)', 'bg-green-600')}
        {renderVendasPorStatus(4, 'Cancelados', 'bg-red-500')}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Novo Pedido de Venda"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Controller
              control={control}
              name="clienteId"
              render={({ field }) => (
                <SearchableSelect
                  label="Cliente"
                  required
                  placeholder="Pesquise o cliente..."
                  options={clientes?.filter(c => !isCliente || c.id === userClienteId).map(c => ({ value: c.id, label: c.nomeFantasia })) || []}
                  value={isCliente ? userClienteId : field.value}
                  onChange={field.onChange}
                  error={errors.clienteId?.message}
                  disabled={isCliente}
                />
              )}
            />
            
            {(userRole === 'Admin' || userRole === 'Gestor') && (
              <Controller
                control={control}
                name="motoristaId"
                render={({ field }) => (
                  <SearchableSelect
                    label="Motorista / Entregador"
                    placeholder="Selecione o motorista..."
                    options={funcionarios?.map(f => ({ value: f.id, label: f.nome })) || []}
                    value={field.value || ''}
                    onChange={field.onChange}
                    error={errors.motoristaId?.message}
                  />
                )}
              />
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Forma de Pagamento</label>
              <select 
                {...register('formaPagamento')}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value={0}>Dinheiro</option>
                <option value={1}>Pix</option>
                <option value={2}>Cartão de Crédito</option>
                <option value={3}>Cartão de Débito</option>
                <option value={4}>Boleto Bancário</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Itens do Pedido</label>
              <Button 
                type="button" 
                size="sm" 
                variant="secondary"
                onClick={() => append({ produtoId: '', quantidade: 1, desconto: 0 })}
                className="text-xs flex items-center gap-1"
              >
                <Plus size={14} /> Adicionar Item
              </Button>
            </div>

            <div className="space-y-3 pr-2">
              {fields.map((field, index) => {
                const selectedProd = produtos?.find(p => p.id === watchItens[index]?.produtoId);
                const preco = selectedProd?.precoVenda || 0;
                const qtd = watchItens[index]?.quantidade || 0;
                const descPerc = watchItens[index]?.desconto || 0;
                const subtotalBase = qtd * preco;
                const subtotalItem = Math.max(0, subtotalBase - (subtotalBase * (descPerc / 100)));

                return (
                  <div key={field.id} className="group flex flex-col sm:flex-row gap-4 items-start sm:items-end bg-bg-card p-5 rounded-2xl border border-border-subtle shadow-sm hover:border-ember/40 hover:shadow-lg transition-all duration-300 relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-surface group-hover:bg-ember transition-colors rounded-l-2xl"></div>
                    
                    <div className="w-full sm:flex-1 sm:min-w-[180px] space-y-1.5">
                      <Controller
                        control={control}
                        name={`itens.${index}.produtoId`}
                        render={({ field }) => (
                          <SearchableSelect
                            label="Produto / Descrição"
                            required
                            placeholder="Selecione..."
                            options={produtos?.filter(p => p.ativo !== false && Number(p.tipo) !== 0).map(p => ({ 
                              value: p.id, 
                              label: `${Number(p.tipo) === 1 ? '🍞' : '📦'} ${p.nome} (${p.unidadeMedida}) - Saldo: ${p.quantidadeEstoque}` 
                            })) || []}
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.itens?.[index]?.produtoId?.message}
                            placeholder={!produtos ? "Carregando produtos..." : "Selecione o produto"}
                          />
                        )}
                      />
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                      <div className="w-16 sm:w-16 space-y-1.5">
                        <Input 
                          label="Qtd" 
                          required
                          type="number"
                          className="h-10 px-2 text-sm font-bold text-slate-700"
                          {...register(`itens.${index}.quantidade`)}
                        />
                      </div>
                      {canGiveDiscount && (
                        <div className="w-20 sm:w-20 space-y-1.5 relative">
                          <Input 
                            label="Desc %" 
                            type="number"
                            step="0.1"
                            className="h-10 pl-2 pr-5 text-sm font-bold text-red-600 bg-red-50/30 border-red-100"
                            {...register(`itens.${index}.desconto`)}
                          />
                          <span className="absolute right-2 bottom-2.5 text-[10px] font-bold text-red-400">%</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end sm:min-w-[100px] sm:pb-1">
                      <div className="flex flex-col sm:items-end">
                        <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Unit.</span>
                        <span className="text-[13px] font-semibold text-mid">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preco)}
                        </span>
                      </div>
                      
                      <div className="flex flex-col sm:items-end mt-1">
                        <span className="text-[10px] text-ember-light font-bold uppercase tracking-wider">Subt.</span>
                        <span className="text-[15px] font-bold text-fire">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotalItem)}
                        </span>
                      </div>

                      <button 
                        type="button" 
                        onClick={() => remove(index)}
                        className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all sm:hidden"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => remove(index)}
                      className="hidden sm:flex p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all mb-1 items-center justify-center"
                      title="Remover Item"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                );
              })}
            </div>
            {errors.itens && <p className="text-xs text-red-500">{errors.itens.message}</p>}
            
            <div className="bg-warm/30 p-4 rounded-xl border border-ember/10 flex justify-between items-center mt-4">
              <span className="text-sm font-bold text-salu-text">Total do Pedido:</span>
              <span className="text-xl font-bold text-fire">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calcularTotal())}
              </span>
            </div>
          </div>

          {/* Alerta de Inadimplência */}
          {isInadimplente && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-300 text-red-800 rounded-xl p-4 animate-pulse-once">
              <AlertTriangle size={20} className="shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Cliente Inadimplente — Pedido Bloqueado</p>
                <p className="text-xs mt-0.5">
                  Este cliente possui <strong>{comandasPendentesCliente.length} comanda(s) pendentes</strong>.
                  Novos pedidos são bloqueados a partir de {LIMITE_INADIMPLENCIA}.
                  Quite as pendências no painel antes de prosseguir.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={handleCloseModal} disabled={mutationCreate.isPending || mutationUpdatePedido.isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-fire to-ember text-white flex items-center gap-2 px-8 shadow-md disabled:opacity-40 disabled:cursor-not-allowed" disabled={mutationCreate.isPending || mutationUpdatePedido.isPending || isInadimplente}>
              {(mutationCreate.isPending || mutationUpdatePedido.isPending) ? (
                <Loader2 className="animate-spin" size={18} />
              ) : isInadimplente ? (
                <AlertTriangle size={18} />
              ) : (
                <Save size={18} />
              )}
              {isInadimplente ? 'Pedido Bloqueado' : editId ? 'Salvar Alterações' : 'Confirmar Pedido'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Documentos (Boleto/Pix) */}
      <Modal 
        isOpen={!!selectedVendaDocs} 
        onClose={() => { setSelectedVendaDocs(null); setSelectedContaId(null); }} 
        title="Documentos de Pagamento"
      >
        {selectedVendaDocs && (
          <div className="p-4 space-y-6 flex flex-col items-center">
            <div className="flex bg-slate-100 p-1 rounded-xl w-full">
              <button 
                onClick={() => setAbaDocumento(1)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${abaDocumento === 1 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <PixIcon size={14} /> Pix
              </button>
              <button 
                onClick={() => setAbaDocumento(4)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${abaDocumento === 4 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <FileText size={14} /> Boleto
              </button>
            </div>

            {abaDocumento === 1 ? (
              <>
                {(() => {
                  const contaSelecionada = contasBancarias?.find(c => c.isPadrao);
                  
                  const pixChave = contaSelecionada?.pixChave || empresa?.pixChave || 'CHAVE-PIX-NAO-CONFIGURADA';

                  // Gerar Pix dinamicamente para sempre usar a chave de banco atualizada do cadastro
                  const pixQrCodeDinamico = gerarBrCodePix(
                    pixChave,
                    selectedVendaDocs.valorTotal,
                    empresa?.nomeFantasia || 'SGPF FABRICA'
                  );

                  return (
                    <div className="w-full space-y-4">
                      {/* Dados estruturados do Pix semelhantes aos do boleto */}
                      <div className="w-full bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4 text-left">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                          <div className="font-bold text-lg text-[#32BCAD] uppercase flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#32BCAD] animate-pulse"></span>
                            Pix
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Banco de Destino</p>
                            <p className="font-bold text-slate-700 text-sm">{contaSelecionada?.bancoNome || empresa?.bancoNome || 'BANCO NÃO CONFIGURADO'}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Beneficiário</p>
                            <p className="text-sm font-medium text-slate-700 uppercase">{empresa?.razaoSocial || empresa?.nomeFantasia || 'EMPRESA NÃO CONFIGURADA'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Chave Pix</p>
                              <p className="text-xs font-semibold text-slate-600 break-all">{pixChave}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Valor a Pagar</p>
                              <p className="text-lg font-black text-[#32BCAD]">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedVendaDocs?.valorTotal || 0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* QR Code e Código de Cópia com validação visual */}
                      {validarChavePix(pixChave) ? (
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center space-y-4 w-full">
                          <div className="bg-white p-4 rounded-xl shadow-inner border border-slate-100">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixQrCodeDinamico)}`} 
                              alt="QR Code Pix"
                              className="w-48 h-48 mx-auto"
                            />
                          </div>
                          
                          <div className="text-center space-y-2 w-full max-w-xs">
                            <p className="text-xs text-slate-500 font-medium">Escaneie o código acima ou use a chave copia e cola abaixo:</p>
                            <div className="bg-slate-100 p-3 rounded-lg text-[9px] font-mono break-all border border-slate-200 select-all text-center">
                              {pixQrCodeDinamico}
                            </div>
                            
                            <Button 
                              size="sm" 
                              className="w-full bg-[#32BCAD] hover:bg-[#2aa89b] text-white flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold shadow-sm mt-2 transition-colors border-0"
                              onClick={() => {
                                navigator.clipboard.writeText(pixQrCodeDinamico);
                                alert('Código Pix copiado!');
                              }}
                            >
                              Copiar Código Pix
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl p-5 w-full">
                          <AlertTriangle size={20} className="shrink-0 text-amber-500 mt-0.5" />
                          <div>
                            <p className="font-bold text-sm text-amber-900">Chave Pix não Configurada ou Temporária</p>
                            <p className="text-xs mt-1 text-amber-700 leading-relaxed font-sans">
                              A chave Pix atual (<strong>{pixChave}</strong>) é inválida ou um preenchimento temporário. 
                              Por favor, cadastre uma **chave Pix real** (CNPJ, CPF, Telefone ou E-mail) no cadastro da conta bancária ou nas configurações da empresa para habilitar a geração de cobranças Pix válidas para os aplicativos de banco.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            ) : (
              <>
                {(() => {
                  const contaSelecionada = contasBancarias?.find(c => c.isPadrao);

                  return (
                    <div className="w-full bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                        <div className="font-bold text-lg text-slate-800 uppercase">{contaSelecionada?.bancoNome || empresa?.bancoNome || 'BANCO NÃO CONFIGURADO'}</div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Vencimento</p>
                          <p className="font-bold text-slate-700">{new Intl.DateTimeFormat('pt-BR').format(new Date(new Date().setDate(new Date().getDate() + 3)))}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Beneficiário</p>
                        <p className="text-sm font-medium text-slate-700 uppercase">{empresa?.razaoSocial || empresa?.nomeFantasia || 'EMPRESA NÃO CONFIGURADA'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Agência / Conta</p>
                          <p className="text-sm font-medium text-slate-700">
                            {contaSelecionada?.agencia || '---'} / {contaSelecionada?.numeroConta || '---'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Valor do Documento</p>
                          <p className="text-lg font-black text-indigo-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedVendaDocs?.valorTotal || 0)}
                          </p>
                        </div>
                      </div>
                      <div className="pt-4 border-t-2 border-black border-dashed">
                        <div className="w-full flex flex-col items-center gap-2">
                          {(() => {
                            const dadosBoleto = obterDadosBoleto(selectedVendaDocs?.boletoCodigoBarras || '34191.79001 01043.510047 91020.150008 5 95020000000000');
                            return (
                              <>
                                <img 
                                  src={`https://bwipjs-api.metafloor.com/?bcid=interleaved2of5&text=${dadosBoleto.barcode}&scale=2&height=15`} 
                                  alt="Código de Barras Boleto"
                                  className="w-full max-h-24 object-contain"
                                />
                                <p className="text-[10px] font-bold font-mono tracking-widest text-slate-800">
                                  {dadosBoleto.linha}
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <Button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2">
                   <FileText size={18} /> Imprimir Boleto
                </Button>
              </>
            )}
            <p className="text-[10px] text-slate-400 text-center">Referente ao Pedido: {selectedVendaDocs?.numeroPedido}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
