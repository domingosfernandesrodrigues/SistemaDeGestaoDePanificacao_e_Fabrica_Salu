import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Compras } from '../pages/Compras';
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

describe('Compras Component', () => {
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
        <Compras />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders purchase drafts and confirm buttons successfully', async () => {
    const mockCompras = [
      { id: '1', fornecedorNome: 'Distribuidora F', dataCompra: '2026-06-01T12:00:00', valorTotal: 500, status: 'Rascunho', produtosResumo: 'Farinha (10)', totalItens: 10, isPago: false, categoria: 'Mercadoria', itens: [] },
    ];
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/Compras')) return Promise.resolve({ data: mockCompras });
      return Promise.resolve({ data: [] });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Distribuidora F')[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText('Rascunho')[0]).toBeInTheDocument();
    expect(screen.getByText('Módulo de Compras')).toBeInTheDocument();
  });
});
