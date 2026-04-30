
import { Project, Team, RDOData } from '../types';

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-infra-norte',
    name: 'Infra Norte - Trecho ZAR-TMI',
    createdAt: new Date().toISOString(),
    address: 'Trecho ZAR-TMI',
    regional: 'Regional Norte', // Added Regional
    services: [
      { code: '3000782', scope: 'SERV MO HH EXTRA ENCAR TURMA FIXA', unit: 'HH', value: 162.84 },
      { code: '3000310', scope: 'SERV MO JORNADA EXTRA DIURNA', unit: 'HH', value: 87.62 },
      { code: '3004016', scope: 'SERV LOCAC ESCAVAD HIDR 22-26TON C/MO', unit: 'H', value: 426.65 },
      { code: '3002123', scope: 'ROÇADA MANUAL E MECANIZADA', unit: 'M2', value: 20.52 },
      { code: '3004199', scope: 'km pronto manutenção preventiva cortes', unit: 'KM', value: 62047.36 },
      { code: '3003983', scope: 'ESCAVAÇÃO DE MATERIAL DE 1/2ª CATEGORIA', unit: 'm³', value: 35.82 },
      { code: '3004279', scope: 'SERV DE CORTE E PODA DE ARVORES', unit: 'UR', value: 380.66 }
    ]
  }
];

export const MOCK_TEAMS: Team[] = [
  {
    id: 'team-william',
    projectId: 'proj-infra-norte',
    name: 'Equipe William',
    createdAt: new Date().toISOString()
  },
  {
    id: 'team-jorge',
    projectId: 'proj-infra-norte',
    name: 'Equipe Jorge',
    createdAt: new Date().toISOString()
  }
];

export const MOCK_RDOS: RDOData[] = [
  // RDO 95 - Team William
  {
    id: 'rdo-95',
    teamId: 'team-william',
    processedAt: new Date().toISOString(),
    reportNumber: '95',
    date: '07/02/2026',
    contractNumber: 'CW61180',
    weatherMorning: 'Chuvoso',
    weatherAfternoon: 'Chuvoso',
    rainIndexMm: 30,
    workforce: [
      { role: 'Assistente de Boletim', count: 2, totalHours: 24 },
      { role: 'Encarregado Obras Manutenção', count: 1, totalHours: 17 },
      { role: 'Ajudante Geral', count: 3, totalHours: 35 },
      { role: 'Operador de Máquinas', count: 2, totalHours: 30 },
      { role: 'Oficial', count: 1, totalHours: 17 },
      { role: 'Motorista', count: 1, totalHours: 17 }
    ],
    equipment: [
      { name: 'Caminhão Casinha', count: 1, hoursOperated: 18 },
      { name: 'Escavadeira Hidráulica', count: 1, hoursOperated: 18 }
    ],
    activities: [
      { code: '3000782', description: 'SERV MO HH EXTRA ENCAR TURMA FIXA', progress: 1, quantity: 8, status: 'Em Andamento' },
      { code: '3000310', description: 'SERV MO JORNADA EXTRA DIURNA', progress: 0, quantity: 0, status: 'Não iniciada' },
      { code: '3004016', description: 'SERV LOCAC ESCAVAD HIDR 22-26TON C/MO', progress: 0, quantity: 0, status: 'Não iniciada' }
    ],
    occurrences: [],
    comments: 'Equipe das 06:00 as 16:00 serviço de reconstrução de erosão km 103.'
  },
  // RDO 40 - Team Jorge (Same Project, different team to show hierarchy)
  {
    id: 'rdo-40',
    teamId: 'team-jorge',
    processedAt: new Date().toISOString(),
    reportNumber: '40',
    date: '07/02/2026',
    contractNumber: 'CW61180',
    weatherMorning: 'Claro',
    weatherAfternoon: 'Claro',
    rainIndexMm: 0,
    workforce: [
        { role: 'Assistente de Boletim', count: 1, totalHours: 9 },
        { role: 'Operador de Máquinas', count: 3, totalHours: 27 }
    ],
    equipment: [
        { name: 'Escavadeira Hidráulica', count: 2, hoursOperated: 13 }
    ],
    activities: [
        { code: '3003983', description: 'SERV ESCAV MAT 1 E 2 CATEG', progress: 5, quantity: 240, status: 'Em Andamento' }
    ],
    occurrences: [],
    comments: 'Limpeza de aterro pronto 430+277ao430+500.'
  }
];
