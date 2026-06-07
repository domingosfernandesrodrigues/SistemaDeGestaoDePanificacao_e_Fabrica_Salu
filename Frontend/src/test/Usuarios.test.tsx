import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Usuarios from '../pages/Usuarios';
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

describe('Usuarios Component', () => {
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
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    localStorage.setItem('sgpf_role', 'Admin');
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <Usuarios />
      </QueryClientProvider>
    );

  it('renders loading spinner initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders users list and filters when API returns data', async () => {
    const mockUsuarios = [
      { id: '1', nome: 'Admin User', email: 'admin@test.com', role: 'Admin', ativo: true },
      { id: '2', nome: 'Operator User', email: 'op@test.com', role: 'Operador', ativo: false },
    ];
    const mockClientes = [
      { id: '10', nomeFantasia: 'Cliente X' }
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/Usuarios') return Promise.resolve({ data: mockUsuarios });
      if (url === '/Clientes') return Promise.resolve({ data: mockClientes });
      return Promise.resolve({ data: [] });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    expect(screen.getByText('Operator User')).toBeInTheDocument();
    expect(screen.getByText('Controle de Usuários')).toBeInTheDocument();

    // Check status renders correctly
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });

  it('filters users by name and profile type', async () => {
    const mockUsuarios = [
      { id: '1', nome: 'Carlos Silva', email: 'carlos@test.com', role: 'Admin', ativo: true },
      { id: '2', nome: 'Ana Souza', email: 'ana@test.com', role: 'Operador', ativo: true },
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/Usuarios') return Promise.resolve({ data: mockUsuarios });
      if (url === '/Clientes') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
    });
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();

    // Filter by name
    const searchInput = screen.getByPlaceholderText('Buscar por nome...');
    fireEvent.change(searchInput, { target: { value: 'Carlos' } });

    expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();

    // Clear filters
    const clearBtn = screen.getByText('Limpar Filtros');
    fireEvent.click(clearBtn);

    expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
  });

  it('triggers toggle-status mutation when Power button is clicked', async () => {
    const mockUsuarios = [
      { id: '1', nome: 'Carlos Silva', email: 'carlos@test.com', role: 'Admin', ativo: true },
    ];
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/Usuarios') return Promise.resolve({ data: mockUsuarios });
      return Promise.resolve({ data: [] });
    });
    (api.post as any).mockResolvedValue({ data: {} });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
    });

    const powerBtn = screen.getByTitle('Inativar Usuário');
    fireEvent.click(powerBtn);

    expect(window.confirm).toHaveBeenCalledWith('Deseja inativar este usuário?');
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/Usuarios/1/toggle-status');
    });
  });

  it('triggers reset-password mutation when KeyRound button is clicked', async () => {
    const mockUsuarios = [
      { id: '1', nome: 'Carlos Silva', email: 'carlos@test.com', role: 'Admin', ativo: true },
    ];
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/Usuarios') return Promise.resolve({ data: mockUsuarios });
      return Promise.resolve({ data: [] });
    });
    (api.post as any).mockResolvedValue({ data: {} });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
    });

    const resetBtn = screen.getByTitle('Resetar Senha');
    fireEvent.click(resetBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/Usuarios/1/reset-password');
    });
  });

  it('triggers delete mutation when Trash button is clicked', async () => {
    const mockUsuarios = [
      { id: '1', nome: 'Carlos Silva', email: 'carlos@test.com', role: 'Admin', ativo: true },
    ];
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/Usuarios') return Promise.resolve({ data: mockUsuarios });
      return Promise.resolve({ data: [] });
    });
    (api.delete as any).mockResolvedValue({ data: {} });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle('Excluir');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith('Excluir usuário permanentemente?');
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/Usuarios/1');
    });
  });

  it('submits form to create a new user', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/Usuarios') return Promise.resolve({ data: [] });
      if (url === '/Clientes') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    (api.post as any).mockResolvedValue({ data: { id: 'new-id' } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Novo Usuário')).toBeInTheDocument();
    });

    // Open Modal
    const newBtn = screen.getByRole('button', { name: /novo usuário/i });
    fireEvent.click(newBtn);

    // Fill Form using name attributes
    const nameInput = document.querySelector('input[name="nome"]') as HTMLInputElement;
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
    const roleSelect = document.querySelector('select[name="role"]') as HTMLSelectElement;

    fireEvent.change(nameInput, { target: { value: 'Novo Admin' } });
    fireEvent.change(emailInput, { target: { value: 'newadmin@test.com' } });
    fireEvent.change(roleSelect, { target: { value: 'Admin' } });

    const saveBtn = screen.getByRole('button', { name: /salvar/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/Usuarios', expect.objectContaining({
        nome: 'Novo Admin',
        email: 'newadmin@test.com',
        role: 'Admin',
        ativo: true
      }));
    });
  });
});
