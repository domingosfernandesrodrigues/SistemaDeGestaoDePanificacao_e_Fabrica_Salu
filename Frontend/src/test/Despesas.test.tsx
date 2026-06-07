import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Despesas from '../pages/Despesas';
import api from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Despesas Component', () => {
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
        <Despesas />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders expenses list correctly', async () => {
    const mockExpenses = [
      {
        id: '1',
        descricao: 'Conta de Água',
        valor: 150,
        categoria: 'Utilidades',
        dataVencimento: '2026-06-15T00:00:00Z',
        mesReferencia: 'Junho/2026',
      },
    ];
    (api.get as any).mockResolvedValue({ data: mockExpenses });

    renderComponent();

    expect(await screen.findAllByText('Conta de Água')).not.toHaveLength(0);
    expect(screen.getAllByText(/150,00/)[0]).toBeInTheDocument();
  });
});
