import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfiguracoesEmpresa } from '../pages/ConfiguracoesEmpresa';
import { empresaService } from '../services/empresaService';

// Mock empresaService
vi.mock('../services/empresaService', () => ({
  empresaService: {
    getConfig: vi.fn(),
    saveConfig: vi.fn(),
    clearCache: vi.fn(),
  },
}));

describe('ConfiguracoesEmpresa Component', () => {
  let queryClient: QueryClient;

  const mockGeolocation = {
    watchPosition: vi.fn((success) => {
      // Simulate successful high-accuracy location response
      setTimeout(() => {
        success({
          coords: {
            latitude: -8.760759,
            longitude: -63.903931,
            accuracy: 10,
          },
        });
      }, 50);
      return 1;
    }),
    clearWatch: vi.fn(),
  };

  const mockFetch = vi.fn((url: string) => {
    if (url.includes('viacep.com.br')) {
      return Promise.resolve({
        json: () => Promise.resolve({
          logradouro: 'Rua de Teste',
          bairro: 'Bairro de Teste',
          localidade: 'Cidade de Teste',
          uf: 'TS',
          erro: false
        })
      });
    }
    if (url.includes('nominatim.openstreetmap.org')) {
      return Promise.resolve({
        json: () => Promise.resolve([
          {
            lat: '-8.760759',
            lon: '-63.903931',
            display_name: 'Local de Teste, Rondônia, Brasil'
          }
        ])
      });
    }
    return Promise.reject(new Error('Unknown URL'));
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: mockGeolocation,
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ConfiguracoesEmpresa />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (empresaService.getConfig as any).mockReturnValue(new Promise(() => {}));
    const { container } = renderComponent();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('loads configuration data and populates form fields', async () => {
    const mockConfig = {
      id: 'empresa-123',
      razaoSocial: 'Padaria da Vila Ltda',
      nomeFantasia: 'Padaria da Vila',
      cnpj: '12.345.678/0001-99',
      inscricaoEstadual: '9876543210',
      telefone: '(11) 99999-9999',
      email: 'contato@padariavila.com',
      endereco: 'Rua das Flores, 100 - Centro - São Paulo - SP, CEP 01001-000',
      latitude: -23.55052,
      longitude: -46.633308
    };

    (empresaService.getConfig as any).mockResolvedValue(mockConfig);

    renderComponent();

    await waitFor(() => {
      expect(document.querySelector('input[name="razaoSocial"]')).toHaveValue('Padaria da Vila Ltda');
    });

    expect(document.querySelector('input[name="nomeFantasia"]')).toHaveValue('Padaria da Vila');
    expect(document.querySelector('input[name="cnpj"]')).toHaveValue('12.345.678/0001-99');
    expect(document.querySelector('input[name="cep"]')).toHaveValue('01001-000');
    expect(document.querySelector('input[name="logradouro"]')).toHaveValue('Rua das Flores');
    expect(document.querySelector('input[name="numero"]')).toHaveValue('100');
    expect(document.querySelector('input[name="bairro"]')).toHaveValue('Centro');
    expect(document.querySelector('input[name="cidade"]')).toHaveValue('São Paulo');
    expect(document.querySelector('input[name="estado"]')).toHaveValue('SP');
  });

  it('performs ViaCEP lookup and fills address fields when CEP is typed', async () => {
    (empresaService.getConfig as any).mockResolvedValue(null);
    renderComponent();

    await waitFor(() => {
      expect(document.querySelector('input[name="cep"]')).toBeInTheDocument();
    });

    const cepInput = document.querySelector('input[name="cep"]') as HTMLInputElement;
    fireEvent.change(cepInput, { target: { value: '12345678' } });

    await waitFor(() => {
      expect(document.querySelector('input[name="logradouro"]')).toHaveValue('Rua de Teste');
    });

    expect(document.querySelector('input[name="bairro"]')).toHaveValue('Bairro de Teste');
    expect(document.querySelector('input[name="cidade"]')).toHaveValue('Cidade de Teste');
    expect(document.querySelector('input[name="estado"]')).toHaveValue('TS');
  });

  it('performs device GPS geolocation calibration', async () => {
    (empresaService.getConfig as any).mockResolvedValue({
      razaoSocial: 'Padaria da Vila Ltda',
      nomeFantasia: 'Padaria da Vila',
      cnpj: '12.345.678/0001-99',
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('GPS do Dispositivo')).toBeInTheDocument();
    });

    const gpsBtn = screen.getByText('GPS do Dispositivo');
    fireEvent.click(gpsBtn);

    await waitFor(() => {
      expect(document.querySelector('input[name="latitude"]')).toHaveValue('-8.760759');
    });

    expect(document.querySelector('input[name="longitude"]')).toHaveValue('-63.903931');
    expect(window.confirm).toHaveBeenCalledWith(
      'Deseja definir a localização atual deste dispositivo como o endereço oficial da empresa?'
    );
  });

  it('performs reverse geocoding address lookup via Nominatim', async () => {
    (empresaService.getConfig as any).mockResolvedValue({
      razaoSocial: 'Padaria da Vila Ltda',
      nomeFantasia: 'Padaria da Vila',
      cnpj: '12.345.678/0001-99',
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Buscar por Endereço')).toBeInTheDocument();
    });

    // Fill minimum fields using name attributes
    fireEvent.change(document.querySelector('input[name="cep"]')!, { target: { value: '12345-678' } });
    fireEvent.change(document.querySelector('input[name="cidade"]')!, { target: { value: 'Porto Velho' } });
    fireEvent.change(document.querySelector('input[name="estado"]')!, { target: { value: 'RO' } });

    const searchAddressBtn = screen.getByText('Buscar por Endereço');
    fireEvent.click(searchAddressBtn);

    await waitFor(() => {
      expect(document.querySelector('input[name="latitude"]')).toHaveValue('-8.760759');
    });

    expect(document.querySelector('input[name="longitude"]')).toHaveValue('-63.903931');
  });

  it('submits corporate data changes successfully', async () => {
    const mockConfig = {
      id: 'empresa-123',
      razaoSocial: 'Padaria da Vila Ltda',
      nomeFantasia: 'Padaria da Vila',
      cnpj: '12.345.678/0001-99',
      endereco: 'Rua das Flores, 100 - Centro - São Paulo - SP, CEP 01001-000',
    };
    (empresaService.getConfig as any).mockResolvedValue(mockConfig);
    (empresaService.saveConfig as any).mockResolvedValue({ ...mockConfig, razaoSocial: 'Novo Nome S/A' });

    renderComponent();

    await waitFor(() => {
      expect(document.querySelector('input[name="razaoSocial"]')).toHaveValue('Padaria da Vila Ltda');
    });

    const nameInput = document.querySelector('input[name="razaoSocial"]') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Novo Nome S/A' } });

    const saveBtn = screen.getByRole('button', { name: /salvar dados/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(empresaService.saveConfig).toHaveBeenCalledWith(expect.objectContaining({
        razaoSocial: 'Novo Nome S/A',
      }));
    });

    expect(empresaService.clearCache).toHaveBeenCalled();
  });
});
