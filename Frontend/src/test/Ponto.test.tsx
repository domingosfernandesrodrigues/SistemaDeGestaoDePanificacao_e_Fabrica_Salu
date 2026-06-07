import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Ponto } from '../pages/Ponto';
import api from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Ponto Component', () => {
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
        <Ponto />
      </QueryClientProvider>
    );

  it('renders relogio de ponto header and buttons', async () => {
    localStorage.setItem('sgpf_role', 'Funcionario');
    (api.get as any).mockResolvedValue({ data: [] });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Relógio de Ponto')).toBeInTheDocument();
    });

    expect(screen.getByText('Registrar Entrada')).toBeInTheDocument();
    expect(screen.getByText('Registrar Saída')).toBeInTheDocument();
  });

  it('renders today points list correctly', async () => {
    localStorage.setItem('sgpf_role', 'Funcionario');
    const mockHoje = [
      {
        id: '1',
        funcionarioId: 'f-1',
        dataHoraEntrada: '2026-06-06T08:00:00',
        dataHoraSaida: '2026-06-06T12:00:00',
        totalHorasTrabalhadas: 4,
      },
    ];
    (api.get as any).mockResolvedValue({ data: mockHoje });

    renderComponent();

    expect(await screen.findByText('Total trabalhado')).toBeInTheDocument();
    expect(screen.getByText('04h00')).toBeInTheDocument();
  });
});
