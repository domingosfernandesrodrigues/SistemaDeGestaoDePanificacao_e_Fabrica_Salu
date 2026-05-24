import { useState, useEffect } from 'react';
import { Building2, Save, Loader2, Info, MapPin } from 'lucide-react';
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
  logoUrl: z.string().optional(),
  latitude: z.preprocess((val) => (val === '' || val === undefined || val === null ? null : Number(val)), z.number().nullable().optional()),
  longitude: z.preprocess((val) => (val === '' || val === undefined || val === null ? null : Number(val)), z.number().nullable().optional()),
  
  // Campos de endereço estruturados virtuais
  cep: z.string().min(8, 'CEP incompleto'),
  logradouro: z.string().min(2, 'Rua é obrigatória'),
  numero: z.string().min(1, 'Número é obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro é obrigatório'),
  cidade: z.string().min(2, 'Cidade é obrigatória'),
  estado: z.string().min(2, 'Estado (UF) é obrigatório')
});

type EmpresaForm = z.infer<typeof empresaSchema>;

const parseEndereco = (enderecoStr: string) => {
  const defaultValues = { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' };
  if (!enderecoStr) return defaultValues;
  
  try {
    const cepMatch = enderecoStr.match(/CEP\s*(\d{5}-\d{3})/i) || enderecoStr.match(/CEP\s*(\d{8})/i);
    const cep = cepMatch ? cepMatch[1] : '';
    
    let textoSemCep = enderecoStr.replace(/,\s*CEP\s*\d{5}-\d{3}/i, '').replace(/CEP\s*\d{5}-\d{3}/i, '');
    textoSemCep = textoSemCep.replace(/,\s*CEP\s*\d{8}/i, '').replace(/CEP\s*\d{8}/i, '');
    
    const complementoMatch = textoSemCep.match(/\(([^)]+)\)/);
    const complemento = complementoMatch ? complementoMatch[1] : '';
    
    if (complemento) {
      textoSemCep = textoSemCep.replace(`(${complemento})`, '').trim();
    }
    
    const partes = textoSemCep.split(' - ').map(p => p.trim());
    
    if (partes.length >= 4) {
      const logradouroENumero = partes[0].split(', ');
      const logradouro = logradouroENumero[0] || '';
      const numero = logradouroENumero[1] || '';
      const bairro = partes[1] || '';
      const cidade = partes[2] || '';
      const estado = partes[3] || '';
      
      return { 
        cep, 
        logradouro, 
        numero, 
        complemento, 
        bairro, 
        cidade, 
        estado 
      };
    } else if (partes.length === 3) {
      const logradouroENumero = partes[0].split(', ');
      const logradouro = logradouroENumero[0] || '';
      const numero = logradouroENumero[1] || '';
      
      let bairro = partes[1] || '';
      let cidade = '';
      
      if (bairro.includes(', ')) {
        const bairroECidade = bairro.split(', ');
        bairro = bairroECidade[0] || '';
        cidade = bairroECidade[1] || '';
      }
      
      let estado = partes[2] || '';
      if (!cidade) {
        if (estado.includes(' - ')) {
          const cidadeEEstado = estado.split(' - ');
          cidade = cidadeEEstado[0] || '';
          estado = cidadeEEstado[1] || '';
        } else {
          cidade = partes[2] || '';
          estado = '';
        }
      }
      
      return { 
        cep, 
        logradouro, 
        numero, 
        complemento, 
        bairro, 
        cidade, 
        estado 
      };
    }
  } catch (e) {
    console.warn("Erro ao fazer parse do endereço:", e);
  }
  
  return { ...defaultValues, logradouro: enderecoStr };
};

