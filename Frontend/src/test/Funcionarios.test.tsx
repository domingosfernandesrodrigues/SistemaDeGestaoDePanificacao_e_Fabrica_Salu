import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Funcionarios from '../pages/Funcionarios';
import api from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Funcionarios Component', () => {
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
        <Funcionarios />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders employees list when API returns data', async () => {
    const mockFuncs = [
      { id: '1', nome: 'Maria Silva', cpf: '11122233396', cargo: 'Confeiteira', salarioBase: 2200, dataAdmissao: '2026-01-01', ativo: true },
      { id: '2', nome: 'João Rocha', cpf: '12345678909', cargo: 'Padeiro', salarioBase: 2500, dataAdmissao: '2026-02-01', ativo: false },
    ];
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/Funcionarios') return Promise.resolve({ data: mockFuncs });
      if (url === '/Usuarios') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('Unknown url'));
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Maria Silva')[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText('João Rocha')[0]).toBeInTheDocument();
    expect(screen.getByText('Confeiteira')).toBeInTheDocument();
    expect(screen.getByText('Padeiro')).toBeInTheDocument();
  });

  it('opens and closes the create employee modal', async () => {
    (api.get as any).mockResolvedValue({ data: [] });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Novo Funcionário')).toBeInTheDocument();
    });

    const newBtn = screen.getByText('Novo Funcionário');
    fireEvent.click(newBtn);

    // Modal title appears
    expect(screen.getAllByText('Novo Funcionário')).toHaveLength(2); // One page header, one modal title

    const cancelBtn = screen.getByText('Cancelar');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
    });
  });
});
