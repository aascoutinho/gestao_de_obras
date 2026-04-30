export type MainMenu = 'DASHBOARD' | 'PROJECTS' | 'ANALYSIS' | 'HISTOGRAM';

export interface Project {
  id: string;
  name: string;
  location: string;
  client: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  contractValue: number;
}

export interface Team {
  id: string;
  projectId: string;
  name: string;
  leader: string;
  membersCount: number;
}

export interface Workforce {
  role: string;
  count: number;
}

export interface Equipment {
  name: string;
  count: number;
}

export interface Activity {
  description: string;
  status: 'DONE' | 'IN_PROGRESS' | 'PENDING';
}

export interface Occurrence {
  type: 'WEATHER' | 'ACCIDENT' | 'SUPPLY' | 'TECHNICAL' | 'OTHER';
  description: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RDOData {
  id: string;
  projectId: string; // Adicionado para facilitar filtros
  teamId: string;
  date: string;
  shift: 'DAY' | 'NIGHT';
  weather: 'SUNNY' | 'CLOUDY' | 'RAINY';
  workforce: Workforce[];
  equipment: Equipment[];
  activities: Activity[];
  occurrences: Occurrence[];
  notes?: string;
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
  sourceGroup: HistogramSourceGroup;
  name: string;
  normalizedName: string;
  peakQty: number;
  monthlyPlan: HistogramMonthlyPlan[];
  source: HistogramSource;
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
