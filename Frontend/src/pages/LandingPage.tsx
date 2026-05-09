import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Lock, Mail, Eye, EyeOff, ShieldCheck,
  ChefHat, BarChart3, Users, Package, Truck,
  ClipboardList, DollarSign, Phone, MapPin, Menu, X,
  ArrowRight, CheckCircle, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
});
const trocarSchema = z.object({
  novaSenha: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[!@#$%^&*(),.?":{}|<>]/),
  confirmarSenha: z.string().min(8)
}).refine(d => d.novaSenha === d.confirmarSenha, { message: 'Senhas não coincidem', path: ['confirmarSenha'] });

type LoginForm = z.infer<typeof loginSchema>;
type TrocarForm = z.infer<typeof trocarSchema>;

const features = [
  { icon: BarChart3, title: 'Dashboard Executivo', desc: 'KPIs em tempo real, DRE automático e análise de rentabilidade por produto.', color: 'bg-blue-500' },
  { icon: ClipboardList, title: 'Gestão de Vendas', desc: 'Kanban de pedidos, documentos de pagamento (Pix/Boleto) e portal B2B.', color: 'bg-emerald-500' },
  { icon: Package, title: 'Controle de Estoque', desc: 'Rastreabilidade completa, ordens de produção e ficha técnica de receitas.', color: 'bg-amber-500' },
  { icon: Users, title: 'Gestão de RH', desc: 'Folha de pagamento CLT, ponto eletrônico e controle de afastamentos.', color: 'bg-rose-500' },
  { icon: Truck, title: 'Logística e Frota', desc: 'Rastreamento de entregas, manutenção de veículos e gestão de trocas/avarias.', color: 'bg-indigo-500' },
  { icon: DollarSign, title: 'Financeiro Completo', desc: 'Contas a pagar/receber, conciliação bancária automática e fluxo de caixa.', color: 'bg-teal-500' },
];

const stats = [
  { value: '100%', label: 'Digital e na Nuvem' },
  { value: '6+', label: 'Módulos Integrados' },
  { value: '24/7', label: 'Disponibilidade' },
  { value: '0', label: 'Papelada' },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [requireChange, setRequireChange] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);
  const [loginError, setLoginError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const { register: rT, handleSubmit: hT, formState: { errors: eT, isSubmitting: isT } } = useForm<TrocarForm>({ resolver: zodResolver(trocarSchema) });

  const finalize = (data: any) => {
    localStorage.setItem('sgpf_token', data.token);
    localStorage.setItem('sgpf_role', data.role);
    localStorage.setItem('sgpf_user_name', data.nome);
    localStorage.setItem('sgpf_user_email', data.email);
    if (data.clienteId) localStorage.setItem('sgpf_cliente_id', data.clienteId);
    navigate('/dashboard');
  };

  const onLogin = async (data: LoginForm) => {
    setLoginError('');
    try {
      const res = await api.post('/Auth/login', data);
      if (res.data.precisaTrocarSenha) {
        setTempToken(res.data.token);
        setTempUser(res.data);
        setRequireChange(true);
        return;
      }
      finalize(res.data);
    } catch (e: any) {
      setLoginError(e.response?.data?.message || 'Credenciais inválidas. Tente novamente.');
    }
  };

  const onTrocar = async (data: TrocarForm) => {
    try {
      await api.post('/Auth/trocar-senha', { novaSenha: data.novaSenha }, { headers: { Authorization: `Bearer ${tempToken}` } });
      finalize(tempUser);
    } catch { alert('Erro ao trocar a senha.'); }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-amber-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 p-2 rounded-xl">
              <ChefHat size={22} className="text-white" />
            </div>
            <span className="text-xl font-black text-slate-800">SGP<span className="text-amber-500">-F</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button onClick={() => scrollTo('sobre')} className="hover:text-amber-600 transition-colors">Quem Somos</button>
            <button onClick={() => scrollTo('funcionalidades')} className="hover:text-amber-600 transition-colors">Funcionalidades</button>
            <button onClick={() => scrollTo('contato')} className="hover:text-amber-600 transition-colors">Contato</button>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setLoginOpen(true)}
              className="px-5 py-2 text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all"
            >
              Acessar Sistema
            </button>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 flex flex-col gap-4">
            <button onClick={() => scrollTo('sobre')} className="text-left text-slate-700 font-medium">Quem Somos</button>
            <button onClick={() => scrollTo('funcionalidades')} className="text-left text-slate-700 font-medium">Funcionalidades</button>
            <button onClick={() => scrollTo('contato')} className="text-left text-slate-700 font-medium">Contato</button>
            <button onClick={() => { setLoginOpen(true); setMobileOpen(false); }} className="bg-amber-500 text-white py-3 rounded-xl font-bold">
              Acessar Sistema
            </button>
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-stone-900 to-amber-950" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, #f59e0b 0%, transparent 60%), radial-gradient(circle at 75% 20%, #d97706 0%, transparent 50%)' }} />

        {/* floating bakery elements */}
        <div className="absolute top-24 right-10 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-orange-400/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 text-xs font-bold px-4 py-2 rounded-full mb-6 border border-amber-500/30">
              <Star size={12} /> Sistema de Gestão para Panificação e Fábricas
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
              Gerencie sua<br />
              <span className="text-amber-400">Padaria</span> com<br />
              inteligência
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed mb-8 max-w-md">
              O SGP-F é o ERP completo para panificadoras e fábricas de alimentos. Controle produção, vendas, estoque, RH e financeiro em um só lugar.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setLoginOpen(true)}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-amber-500/30 hover:shadow-amber-400/40 hover:-translate-y-0.5"
              >
                Acessar o Sistema <ArrowRight size={18} />
              </button>
              <button
                onClick={() => scrollTo('funcionalidades')}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-2xl transition-all border border-white/20"
              >
                Ver Funcionalidades
              </button>
            </div>
          </div>

          {/* Stats card */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-6 text-center hover:bg-white/15 transition-all">
                <p className="text-4xl font-black text-amber-400 mb-1">{s.value}</p>
                <p className="text-slate-300 text-sm font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── QUEM SOMOS ─── */}
      <section id="sobre" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-amber-600 font-bold text-sm uppercase tracking-widest">Quem Somos</span>
              <h2 className="text-4xl font-black text-slate-800 mt-3 mb-6 leading-tight">
                Nascemos para<br /><span className="text-amber-500">digitalizar</span> a padaria brasileira
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-6">
                O <strong>SGP-F (Sistema de Gestão para Panificação e Fábrica)</strong> foi desenvolvido 
                especificamente para os desafios únicos do setor de panificação. Sabemos que gerir 
                uma padaria vai muito além de assar pão — envolve logística, RH, finanças e muito mais.
              </p>
              <p className="text-slate-500 leading-relaxed mb-8">
                Nossa missão é simplificar toda a operação para que o dono de padaria possa focar 
                no que faz de melhor: produzir produtos de qualidade para seus clientes.
              </p>
              <div className="space-y-3">
                {['Desenvolvimento focado no setor alimentício', 'Suporte técnico especializado', 'Atualizações constantes e sem custo adicional', 'Dados seguros e sempre disponíveis'].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                    <span className="text-slate-600 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-4 -left-4 w-full h-full bg-amber-100 rounded-3xl" />
              <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-10 text-white shadow-2xl">
                <ChefHat size={48} className="mb-6 opacity-80" />
                <h3 className="text-2xl font-black mb-4">Nossa Visão</h3>
                <p className="text-amber-100 leading-relaxed text-lg">
                  "Ser o sistema de gestão mais completo e acessível para panificadoras, transformando 
                  operações tradicionais em negócios modernos, eficientes e lucrativos."
                </p>
                <div className="mt-8 pt-8 border-t border-amber-400/40 grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-3xl font-black">100%</p><p className="text-amber-200 text-xs">Web</p></div>
                  <div><p className="text-3xl font-black">24/7</p><p className="text-amber-200 text-xs">Online</p></div>
                  <div><p className="text-3xl font-black">∞</p><p className="text-amber-200 text-xs">Usuários</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FUNCIONALIDADES ─── */}
      <section id="funcionalidades" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-amber-600 font-bold text-sm uppercase tracking-widest">Plataforma Completa</span>
            <h2 className="text-4xl font-black text-slate-800 mt-3 mb-4">Tudo que sua padaria precisa</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Módulos integrados que se comunicam entre si, eliminando retrabalho e proporcionando visão 360° do negócio.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all group">
                <div className={`${f.color} p-3 rounded-xl w-fit mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                  <f.icon size={22} className="text-white" />
                </div>
                <h3 className="text-slate-800 font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-black text-white mb-4">Pronto para modernizar sua padaria?</h2>
          <p className="text-amber-100 text-lg mb-8">Acesse agora e comece a transformar a gestão do seu negócio hoje mesmo.</p>
          <button
            onClick={() => setLoginOpen(true)}
            className="inline-flex items-center gap-3 bg-white text-amber-600 font-black px-10 py-4 rounded-2xl hover:shadow-2xl hover:-translate-y-1 transition-all text-lg"
          >
            <ChefHat size={22} /> Acessar o SGP-F Agora
          </button>
        </div>
      </section>

      {/* ─── CONTATO ─── */}
      <section id="contato" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-amber-500 p-2 rounded-xl"><ChefHat size={22} className="text-white" /></div>
                <span className="text-xl font-black">SGP<span className="text-amber-400">-F</span></span>
              </div>
              <p className="text-slate-400 leading-relaxed text-sm">
                Sistema de Gestão para Panificação e Fábricas. Desenvolvido com tecnologia de ponta para o setor alimentício brasileiro.
              </p>
            </div>

            <div className="md:col-span-2 grid sm:grid-cols-2 gap-8">
              <div>
                <h4 className="font-bold text-amber-400 mb-4 uppercase text-xs tracking-widest">Módulos do Sistema</h4>
                <ul className="space-y-2 text-slate-400 text-sm">
                  {['Dashboard & BI', 'Vendas & Pedidos', 'Produção & Estoque', 'Financeiro', 'RH & Folha', 'Logística & Frota'].map(m => (
                    <li key={m} className="flex items-center gap-2"><ArrowRight size={12} className="text-amber-500" />{m}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-amber-400 mb-4 uppercase text-xs tracking-widest">Contato</h4>
                <div className="space-y-3 text-slate-400 text-sm">
                  <div className="flex items-center gap-3"><Mail size={16} className="text-amber-500 shrink-0" /><span>contato@sgpf.com.br</span></div>
                  <div className="flex items-center gap-3"><Phone size={16} className="text-amber-500 shrink-0" /><span>(11) 9 0000-0000</span></div>
                  <div className="flex items-start gap-3"><MapPin size={16} className="text-amber-500 shrink-0 mt-0.5" /><span>São Paulo - SP, Brasil</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-800 text-center text-slate-500 text-xs">
            © {new Date().getFullYear()} SGP-F — Sistema de Gestão para Panificação e Fábrica. Todos os direitos reservados.
          </div>
        </div>
      </section>

      {/* ─── MODAL DE LOGIN ─── */}
      {loginOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setLoginOpen(false); setRequireChange(false); setLoginError(''); } }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            
            {/* Header do modal */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white text-center relative">
              <button onClick={() => { setLoginOpen(false); setRequireChange(false); setLoginError(''); }} className="absolute right-4 top-4 p-1 hover:bg-white/20 rounded-lg transition-all">
                <X size={20} />
              </button>
              <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3">
                {requireChange ? <ShieldCheck size={28} /> : <ChefHat size={28} />}
              </div>
              <h2 className="text-xl font-black">{requireChange ? 'Defina sua Senha' : 'Acessar SGP-F'}</h2>
              <p className="text-amber-100 text-sm mt-1">
                {requireChange ? 'Crie uma senha segura para sua conta' : 'Insira suas credenciais para continuar'}
              </p>
            </div>

            <div className="p-6">
              {!requireChange ? (
                <form onSubmit={handleSubmit(onLogin)} className="space-y-4">
                  {loginError && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">{loginError}</div>
                  )}
                  <div className="relative">
                    <Mail className="absolute left-3 top-[34px] h-4 w-4 text-slate-400" />
                    <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      {...register('email')}
                      className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-[34px] h-4 w-4 text-slate-400" />
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('senha')}
                      className="w-full h-11 pl-9 pr-10 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-[34px] text-slate-400">
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    {errors.senha && <p className="text-red-500 text-xs mt-1">{errors.senha.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    {isSubmitting ? 'Entrando...' : <><ArrowRight size={18} /> Entrar no Sistema</>}
                  </button>
                </form>
              ) : (
                <form onSubmit={hT(onTrocar)} className="space-y-4">
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-xs text-amber-800">
                    Primeiro acesso detectado. Crie uma senha segura para proteger sua conta.
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-[34px] h-4 w-4 text-slate-400" />
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nova Senha</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      {...rT('novaSenha')}
                      className="w-full h-11 pl-9 pr-10 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-[34px] text-slate-400">
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    {eT.novaSenha && <p className="text-red-500 text-xs mt-1">Senha não atende aos requisitos</p>}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-[34px] h-4 w-4 text-slate-400" />
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Confirmar Senha</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      {...rT('confirmarSenha')}
                      className="w-full h-11 pl-9 pr-10 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    {eT.confirmarSenha && <p className="text-red-500 text-xs mt-1">{eT.confirmarSenha.message}</p>}
                  </div>
                  <button
                    type="submit"
                    disabled={isT}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    {isT ? 'Salvando...' : 'Salvar Senha e Entrar'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
