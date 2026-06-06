import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Lock, Mail, Eye, EyeOff,
  MapPin, Phone, Clock,
  Menu, X, Star, CheckCircle2, ChevronLeft, ChevronRight, ZoomIn, Upload
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LogoSalu } from '../components/LogoSalu';
import { PhysicsCanvas } from '../components/PhysicsCanvas';

// ─── Product Images ───────────────────────────────────────────────────────────
import imgPaoForma from '../assets/produtos/pao_forma.png';
import imgPaoLeite from '../assets/produtos/pao_leite.png';
import imgPaoBisnaguinha from '../assets/produtos/pao_bisnaguinha.png';
import imgPaoBatata from '../assets/produtos/pao_batata.png';
import imgPaoIntegralCastanha from '../assets/produtos/pao_integral_castanha.png';
import imgPaoIntegralLight from '../assets/produtos/pao_integral_light.png';
import imgPaoIntegralMultigraos from '../assets/produtos/pao_integral_multigraos.png';
import imgPaoIntegralPassas from '../assets/produtos/pao_integral_passas.png';
import imgPaoBolinha from '../assets/produtos/pao_bolinha.png';
import imgPaoHamburguer from '../assets/produtos/pao_hamburguer.png';
import imgPaoHotdog from '../assets/produtos/pao_hotdog.png';
import imgBiscoitoTradicional from '../assets/produtos/biscoito_tradicional.png';
import imgBiscoitoQueijo from '../assets/produtos/biscoito_queijo.png';
import imgBiscoitoAmanteigado from '../assets/produtos/biscoito_amanteigado.png';
import imgBiscoitoCebola from '../assets/produtos/biscoito_cebola.png';

// ─── Types & Schemas ──────────────────────────────────────────────────────────
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

const trabalheSchema = z.object({
  nome: z.string().min(3, 'Nome muito curto (mínimo 3 caracteres)'),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().min(10, 'Telefone inválido (mínimo 10 dígitos)'),
  cargoInteresse: z.string().min(1, 'Selecione o cargo de interesse'),
  mensagem: z.string().optional(),
});

type TrabalheForm = z.infer<typeof trabalheSchema>;

// ─── Product Data ─────────────────────────────────────────────────────────────
interface Product {
  name: string;
  weight: string;
  category: string;
  image: string;
  description: string;
}

