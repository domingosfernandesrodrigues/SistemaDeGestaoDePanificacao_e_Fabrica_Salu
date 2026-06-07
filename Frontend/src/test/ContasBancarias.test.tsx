import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContasBancarias } from '../pages/ContasBancarias';
import api from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('ContasBancarias Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ContasBancarias />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders bank accounts, summaries, and transactions correctly', async () => {
    const mockContas = [
      {
        id: 'c-1',
        nome: 'Caixa Geral',
        tipo: 0, // Caixa Físico
        saldoInicial: 1000,
        saldoAtual: 1200,
        ativa: true,
        isPadrao: true,
      },
      {
        id: 'c-2',
        nome: 'Conta Santander',
        tipo: 1, // Conta Corrente
        saldoInicial: 5000,
        saldoAtual: 4500,
        ativa: true,
        isPadrao: false,
      },
    ];

    const mockExtrato = [
      {
        id: 'm-1',
        contaBancariaId: 'c-1',
        dataMovimentacao: '2026-06-06T10:00:00Z',
        tipo: 'entrada',
        valor: 200,
        descricao: 'Reforço de Caixa',
        origem: 0, // Manual
      },
      {
        id: 'm-2',
        contaBancariaId: 'c-2',
        dataMovimentacao: '2026-06-06T14:30:00Z',
        tipo: 'saida',
        valor: 500,
        descricao: 'Pagamento de Internet',
        origem: 1, // Despesa
      },
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url.startsWith('/ContasBancarias/saldos-periodo')) {
        return Promise.resolve({ data: mockContas });
      }
      if (url.startsWith('/ContasBancarias/extrato')) {
        return Promise.resolve({ data: mockExtrato });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    renderComponent();

    // Aguarda carregar dados dinâmicos do dashboard/contas
    expect(await screen.findAllByText('Caixa Geral')).not.toHaveLength(0);
    expect(screen.getAllByText('Conta Santander')[0]).toBeInTheDocument();

    // Verifica Saldos Totais calculados no resumo
    // Saldo Consolidado = 1200 + 4500 = 5700
    expect(screen.getAllByText(/5\.700,00/)[0]).toBeInTheDocument();
    
    // Entradas no Período = 200
    expect(screen.getAllByText(/200,00/)[0]).toBeInTheDocument();

    // Saídas no Período = 500
    expect(screen.getAllByText(/500,00/)[0]).toBeInTheDocument();

    // Tipo de Conta labels
    expect(screen.getAllByText('Caixa Físico')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Conta Corrente')[0]).toBeInTheDocument();

    // Extrato list elements
    expect(screen.getAllByText('Reforço de Caixa')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Pagamento de Internet')[0]).toBeInTheDocument();
  });
});
