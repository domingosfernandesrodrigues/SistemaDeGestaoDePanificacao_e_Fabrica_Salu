import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Clientes } from '../pages/Clientes';
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

describe('Clientes Component', () => {
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
        <Clientes />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders clients list when API returns data', async () => {
    const mockClientes = [
      { id: '1', nomeFantasia: 'Supermercado Alpha', cnp_j_CPF: '12345678901', telefone: '11999999999', endereco: 'Rua A, 100', ativo: true },
      { id: '2', nomeFantasia: 'Padaria Beta', cnp_j_CPF: '98765432100', telefone: '11888888888', endereco: 'Rua B, 200', ativo: false },
    ];
    (api.get as any).mockResolvedValue({ data: mockClientes });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Supermercado Alpha')[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText('Padaria Beta')[0]).toBeInTheDocument();
    expect(screen.getByText('Gestão de Clientes')).toBeInTheDocument();
  });

  it('opens and closes the create client modal', async () => {
    (api.get as any).mockResolvedValue({ data: [] });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Novo Cliente')).toBeInTheDocument();
    });

    const newBtn = screen.getByText('Novo Cliente');
    fireEvent.click(newBtn);

    // Modal title appears
    expect(screen.getAllByText('Novo Cliente')).toHaveLength(2); // One header, one modal title

    const cancelBtn = screen.getByText('Cancelar');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
    });
  });
});
