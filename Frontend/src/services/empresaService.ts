import api from './api';

export interface EmpresaConfig {
  id?: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  telefone: string;
  email: string;
  endereco: string;
  logoUrl?: string;
  latitude?: number;
  longitude?: number;
}

let _cachedConfig: EmpresaConfig | null = null;

export const empresaService = {
  // Pega a primeira empresa configurada com cache em memória
  getConfig: async (): Promise<EmpresaConfig | null> => {
    if (_cachedConfig) return _cachedConfig;
    
    const { data } = await api.get<EmpresaConfig[]>('/Empresas');
    _cachedConfig = data.length > 0 ? data[0] : null;
    return _cachedConfig;
  },

  // Cria ou atualiza a empresa
  saveConfig: async (config: EmpresaConfig): Promise<EmpresaConfig> => {
    let result: EmpresaConfig;
    if (config.id && config.id !== '00000000-0000-0000-0000-000000000000') {
      const { data } = await api.put<EmpresaConfig>(`/Empresas/${config.id}`, config);
      result = data;
    } else {
      const { data } = await api.post<EmpresaConfig>('/Empresas', config);
      result = data;
    }
    _cachedConfig = result;
    return result;
  },

  // Limpa o cache se necessário
  clearCache: () => {
    _cachedConfig = null;
  }
};