export function ConfiguracoesEmpresa() {
  const [isLoading, setIsLoading] = useState(true);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isBuscandoEndereco, setIsBuscandoEndereco] = useState(false);
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
      logoUrl: '',
      latitude: null,
      longitude: null,
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: ''
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

  const compressImage = (base64Str: string, maxWidth: number = 150, maxHeight: number = 150): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Preenche fundo com branco para manter transparências limpas no JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  useEffect(() => {
    loadEmpresa();
  }, []);

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 5) {
      val = val.replace(/^(\d{5})(\d)/, '$1-$2');
    }
    setValue('cep', val.slice(0, 9), { shouldValidate: true });
    
    const cleanCep = val.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setValue('logradouro', data.logradouro, { shouldDirty: true, shouldValidate: true });
          setValue('bairro', data.bairro, { shouldDirty: true, shouldValidate: true });
          setValue('cidade', data.localidade, { shouldDirty: true, shouldValidate: true });
          setValue('estado', data.uf, { shouldDirty: true, shouldValidate: true });
          setTimeout(() => document.getElementById('numero-input')?.focus(), 50);
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const loadEmpresa = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const config = await empresaService.getConfig();
      if (config) {
        const parsedEndereco = parseEndereco(config.endereco || '');
        reset({
          ...config,
          ...parsedEndereco
        });
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
      const { cep, logradouro, numero, complemento, bairro, cidade, estado, ...rest } = data;
      const complementoStr = complemento ? ` (${complemento})` : '';
      const enderecoConcatenado = `${logradouro}, ${numero} - ${bairro} - ${cidade} - ${estado}, CEP ${cep}${complementoStr}`;
      
      const payload: EmpresaConfig = {
        ...rest,
        endereco: enderecoConcatenado,
        // Garante que lat/lng chegam como number puro, não string, nem NaN
        latitude: rest.latitude != null && !isNaN(Number(rest.latitude)) ? Number(rest.latitude) : undefined,
        longitude: rest.longitude != null && !isNaN(Number(rest.longitude)) ? Number(rest.longitude) : undefined,
      };
      
      console.log('[SAVE] Payload enviado ao backend:', JSON.stringify({ lat: payload.latitude, lng: payload.longitude }));
      
      empresaService.clearCache(); // Limpa cache antes de salvar para evitar stale data
      await empresaService.saveConfig(payload);
      empresaService.clearCache(); // Limpa cache depois do save para forçar re-fetch
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
              required
              placeholder="Ex: Padaria e Fábrica SGP-F Ltda"
              {...register('razaoSocial')}
              error={errors.razaoSocial?.message}
            />

            <Input
              label="Nome Fantasia"
              required
              placeholder="Ex: SGP-Fábrica"
              {...register('nomeFantasia')}
              error={errors.nomeFantasia?.message}
            />

            <Input
              label="CNPJ"
              required
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

            <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Input
                id="cep-input"
                label="CEP"
                required
                placeholder="00000-000"
                {...register('cep')}
                onChange={handleCepChange}
                error={errors.cep?.message}
              />
              <div className="sm:col-span-3">
                <Input
                  label="Logradouro (Rua, Avenida...)"
                  required
                  placeholder="Ex: Avenida Paulista"
                  {...register('logradouro')}
                  error={errors.logradouro?.message}
                />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                id="numero-input"
                label="Número"
                required
                placeholder="Ex: 123"
                {...register('numero')}
                error={errors.numero?.message}
              />
              <Input
                label="Complemento (Apto, Sala...)"
                placeholder="Ex: Bloco A"
                {...register('complemento')}
                error={errors.complemento?.message}
              />
              <Input
                label="Bairro"
                required
                placeholder="Ex: Centro"
                {...register('bairro')}
                error={errors.bairro?.message}
              />
            </div>

            <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Cidade"
                required
                placeholder="Ex: São Paulo"
                {...register('cidade')}
                error={errors.cidade?.message}
              />
              <Input
                label="Estado (UF)"
                required
                placeholder="Ex: SP"
                maxLength={2}
                {...register('estado')}
                error={errors.estado?.message}
              />
            </div>

            <div className="col-span-1 md:col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="text-blue-600 shrink-0" size={18} />
                <h4 className="text-sm font-semibold text-slate-800">Cerca Virtual do Ponto (Geolocalização)</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                As coordenadas abaixo definem o centro do perímetro físico da empresa. O primeiro registro de ponto do dia (entrada)
                dos funcionários será validado contra estas coordenadas, bloqueando marcações feitas a mais de 100 metros daqui.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end pt-1">
                <Input
                  label="Latitude"
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: -8.760759"
                  {...register('latitude')}
                  error={errors.latitude?.message}
                />
                
                <Input
                  label="Longitude"
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: -63.903931"
                  {...register('longitude')}
                  error={errors.longitude?.message}
                />

              </div>

              {/* Preview de verificação das coordenadas */}
              {(() => {
                const lat = watch('latitude');
                const lng = watch('longitude');
                if (!lat || !lng) return null;
                const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                const isValidBrazilish = Number(lat) >= -34 && Number(lat) <= 5 && Number(lng) >= -74 && Number(lng) <= -28;
                return (
                  <div className={`flex items-start gap-3 p-3 rounded-lg border text-xs ${isValidBrazilish ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <MapPin size={16} className={`mt-0.5 shrink-0 ${isValidBrazilish ? 'text-green-600' : 'text-red-500'}`} />
                    <div className="flex-1 min-w-0">
                      {isValidBrazilish ? (
                        <p className="font-medium">Coordenadas válidas para o Brasil ✓</p>
                      ) : (
                        <p className="font-bold">⚠️ Atenção: coordenadas fora do território brasileiro!</p>
                      )}
                      <p className="text-[11px] mt-0.5 opacity-80">
                        Lat: <strong>{Number(lat).toFixed(6)}</strong> | Lng: <strong>{Number(lng).toFixed(6)}</strong>
                      </p>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 mt-1 font-semibold underline underline-offset-2 ${isValidBrazilish ? 'text-green-700 hover:text-green-900' : 'text-red-600 hover:text-red-800'}`}
                      >
                        <MapPin size={11} />
                        Verificar este ponto no Google Maps &#8594;
                      </a>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!navigator.geolocation) {
                        alert("Geolocalização não é suportada por este navegador.");
                        return;
                      }
                      
                      const confirmar = window.confirm("Deseja definir a localização atual deste dispositivo como o endereço oficial da empresa?");
                      if (!confirmar) return;

                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setValue('latitude', position.coords.latitude, { shouldDirty: true, shouldValidate: true });
                          setValue('longitude', position.coords.longitude, { shouldDirty: true, shouldValidate: true });
                          alert("Coordenadas obtidas com sucesso! Não se esqueça de salvar os dados abaixo no botão final da página.");
                        },
                        (error) => {
                          console.error(error);
                          alert("Não foi possível obter a localização. Certifique-se de que a permissão de GPS foi concedida no navegador.");
                        },
                        { enableHighAccuracy: true }
                      );
                    }}
                    className="w-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] text-xs"
                  >
                    <MapPin size={14} className="text-slate-500" />
                    GPS do Dispositivo
                  </Button>

                  <Button
                    type="button"
                    onClick={async () => {
                      const cep = watch('cep');
                      const logradouro = watch('logradouro');
                      const numero = watch('numero');
                      const complemento = watch('complemento');
                      const bairro = watch('bairro');
                      const cidade = watch('cidade');
                      const estado = watch('estado');
                      
                      if (!cep || !cidade || !estado) {
                        alert("Por favor, preencha pelo menos o CEP, Cidade e Estado antes de buscar.");
                        return;
                      }

                      setIsBuscandoEndereco(true);
                      
                      const cleanCep = cep.replace(/\D/g, '');

                      // Mapa de UF -> nome completo do estado para validação via reverse geocoding
                      const ufParaNome: Record<string, string[]> = {
                        RO: ['rondônia', 'rondonia'], AC: ['acre'], AM: ['amazonas'], RR: ['roraima'],
                        PA: ['pará', 'para'], AP: ['amapá', 'amapa'], TO: ['tocantins'], MA: ['maranhão', 'maranhao'],
                        PI: ['piauí', 'piaui'], CE: ['ceará', 'ceara'], RN: ['rio grande do norte'],
                        PB: ['paraíba', 'paraiba'], PE: ['pernambuco'], AL: ['alagoas'], SE: ['sergipe'],
                        BA: ['bahia'], MG: ['minas gerais'], ES: ['espírito santo', 'espirito santo'],
                        RJ: ['rio de janeiro'], SP: ['são paulo', 'sao paulo'], PR: ['paraná', 'parana'],
                        SC: ['santa catarina'], RS: ['rio grande do sul'], MS: ['mato grosso do sul'],
                        MT: ['mato grosso'], GO: ['goiás', 'goias'], DF: ['distrito federal'],
                      };
                      const estadoUF = estado.trim().toUpperCase();
                      const nomesEstado = ufParaNome[estadoUF] ?? [];

                      // Função para validar se o resultado pertence ao estado correto
                      const resultadoEDoEstado = (displayName: string): boolean => {
                        if (nomesEstado.length === 0) return true; // sem mapa, aceita qualquer
                        const lower = displayName.toLowerCase();
                        return nomesEstado.some(n => lower.includes(n));
                      };

                      // Helper para buscar via Nominatim e retornar resultado filtrado por estado
                      const buscarNominatim = async (params: string): Promise<{ latitude: number; longitude: number } | null> => {
                        try {
                          const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&limit=5&${params}`;
                          const res = await fetch(url, { headers: { 'User-Agent': 'SGPF-Bakery-App/1.0' } });
                          const data: any[] = await res.json();
                          if (!data || data.length === 0) return null;

                          // Prioriza resultado que bata com o estado do formulário
                          const match = data.find(r => resultadoEDoEstado(r.display_name)) ?? null;
                          if (!match) return null;

                          console.log('[GEOCODE] Resultado aceito:', match.display_name);
                          return { latitude: parseFloat(match.lat), longitude: parseFloat(match.lon) };
                        } catch {
                          return null;
                        }
                      };

                      let coordenadasEncontradas: { latitude: number; longitude: number } | null = null;

                      // Tentativa 1: CEP estruturado (mais preciso, evita conflito entre estados)
                      if (!coordenadasEncontradas && cleanCep.length === 8) {
                        coordenadasEncontradas = await buscarNominatim(`postalcode=${cleanCep}&countrycodes=br`);
                        if (coordenadasEncontradas) console.log('[GEOCODE] Achou via CEP estruturado');
                      }

                      // Tentativa 2: Logradouro + cidade + estado estruturado
                      if (!coordenadasEncontradas && logradouro) {
                        const street = encodeURIComponent(`${numero ? numero + ' ' : ''}${logradouro}`);
                        const city = encodeURIComponent(cidade);
                        const stateParam = encodeURIComponent(cidade); // usa cidade pois Nominatim aceita melhor
                        coordenadasEncontradas = await buscarNominatim(
                          `street=${street}&city=${city}&state=${encodeURIComponent(estado)}&countrycodes=br`
                        );
                        if (coordenadasEncontradas) console.log('[GEOCODE] Achou via logradouro estruturado');
                      }

                      // Tentativa 3: Cidade + estado em texto livre (fallback)
                      if (!coordenadasEncontradas) {
                        coordenadasEncontradas = await buscarNominatim(
                          `q=${encodeURIComponent(`${cidade}, ${estado}, Brasil`)}`
                        );
                        if (coordenadasEncontradas) console.log('[GEOCODE] Achou via cidade+estado');
                      }

                      setIsBuscandoEndereco(false);

                      if (coordenadasEncontradas) {
                        setValue('latitude', coordenadasEncontradas.latitude, { shouldDirty: true, shouldValidate: true });
                        setValue('longitude', coordenadasEncontradas.longitude, { shouldDirty: true, shouldValidate: true });
                        alert(`Coordenadas encontradas para ${cidade}/${estadoUF}!\n\nVerifique o link do Google Maps abaixo antes de salvar.`);
                      } else {
                        alert(`Não encontramos coordenadas para ${cidade}/${estadoUF}.\n\nUse "GPS do Dispositivo" estando na empresa para máxima precisão.`);
                      }
                    }}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-medium py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] text-xs"
                    disabled={isBuscandoEndereco}
                  >
                    {isBuscandoEndereco ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <MapPin size={14} className="text-blue-500" />
                        Buscar por Endereço
                      </>
                    )}
                  </Button>
                </div>
            </div>
            
            <div className="col-span-1 md:col-span-2 mt-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Identidade Visual</h3>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Upload da Logo (Opcional)</label>
              <div className="flex items-center gap-4">
                <label className="flex-1 flex items-center justify-center h-12 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-blue-50 hover:border-blue-400 transition-all">
                  <span className="text-sm font-medium text-slate-500">
                    {isCompressing ? (
                      <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> Otimizando imagem...</span>
                    ) : (
                      "Clique para anexar a imagem da Logo (JPG, PNG)"
                    )}
                  </span>
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png" disabled={isCompressing} onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setIsCompressing(true);
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const base64 = reader.result as string;
                        // Comprime para no máximo 150px (tamanho ideal e leve de logo)
                        const compressed = await compressImage(base64, 150, 150);
                        setValue('logoUrl', compressed, { shouldDirty: true });
                        setIsCompressing(false);
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
              <p className="text-xs text-slate-500 mt-2">A logo enviada será otimizada automaticamente e impressa no cabeçalho do PDF do contracheque.</p>
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
