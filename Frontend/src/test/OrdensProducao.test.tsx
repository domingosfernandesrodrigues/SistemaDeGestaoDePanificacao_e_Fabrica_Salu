import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrdensProducao } from '../pages/OrdensProducao';
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

describe('OrdensProducao Component', () => {
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
        <OrdensProducao />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders OPs list when API returns data', async () => {
    const mockOps = [
      { id: '1', numeroOP: 'OP-001', produtoId: 'prod-1', produto: { nome: 'Pão de Queijo' }, quantidadePlanejada: 100, quantidadeRealizada: 0, status: 0 },
    ];
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/ordens-producao')) return Promise.resolve({ data: mockOps });
      return Promise.resolve({ data: [] });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Pão de Queijo')).toBeInTheDocument();
    });

    expect(screen.getByText('OP-001')).toBeInTheDocument();
    expect(screen.getByText('Ordens de Produção (OP)')).toBeInTheDocument();
  });

  it('opens and closes the create OP modal', async () => {
    (api.get as any).mockResolvedValue({ data: [] });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Nova Ordem')).toBeInTheDocument();
    });

    const newBtn = screen.getByText('Nova Ordem');
    fireEvent.click(newBtn);

    // Modal title appears
    expect(screen.getByText('Abrir Ordem de Produção')).toBeInTheDocument();

    const cancelBtn = screen.getByText('Cancelar');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Abrir Ordem de Produção')).not.toBeInTheDocument();
    });
  });
});
