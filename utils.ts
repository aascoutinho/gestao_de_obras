import { Project, RDOData, ServiceItem } from './types';

export const formatMoney = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const parseDate = (dateStr: string) => {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
};

export const getServiceByCode = (project: Project, code: string): ServiceItem | undefined => {
  if (!project.services) return undefined;
  return project.services.find(s => s.code.trim() === code.trim());
};

export const calculateRDOTotal = (rdo: RDOData, project?: Project) => {
  if (!project || !project.services) return 0;
  let total = 0;
  rdo.activities.forEach(act => {
    if (act.code && act.quantity) {
      const service = getServiceByCode(project, act.code);
      if (service) {
        total += service.value * act.quantity;
      }
    }
  });
  return total;
};

/**
 * Generates a UUID v4.
 * Includes a fallback for non-secure contexts (HTTP/IP) where crypto.randomUUID is unavailable.
 */
export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation for non-secure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