const PRODUCTS: Product[] = [
  { name: 'Pão de Forma', weight: '450g', category: 'Pães', image: imgPaoForma, description: 'Pão de forma macio e fofinho, perfeito para o café da manhã e lanches. Casca dourada e miolo suave.' },
  { name: 'Pão de Leite', weight: '450g', category: 'Pães', image: imgPaoLeite, description: 'Enriquecido com leite para uma textura ainda mais macia e um sabor levemente adocicado.' },
  { name: 'Pão Bisnaguinha', weight: '250g', category: 'Pães', image: imgPaoBisnaguinha, description: 'Mini pãezinhos macios e deliciosos, ideais para festas, lanches e cafés.' },
  { name: 'Pão de Batata', weight: '250g', category: 'Pães', image: imgPaoBatata, description: 'Textura especial com batata incorporada à massa, resultando em um pão macio e com sabor único.' },
  { name: 'Pão Integral com Castanha', weight: '400g', category: 'Integral', image: imgPaoIntegralCastanha, description: 'Pão integral com castanhas selecionadas, rico em fibras e nutrientes para uma alimentação saudável.' },
  { name: 'Pão Integral Light', weight: '330g', category: 'Integral', image: imgPaoIntegralLight, description: 'Opção leve e saudável com baixo teor calórico, mantendo o sabor e a textura do pão integral.' },
  { name: 'Pão Integral Multigrãos', weight: '330g', category: 'Integral', image: imgPaoIntegralMultigraos, description: 'Blend especial de múltiplos grãos — linhaça, girassol, gergelim e mais — para máximo valor nutritivo.' },
  { name: 'Pão Integral com Passas', weight: '330g', category: 'Integral', image: imgPaoIntegralPassas, description: 'Pão integral com passas selecionadas, combinando o saudável do integral com um toque naturalmente doce.' },
  { name: 'Pão Bolinha', weight: '310g', category: 'Pães', image: imgPaoBolinha, description: 'Pãezinhos redondos e fofos, versáteis para acompanhar refeições ou servir como lanche.' },
  { name: 'Pão de Hambúrguer', weight: '400g', category: 'Pães', image: imgPaoHamburguer, description: 'Pão redondo macio com gergelim, desenvolvido especialmente para o hambúrguer perfeito.' },
  { name: 'Pão Hot Dog', weight: '600g', category: 'Pães', image: imgPaoHotdog, description: 'Pão alongado e macio, ideal para hot dogs e cachorros-quentes. Textura leve e saborosa.' },
  { name: 'Biscoito de Polvilho Tradicional', weight: '55g', category: 'Biscoitos', image: imgBiscoitoTradicional, description: 'Biscoito de polvilho crocante e leve, feito com a receita tradicional brasileira. Irresistível!' },
  { name: 'Biscoito de Polvilho Queijo', weight: '55g', category: 'Biscoitos', image: imgBiscoitoQueijo, description: 'Biscoito de polvilho com intenso sabor de queijo, crocante e perfeito para o lanche.' },
  { name: 'Biscoito de Polvilho Amanteigado', weight: '55g', category: 'Biscoitos', image: imgBiscoitoAmanteigado, description: 'Biscoito de polvilho com toque delicado de manteiga, suave e irresistível.' },
  { name: 'Biscoito de Polvilho Cebola e Salsa', weight: '55g', category: 'Biscoitos', image: imgBiscoitoCebola, description: 'Biscoito de polvilho sabor cebola e salsa, com tempero especial para quem gosta de algo diferente.' },
];

const CATEGORIES = ['Todos', 'Pães', 'Integral', 'Biscoitos'];

