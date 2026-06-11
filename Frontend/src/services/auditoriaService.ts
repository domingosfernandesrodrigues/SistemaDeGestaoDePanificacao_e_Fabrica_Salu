import api from './api';

export interface AuditLog {
  id: string;
  tableName: string;
  action: string;
  keyValues: string;
  oldValues: string | null;
  newValues: string | null;
  timestamp: string;
  userId: string | null;
  userName: string | null;
}

export interface AuditLogsResponse {
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: AuditLog[];
}

export interface AuditFilters {
  tableName?: string;
  action?: string;
  userName?: string;
  startDate?: string;
  endDate?: string;
  numeroPedido?: string;
  page?: number;
  pageSize?: number;
}

export const auditoriaService = {
  getLogs: async (filters: AuditFilters): Promise<AuditLogsResponse> => {
    const { data } = await api.get<AuditLogsResponse>('/Auditoria', { params: filters });
    return data;
  },

  getAuditedTables: async (): Promise<string[]> => {
    const { data } = await api.get<string[]>('/Auditoria/tables');
    return data;
  }
};
