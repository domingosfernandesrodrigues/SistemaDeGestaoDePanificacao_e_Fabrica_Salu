import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Produtos } from '../pages/Produtos';
import api from '../services/api';

// Mock the API client
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('Produtos Component', () => {
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
        <Produtos />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    // Make API request hang
    (api.get as any).mockReturnValue(new Promise(() => {}));

    renderComponent();

    // Verify loading state
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders products list successfully when API returns data', async () => {
    const mockProducts = [
      { id: '1', nome: 'Pão de Forma', tipo: 1, unidadeMedida: 'Un', precoCusto: 2.50, precoVenda: 5.00, quantidadeEstoque: 10, ativo: true },
      { id: '2', nome: 'Farinha Trigo', tipo: 0, unidadeMedida: 'Kg', precoCusto: 3.00, precoVenda: 0.00, quantidadeEstoque: 50, ativo: true },
    ];

    (api.get as any).mockResolvedValue({ data: mockProducts });

    renderComponent();

    // Wait for the query to resolve
    await waitFor(() => {
      expect(screen.getByText('Pão de Forma')).toBeInTheDocument();
    });

    expect(screen.getByText('Farinha Trigo')).toBeInTheDocument();
    expect(screen.getByText('Cadastro de Produtos')).toBeInTheDocument();
  });

  it('opens and closes the create product modal', async () => {
    (api.get as any).mockResolvedValue({ data: [] });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Novo Produto')).toBeInTheDocument();
    });

    const newProductButton = screen.getByText('Novo Produto');
    fireEvent.click(newProductButton);

    // Modal title should be in the document
    expect(screen.getByText('Cadastrar Novo Produto')).toBeInTheDocument();

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByText('Cadastrar Novo Produto')).not.toBeInTheDocument();
    });
  });
});
