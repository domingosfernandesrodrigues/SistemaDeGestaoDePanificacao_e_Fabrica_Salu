import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

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

type LoginForm = z.infer<typeof loginSchema>;
type TrocarSenhaForm = z.infer<typeof trocarSenhaSchema>;

export function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // States for forced password change flow
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [tempUserData, setTempUserData] = useState<any>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const { register: registerTrocar, handleSubmit: handleSubmitTrocar, watch: watchTrocar, formState: { errors: errorsTrocar, isSubmitting: isSubmittingTrocar } } = useForm<TrocarSenhaForm>({
    resolver: zodResolver(trocarSenhaSchema),
  });

  const novaSenha = watchTrocar('novaSenha') || '';

  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', test: (val: string) => val.length >= 8 },
    { label: 'Letra maiúscula', test: (val: string) => /[A-Z]/.test(val) },
    { label: 'Letra minúscula', test: (val: string) => /[a-z]/.test(val) },
    { label: 'Número', test: (val: string) => /[0-9]/.test(val) },
    { label: 'Caractere especial', test: (val: string) => /[!@#$%^&*(),.?":{}|<> ]/.test(val) },
  ];

  const onSubmit = async (data: LoginForm) => {
    try {
      const response = await api.post('/Auth/login', data);
      
      if (response.data.precisaTrocarSenha) {
        setTempToken(response.data.token);
        setTempUserData(response.data);
        setRequirePasswordChange(true);
        return;
      }

      finalizeLogin(response.data);
    } catch (error: any) {
      console.error('Login Error:', error);
      const msg = error.response?.data?.message || error.message || 'Erro de conexão';
      alert(`Erro no Login: ${msg}`);
    }
  };

  const onSubmitTrocarSenha = async (data: TrocarSenhaForm) => {
    try {
      // Usar o token temporário para autorizar a troca de senha
      await api.post('/Auth/trocar-senha', { novaSenha: data.novaSenha }, {
        headers: { Authorization: `Bearer ${tempToken}` }
      });
      
      // Finalizar o login agora que a senha foi trocada
      finalizeLogin(tempUserData);
    } catch (error: any) {
      console.error('Trocar Senha Error:', error);
      alert('Erro ao trocar a senha. Tente novamente.');
    }
  };

  const finalizeLogin = (userData: any) => {
    localStorage.setItem('sgpf_token', userData.token);
    localStorage.setItem('sgpf_role', userData.role);
    localStorage.setItem('sgpf_user_name', userData.nome);
    localStorage.setItem('sgpf_user_email', userData.email);
    if (userData.clienteId) {
      localStorage.setItem('sgpf_cliente_id', userData.clienteId);
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-100">
        
        {!requirePasswordChange ? (
          <>
            <div className="text-center mb-8">
              <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md text-white font-bold text-2xl">
                SGP
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Bem-vindo de volta</h1>
              <p className="text-slate-500 mt-2">Acesse o Sistema de Gestão SGP-F</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-[34px] h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-9"
                  {...register('email')}
                  error={errors.email?.message}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-[34px] h-4 w-4 text-slate-400" />
                <Input
                  id="senha"
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-10"
                  {...register('senha')}
                  error={errors.senha?.message}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="bg-emerald-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md text-white">
                <ShieldCheck size={32} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Segurança</h1>
              <p className="text-slate-500 mt-2">Este é o seu primeiro acesso. Por favor, defina uma nova senha para sua conta.</p>
            </div>

            <form onSubmit={handleSubmitTrocar(onSubmitTrocarSenha)} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-[34px] h-4 w-4 text-slate-400" />
                <Input
                  label="Nova Senha"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  className="pl-9 pr-10"
                  {...registerTrocar('novaSenha')}
                  error={errorsTrocar.novaSenha?.message}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  className="pl-9 pr-10"
                  {...registerTrocar('confirmarSenha')}
                  error={errorsTrocar.confirmarSenha?.message}
                />
              </div>

              <Button type="submit" className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700" disabled={isSubmittingTrocar}>
                {isSubmittingTrocar ? 'Salvando...' : 'Salvar Nova Senha e Entrar'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
