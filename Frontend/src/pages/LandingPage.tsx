import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Lock, Mail, Eye, EyeOff, ShieldCheck,
  ChefHat, Wheat, Sprout, PlusCircle,
  MapPin, Phone, Clock, ArrowRight,
  Menu, X, Star, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LogoSalu } from '../components/LogoSalu';
import { PhysicsCanvas } from '../components/PhysicsCanvas';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(8, 'Mínimo 8 caracteres'),
});

const trocarSchema = z.object({
  novaSenha: z.string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'A senha deve conter pelo menos um caractere especial'),
  confirmarSenha: z.string().min(8, 'Confirme a nova senha')
}).refine(d => d.novaSenha === d.confirmarSenha, { message: 'Senhas não coincidem', path: ['confirmarSenha'] });

const passwordRequirements = [
  { label: 'Mínimo 8 caracteres', test: (val: string) => val.length >= 8 },
  { label: 'Letra maiúscula', test: (val: string) => /[A-Z]/.test(val) },
  { label: 'Letra minúscula', test: (val: string) => /[a-z]/.test(val) },
  { label: 'Número', test: (val: string) => /[0-9]/.test(val) },
  { label: 'Caractere especial', test: (val: string) => /[!@#$%^&*(),.?":{}|<> ]/.test(val) },
];

type LoginForm = z.infer<typeof loginSchema>;
type TrocarForm = z.infer<typeof trocarSchema>;

export function LandingPage() {
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [requireChange, setRequireChange] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);
  const [loginError, setLoginError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({ 
    resolver: zodResolver(loginSchema) 
  });
  
  const { register: rT, handleSubmit: hT, watch: wT, formState: { errors: eT, isSubmitting: isT } } = useForm<TrocarForm>({ 
    resolver: zodResolver(trocarSchema) 
  });
  
  const novaSenha = wT('novaSenha') || '';

  const finalize = (data: any) => {
    localStorage.setItem('sgpf_token', data.token);
    localStorage.setItem('sgpf_role', data.role);
    localStorage.setItem('sgpf_user_name', data.nome);
    localStorage.setItem('sgpf_user_email', data.email);
    if (data.clienteId) localStorage.setItem('sgpf_cliente_id', data.clienteId);
    if (data.funcionarioId) localStorage.setItem('sgpf_funcionario_id', data.funcionarioId);
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
      await api.post('/Auth/trocar-senha', { novaSenha: data.novaSenha }, { 
        headers: { Authorization: `Bearer ${tempToken}` } 
      });
      finalize(tempUser);
    } catch { alert('Erro ao trocar a senha.'); }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-cream font-sans text-salu-text selection:bg-ember selection:text-white">
      {/* ─── NAVBAR ─── */}
      <nav className="sticky top-0 z-[100] bg-charcoal flex items-center justify-between px-6 md:px-12 h-[62px] border-b-2 border-ember">
        <div className="flex items-center gap-3">
          <LogoSalu size={48} className="shrink-0" />
          <div className="font-serif text-cream text-[1.35rem] font-bold tracking-wider">
            Salú <span className="text-ember-light">Representação</span>
          </div>
        </div>

        {/* Desktop Links */}
        <ul className="hidden md:flex items-center gap-8 list-none">
          {['quem-somos', 'mvv', 'produtos', 'regiao', 'contato'].map((item) => (
            <li key={item}>
              <button 
                onClick={() => scrollTo(item)} 
                className="text-[#D4B89A] text-[0.78rem] font-medium tracking-[0.1em] uppercase hover:text-ember-light transition-colors"
              >
                {item.replace('-', ' ')}
              </button>
            </li>
          ))}
          <li>
            <button 
              onClick={() => setLoginOpen(true)}
              className="bg-ember hover:bg-ember-light text-charcoal px-5 py-2 rounded-md font-bold text-[0.78rem] uppercase tracking-wider transition-all"
            >
              Entrar
            </button>
          </li>
        </ul>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden text-cream"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="absolute top-[62px] left-0 right-0 bg-charcoal border-b border-ember p-6 flex flex-col gap-4 md:hidden animate-in slide-in-from-top duration-300">
            {['quem-somos', 'mvv', 'produtos', 'regiao', 'contato'].map((item) => (
              <button 
                key={item}
                onClick={() => scrollTo(item)} 
                className="text-[#D4B89A] text-left font-medium uppercase tracking-wider hover:text-ember-light"
              >
                {item.replace('-', ' ')}
              </button>
            ))}
            <button 
              onClick={() => { setLoginOpen(true); setMobileMenuOpen(false); }}
              className="bg-ember text-charcoal py-3 rounded-lg font-bold uppercase tracking-wider"
            >
              Acessar Sistema
            </button>
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section id="home" className="relative min-h-[560px] bg-dark flex items-center px-6 md:px-12 py-24 overflow-hidden">
        {/* Animated Hero Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_60%_50%_at_80%_50%,rgba(224,98,26,0.20)_0%,transparent_70%),radial-gradient(ellipse_40%_60%_at_20%_80%,rgba(192,57,10,0.15)_0%,transparent_60%)]" />
          <div className="absolute right-0 top-0 bottom-0 w-full md:w-[45%] bg-[repeating-linear-gradient(90deg,transparent,transparent_39px,rgba(212,134,11,0.05)_39px,rgba(212,134,11,0.05)_40px)]" />
        </div>

        {/* Physics-Based Kinetic Atmosphere Background (GPU Accelerated) */}
        <div className="absolute inset-0 z-[1] select-none pointer-events-auto">
          <PhysicsCanvas />
        </div>

        <div className="relative z-10 max-w-[620px]">
          <div className="inline-flex items-center gap-2 bg-ember/15 border border-ember/40 text-ember-light text-[0.72rem] font-bold tracking-[0.13em] uppercase px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-ember-light rounded-full animate-pulse shadow-[0_0_8px_rgba(244,146,85,0.8)]" />
            Distribuição em Rondônia & Amazonas
          </div>
          
          <h1 className="font-serif text-4xl md:text-6xl text-cream leading-[1.1] font-bold mb-6">
            Qualidade que sai do forno e chega até <span className="text-ember-light font-normal italic">você</span> <br />
            <strong className="block bg-gradient-to-r from-gold-light to-ember-light bg-clip-text text-transparent mt-2">
              com tradição e força
            </strong>
          </h1>

          <p className="text-[#D4B89A] text-lg mb-10 max-w-[480px] font-light leading-relaxed">
            Representamos as melhores marcas de panificação e distribuímos com agilidade, pontualidade e comprometimento por toda a região Norte.
          </p>

          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => scrollTo('produtos')}
              className="bg-gradient-to-br from-fire to-ember text-white px-8 py-4 rounded-lg font-bold text-[0.88rem] tracking-wider shadow-[0_4px_20px_rgba(192,57,10,0.4)] hover:-translate-y-0.5 transition-all"
            >
              Conheça os Produtos
            </button>
            <button 
              onClick={() => scrollTo('contato')}
              className="border-[1.5px] border-gold-light/50 text-gold-light px-8 py-4 rounded-lg font-medium text-[0.88rem] tracking-wider hover:bg-gold-light/5 transition-all"
            >
              Fale Conosco
            </button>
          </div>
        </div>
      </section>

      {/* ─── COVERAGE BANNER ─── */}
      <div className="bg-gradient-to-r from-fire-deep via-fire to-ember py-4 px-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 animate-in fade-in duration-1000">
          <div className="flex items-center gap-3 text-[#FFE8D0] text-[0.82rem] font-bold uppercase tracking-wider">
            <Star size={14} className="text-gold-light" /> Todo o Estado de Rondônia
          </div>
          <div className="hidden md:block text-[#FFE8D0]/30 text-xl">|</div>
          <div className="flex items-center gap-3 text-[#FFE8D0] text-[0.82rem] font-bold uppercase tracking-wider">
            <Star size={14} className="text-gold-light" /> Parcialmente o Estado do Amazonas
          </div>
          <div className="hidden md:block text-[#FFE8D0]/30 text-xl">|</div>
          <div className="flex items-center gap-3 text-[#FFE8D0] text-[0.82rem] font-bold uppercase tracking-wider">
            <Star size={14} className="text-gold-light" /> Entrega pontual e garantida
          </div>
        </div>
      </div>

      {/* ─── QUEM SOMOS ─── */}
      <section id="quem-somos" className="bg-warm py-24 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          <div className="text-[0.7rem] font-bold tracking-[0.16em] uppercase text-ember mb-2">Quem Somos</div>
          <h2 className="font-serif text-3xl md:text-[2.8rem] text-dark leading-[1.15] mb-8 font-bold">
            Uma empresa que conecta qualidade ao varejo regional
          </h2>
          
          <div className="grid md:grid-cols-[3fr_2fr] gap-12 md:gap-16 items-center mt-10">
            <div className="space-y-4 text-mid text-[0.97rem] leading-relaxed">
              <p>A <strong>Salú Representação Ltda</strong> atua como representante comercial de produtos de panificação de alta qualidade, conectando indústrias selecionadas ao varejo de Rondônia e Amazonas com eficiência e confiança.</p>
              <p>Desde supermercados a padarias e mercearias, levamos uma linha completa de pães — de forma, integral, centeio, polvilho e mais — garantindo frescor e variedade para cada tipo de cliente e consumidor.</p>
              <p>Nossa equipe conhece profundamente o mercado local e atua de forma consultiva, construindo parcerias sólidas e duradouras com cada cliente atendido.</p>
            </div>
            
            <div className="flex flex-col gap-1">
              {[
                { n: '2 Estados', d: 'Rondônia e Amazonas cobertos' },
                { n: '7+ Linhas', d: 'de produtos representados' },
                { n: '100%', d: 'foco em qualidade e pontualidade' }
              ].map((stat, i) => (
                <div key={i} className={`bg-dark border-l-4 border-ember p-6 ${i === 0 ? 'rounded-t-xl' : ''} ${i === 2 ? 'rounded-b-xl' : ''} hover:border-gold-light transition-colors group`}>
                  <div className="font-serif text-3xl text-ember-light font-bold leading-none mb-1 group-hover:scale-105 transition-transform origin-left">{stat.n}</div>
                  <div className="text-[#B8906A] text-[0.8rem] font-normal uppercase tracking-wider">{stat.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── MVV ─── */}
      <section id="mvv" className="bg-charcoal py-24 px-6 md:px-12 text-cream">
        <div className="max-w-[900px] mx-auto">
          <div className="text-[0.7rem] font-bold tracking-[0.16em] uppercase text-ember-light mb-2">Nossa Essência</div>
          <h2 className="font-serif text-3xl md:text-5xl text-cream leading-tight mb-12 font-bold">Missão, Visão e Valores</h2>
          
          <div className="grid md:grid-cols-3 gap-px bg-ember/20 border border-ember/20 rounded-2xl overflow-hidden mt-10">
            {[
              { num: '01', tag: 'Missão', title: 'Por que existimos', desc: 'Representar com excelência marcas de panificação de qualidade, conectando indústria e varejo em Rondônia e Amazonas com agilidade, honestidade e dedicação — gerando valor real para cada parceiro.' },
              { num: '02', tag: 'Visão', title: 'Para onde vamos', desc: 'Ser reconhecida como a principal representação comercial de panificação da região Norte, referência em atendimento, cobertura de mercado e relacionamento de longo prazo com clientes e fornecedores.' },
              { num: '03', tag: 'Valores', title: 'Como agimos', desc: <> <strong className="text-ember-light">Honestidade</strong> — transparência em cada negociação.<br /><strong className="text-ember-light">Qualidade</strong> — só representamos o que acreditamos.<br /><strong className="text-ember-light">Comprometimento</strong> — cumprimos o que prometemos.<br /><strong className="text-ember-light">Parceria</strong> — crescemos juntos.</> }
            ].map((item, i) => (
              <div key={i} className="bg-dark p-10 hover:bg-[#2E1500] transition-all group">
                <div className="font-serif text-[3.5rem] text-ember/20 font-bold leading-none mb-2 group-hover:text-ember/30 transition-colors">{item.num}</div>
                <div className="inline-block bg-ember/15 border border-ember/30 text-ember-light text-[0.68rem] font-bold tracking-widest uppercase px-3 py-1 rounded mb-4">{item.tag}</div>
                <h3 className="font-serif text-xl text-ember-light font-semibold mb-4">{item.title}</h3>
                <div className="text-[#B8906A] text-[0.88rem] leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRODUTOS ─── */}
      <section id="produtos" className="bg-warm py-24 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          <div className="text-[0.7rem] font-bold tracking-[0.16em] uppercase text-ember mb-2">Portfólio</div>
          <h2 className="font-serif text-3xl md:text-5xl text-dark mb-12 font-bold">Nossos Produtos</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mt-10">
            {[
              { icon: ChefHat, name: 'Pão de Forma Comum', pill: 'Clássico' },
              { icon: Wheat, name: 'Pão Integral 100%', pill: 'Saudável' },
              { icon: ChefHat, name: 'Pão Integral de Forma', pill: 'Saudável' },
              { icon: Star, name: 'Pão de Centeio 100%', pill: 'Especial' },
              { icon: Sprout, name: 'Polvilho Tradicional', pill: 'Crocante' },
              { icon: PlusCircle, name: 'E muito mais...', pill: 'Consulte' }
            ].map((p, i) => (
              <div key={i} className="bg-cream border-[1.5px] border-surface rounded-2xl p-6 text-center hover:border-ember-light hover:-translate-y-1 hover:shadow-xl transition-all relative overflow-hidden group">
                <div className="flex justify-center mb-4 text-ember group-hover:scale-110 transition-transform">
                  <p.icon size={36} strokeWidth={1.5} />
                </div>
                <div className="text-dark text-[0.9rem] font-bold leading-tight mb-2">{p.name}</div>
                <span className="inline-block bg-surface text-mid text-[0.65rem] font-bold uppercase tracking-widest px-3 py-1 rounded-full">{p.pill}</span>
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-fire to-ember scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── REGIÃO ─── */}
      <section id="regiao" className="bg-dark py-24 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          <div className="text-[0.7rem] font-bold tracking-[0.16em] uppercase text-ember-light mb-2">Área de Atuação</div>
          <h2 className="font-serif text-3xl md:text-5xl text-cream mb-12 font-bold">Nossa cobertura regional</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mt-10">
            {/* Rondônia */}
            <div className="bg-gradient-to-br from-fire/25 to-ember/10 border-[1.5px] border-ember/40 rounded-2xl p-8 hover:bg-fire/20 transition-all">
              <span className="inline-block bg-ember/20 border border-ember/40 text-ember-light text-[0.68rem] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">Cobertura Total</span>
              <h3 className="font-serif text-2xl text-cream font-bold mb-2">Estado de Rondônia</h3>
              <p className="text-[#D4B89A] text-[0.88rem] mb-6">Atendemos todo o estado de Rondônia com distribuição completa, chegando em municípios de grande e pequeno porte com regularidade.</p>
              <div className="flex flex-wrap gap-2">
                {['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Cacoal', 'Vilhena'].map(c => (
                  <span key={c} className="bg-ember/15 text-ember-light text-[0.72rem] font-medium px-3 py-1 rounded-full">{c}</span>
                ))}
                <span className="bg-ember/15 text-ember-light text-[0.72rem] font-medium px-3 py-1 rounded-full italic">+ demais municípios</span>
              </div>
            </div>

            {/* Amazonas */}
            <div className="bg-white/5 border-[1.5px] border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <span className="inline-block bg-white/7 border border-white/15 text-[#B8906A] text-[0.68rem] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">Cobertura Parcial</span>
              <h3 className="font-serif text-2xl text-[#D4B89A] font-bold mb-2">Estado do Amazonas</h3>
              <p className="text-[#9B7653] text-[0.88rem] mb-6">Atuamos parcialmente no estado do Amazonas, atendendo municípios estratégicos com logística dedicada e atendimento especializado.</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/6 text-[#9B7653] text-[0.72rem] font-medium px-4 py-1.5 rounded-full border border-white/10">Consulte cidades atendidas</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CONTATO ─── */}
      <section id="contato" className="bg-warm py-24 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          <div className="text-[0.7rem] font-bold tracking-[0.16em] uppercase text-ember mb-2">Contato</div>
          <h2 className="font-serif text-3xl md:text-5xl text-dark mb-12 font-bold">Fale com nossa equipe</h2>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5 mt-10">
            {[
              { icon: MapPin, label: 'Endereço', val: 'Porto Velho, RO', sub: 'Rondônia — Brasil' },
              { icon: Phone, label: 'Telefone & WhatsApp', val: '(69) 9 0000-0000', sub: 'Seg–Sex, 8h às 18h' },
              { icon: Mail, label: 'E-mail', val: 'contato@salu.com.br', sub: 'Respondemos em até 24h' },
              { icon: Clock, label: 'Horário', val: 'Segunda a Sexta', sub: '08:00h às 18:00h' }
            ].map((card, i) => (
              <div key={i} className="bg-cream border-[1.5px] border-surface rounded-2xl p-6 hover:border-ember-light hover:-translate-y-1 transition-all">
                <div className="w-11 h-11 bg-gradient-to-br from-fire to-ember rounded-lg flex items-center justify-center text-white mb-4 shadow-lg shadow-fire/20">
                  <card.icon size={20} />
                </div>
                <div className="text-[0.72rem] font-bold tracking-widest uppercase text-muted mb-1">{card.label}</div>
                <div className="text-[0.95rem] font-bold text-dark mb-1">{card.val}</div>
                <div className="text-[0.82rem] text-muted">{card.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-charcoal py-16 px-6 md:px-12 text-center">
        <div className="font-serif text-3xl text-ember-light font-bold tracking-wider mb-2">Salú Representação Ltda</div>
        <div className="text-[#7A4820] text-sm font-light tracking-wide mb-8">Qualidade de ponta a ponta — Rondônia & Amazonas</div>
        
        <div className="flex justify-center flex-wrap gap-x-8 gap-y-4 mb-8">
          {['quem-somos', 'mvv', 'produtos', 'regiao', 'contato'].map((item) => (
            <button 
              key={item}
              onClick={() => scrollTo(item)}
              className="text-[#7A4820] text-[0.78rem] font-medium tracking-widest uppercase hover:text-ember-light transition-colors"
            >
              {item.replace('-', ' ')}
            </button>
          ))}
          <button 
            onClick={() => setLoginOpen(true)}
            className="text-[#7A4820] text-[0.78rem] font-medium tracking-widest uppercase hover:text-ember-light transition-colors"
          >
            Acessar Sistema
          </button>
        </div>

        <div className="flex justify-center gap-6 mb-10">
          {/* Social icons removed due to library compatibility issues */}
        </div>

        <hr className="border-none border-t border-ember/15 mb-6" />
        
        <p className="text-[#4A2410] text-[0.8rem] mb-1">© 2025 Salú Representação Ltda — Todos os direitos reservados</p>
        <p className="text-[#4A2410] text-[0.75rem]">CNPJ: 00.000.000/0001-00 — Porto Velho, RO</p>
      </footer>

      {/* ─── MODAL DE LOGIN (Integrated React Logic) ─── */}
      {loginOpen && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#120700]/80 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={(e) => { if (e.target === e.currentTarget) setLoginOpen(false); }}
        >
          <div 
            className="bg-dark border border-ember/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fire via-ember to-gold-light" />
            
            <button 
              onClick={() => { setLoginOpen(false); setRequireChange(false); setLoginError(''); }}
              className="absolute right-4 top-4 text-[#4A2410] hover:text-cream transition-colors p-2"
            >
              <X size={20} />
            </button>

            <div className="p-10">
              {!requireChange ? (
                <>
                  <div className="mb-8 text-center">
                    <div className="flex justify-center mb-4">
                      <LogoSalu size={80} />
                    </div>
                    <h3 className="font-serif text-3xl text-cream font-bold mb-1">Salú Representação</h3>
                    <p className="text-[#D4B89A] text-sm">Insira suas credenciais para continuar</p>
                  </div>

                  <form onSubmit={handleSubmit(onLogin)} className="space-y-5">
                    {loginError && (
                      <div className="bg-red-500/10 text-red-500 text-xs p-3 rounded-lg border border-red-500/20">{loginError}</div>
                    )}
                    
                    <div className="space-y-1.5">
                      <label htmlFor="login-email" className="block text-[0.72rem] font-bold text-[#D4B89A] tracking-widest uppercase">E-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ember-light/60 pointer-events-none" />
                        <input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com.br"
                          {...register('email')}
                          className="w-full bg-black/20 border-[1.5px] border-ember/40 rounded-lg py-3 pl-10 pr-4 text-cream text-[0.93rem] outline-none focus:border-ember transition-colors placeholder:text-[#D4B89A]/45"
                        />
                      </div>
                      {errors.email && <p className="text-red-500 text-[10px] mt-1">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="login-senha" className="block text-[0.72rem] font-bold text-[#D4B89A] tracking-widest uppercase">Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ember-light/60 pointer-events-none" />
                        <input
                          id="login-senha"
                          type={showPass ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...register('senha')}
                          className="w-full bg-black/20 border-[1.5px] border-ember/40 rounded-lg py-3 pl-10 pr-12 text-cream text-[0.93rem] outline-none focus:border-ember transition-colors placeholder:text-[#D4B89A]/45"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-ember-light/60 hover:text-ember-light transition-colors"
                        >
                          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {errors.senha && <p className="text-red-500 text-[10px] mt-1">{errors.senha.message}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-fire to-ember text-white py-4 rounded-lg font-bold text-[0.95rem] tracking-wide mt-4 shadow-[0_4px_20px_rgba(192,57,10,0.4)] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? 'Verificando...' : 'Entrar no Sistema'}
                    </button>

                    <div className="text-center pt-4 text-[0.82rem] text-[#D4B89A]">
                      <button 
                        type="button" 
                        onClick={() => alert('Por favor, entre em contato com a administração para recuperar sua senha.')}
                        className="hover:text-ember-light transition-colors font-medium underline underline-offset-4"
                      >
                        Esqueceu sua senha?
                      </button> 
                    </div>
                  </form>
                </>
              ) : (
                <form onSubmit={hT(onTrocar)} className="space-y-5">
                  <div className="mb-8">
                    <h3 className="font-serif text-3xl text-cream font-bold mb-1">Primeiro Acesso</h3>
                    <p className="text-[#D4B89A] text-sm">Crie uma senha segura para sua conta</p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="nova-senha" className="block text-[0.72rem] font-bold text-[#D4B89A] tracking-widest uppercase">Nova Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ember-light/60 pointer-events-none" />
                      <input
                        id="nova-senha"
                        type={showPass ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres"
                        {...rT('novaSenha')}
                        className="w-full bg-white/5 border-[1.5px] border-ember/20 rounded-lg py-3 pl-10 pr-12 text-cream text-[0.93rem] outline-none focus:border-ember transition-colors"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPass(!showPass)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ember-light/60 hover:text-ember-light transition-colors"
                      >
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {eT.novaSenha && <p className="text-red-500 text-[10px] mt-1">{eT.novaSenha.message}</p>}
                  </div>

                  {/* Checklist de Requisitos */}
                  <div className="bg-white/5 p-4 rounded-xl border border-ember/10 grid grid-cols-2 gap-y-2">
                    {passwordRequirements.map((req, idx) => {
                      const isMet = req.test(novaSenha);
                      return (
                        <div key={idx} className={`flex items-center gap-2 text-[11px] ${isMet ? 'text-ember-light font-bold' : 'text-[#D4B89A]/50'}`}>
                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${isMet ? 'bg-ember/20 border-ember-light' : 'border-[#D4B89A]/20'}`}>
                            {isMet && <CheckCircle2 size={10} />}
                          </div>
                          {req.label}
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="confirmar-senha" className="block text-[0.72rem] font-bold text-[#D4B89A] tracking-widest uppercase">Confirmar Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ember-light/60 pointer-events-none" />
                      <input
                        id="confirmar-senha"
                        type={showPass ? 'text' : 'password'}
                        placeholder="Repita a nova senha"
                        {...rT('confirmarSenha')}
                        className="w-full bg-white/5 border-[1.5px] border-ember/20 rounded-lg py-3 pl-10 pr-4 text-cream text-[0.93rem] outline-none focus:border-ember transition-colors"
                      />
                    </div>
                    {eT.confirmarSenha && <p className="text-red-500 text-[10px] mt-1">{eT.confirmarSenha.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isT}
                    className="w-full bg-gradient-to-r from-fire to-ember text-white py-4 rounded-lg font-bold text-[0.95rem] tracking-wide mt-4 shadow-lg shadow-fire/30 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
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
