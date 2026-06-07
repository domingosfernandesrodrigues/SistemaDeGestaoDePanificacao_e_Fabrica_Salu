import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FolhaPagamento } from '../pages/FolhaPagamento';
import api from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('FolhaPagamento Component', () => {
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
        <FolhaPagamento />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders pay sheets list and tabs correctly', async () => {
    const mockFolhas = [
      {
        id: '1',
        mesReferencia: 5,
        anoReferencia: 2026,
        salarioBaseCalculado: 2000,
        totalDescontos: 160,
        salarioLiquido: 1840,
        status: 0, // Aberta
        tipo: 0,
        funcionarioNome: 'Maria Ajudante',
      },
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/Funcionarios') return Promise.resolve({ data: [] });
      if (url === '/folha-pagamento/funcionarios') return Promise.resolve({ data: mockFolhas });
      if (url.startsWith('/planejamento-ferias/mes/')) return Promise.resolve({ data: [] });
      return Promise.reject(new Error('Unknown url'));
    });

    renderComponent();

    expect(await screen.findAllByText('Maria Ajudante')).not.toHaveLength(0);
    expect(screen.getAllByText('05/2026')[0]).toBeInTheDocument();
    expect(screen.getByText('Folhas em Aberto')).toBeInTheDocument();
  });
});
