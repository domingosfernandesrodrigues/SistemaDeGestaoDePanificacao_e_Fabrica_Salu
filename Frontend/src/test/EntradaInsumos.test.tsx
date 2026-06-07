import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EntradaInsumos } from '../pages/EntradaInsumos';
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

describe('EntradaInsumos Component', () => {
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
        <EntradaInsumos />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders raw materials inputs successfully', async () => {
    const mockCompras = [
      { id: '1', fornecedorNome: 'Insumos do Sul', dataCompra: '2026-06-01T12:00:00', valorTotal: 300, status: 'Rascunho', produtosResumo: 'Fermento (5)', totalItens: 5, isPago: false, categoria: 'Insumo', itens: [] },
    ];
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/Compras')) return Promise.resolve({ data: mockCompras });
      return Promise.resolve({ data: [] });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Insumos do Sul')[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText('Rascunho')[0]).toBeInTheDocument();
    expect(screen.getByText('Entrada de Insumos')).toBeInTheDocument();
  });
});
