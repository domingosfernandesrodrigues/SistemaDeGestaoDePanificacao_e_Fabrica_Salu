import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlanejamentoFerias } from '../pages/PlanejamentoFerias';
import api from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('PlanejamentoFerias Component', () => {
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
        <PlanejamentoFerias />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders vacation planners and totals', async () => {
    const mockVacations = [
      {
        id: '1',
        funcionarioId: 'f-1',
        funcionarioNome: 'Ana Padeira',
        dataInicio: '2026-07-01',
        dataFim: '2026-07-31',
        diasFerias: 30,
        diasEfetivosGozo: 30,
        tipoParcelamento: 0,
        solicitaAbono: false,
        diasAbono: 0,
        solicitaAdiantamentoDecimoTerceiro: false,
        valorAdiantamentoDecimoTerceiro: 0,
        status: 0,
        periodoAquisitivoInicio: '2025-01-01',
        periodoAquisitivoFim: '2025-12-31',
        periodoConcessivoFim: '2026-12-31',
        valorRemFeriasBruto: 3000,
        valorTercoConstitucional: 1000,
        valorAbonoFeriasVendidas: 0,
        valorTotalBruto: 4000,
        dataCriacao: '2026-05-01',
        periodoConcessivoVencido: false,
      },
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/planejamento-ferias') return Promise.resolve({ data: mockVacations });
      if (url === '/Funcionarios') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('Unknown url'));
    });

    renderComponent();

    expect(await screen.findAllByText('Ana Padeira')).not.toHaveLength(0);
    expect(screen.getAllByText('Total Planejados')[0]).toBeInTheDocument();
  });
});
