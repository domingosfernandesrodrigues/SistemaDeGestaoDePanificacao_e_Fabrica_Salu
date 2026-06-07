import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AfastamentosRH from '../pages/AfastamentosRH';
import api from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('AfastamentosRH Component', () => {
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
        <AfastamentosRH />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders list of leaves and shows info', async () => {
    const mockAfastamentos = [
      {
        id: '1',
        nomeFuncionario: 'Maria Silva',
        motivo: 'Atestado Médico',
        dataInicio: '2026-06-01',
        dataFim: '2026-06-03',
        observacao: 'Gripe forte',
        status: 'Pendente',
        anexoNome: 'atestado.pdf',
        anexoBase64: 'data:application/pdf;base64,abc',
        dataCriacao: '2026-05-30',
      },
    ];
    (api.get as any).mockResolvedValue({ data: mockAfastamentos });

    renderComponent();

    expect(await screen.findAllByText('Maria Silva')).not.toHaveLength(0);
    expect(screen.getAllByText('Atestado Médico')[0]).toBeInTheDocument();
  });
});
