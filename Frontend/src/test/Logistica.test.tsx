import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Frota, Trocas } from '../pages/Logistica';
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

describe('Logistica - Frota & Trocas Components', () => {
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

  describe('Frota Component', () => {
    const renderFrota = () =>
      render(
        <QueryClientProvider client={queryClient}>
          <Frota />
        </QueryClientProvider>
      );

    it('renders loading spinner initially', async () => {
      (api.get as any).mockReturnValue(new Promise(() => {}));
      renderFrota();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('renders fleet list when API returns data', async () => {
      const mockVeiculos = [
        { id: '1', modelo: 'Van de Carga', placa: 'AAA1234', quilometragemAtual: 5000, ativo: true }
      ];
      (api.get as any).mockImplementation((url: string) => {
        if (url.includes('/veiculos')) return Promise.resolve({ data: mockVeiculos });
        return Promise.resolve({ data: [] });
      });

      renderFrota();

      await waitFor(() => {
        expect(screen.getByText('Van de Carga')).toBeInTheDocument();
      });

      expect(screen.getByText('AAA1234')).toBeInTheDocument();
      expect(screen.getByText('Controle de Frota')).toBeInTheDocument();
    });
  });

  describe('Trocas Component', () => {
    const renderTrocas = () =>
      render(
        <QueryClientProvider client={queryClient}>
          <Trocas />
        </QueryClientProvider>
      );

    it('renders loading spinner initially', async () => {
      (api.get as any).mockReturnValue(new Promise(() => {}));
      renderTrocas();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('renders exchanges list when API returns data', async () => {
      const mockTrocas = [
        { id: '1', clienteId: 'c1', produtoId: 'p1', quantidade: 5, dataTroca: '2026-06-01T12:00:00', motoristaId: 'm1', motivo: 'Avaria' }
      ];
      (api.get as any).mockImplementation((url: string) => {
        if (url.includes('/trocas')) return Promise.resolve({ data: mockTrocas });
        return Promise.resolve({ data: [] });
      });

      renderTrocas();

      await waitFor(() => {
        expect(screen.getByText('Logística Reversa (Trocas & Avarias)')).toBeInTheDocument();
      });
    });
  });
});
