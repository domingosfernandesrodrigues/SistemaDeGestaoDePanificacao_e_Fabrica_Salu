import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Alimentacao from '../pages/Alimentacao';
import api from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Alimentacao Component', () => {
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
    localStorage.clear();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <Alimentacao />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders meals list correctly when data is returned', async () => {
    localStorage.setItem('sgpf_role', 'Admin');
    const mockMeals = [
      {
        id: '1',
        funcionarioId: 'f-1',
        nomeFuncionario: 'Lucas Padeiro',
        data: '2026-06-06T00:00:00Z',
        tipoRefeicao: 'Almoço',
        valor: 25,
        observacao: 'Extra',
        statusFinanceiro: 'Pendente',
      },
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/Funcionarios') return Promise.resolve({ data: [] });
      if (url === '/LancamentosAlimentacao') return Promise.resolve({ data: mockMeals });
      return Promise.reject(new Error('Unknown url'));
    });

    renderComponent();

    expect(await screen.findAllByText('Lucas Padeiro')).not.toHaveLength(0);
    expect(screen.getAllByText('Almoço')[0]).toBeInTheDocument();
    expect(screen.getAllByText(/25,00/)[0]).toBeInTheDocument();
  });
});