const formatPhone = (value: string) => {
  if (!value) return value;
  const phoneNumber = value.replace(/\D/g, '').slice(0, 11);
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 3) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
  }
  if (phoneNumberLength < 11) {
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 6)}-${phoneNumber.slice(6)}`;
  }
  return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
};

// ─── Product Viewer Modal ─────────────────────────────────────────────────────
function ProductModal({ product, onClose, products, currentIndex, onNavigate }: {
  product: Product;
  onClose: () => void;
  products: Product[];
  currentIndex: number;
  onNavigate: (idx: number) => void;
}) {
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < products.length - 1;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, hasPrev, hasNext, onClose, onNavigate]);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start sm:items-center justify-center p-3 sm:p-6 bg-[#0A0400]/92 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-dark border border-ember/30 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl my-3 sm:my-0 overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'productModalIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-fire via-ember to-gold-light z-10" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 w-10 h-10 bg-black/40 hover:bg-ember/30 rounded-full flex items-center justify-center text-cream/60 hover:text-cream transition-all shadow-lg"
        >
          <X size={20} />
        </button>

        {/* ── Layout: coluna única no mobile, 2 colunas no md+ ── */}
        <div className="flex flex-col md:grid md:grid-cols-[1.1fr_1fr]">

          {/* ── IMAGE PANEL ── */}
          <div className="relative bg-gradient-to-br from-[#1E1000] to-[#0D0600] flex items-center justify-center p-6 sm:p-10 min-h-[260px] sm:min-h-[420px] md:min-h-[560px]">
            <img
              key={product.image}
              src={product.image}
              alt={product.name}
              className="w-full max-h-[240px] sm:max-h-[380px] md:max-h-[480px] object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
              style={{ animation: 'productImgIn 0.45s cubic-bezier(0.34,1.2,0.64,1) both' }}
            />

            {/* Glow ring under image */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-ember/10 blur-2xl rounded-full" />

            {/* Navigation Arrows */}
            {hasPrev && (
              <button
                onClick={() => onNavigate(currentIndex - 1)}
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 bg-black/50 hover:bg-ember/40 border border-white/10 hover:border-ember/60 rounded-full flex items-center justify-center text-cream/70 hover:text-cream transition-all hover:scale-110 shadow-xl"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            {hasNext && (
              <button
                onClick={() => onNavigate(currentIndex + 1)}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 bg-black/50 hover:bg-ember/40 border border-white/10 hover:border-ember/60 rounded-full flex items-center justify-center text-cream/70 hover:text-cream transition-all hover:scale-110 shadow-xl"
              >
                <ChevronRight size={22} />
              </button>
            )}

            {/* Mobile nav dots */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 md:hidden">
              {products.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  onClick={() => onNavigate(dotIdx)}
                  className={`rounded-full transition-all ${
                    dotIdx === currentIndex
                      ? 'w-5 h-2 bg-ember shadow-[0_0_6px_rgba(192,57,10,0.8)]'
                      : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ── INFO PANEL ── */}
          <div className="p-6 sm:p-10 flex flex-col justify-between min-h-[280px] md:min-h-[560px]">
            <div className="flex-1">
              {/* Category + counter row */}
              <div className="flex items-center justify-between mb-5">
                <span className="inline-block bg-ember/15 border border-ember/30 text-ember-light text-[0.65rem] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                  {product.category}
                </span>
                <span className="text-[#7A4820] text-[0.72rem] font-bold uppercase tracking-widest">
                  {currentIndex + 1} / {products.length}
                </span>
              </div>

              {/* Product name */}
              <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl text-cream font-bold mb-2 leading-tight">
                {product.name}
              </h3>

              {/* Weight badge */}
              <div className="inline-flex items-center gap-2 mb-5">
                <div className="w-1.5 h-1.5 rounded-full bg-ember animate-pulse" />
                <span className="text-ember-light text-base sm:text-lg font-semibold tracking-wide">{product.weight}</span>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-ember/30 to-transparent mb-5" />

              {/* Description */}
              <p className="text-[#C0956E] text-[0.92rem] sm:text-[1rem] leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* ── Thumbnails strip (desktop only) ── */}
            <div className="hidden md:block mt-8 pt-6 border-t border-white/8">
              <div className="text-[0.65rem] text-[#7A4820] uppercase tracking-widest font-bold mb-3">Outros produtos</div>
              <div className="flex gap-2.5 flex-wrap">
                {products.slice(Math.max(0, currentIndex - 3), Math.min(products.length, currentIndex + 4)).map((p, idx) => {
                  const absIdx = Math.max(0, currentIndex - 3) + idx;
                  return (
                    <button
                      key={absIdx}
                      title={p.name}
                      onClick={() => onNavigate(absIdx)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all hover:scale-105 hover:border-ember/60 ${
                        absIdx === currentIndex
                          ? 'border-ember shadow-[0_0_14px_rgba(192,57,10,0.6)] scale-105'
                          : 'border-white/10 opacity-50 hover:opacity-100'
                      }`}
                    >
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Mobile thumbnail strip ── */}
            <div className="md:hidden mt-6 pt-5 border-t border-white/8">
              <div className="text-[0.62rem] text-[#7A4820] uppercase tracking-widest font-bold mb-2">Outros produtos</div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {products.map((p, absIdx) => (
                  <button
                    key={absIdx}
                    title={p.name}
                    onClick={() => onNavigate(absIdx)}
                    className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      absIdx === currentIndex
                        ? 'border-ember shadow-[0_0_10px_rgba(192,57,10,0.5)] scale-105'
                        : 'border-white/10 opacity-40 hover:opacity-80'
                    }`}
                  >
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [requireChange, setRequireChange] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);
  const [loginError, setLoginError] = useState('');

  // Product modal state
  const [selectedProductIdx, setSelectedProductIdx] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState('Todos');

  // Trabalhe Conosco state
  const [trabalheOpen, setTrabalheOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [trabalheSubmitting, setTrabalheSubmitting] = useState(false);
  const [trabalheSuccess, setTrabalheSuccess] = useState(false);
  const [trabalheError, setTrabalheError] = useState('');

  const { register: registerTrabalhe, handleSubmit: handleSubmitTrabalhe, reset: resetTrabalhe, formState: { errors: errorsTrabalhe } } = useForm<TrabalheForm>({
    resolver: zodResolver(trabalheSchema)
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      const allowed = ['.pdf', '.docx', '.doc'];
      if (!allowed.includes(ext)) {
        setFileError('Apenas arquivos .pdf, .docx e .doc são permitidos.');
        setFile(null);
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setFileError('O arquivo do currículo não pode exceder 5MB.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const onSubmitTrabalhe = async (data: TrabalheForm) => {
    setTrabalheError('');
    if (!file) {
      setFileError('É obrigatório anexar o seu currículo.');
      return;
    }
    setTrabalheSubmitting(true);

    const formData = new FormData();
    formData.append('nome', data.nome);
    formData.append('email', data.email);
    formData.append('telefone', data.telefone);
    formData.append('cargoInteresse', data.cargoInteresse);
    if (data.mensagem) {
      formData.append('mensagem', data.mensagem);
    }
    formData.append('curriculo', file);

    try {
      await api.post('/Candidaturas', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setTrabalheSuccess(true);
    } catch (err: any) {
      console.error(err);
      setTrabalheError(err.response?.data?.message || 'Ocorreu um erro ao enviar sua candidatura. Tente novamente mais tarde.');
    } finally {
      setTrabalheSubmitting(false);
    }
  };

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

  const filteredProducts = activeCategory === 'Todos'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === activeCategory);

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-cream font-sans text-salu-text selection:bg-ember selection:text-white">

      {/* ─── Keyframe Styles ─── */}
      <style>{`
        @keyframes productModalIn {
          from { opacity: 0; transform: scale(0.88) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes productImgIn {
          from { opacity: 0; transform: scale(0.92) rotate(-2deg); }
          to   { opacity: 1; transform: scale(1)    rotate(0deg); }
        }
        @keyframes cardPop {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>

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
              onClick={() => setTrabalheOpen(true)}
              className="text-[#D4B89A] text-[0.78rem] font-medium tracking-[0.1em] uppercase hover:text-ember-light transition-colors"
            >
              Trabalhe Conosco
            </button>
          </li>
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
              onClick={() => { setTrabalheOpen(true); setMobileMenuOpen(false); }}
              className="text-[#D4B89A] text-left font-medium uppercase tracking-wider hover:text-ember-light"
            >
              Trabalhe Conosco
            </button>
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
            Distribuição em Rondônia &amp; Amazonas
          </div>

          <h1 className="font-serif text-4xl md:text-6xl text-cream leading-[1.1] font-bold mb-6">
            Qualidade que sai do forno e chega até <span className="text-ember-light font-normal italic">você</span> <br />
            <strong className="block bg-gradient-to-r from-gold-light to-ember-light bg-clip-text text-transparent mt-2">
              com tradição e força
            </strong>
          </h1>

          <p className="text-[#D4B89A] text-lg mb-10 max-w-[480px] font-light leading-relaxed">
            Representamos as principais marcas do setor de panificação, realizando a distribuição com agilidade, pontualidade e comprometimento.
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

      <div className="bg-gradient-to-r from-fire-deep via-fire to-ember py-4 px-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 animate-in fade-in duration-1000">
          <div className="flex items-center gap-3 text-[#FFE8D0] text-[0.82rem] font-bold uppercase tracking-wider">
            <Star size={14} className="text-gold-light" /> Rondônia &amp; Amazonas
          </div>
          <div className="hidden md:block text-[#FFE8D0]/30 text-xl">|</div>
          <div className="flex items-center gap-3 text-[#FFE8D0] text-[0.82rem] font-bold uppercase tracking-wider">
            <Star size={14} className="text-gold-light" /> Porto Velho, Candeias &amp; Humaitá
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
              <p>A <strong>Salú Representação Ltda</strong> atua como representante comercial de produtos de panificação de alta qualidade, conectando indústrias selecionadas ao varejo de Rondônia e Amazonas (Porto Velho, Candeias do Jamari e Humaitá) com eficiência e confiança.</p>
              <p>Desde supermercados a padarias e mercearias, levamos uma linha completa de pães — de forma, integral, centeio, polvilho e mais — garantindo frescor e variedade para cada tipo de cliente e consumidor.</p>
              <p>Nossa equipe conhece profundamente o mercado local e atua de forma consultiva, construindo parcerias sólidas e duradouras com cada cliente atendido.</p>
            </div>

            <div className="flex flex-col gap-1">
              {[
                { n: '2 Estados', d: 'Porto Velho, Candeias e Humaitá' },
                { n: '15+ Produtos', d: 'de panificação representados' },
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
              { num: '02', tag: 'Visão', title: 'Para onde vamos', desc: 'Ser reconhecida como a principal referência em representação comercial de panificação da região Norte, com excelência em atendimento, cobertura de mercado e relacionamento de longo prazo com clientes e fornecedores.' },
              { num: '03', tag: 'Valores', title: 'Como agimos', desc: <><strong className="text-ember-light">Honestidade</strong> — transparência em cada negociação.<br /><strong className="text-ember-light">Qualidade</strong> — só representamos o que acreditamos.<br /><strong className="text-ember-light">Comprometimento</strong> — cumprimos o que prometemos.<br /><strong className="text-ember-light">Parceria</strong> — crescemos juntos.</> }
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
        <div className="max-w-[1100px] mx-auto">
          <div className="text-[0.7rem] font-bold tracking-[0.16em] uppercase text-ember mb-2">Portfólio</div>
          <h2 className="font-serif text-3xl md:text-5xl text-dark mb-4 font-bold">Nossos Produtos</h2>
          <p className="text-mid text-[0.95rem] mb-8 max-w-[520px]">Clique em qualquer produto para ver os detalhes e a fotografia completa.</p>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-10">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full text-[0.78rem] font-bold uppercase tracking-wider transition-all ${
                  activeCategory === cat
                    ? 'bg-ember text-white shadow-[0_4px_16px_rgba(192,57,10,0.4)] scale-105'
                    : 'bg-cream border border-surface text-mid hover:border-ember-light hover:text-dark'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredProducts.map((product, i) => {
              const absIdx = PRODUCTS.indexOf(product);
              return (
                <button
                  key={`${product.name}-${i}`}
                  onClick={() => setSelectedProductIdx(absIdx)}
                  className="group bg-cream border-[1.5px] border-surface rounded-2xl overflow-hidden hover:border-ember-light hover:-translate-y-2 hover:shadow-2xl hover:shadow-ember/10 transition-all duration-300 text-left relative"
                  style={{ animation: `cardPop 0.4s ease-out ${i * 0.05}s both` }}
                >
                  {/* Image */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-[#FFF8F0] to-[#F5EDE0] aspect-square">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-ember/0 group-hover:bg-ember/10 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-ember/90 rounded-full p-2.5 shadow-lg">
                        <ZoomIn size={18} className="text-white" />
                      </div>
                    </div>
                    {/* Category badge */}
                    <div className="absolute top-2 left-2">
                      <span className="bg-charcoal/80 text-cream text-[0.58rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full backdrop-blur-sm">
                        {product.category}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="text-dark text-[0.82rem] font-bold leading-tight mb-1 group-hover:text-ember transition-colors">{product.name}</div>
                    <div className="text-ember-light text-[0.75rem] font-semibold">{product.weight}</div>
                  </div>

                  {/* Bottom accent bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-fire to-ember scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                </button>
              );
            })}
          </div>

          {/* Count */}
          <div className="mt-6 text-center text-mid text-[0.82rem]">
            Exibindo <strong className="text-dark">{filteredProducts.length}</strong> de <strong className="text-dark">{PRODUCTS.length}</strong> produtos
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
              <span className="inline-block bg-ember/20 border border-ember/40 text-ember-light text-[0.68rem] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">Cobertura Ativa</span>
              <h3 className="font-serif text-2xl text-cream font-bold mb-2">Estado de Rondônia</h3>
              <p className="text-[#D4B89A] text-[0.88rem] mb-6">Atendemos Porto Velho e Candeias do Jamari com distribuição dedicada, regularidade e excelência no atendimento.</p>
              <div className="flex flex-wrap gap-2">
                {['Porto Velho', 'Candeias do Jamari'].map(c => (
                  <span key={c} className="bg-ember/15 text-ember-light text-[0.72rem] font-medium px-3 py-1 rounded-full">{c}</span>
                ))}
              </div>
            </div>

            {/* Amazonas */}
            <div className="bg-gradient-to-br from-fire/25 to-ember/10 border-[1.5px] border-ember/40 rounded-2xl p-8 hover:bg-fire/20 transition-all">
              <span className="inline-block bg-ember/20 border border-ember/40 text-ember-light text-[0.68rem] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">Cobertura Ativa</span>
              <h3 className="font-serif text-2xl text-cream font-bold mb-2">Estado do Amazonas</h3>
              <p className="text-[#D4B89A] text-[0.88rem] mb-6">Atendemos o município de Humaitá no Amazonas com distribuição dedicada, regularidade e excelência no atendimento.</p>
              <div className="flex flex-wrap gap-2">
                {['Humaitá'].map(c => (
                  <span key={c} className="bg-ember/15 text-ember-light text-[0.72rem] font-medium px-3 py-1 rounded-full">{c}</span>
                ))}
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
              { icon: Phone, label: 'Telefone & WhatsApp', val: '(69) 99236-1442', sub: 'Seg–Sex, 8h às 18h' },
              { icon: Mail, label: 'E-mail', val: 'salurepresentacao@gmail.com', sub: 'Respondemos em até 24h' },
              { icon: Clock, label: 'Horário', val: 'Segunda a Sexta', sub: '08:00h às 18:00h' }
            ].map((card, i) => (
              <div key={i} className="bg-cream border-[1.5px] border-surface rounded-2xl p-6 hover:border-ember-light hover:-translate-y-1 transition-all">
                <div className="w-11 h-11 bg-gradient-to-br from-fire to-ember rounded-lg flex items-center justify-center text-white mb-4 shadow-lg shadow-fire/20">
                  <card.icon size={20} />
                </div>
                <div className="text-[0.72rem] font-bold tracking-widest uppercase text-muted mb-1">{card.label}</div>
                <div className="text-[0.9rem] font-bold text-dark mb-1 break-all">{card.val}</div>
                <div className="text-[0.82rem] text-muted">{card.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-charcoal py-16 px-6 md:px-12 text-center">
        <div className="font-serif text-3xl text-ember-light font-bold tracking-wider mb-2">Salú Representação Ltda</div>
        <div className="text-[#7A4820] text-sm font-light tracking-wide mb-8">Qualidade de ponta a ponta — Rondônia &amp; Amazonas</div>

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
            onClick={() => setTrabalheOpen(true)}
            className="text-[#7A4820] text-[0.78rem] font-medium tracking-widest uppercase hover:text-ember-light transition-colors"
          >
            Trabalhe Conosco
          </button>
          <button
            onClick={() => setLoginOpen(true)}
            className="text-[#7A4820] text-[0.78rem] font-medium tracking-widest uppercase hover:text-ember-light transition-colors"
          >
            Acessar Sistema
          </button>
        </div>

        <hr className="border-none border-t border-ember/15 mb-6" />

        <p className="text-[#4A2410] text-[0.8rem] mb-1">© {currentYear} Salú Representação Ltda — Todos os direitos reservados</p>
        <p className="text-[#4A2410] text-[0.75rem]">CNPJ: 29.746.159/0001-31 — Porto Velho, RO</p>
      </footer>

      {/* ─── MODAL DE LOGIN ─── */}
      {/* ─── MODAL TRABALHE CONOSCO ─── */}
      {trabalheOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#120700]/80 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={(e) => { if (e.target === e.currentTarget) setTrabalheOpen(false); }}
        >
          <div
            className="bg-dark border border-ember/30 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fire via-ember to-gold-light" />

            <button
              onClick={() => { setTrabalheOpen(false); resetTrabalhe(); setFileError(''); setFile(null); setTrabalheSuccess(false); }}
              className="absolute right-4 top-4 text-[#4A2410] hover:text-cream transition-colors p-2"
            >
              <X size={20} />
            </button>

            <div className="p-8 sm:p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
              {trabalheSuccess ? (
                <div className="text-center py-8">
                  <div className="flex justify-center mb-4 text-ember-light">
                    <CheckCircle2 size={72} />
                  </div>
                  <h3 className="font-serif text-3xl text-cream font-bold mb-2">Candidatura Enviada!</h3>
                  <p className="text-[#D4B89A] text-sm mb-6">Agradecemos o seu interesse em fazer parte da equipe da Salú. Seu currículo foi recebido com sucesso e será analisado pela nossa equipe de RH.</p>
                  <button
                    onClick={() => { setTrabalheOpen(false); resetTrabalhe(); setFile(null); setTrabalheSuccess(false); }}
                    className="bg-gradient-to-r from-fire to-ember text-white px-6 py-2.5 rounded-lg font-bold text-sm tracking-wide"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6 text-center">
                    <h3 className="font-serif text-3xl text-cream font-bold mb-1">Trabalhe Conosco</h3>
                    <p className="text-[#D4B89A] text-sm">Preencha as informações abaixo para nos enviar seu currículo</p>
                  </div>

                  <form onSubmit={handleSubmitTrabalhe(onSubmitTrabalhe)} className="space-y-4">
                    {trabalheError && (
                      <div className="bg-red-500/10 text-red-500 text-xs p-3 rounded-lg border border-red-500/20">{trabalheError}</div>
                    )}

                    <div className="space-y-1">
                      <label htmlFor="trabalhe-nome" className="block text-[0.72rem] font-bold text-[#D4B89A] tracking-widest uppercase">Nome Completo</label>
                      <input
                        id="trabalhe-nome"
                        type="text"
                        placeholder="Ex: João da Silva"
                        {...registerTrabalhe('nome')}
                        className="w-full bg-black/20 border-[1.5px] border-ember/40 rounded-lg py-2.5 px-4 text-cream text-sm outline-none focus:border-ember transition-colors placeholder:text-[#D4B89A]/30"
                      />
                      {errorsTrabalhe.nome && <p className="text-red-500 text-[10px]">{errorsTrabalhe.nome.message}</p>}
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="trabalhe-email" className="block text-[0.72rem] font-bold text-[#D4B89A] tracking-widest uppercase">E-mail</label>
                      <input
                        id="trabalhe-email"
                        type="email"
                        placeholder="Ex: joao@email.com"
                        {...registerTrabalhe('email')}
                        className="w-full bg-black/20 border-[1.5px] border-ember/40 rounded-lg py-2.5 px-4 text-cream text-sm outline-none focus:border-ember transition-colors placeholder:text-[#D4B89A]/30"
                      />
                      {errorsTrabalhe.email && <p className="text-red-500 text-[10px]">{errorsTrabalhe.email.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="trabalhe-telefone" className="block text-[0.72rem] font-bold text-[#D4B89A] tracking-widest uppercase">Telefone</label>
                        <input
                          id="trabalhe-telefone"
                          type="text"
                          placeholder="Ex: (69) 99999-9999"
                          {...registerTrabalhe('telefone', {
                            onChange: (e) => {
                              const rawValue = e.target.value;
                              e.target.value = formatPhone(rawValue);
                            }
                          })}
                          className="w-full bg-black/20 border-[1.5px] border-ember/40 rounded-lg py-2.5 px-4 text-cream text-sm outline-none focus:border-ember transition-colors placeholder:text-[#D4B89A]/30"
                        />
                        {errorsTrabalhe.telefone && <p className="text-red-500 text-[10px]">{errorsTrabalhe.telefone.message}</p>}
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="trabalhe-cargo" className="block text-[0.72rem] font-bold text-[#D4B89A] tracking-widest uppercase">Cargo de Interesse</label>
                        <select
                          id="trabalhe-cargo"
                          {...registerTrabalhe('cargoInteresse')}
                          className="w-full bg-charcoal border-[1.5px] border-ember/40 rounded-lg py-2.5 px-4 text-cream text-sm outline-none focus:border-ember transition-colors"
                        >
                          <option value="" className="bg-charcoal text-cream">Selecione uma área...</option>
                          <option value="Produção / Fábrica" className="bg-charcoal text-cream">Produção / Fábrica</option>
                          <option value="Logística / Motorista" className="bg-charcoal text-cream">Logística / Motorista</option>
                          <option value="Administrativo" className="bg-charcoal text-cream">Administrativo</option>
                          <option value="Comercial / Vendas" className="bg-charcoal text-cream">Comercial / Vendas</option>
                          <option value="Financeiro" className="bg-charcoal text-cream">Financeiro</option>
                          <option value="Outro" className="bg-charcoal text-cream">Outro</option>
                        </select>
                        {errorsTrabalhe.cargoInteresse && <p className="text-red-500 text-[10px]">{errorsTrabalhe.cargoInteresse.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="trabalhe-mensagem" className="block text-[0.72rem] font-bold text-[#D4B89A] tracking-widest uppercase">Mensagem de Apresentação (Opcional)</label>
                      <textarea
                        id="trabalhe-mensagem"
                        rows={3}
                        placeholder="Fale um pouco sobre você..."
                        {...registerTrabalhe('mensagem')}
                        className="w-full bg-black/20 border-[1.5px] border-ember/40 rounded-lg py-2 px-4 text-cream text-sm outline-none focus:border-ember transition-colors placeholder:text-[#D4B89A]/30 resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[0.72rem] font-bold text-[#D4B89A] tracking-widest uppercase">Anexar Currículo (PDF, DOC, DOCX - Máx 5MB)</label>
                      <div className="relative">
                        <input
                          id="trabalhe-file"
                          type="file"
                          accept=".pdf,.docx,.doc"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="trabalhe-file"
                          className="flex flex-col items-center justify-center border-2 border-dashed border-ember/40 hover:border-ember rounded-xl p-5 bg-black/10 cursor-pointer transition-colors text-center"
                        >
                          <Upload className="text-ember-light w-8 h-8 mb-2" />
                          {file ? (
                            <div>
                              <span className="text-cream text-xs font-semibold block truncate max-w-[320px]">{file.name}</span>
                              <span className="text-muted text-[10px]">{(file.size / (1024 * 1024)).toFixed(2)} MB - Clique para trocar</span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[#D4B89A] text-xs font-semibold block">Escolha seu arquivo de currículo</span>
                              <span className="text-muted text-[10px]">Arraste ou clique para selecionar</span>
                            </div>
                          )}
                        </label>
                      </div>
                      {fileError && <p className="text-red-500 text-[10px]">{fileError}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={trabalheSubmitting}
                      className="w-full bg-gradient-to-r from-fire to-ember text-white py-3.5 rounded-lg font-bold text-sm tracking-wide mt-4 shadow-[0_4px_20px_rgba(192,57,10,0.4)] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {trabalheSubmitting ? 'Enviando candidatura...' : 'Enviar Currículo'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
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

      {/* ─── PRODUCT VIEWER MODAL ─── */}
      {selectedProductIdx !== null && (
        <ProductModal
          product={PRODUCTS[selectedProductIdx]}
          products={PRODUCTS}
          currentIndex={selectedProductIdx}
          onClose={() => setSelectedProductIdx(null)}
          onNavigate={(idx) => setSelectedProductIdx(idx)}
        />
      )}
    </div>
  );
}
