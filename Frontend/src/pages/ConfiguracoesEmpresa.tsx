import { useState, useEffect } from 'react';
import { Building2, Save, Loader2, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { empresaService } from '../services/empresaService';
import type { EmpresaConfig } from '../services/empresaService';

const empresaSchema = z.object({
  id: z.string().optional(),
  razaoSocial: z.string().min(3, 'A Razão Social é obrigatória'),
  nomeFantasia: z.string().min(2, 'O Nome Fantasia é obrigatório'),
  cnpj: z.string().min(18, 'CNPJ deve ter 14 dígitos (com pontuação)'),
  inscricaoEstadual: z.string().optional(),
  telefone: z.string().min(14, 'Telefone inválido').optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  endereco: z.string().min(5, 'Endereço é obrigatório'),
  logoUrl: z.string().optional()
});

type EmpresaForm = z.infer<typeof empresaSchema>;

export function ConfiguracoesEmpresa() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<EmpresaForm>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      inscricaoEstadual: '',
      telefone: '',
      email: '',
      endereco: '',
      logoUrl: ''
    }
  });

  const logoPreview = watch('logoUrl');

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');
    setValue('cnpj', value.slice(0, 18), { shouldValidate: true });
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    setValue('telefone', value.slice(0, 15), { shouldValidate: true });
  };

  const handleIeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // IE formats vary by state, so we'll just allow numbers and apply a generic 
    // pattern if you want, but simply restricting to numbers is safest nationwide.
    let value = e.target.value.replace(/\D/g, '');
    setValue('inscricaoEstadual', value, { shouldValidate: true });
  };

  useEffect(() => {
    loadEmpresa();
  }, []);

  const loadEmpresa = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const config = await empresaService.getConfig();
      if (config) {
        reset(config);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações da empresa:', err);
      setError('Não foi possível carregar os dados da empresa. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: EmpresaForm) => {
    try {
      await empresaService.saveConfig(data as EmpresaConfig);
      alert('Configurações salvas com sucesso!');
      loadEmpresa(); // Recarrega para obter o ID caso tenha acabado de ser criado
    } catch (err) {
      console.error('Erro ao salvar empresa:', err);
      alert('Erro ao salvar as configurações.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-blue-600" />
            Configurações da Empresa
          </h1>
          <p className="text-slate-500 mt-1">Gerencie as informações legais e de contato da sua fábrica.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg flex items-center gap-3">
          <Info size={20} />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Informações Legais</h3>
            </div>
            
            <Input
              label="Razão Social"
              placeholder="Ex: Padaria e Fábrica SGP-F Ltda"
              {...register('razaoSocial')}
              error={errors.razaoSocial?.message}
            />

            <Input
              label="Nome Fantasia"
              placeholder="Ex: SGP-Fábrica"
              {...register('nomeFantasia')}
              error={errors.nomeFantasia?.message}
            />

            <Input
              label="CNPJ"
              placeholder="00.000.000/0001-00"
              {...register('cnpj')}
              onChange={handleCnpjChange}
              error={errors.cnpj?.message}
            />

            <Input
              label="Inscrição Estadual (Apenas números)"
              placeholder="Ex: 123456789000"
              {...register('inscricaoEstadual')}
              onChange={handleIeChange}
              error={errors.inscricaoEstadual?.message}
            />

            <div className="col-span-1 md:col-span-2 mt-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Contato e Endereço</h3>
            </div>

            <Input
              label="E-mail Corporativo"
              type="email"
              placeholder="contato@empresa.com"
              {...register('email')}
              error={errors.email?.message}
            />

            <Input
              label="Telefone Principal"
              placeholder="(00) 00000-0000"
              {...register('telefone')}
              onChange={handleTelefoneChange}
              error={errors.telefone?.message}
            />

            <div className="col-span-1 md:col-span-2">
              <Input
                label="Endereço Completo"
                placeholder="Rua, Número, Bairro, Cidade - Estado"
                {...register('endereco')}
                error={errors.endereco?.message}
              />
            </div>
            
            <div className="col-span-1 md:col-span-2 mt-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Identidade Visual</h3>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Upload da Logo (Opcional)</label>
              <div className="flex items-center gap-4">
                <label className="flex-1 flex items-center justify-center h-12 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-blue-50 hover:border-blue-400 transition-all">
                  <span className="text-sm font-medium text-slate-500">Clique para anexar a imagem da Logo (JPG, PNG)</span>
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setValue('logoUrl', reader.result as string, { shouldDirty: true });
                      };
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
                {logoPreview && (
                  <div className="w-14 h-14 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm shrink-0 relative group">
                    <img src={logoPreview} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                    <button 
                      type="button" 
                      onClick={(e) => { e.preventDefault(); setValue('logoUrl', ''); }} 
                      className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">A logo enviada será impressa automaticamente no cabeçalho do PDF do contracheque.</p>
            </div>

          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 min-w-[150px] justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Salvar Dados
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
