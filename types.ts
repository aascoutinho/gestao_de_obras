export type MainMenu = 'DASHBOARD' | 'PROJECTS' | 'ANALYSIS' | 'HISTOGRAM';

export interface Project {
  id: string;
  name: string;
  location?: string;
  client?: string;
  startDate?: string;
  endDate?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  contractValue?: number;
  regional?: string;
  budgetValue?: number;
  forecastValue?: number;
  createdAt: string;
  address?: string;
  services: ServiceItem[];
}

export interface ServiceItem {
  code: string;
  scope: string;
  unit: string;
  value: number;
}

export interface Team {
  id: string;
  projectId: string;
  name: string;
  leader?: string;
  membersCount?: number;
  createdAt: string;
}

export interface Workforce {
  role: string;
  count: number;
  totalHours?: number;
}

export interface WorkerGroup {
  role: string;
  count: number;
  totalHours?: number;
}

export interface Equipment {
  name: string;
  count: number;
  hoursOperated?: number;
}

export interface Activity {
  description: string;
  status: 'DONE' | 'IN_PROGRESS' | 'PENDING' | string;
  code?: string;
  quantity?: number;
  progress?: number;
}

export interface Occurrence {
  type?: string;
  description: string;
  impact?: 'LOW' | 'MEDIUM' | 'HIGH';
  impactTimeMinutes?: number;
}

// Typo fallback for older components
export type Occurence = Occurrence;

export interface RDOData {
  id: string;
  projectId?: string;
  teamId: string;
  date: string;
  reportNumber?: string;
  shift?: 'DAY' | 'NIGHT';
  weather?: string;
  weatherMorning?: string;
  weatherAfternoon?: string;
  rainIndexMm?: number;
  workforce: Workforce[];
  equipment: Equipment[];
  activities: Activity[];
  occurrences: Occurrence[];
  notes?: string;
  comments?: string;
  contractNumber?: string;
  processedAt?: string;
  synced?: boolean;
}

// --- Histogram Analysis Types ---

export type HistogramCategory =
  | 'MAO_OBRA_DIRETA'
  | 'MAO_OBRA_INDIRETA'
  | 'EQUIPAMENTOS';

export type HistogramStatus =
  | 'OK'
  | 'ABAIXO'
  | 'ACIMA'
  | 'NAO_PLANEJADO'
  | 'SEM_APONTAMENTO';

export type HistogramSource =
  | 'RDO_GENERATED'
  | 'MANUAL'
  | 'COMMERCIAL_IMPORT';

export type HistogramSourceGroup =
  | 'WORKFORCE'
  | 'EQUIPMENT'
  | 'MANUAL';

export interface HistogramMonthlyPlan {
  monthKey: string;
  monthLabel: string;
  quantity: number;
}

export interface HistogramItem {
  id: string;
  projectId: string;
  category: HistogramCategory;
  sourceGroup?: HistogramSourceGroup;
  name: string;
  normalizedName: string;
  peakQty: number;
  monthlyPlan: HistogramMonthlyPlan[];
  source?: HistogramSource;
}

export interface HistogramAnalysisRow {
  itemName: string;
  normalizedName: string;
  category: HistogramCategory;
  peakQty: number;
  plannedQty: number;
  actualQty: number;
  deviationQty: number;
  deviationPercent: number;
  status: HistogramStatus;
}

export interface HistogramAnalysisSummary {
  totalItems: number;
  okItems: number;
  belowItems: number;
  aboveItems: number;
  notPlannedItems: number;
  missingItems: number;
  adherencePercent: number;
  directLaborAdherencePercent: number;
  indirectLaborAdherencePercent: number;
  equipmentAdherencePercent: number;
}
