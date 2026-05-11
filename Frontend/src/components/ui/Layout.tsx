import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Package, ChefHat, Factory, LayoutDashboard, LogOut, Clock, FileText, ShoppingCart, Truck, ArrowRightLeft, Users, Menu, X, KeyRound, Loader2, Save, Lock, Eye, EyeOff, FlaskConical, Wallet } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../services/api';
import { empresaService } from '../../services/empresaService';

const trocarSenhaSchema = z.object({
  novaSenha: z.string()
    .min(8, 'A nova senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'A senha deve conter pelo menos um caractere especial'),
  confirmarSenha: z.string().min(8, 'Confirme a nova senha')
}).refine(data => data.novaSenha === data.confirmarSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"],
});

type TrocarSenhaForm = z.infer<typeof trocarSenhaSchema>;

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userName = localStorage.getItem('sgpf_user_name') || 'Usuário';
  const userEmail = localStorage.getItem('sgpf_user_email') || '';
  const userRole = localStorage.getItem('sgpf_role') || '';

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState<string>('');

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    empresaService.getConfig().then(config => {
      if (config && config.nomeFantasia) {
        setNomeEmpresa(config.nomeFantasia);
      }
    }).catch(err => console.error('Erro ao buscar nome da empresa', err));
  }, []);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<TrocarSenhaForm>({
    resolver: zodResolver(trocarSenhaSchema)
  });

  const novaSenha = watch('novaSenha') || '';

  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', test: (val: string) => val.length >= 8 },
    { label: 'Letra maiúscula', test: (val: string) => /[A-Z]/.test(val) },
    { label: 'Letra minúscula', test: (val: string) => /[a-z]/.test(val) },
    { label: 'Número', test: (val: string) => /[0-9]/.test(val) },
    { label: 'Caractere especial', test: (val: string) => /[!@#$%^&*(),.?":{}|<> ]/.test(val) },
  ];

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'Gestor', 'Operador'] },
    { name: 'Portal do Cliente', path: '/portal-cliente', icon: ShoppingCart, roles: ['Cliente'] },
    { name: 'CRM & Reuniões', path: '/crm', icon: Users, roles: ['Admin', 'Gestor'] },
    { name: 'Vendas (B2B)', path: '/vendas', icon: ShoppingCart, roles: ['Admin', 'Gestor', 'Cliente'] },
    { name: 'Compras e Entradas', path: '/compras', icon: Package, roles: ['Admin', 'Gestor'] },
    { name: 'Entrada de Insumos', path: '/entrada-insumos', icon: FlaskConical, roles: ['Admin', 'Gestor'] },
    { name: 'Gestão de Clientes', path: '/clientes', icon: Users, roles: ['Admin', 'Gestor'] },
    { name: 'Ordens de Produção', path: '/ordens-producao', icon: Factory, roles: ['Admin', 'Gestor', 'Operador'] },
    { name: 'Produtos e Insumos', path: '/produtos', icon: Package, roles: ['Admin', 'Gestor', 'Operador'] },
    { name: 'Fichas Técnicas (BOM)', path: '/fichas-tecnicas', icon: ChefHat, roles: ['Admin', 'Gestor', 'Operador'] },
    { name: 'Fornecedores', path: '/fornecedores', icon: Truck, roles: ['Admin', 'Gestor'] },
    { name: 'Gestão de Frota', path: '/frota', icon: Truck, roles: ['Admin', 'Gestor', 'Operador'] },
    { name: 'Trocas e Avarias', path: '/trocas', icon: ArrowRightLeft, roles: ['Admin', 'Gestor', 'Operador'] },
    { name: 'Controle de Ponto', path: '/rh/ponto', icon: Clock, roles: ['Admin', 'Gestor', 'Operador'] },
    { name: 'Afastamentos (RH)', path: '/rh/afastamentos', icon: FileText, roles: ['Admin', 'Gestor'] },
    { name: 'Funcionários (RH)', path: '/rh/funcionarios', icon: Users, roles: ['Admin', 'Gestor'] },
    { name: 'Folha de Pagamento', path: '/rh/folha', icon: FileText, roles: ['Admin', 'Gestor'] },
    { name: 'Meus Contracheques', path: '/rh/meus-contracheques', icon: FileText, roles: ['Admin', 'Gestor', 'Operador', 'Funcionario'] },
    { name: 'Despesas Gerais', path: '/financeiro/despesas', icon: FileText, roles: ['Admin', 'Gestor'] },
    { name: 'Contas e Saldos', path: '/financeiro/contas', icon: Wallet, roles: ['Admin', 'Gestor'] },
    { name: 'Usuários do Sistema', path: '/usuarios', icon: Users, roles: ['Admin', 'Gestor'] },
    { name: 'Dados da Empresa', path: '/configuracoes/empresa', icon: Factory, roles: ['Admin', 'Gestor'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  const closeMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.clear();
    navigate('/');
  };

  const onSubmitTrocarSenha = async (data: TrocarSenhaForm) => {
    try {
      await api.post('/Auth/trocar-senha', { novaSenha: data.novaSenha });
      alert('Senha alterada com sucesso!');
      setIsPasswordModalOpen(false);
      reset();
    } catch (error: any) {
      console.error('Trocar Senha Error:', error);
      alert('Erro ao trocar a senha. Tente novamente.');
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header - Optimized for Safe Areas */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 text-lg font-bold">
          <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-inner">S</div>
          <span className="tracking-tight">SGP-F</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 hover:bg-slate-800 rounded-full active:scale-90 transition-all"
          aria-label="Menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar / Overlay Menu - Modern Side Drawer Pattern */}
      <div className={`
        fixed inset-y-0 left-0 z-[60] w-[280px] sm:w-[320px] md:relative md:flex md:w-64 bg-slate-900 text-white flex-col transition-transform duration-300 ease-out shadow-2xl md:shadow-none
        ${isMobileMenuOpen ? 'flex translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Branding Area */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 text-xl font-bold">
            <div className="bg-blue-600 text-white w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">S</div>
            <div className="flex flex-col">
              <span className="leading-tight">SGP-Fábrica</span>
              {nomeEmpresa && (
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[160px] uppercase tracking-widest mt-0.5" title={nomeEmpresa}>
                  {nomeEmpresa}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* User Profile Info - Visible on both Mobile & Desktop Sidebar */}
        <div className="px-6 py-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-blue-400 font-bold border border-white/10 shadow-lg">
              {userName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate leading-none mb-1.5">{userName}</p>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-bold uppercase tracking-widest rounded border border-blue-500/20">
                  {userRole}
                </span>
              </div>
              {/* Email visible on mobile menu for context */}
              <p className="text-[10px] text-slate-500 truncate mt-1.5 md:hidden">{userEmail}</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMenu}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-[1.02]' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400 transition-colors'} />
                <span className="text-[15px] md:text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-xl space-y-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button onClick={() => { closeMenu(); setIsPasswordModalOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <KeyRound size={20} />
            <span>Alterar Senha</span>
          </button>
          <a href="#" onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut size={20} />
            <span>Sair</span>
          </a>
        </div>
      </div>

      {/* Backdrop for mobile - Glassmorphism effect */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[50] md:hidden transition-opacity duration-300 animate-in fade-in" 
          onClick={closeMenu}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 hidden md:flex items-center justify-between px-8 shadow-sm shrink-0">
          <h1 className="text-xl font-semibold text-slate-800">
            {navItems.find(i => location.pathname.startsWith(i.path))?.name || 'Sistema'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">{userName}</p>
              <p className="text-xs text-slate-500">{userEmail}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-blue-600 font-bold border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => setIsPasswordModalOpen(true)}>
              {userName.charAt(0)}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 pb-safe">
          {/* Header page indicator for mobile */}
          <div className="md:hidden mb-4">
            <h1 className="text-xl font-bold text-slate-800">
              {navItems.find(i => location.pathname.startsWith(i.path))?.name || 'Sistema'}
            </h1>
            <div className="h-1 w-12 bg-blue-600 rounded-full mt-1" />
          </div>
          <Outlet />
        </main>
      </div>

      <Modal isOpen={isPasswordModalOpen} onClose={() => { setIsPasswordModalOpen(false); reset(); }} title="Alterar Senha">
        <form onSubmit={handleSubmit(onSubmitTrocarSenha)} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-[34px] h-4 w-4 text-slate-400" />
            <Input
              label="Nova Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              className="pl-9 pr-10"
              {...register('novaSenha')}
              error={errors.novaSenha?.message}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Checklist de Requisitos em Tempo Real */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 grid grid-cols-2 gap-2">
            {passwordRequirements.map((req, idx) => {
              const isMet = req.test(novaSenha);
              return (
                <div key={idx} className={`flex items-center gap-2 text-[10px] ${isMet ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <div className={`w-3 h-3 rounded-full flex items-center justify-center ${isMet ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                    {isMet ? '✓' : ''}
                  </div>
                  {req.label}
                </div>
              );
            })}
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-[34px] h-4 w-4 text-slate-400" />
            <Input
              label="Confirme a Nova Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repita a senha"
              className="pl-9 pr-10"
              {...register('confirmarSenha')}
              error={errors.confirmarSenha?.message}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => { setIsPasswordModalOpen(false); reset(); }}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white flex justify-center gap-2" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar Nova Senha
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
