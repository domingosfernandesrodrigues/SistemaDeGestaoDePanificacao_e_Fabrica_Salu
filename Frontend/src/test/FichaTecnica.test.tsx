import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FichaTecnica } from '../pages/FichaTecnica';
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

describe('FichaTecnica Component', () => {
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
        <FichaTecnica />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    // Make API request hang
    (api.get as any).mockReturnValue(new Promise(() => {}));

    renderComponent();

    // Verify loading indicator is present
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders recipe list successfully when API returns data', async () => {
    const mockFichas = [
      {
        id: 'f1',
        produtoId: 'p1',
        rendimentoPadrao: 10,
        produto: { id: 'p1', nome: 'Pão Francês', unidadeMedida: 'Kg' },
        insumos: [
          {
            id: 'i1',
            insumoId: 'm1',
            quantidadeNecessaria: 5,
            perdaPercentual: 0,
            insumo: { id: 'm1', nome: 'Farinha de Trigo', precoCusto: 2.00, unidadeMedida: 'Kg' }
          }
        ]
      }
    ];

    const mockProducts = [
      { id: 'p1', nome: 'Pão Francês', tipo: 1, unidadeMedida: 'Kg' },
      { id: 'm1', nome: 'Farinha de Trigo', tipo: 0, unidadeMedida: 'Kg' }
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('fichas-tecnicas')) {
        return Promise.resolve({ data: mockFichas });
      }
      if (url.includes('Produtos')) {
        return Promise.resolve({ data: mockProducts });
      }
      return Promise.resolve({ data: [] });
    });

    renderComponent();

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Pão Francês')).toBeInTheDocument();
    });

    expect(screen.getByText('Farinha de Trigo')).toBeInTheDocument();
    expect(screen.getByText('5 Kg')).toBeInTheDocument();
    expect(screen.getByText('R$ 10,00')).toBeInTheDocument(); // Custo total calculated: 5kg * R$2.00 = R$10.00
  });

  it('opens and closes the recipe creation modal', async () => {
    (api.get as any).mockResolvedValue({ data: [] });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Nova Receita')).toBeInTheDocument();
    });

    const newRecipeButton = screen.getByText('Nova Receita');
    fireEvent.click(newRecipeButton);

    // Modal title should be in the document
    expect(screen.getByText('Nova Ficha Técnica')).toBeInTheDocument();

    // Click close button inside the modal
    const closeBtn = document.querySelector('.lucide-x')?.parentElement;
    expect(closeBtn).toBeInTheDocument();
    if (closeBtn) {
      fireEvent.click(closeBtn);
      await waitFor(() => {
        expect(screen.queryByText('Nova Ficha Técnica')).not.toBeInTheDocument();
      });
    }
  });
});
