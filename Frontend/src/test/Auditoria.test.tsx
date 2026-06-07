import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Auditoria } from '../pages/Auditoria';
import { auditoriaService } from '../services/auditoriaService';

// Mock auditoriaService
vi.mock('../services/auditoriaService', () => ({
  auditoriaService: {
    getLogs: vi.fn(),
    getAuditedTables: vi.fn(),
  },
}));

describe('Auditoria Component', () => {
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
        <Auditoria />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (auditoriaService.getLogs as any).mockReturnValue(new Promise(() => {}));
    (auditoriaService.getAuditedTables as any).mockResolvedValue([]);
    renderComponent();
    expect(screen.getByText('Carregando logs de auditoria...')).toBeInTheDocument();
  });

  it('renders log list when API returns data', async () => {
    const mockLogsResponse = {
      totalItems: 2,
      page: 1,
      pageSize: 12,
      totalPages: 1,
      items: [
        {
          id: '1',
          tableName: 'Produtos',
          action: 'Added',
          keyValues: '{"Id":"p1"}',
          oldValues: null,
          newValues: '{"Nome":"Pão Francês","Preco":1.50}',
          timestamp: '2026-06-06T10:00:00Z',
          userId: 'usr1',
          userName: 'Admin User',
        },
        {
          id: '2',
          tableName: 'Clientes',
          action: 'Modified',
          keyValues: '{"Id":"c1"}',
          oldValues: '{"Nome":"Cliente Antigo"}',
          newValues: '{"Nome":"Cliente Novo"}',
          timestamp: '2026-06-06T11:00:00Z',
          userId: 'usr2',
          userName: 'Manager User',
        },
      ],
    };

    (auditoriaService.getLogs as any).mockResolvedValue(mockLogsResponse);
    (auditoriaService.getAuditedTables as any).mockResolvedValue(['Produtos', 'Clientes']);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    expect(screen.getByText('Manager User')).toBeInTheDocument();
    
    // Check table name elements exist (using getAllByText because they also appear in options)
    expect(screen.getAllByText('Produtos').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Clientes').length).toBeGreaterThan(0);
    
    // Check action and id values (using getAllByText/getByText)
    expect(screen.getByText('Inclusão')).toBeInTheDocument();
    expect(screen.getByText('Alteração')).toBeInTheDocument();
    expect(screen.getByText('Id: p1')).toBeInTheDocument();
    expect(screen.getByText('Id: c1')).toBeInTheDocument();
  });

  it('filters logs by query values', async () => {
    const mockLogsResponse = {
      totalItems: 0,
      page: 1,
      pageSize: 12,
      totalPages: 1,
      items: [],
    };

    (auditoriaService.getLogs as any).mockResolvedValue(mockLogsResponse);
    (auditoriaService.getAuditedTables as any).mockResolvedValue(['Produtos']);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Filtros de Pesquisa')).toBeInTheDocument();
    });

    // Find input by placeholder
    const userField = screen.getByPlaceholderText('Nome do usuário...');
    fireEvent.change(userField, { target: { value: 'Admin' } });

    const applyBtn = screen.getByRole('button', { name: /aplicar filtros/i });
    fireEvent.click(applyBtn);

    expect(auditoriaService.getLogs).toHaveBeenCalledWith(expect.objectContaining({
      userName: 'Admin',
    }));

    // Clear filters
    const clearBtn = screen.getByRole('button', { name: /limpar filtros/i });
    fireEvent.click(clearBtn);

    expect(auditoriaService.getLogs).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 12
    });
  });

  it('opens and closes details modal showing correct diff', async () => {
    const mockLog = {
      id: '1',
      tableName: 'Produtos',
      action: 'Modified',
      keyValues: '{"Id":"p1"}',
      oldValues: '{"Nome":"Pão Antigo","Preco":1.20}',
      newValues: '{"Nome":"Pão Novo","Preco":1.50}',
      timestamp: '2026-06-06T10:00:00Z',
      userId: 'usr1',
      userName: 'Admin User',
    };

    const mockLogsResponse = {
      totalItems: 1,
      page: 1,
      pageSize: 12,
      totalPages: 1,
      items: [mockLog],
    };

    (auditoriaService.getLogs as any).mockResolvedValue(mockLogsResponse);
    (auditoriaService.getAuditedTables as any).mockResolvedValue(['Produtos']);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Ver Alterações')).toBeInTheDocument();
    });

    const viewBtn = screen.getByText('Ver Alterações');
    fireEvent.click(viewBtn);

    // Modal opens
    expect(screen.getByText('Histórico de Alterações')).toBeInTheDocument();
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Pão Antigo')).toBeInTheDocument();
    expect(screen.getByText('Pão Novo')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /fechar/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Histórico de Alterações')).not.toBeInTheDocument();
    });
  });
});
