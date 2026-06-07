import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Fornecedores from '../pages/Fornecedores';
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

describe('Fornecedores Component', () => {
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
        <Fornecedores />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders suppliers list when API returns data', async () => {
    const mockFornecedores = [
      { id: '1', nomeFantasia: 'Fornecedor A', cnpj: '12345678901234', contato: '11999999999', telefone: '11999999999', email: 'forn@test.com', ativo: true },
      { id: '2', nomeFantasia: 'Fornecedor B', cnpj: '98765432109876', contato: '11888888888', telefone: '11888888888', email: 'forn2@test.com', ativo: false },
    ];
    (api.get as any).mockResolvedValue({ data: mockFornecedores });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Fornecedor A')).toBeInTheDocument();
    });

    expect(screen.getByText('Fornecedor B')).toBeInTheDocument();
    expect(screen.getByText('Gestão de Fornecedores')).toBeInTheDocument();
  });

  it('opens and closes the create supplier modal', async () => {
    (api.get as any).mockResolvedValue({ data: [] });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Novo Fornecedor')).toBeInTheDocument();
    });

    const newBtn = screen.getByText('Novo Fornecedor');
    fireEvent.click(newBtn);

    // Modal title appears
    expect(screen.getAllByText('Novo Fornecedor')).toHaveLength(2); // One header, one modal title

    const cancelBtn = screen.getByText('Cancelar');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
    });
  });
});
