import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CandidaturasRH } from '../pages/CandidaturasRH';
import api from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('CandidaturasRH Component', () => {
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
        <CandidaturasRH />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders list of candidates and details correctly', async () => {
    const mockCandidaturas = [
      {
        id: '1',
        nome: 'Maria Padeira',
        email: 'maria@pao.com',
        telefone: '11999998888',
        cargoInteresse: 'Produção / Fábrica',
        mensagem: 'Olá, sou padeira há 5 anos.',
        nomeOriginalArquivo: 'cv_maria.pdf',
        dataEnvio: '2026-06-01T10:00:00Z',
        status: 'Novo',
      },
    ];
    (api.get as any).mockResolvedValue({ data: mockCandidaturas });

    renderComponent();

    expect(await screen.findByText('Maria Padeira')).toBeInTheDocument();
    expect(screen.getByText('maria@pao.com')).toBeInTheDocument();
    expect(screen.getAllByText('Produção / Fábrica')[0]).toBeInTheDocument();
  });
});
