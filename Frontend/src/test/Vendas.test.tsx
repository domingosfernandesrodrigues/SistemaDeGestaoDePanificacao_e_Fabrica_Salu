import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Vendas } from '../pages/Vendas';
import api from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('Vendas Component', () => {
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
    localStorage.setItem('sgpf_role', 'Admin');
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <Vendas />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders sales board columns successfully when API returns data', async () => {
    const mockVendas = [
      { id: '1', numeroPedido: 'PED-123', cliente: { nomeFantasia: 'Mercado Bom' }, valorTotal: 100, status: 0, dataPedido: '2026-06-01T10:00:00', formaPagamento: 1, pago: false, clienteId: 'c1' }
    ];
    
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/Vendas')) return Promise.resolve({ data: mockVendas });
      if (url.includes('/Empresas')) return Promise.resolve({ data: [{ id: 'emp-1', nomeFantasia: 'Empresa Teste' }] });
      return Promise.resolve({ data: [] });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Mercado Bom')[0]).toBeInTheDocument();
    });

    expect(screen.getByText('PED-123')).toBeInTheDocument();
    expect(screen.getByText('Painel de Vendas B2B')).toBeInTheDocument();
  });
});
