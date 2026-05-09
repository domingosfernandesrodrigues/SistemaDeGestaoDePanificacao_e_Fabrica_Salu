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
  pixChave?: string;
  bancoNome?: string;
  bancoAgencia?: string;
  bancoConta?: string;
  gatewayToken?: string;
}

export const empresaService = {
  // Pega a primeira empresa configurada
  getConfig: async (): Promise<EmpresaConfig | null> => {
    const { data } = await api.get<EmpresaConfig[]>('/Empresas');
    return data.length > 0 ? data[0] : null;
  },

  // Cria ou atualiza a empresa
  saveConfig: async (config: EmpresaConfig): Promise<EmpresaConfig> => {
    if (config.id && config.id !== '00000000-0000-0000-0000-000000000000') {
      const { data } = await api.put<EmpresaConfig>(`/Empresas/${config.id}`, config);
      return data;
    } else {
      const { data } = await api.post<EmpresaConfig>('/Empresas', config);
      return data;
    }
  }
};
