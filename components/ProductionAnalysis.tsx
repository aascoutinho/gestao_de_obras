import React, { useMemo, useState } from 'react';
import { Project, RDOData, Team } from '../types';
import { parseDate } from '../utils';
import {
  Calendar,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trash2,
  Filter,
  Users,
  Truck,
  Clock,
  AlertTriangle,
  Building2,
  X
} from 'lucide-react';

interface ProductionAnalysisProps {
  projects: Project[];
  rdos: RDOData[];
  teams: Team[];
  filterStartDate: string;
  setFilterStartDate: (date: string) => void;
  filterEndDate: string;
  setFilterEndDate: (date: string) => void;
  filterRegional: string;
  setFilterRegional: (reg: string) => void;
  filterProject: string;
  setFilterProject: (projId: string) => void;
  filterTeam: string;
  setFilterTeam: (teamId: string) => void;
  onOpenRdoDetail: (rdo: RDOData) => void;
}

interface DailySummary {
  date: string;
  activeTeams: number;
  totalWorkers: number;
  totalManHours: number;
  totalMachines: number;
  totalMachineHours: number;
  totalOccurrences: number;
  occurrenceImpactMinutes: number;
  avgRainMm: number;
}

interface TeamSummary {
  teamId: string;
  teamName: string;
  daysWithRdo: number;
  totalWorkers: number;
  totalManHours: number;
  totalMachines: number;
  totalMachineHours: number;
  totalOccurrences: number;
  occurrenceImpactMinutes: number;
}

interface EquipmentSummary {
  name: string;
  totalCount: number;
  totalHours: number;
  usageRecords: number;
}

interface RoleSummary {
  role: string;
  daysWithRecords: number;
  totalWorkers: number;
  totalManHours: number;
  avgWorkersPerDay: number;
}

interface DayTeamDetail {
  teamId: string;
  teamName: string;
  projectName: string;
  rdosCount: number;
  workers: number;
  manHours: number;
  machines: number;
  machineHours: number;
  occurrences: number;
  impactMinutes: number;
}

const formatDecimal = (value: number, digits = 1) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);

export const ProductionAnalysis: React.FC<ProductionAnalysisProps> = ({
  projects,
  rdos,
  teams,
  filterStartDate,
  setFilterStartDate,
  filterEndDate,
  setFilterEndDate,
  filterRegional,
  setFilterRegional,
  filterProject,
  setFilterProject,
  filterTeam,
  setFilterTeam,
  onOpenRdoDetail
}) => {
  const [showDailyBreakdown, setShowDailyBreakdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const availableRegionals = useMemo(
    () => Array.from(new Set(projects.map((p) => p.regional || 'Sem Regional').filter(Boolean))).sort(),
    [projects]
  );

  const availableProjects = useMemo(
    () =>
      projects
        .filter((p) => filterRegional === 'all' || (p.regional || 'Sem Regional') === filterRegional)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [projects, filterRegional]
  );

  const availableTeams = useMemo(() => {
    return teams
      .filter((t) => {
        if (filterProject !== 'all') return t.projectId === filterProject;

        if (filterRegional === 'all') return true;

        const project = projectById.get(t.projectId);
        if (!project) return false;

        return (project.regional || 'Sem Regional') === filterRegional;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, filterProject, filterRegional, projectById]);

  const filteredRdos = useMemo(() => {
    let result = rdos;

    if (filterStartDate) {
      const start = new Date(filterStartDate + 'T00:00:00');
      result = result.filter((r) => parseDate(r.date) >= start);
    }

    if (filterEndDate) {
      const end = new Date(filterEndDate + 'T23:59:59');
      result = result.filter((r) => parseDate(r.date) <= end);
    }

    result = result.filter((r) => {
      const team = teamById.get(r.teamId);
      if (!team) return false;

      const project = projectById.get(team.projectId);
      if (!project) return false;

      const matchesRegional = filterRegional === 'all' || (project.regional || 'Sem Regional') === filterRegional;
      const matchesProject = filterProject === 'all' || project.id === filterProject;
      const matchesTeam = filterTeam === 'all' || r.teamId === filterTeam;

      return matchesRegional && matchesProject && matchesTeam;
    });

    return result;
  }, [rdos, filterStartDate, filterEndDate, filterRegional, filterProject, filterTeam, teamById, projectById]);

  const dailySummaries = useMemo<DailySummary[]>(() => {
    const byDate = new Map<
      string,
      {
        teamIds: Set<string>;
        workers: number;
        manHours: number;
        machines: number;
        machineHours: number;
        occurrences: number;
        occurrenceImpact: number;
        rainSum: number;
        entries: number;
      }
    >();

    filteredRdos.forEach((rdo) => {
      const workers = rdo.workforce.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const manHours = rdo.workforce.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
      const machines = rdo.equipment.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const machineHours = rdo.equipment.reduce((acc, curr) => acc + (curr.hoursOperated || 0), 0);
      const occurrences = (rdo.occurrences || []).length;
      const occurrenceImpact = (rdo.occurrences || []).reduce((acc, curr) => acc + (curr.impactTimeMinutes || 0), 0);

      if (!byDate.has(rdo.date)) {
        byDate.set(rdo.date, {
          teamIds: new Set<string>(),
          workers: 0,
          manHours: 0,
          machines: 0,
          machineHours: 0,
          occurrences: 0,
          occurrenceImpact: 0,
          rainSum: 0,
          entries: 0
        });
      }

      const day = byDate.get(rdo.date)!;
      day.teamIds.add(rdo.teamId);
      day.workers += workers;
      day.manHours += manHours;
      day.machines += machines;
      day.machineHours += machineHours;
      day.occurrences += occurrences;
      day.occurrenceImpact += occurrenceImpact;
      day.rainSum += rdo.rainIndexMm || 0;
      day.entries += 1;
    });

    return Array.from(byDate.entries())
      .map(([date, bucket]) => ({
        date,
        activeTeams: bucket.teamIds.size,
        totalWorkers: bucket.workers,
        totalManHours: bucket.manHours,
        totalMachines: bucket.machines,
        totalMachineHours: bucket.machineHours,
        totalOccurrences: bucket.occurrences,
        occurrenceImpactMinutes: bucket.occurrenceImpact,
        avgRainMm: bucket.entries > 0 ? bucket.rainSum / bucket.entries : 0
      }))
      .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  }, [filteredRdos]);

  const teamSummaries = useMemo<TeamSummary[]>(() => {
    const byTeam = new Map<
      string,
      {
        name: string;
        days: Set<string>;
        workers: number;
        manHours: number;
        machines: number;
        machineHours: number;
        occurrences: number;
        occurrenceImpact: number;
      }
    >();

    filteredRdos.forEach((rdo) => {
      const team = teamById.get(rdo.teamId);
      const teamName = team?.name || 'Equipe removida';

      if (!byTeam.has(rdo.teamId)) {
        byTeam.set(rdo.teamId, {
          name: teamName,
          days: new Set<string>(),
          workers: 0,
          manHours: 0,
          machines: 0,
          machineHours: 0,
          occurrences: 0,
          occurrenceImpact: 0
        });
      }

      const workers = rdo.workforce.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const manHours = rdo.workforce.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
      const machines = rdo.equipment.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const machineHours = rdo.equipment.reduce((acc, curr) => acc + (curr.hoursOperated || 0), 0);
      const occurrences = (rdo.occurrences || []).length;
      const occurrenceImpact = (rdo.occurrences || []).reduce((acc, curr) => acc + (curr.impactTimeMinutes || 0), 0);

      const summary = byTeam.get(rdo.teamId)!;
      summary.days.add(rdo.date);
      summary.workers += workers;
      summary.manHours += manHours;
      summary.machines += machines;
      summary.machineHours += machineHours;
      summary.occurrences += occurrences;
      summary.occurrenceImpact += occurrenceImpact;
    });

    return Array.from(byTeam.entries())
      .map(([teamId, value]) => ({
        teamId,
        teamName: value.name,
        daysWithRdo: value.days.size,
        totalWorkers: value.workers,
        totalManHours: value.manHours,
        totalMachines: value.machines,
        totalMachineHours: value.machineHours,
        totalOccurrences: value.occurrences,
        occurrenceImpactMinutes: value.occurrenceImpact
      }))
      .sort((a, b) => b.totalManHours - a.totalManHours);
  }, [filteredRdos, teamById]);

  const equipmentSummaries = useMemo<EquipmentSummary[]>(() => {
    const byEquipment = new Map<string, { count: number; hours: number; records: number }>();

    filteredRdos.forEach((rdo) => {
      rdo.equipment.forEach((eq) => {
        const name = (eq.name || '').trim() || 'Nao informado';

        if (!byEquipment.has(name)) {
          byEquipment.set(name, { count: 0, hours: 0, records: 0 });
        }

        const summary = byEquipment.get(name)!;
        summary.count += eq.count || 0;
        summary.hours += eq.hoursOperated || 0;
        summary.records += 1;
      });
    });

    return Array.from(byEquipment.entries())
      .map(([name, value]) => ({
        name,
        totalCount: value.count,
        totalHours: value.hours,
        usageRecords: value.records
      }))
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredRdos]);

  const roleSummaries = useMemo<RoleSummary[]>(() => {
    const byRole = new Map<string, { days: Set<string>; workers: number; manHours: number }>();

    filteredRdos.forEach((rdo) => {
      rdo.workforce.forEach((worker) => {
        const role = (worker.role || '').trim() || 'Nao informado';

        if (!byRole.has(role)) {
          byRole.set(role, { days: new Set<string>(), workers: 0, manHours: 0 });
        }

        const summary = byRole.get(role)!;
        summary.days.add(rdo.date);
        summary.workers += worker.count || 0;
        summary.manHours += worker.totalHours || 0;
      });
    });

    return Array.from(byRole.entries())
      .map(([role, value]) => ({
        role,
        daysWithRecords: value.days.size,
        totalWorkers: value.workers,
        totalManHours: value.manHours,
        avgWorkersPerDay: value.days.size > 0 ? value.workers / value.days.size : 0
      }))
      .sort((a, b) => b.totalManHours - a.totalManHours);
  }, [filteredRdos]);

  const kpis = useMemo(() => {
    const totalDays = dailySummaries.length;
    const totalRdos = filteredRdos.length;
    const uniqueTeams = new Set(filteredRdos.map((r) => r.teamId)).size;

    const totalWorkers = dailySummaries.reduce((acc, d) => acc + d.totalWorkers, 0);
    const totalManHours = dailySummaries.reduce((acc, d) => acc + d.totalManHours, 0);
    const totalMachines = dailySummaries.reduce((acc, d) => acc + d.totalMachines, 0);
    const totalMachineHours = dailySummaries.reduce((acc, d) => acc + d.totalMachineHours, 0);
    const totalOccurrences = dailySummaries.reduce((acc, d) => acc + d.totalOccurrences, 0);

    const avgTeamsPerDay = totalDays > 0 ? dailySummaries.reduce((acc, d) => acc + d.activeTeams, 0) / totalDays : 0;
    const avgMachinesPerDay = totalDays > 0 ? totalMachines / totalDays : 0;

    return {
      totalDays,
      totalRdos,
      uniqueTeams,
      totalWorkers,
      totalManHours,
      totalMachines,
      totalMachineHours,
      totalOccurrences,
      avgTeamsPerDay,
      avgMachinesPerDay
    };
  }, [dailySummaries, filteredRdos]);

  const selectedDaySummary = useMemo(
    () => (selectedDate ? dailySummaries.find((d) => d.date === selectedDate) || null : null),
    [selectedDate, dailySummaries]
  );

  const selectedDayRdos = useMemo(() => {
    if (!selectedDate) return [];

    return filteredRdos
      .filter((r) => r.date === selectedDate)
      .slice()
      .sort((a, b) => Number(a.reportNumber || 0) - Number(b.reportNumber || 0));
  }, [selectedDate, filteredRdos]);

  const selectedDayTeamDetails = useMemo<DayTeamDetail[]>(() => {
    if (!selectedDate) return [];

    const byTeam = new Map<
      string,
      {
        teamName: string;
        projectName: string;
        rdosCount: number;
        workers: number;
        manHours: number;
        machines: number;
        machineHours: number;
        occurrences: number;
        impactMinutes: number;
      }
    >();

    selectedDayRdos.forEach((rdo) => {
      const team = teamById.get(rdo.teamId);
      const project = team ? projectById.get(team.projectId) : undefined;
      const teamName = team?.name || 'Equipe removida';
      const projectName = project?.name || 'Obra removida';

      if (!byTeam.has(rdo.teamId)) {
        byTeam.set(rdo.teamId, {
          teamName,
          projectName,
          rdosCount: 0,
          workers: 0,
          manHours: 0,
          machines: 0,
          machineHours: 0,
          occurrences: 0,
          impactMinutes: 0
        });
      }

      const workers = rdo.workforce.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const manHours = rdo.workforce.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
      const machines = rdo.equipment.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const machineHours = rdo.equipment.reduce((acc, curr) => acc + (curr.hoursOperated || 0), 0);
      const occurrences = (rdo.occurrences || []).length;
      const impactMinutes = (rdo.occurrences || []).reduce((acc, curr) => acc + (curr.impactTimeMinutes || 0), 0);

      const summary = byTeam.get(rdo.teamId)!;
      summary.rdosCount += 1;
      summary.workers += workers;
      summary.manHours += manHours;
      summary.machines += machines;
      summary.machineHours += machineHours;
      summary.occurrences += occurrences;
      summary.impactMinutes += impactMinutes;
    });

    return Array.from(byTeam.entries())
      .map(([teamId, value]) => ({
        teamId,
        teamName: value.teamName,
        projectName: value.projectName,
        rdosCount: value.rdosCount,
        workers: value.workers,
        manHours: value.manHours,
        machines: value.machines,
        machineHours: value.machineHours,
        occurrences: value.occurrences,
        impactMinutes: value.impactMinutes
      }))
      .sort((a, b) => b.manHours - a.manHours);
  }, [selectedDate, selectedDayRdos, teamById, projectById]);

  const selectedDayRoleDetails = useMemo<RoleSummary[]>(() => {
    if (!selectedDate) return [];

    const byRole = new Map<string, { days: Set<string>; workers: number; manHours: number }>();

    selectedDayRdos.forEach((rdo) => {
      rdo.workforce.forEach((worker) => {
        const role = (worker.role || '').trim() || 'Nao informado';

        if (!byRole.has(role)) {
          byRole.set(role, { days: new Set<string>(), workers: 0, manHours: 0 });
        }

        const summary = byRole.get(role)!;
        summary.days.add(rdo.date);
        summary.workers += worker.count || 0;
        summary.manHours += worker.totalHours || 0;
      });
    });

    return Array.from(byRole.entries())
      .map(([role, value]) => ({
        role,
        daysWithRecords: value.days.size,
        totalWorkers: value.workers,
        totalManHours: value.manHours,
        avgWorkersPerDay: value.days.size > 0 ? value.workers / value.days.size : 0
      }))
      .sort((a, b) => b.totalManHours - a.totalManHours);
  }, [selectedDate, selectedDayRdos]);

  const selectedDayEquipmentDetails = useMemo<EquipmentSummary[]>(() => {
    if (!selectedDate) return [];

    const byEquipment = new Map<string, { count: number; hours: number; records: number }>();

    selectedDayRdos.forEach((rdo) => {
      rdo.equipment.forEach((eq) => {
        const name = (eq.name || '').trim() || 'Nao informado';

        if (!byEquipment.has(name)) {
          byEquipment.set(name, { count: 0, hours: 0, records: 0 });
        }

        const summary = byEquipment.get(name)!;
        summary.count += eq.count || 0;
        summary.hours += eq.hoursOperated || 0;
        summary.records += 1;
      });
    });

    return Array.from(byEquipment.entries())
      .map(([name, value]) => ({
        name,
        totalCount: value.count,
        totalHours: value.hours,
        usageRecords: value.records
      }))
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [selectedDate, selectedDayRdos]);

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col lg:flex-row gap-6 items-end lg:items-center justify-between shadow-2xl shadow-blue-900/10">
        <div className="flex flex-col md:flex-row gap-6 w-full">
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">De</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
            />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ate</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
            />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-52">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Regional</label>
            <div className="relative group">
              <select
                value={filterRegional}
                onChange={(e) => {
                  setFilterRegional(e.target.value);
                  setFilterProject('all');
                  setFilterTeam('all');
                }}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">
                  Todas as Regionais
                </option>
                {availableRegionals.map((r) => (
                  <option key={r} value={r} className="bg-slate-900">
                    {r}
                  </option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-64">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Obra</label>
            <div className="relative group">
              <select
                value={filterProject}
                onChange={(e) => {
                  setFilterProject(e.target.value);
                  setFilterTeam('all');
                }}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">
                  Todas as Obras
                </option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900">
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-64">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Equipe</label>
            <div className="relative group">
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">
                  Todas as Equipes
                </option>
                {availableTeams.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900">
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setFilterStartDate('');
              setFilterEndDate('');
              setFilterRegional('all');
              setFilterProject('all');
              setFilterTeam('all');
            }}
            className="p-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all duration-300 border border-white/5"
            title="Limpar Filtros"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {filteredRdos.length === 0 ? (
        <div className="py-28 glass-panel rounded-[40px] border border-dashed border-white/10 flex flex-col items-center justify-center text-center px-6">
          <div className="bg-blue-500/10 p-8 rounded-full mb-8 shadow-inner border border-blue-500/20">
            <Building2 className="w-14 h-14 text-blue-400 opacity-60" />
          </div>
          <h4 className="text-2xl font-black text-white mb-3 tracking-tight">Sem Dados no Filtro</h4>
          <p className="text-slate-500 max-w-md leading-relaxed font-medium">
            Nao foram encontrados RDOs para os filtros selecionados. Ajuste o periodo, regional, obra ou equipe.
          </p>
          <div className="mt-8 flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest py-2 px-4 bg-blue-500/5 rounded-full border border-blue-500/10">
            <Filter className="w-3 h-3" /> Revise os filtros superiores
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5 ml-1">
            <h2 className="text-3xl font-bold text-white tracking-tight">Analise de Quantificacao Operacional</h2>
            <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Consolidado diario de equipes e maquinas no periodo filtrado
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dias com RDO</p>
              <p className="text-2xl font-black text-white mt-2">{kpis.totalDays}</p>
              <p className="text-[10px] text-slate-500 mt-2">{kpis.totalRdos} RDOs no periodo</p>
            </div>
            <div className="glass-card p-5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Equipes Atendidas</p>
              <p className="text-2xl font-black text-blue-400 mt-2">{kpis.uniqueTeams}</p>
              <p className="text-[10px] text-slate-500 mt-2">Media {formatDecimal(kpis.avgTeamsPerDay)} equipes/dia</p>
            </div>
            <div className="glass-card p-5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Efetivo Total</p>
              <p className="text-2xl font-black text-emerald-400 mt-2">{kpis.totalWorkers}</p>
              <p className="text-[10px] text-slate-500 mt-2">{formatDecimal(kpis.totalManHours)} HH acumuladas</p>
            </div>
            <div className="glass-card p-5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Maquinas</p>
              <p className="text-2xl font-black text-amber-400 mt-2">{kpis.totalMachines}</p>
              <p className="text-[10px] text-slate-500 mt-2">Media {formatDecimal(kpis.avgMachinesPerDay)} maquinas/dia</p>
            </div>
            <div className="glass-card p-5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ocorrencias</p>
              <p className="text-2xl font-black text-red-400 mt-2">{kpis.totalOccurrences}</p>
              <p className="text-[10px] text-slate-500 mt-2">{formatDecimal(kpis.totalMachineHours)} h de maquinas</p>
            </div>
          </div>

          <div className="glass-panel rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" /> Quantificacao Diaria
              </h3>
              <button
                onClick={() => setShowDailyBreakdown((prev) => !prev)}
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-[10px] font-black text-slate-300 uppercase tracking-widest inline-flex items-center gap-2"
              >
                {showDailyBreakdown ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" /> Ocultar Detalhes
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" /> Mostrar Detalhes
                  </>
                )}
              </button>
            </div>
            {!showDailyBreakdown ? (
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dias consolidados</p>
                  <p className="text-xl font-black text-white mt-2">{dailySummaries.length}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Maior efetivo diario</p>
                  <p className="text-xl font-black text-emerald-300 mt-2">
                    {Math.max(...dailySummaries.map((d) => d.totalWorkers), 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Maior volume de maquinas</p>
                  <p className="text-xl font-black text-amber-300 mt-2">
                    {Math.max(...dailySummaries.map((d) => d.totalMachines), 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pico de ocorrencias</p>
                  <p className="text-xl font-black text-red-300 mt-2">
                    {Math.max(...dailySummaries.map((d) => d.totalOccurrences), 0)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[1100px]">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/5">
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Equipes</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pessoas</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">HH</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Maquinas</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Horas Maq.</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ocorr.</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Impacto (min)</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Chuva media (mm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {dailySummaries.map((day) => (
                      <tr key={day.date} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-6">
                          <button
                            onClick={() => setSelectedDate(day.date)}
                            className="text-white font-semibold hover:text-blue-300 transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-blue-300/50"
                          >
                            {day.date}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-center text-blue-300 font-black">{day.activeTeams}</td>
                        <td className="py-4 px-6 text-center text-slate-200 font-semibold">{day.totalWorkers}</td>
                        <td className="py-4 px-6 text-center text-emerald-300 font-semibold">{formatDecimal(day.totalManHours)}</td>
                        <td className="py-4 px-6 text-center text-amber-300 font-semibold">{day.totalMachines}</td>
                        <td className="py-4 px-6 text-center text-amber-200 font-semibold">{formatDecimal(day.totalMachineHours)}</td>
                        <td className="py-4 px-6 text-center text-red-300 font-semibold">{day.totalOccurrences}</td>
                        <td className="py-4 px-6 text-center text-red-200 font-semibold">{day.occurrenceImpactMinutes}</td>
                        <td className="py-4 px-6 text-center text-sky-300 font-semibold">{formatDecimal(day.avgRainMm)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="glass-panel rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" /> Consolidado por Equipe
                </h3>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No filtro atual</span>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[760px]">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/5">
                      <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe</th>
                      <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Dias</th>
                      <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pessoas</th>
                      <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">HH</th>
                      <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Maq.</th>
                      <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">H. Maq.</th>
                      <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ocorr.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {teamSummaries.map((team) => (
                      <tr key={team.teamId} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-5 text-white font-semibold">{team.teamName}</td>
                        <td className="py-4 px-5 text-center text-blue-300 font-semibold">{team.daysWithRdo}</td>
                        <td className="py-4 px-5 text-center text-slate-200 font-semibold">{team.totalWorkers}</td>
                        <td className="py-4 px-5 text-center text-emerald-300 font-semibold">{formatDecimal(team.totalManHours)}</td>
                        <td className="py-4 px-5 text-center text-amber-300 font-semibold">{team.totalMachines}</td>
                        <td className="py-4 px-5 text-center text-amber-200 font-semibold">{formatDecimal(team.totalMachineHours)}</td>
                        <td className="py-4 px-5 text-center text-red-300 font-semibold">{team.totalOccurrences}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-400" /> Maquinas por Tipo
                </h3>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Uso acumulado</span>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[620px]">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/5">
                      <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipamento</th>
                      <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qtd.</th>
                      <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Horas</th>
                      <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Registros</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {equipmentSummaries.map((eq) => (
                      <tr key={eq.name} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-5 text-white font-semibold">{eq.name}</td>
                        <td className="py-4 px-5 text-center text-amber-300 font-semibold">{eq.totalCount}</td>
                        <td className="py-4 px-5 text-center text-amber-200 font-semibold">{formatDecimal(eq.totalHours)}</td>
                        <td className="py-4 px-5 text-center text-slate-300 font-semibold">{eq.usageRecords}</td>
                      </tr>
                    ))}
                    {equipmentSummaries.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-500">
                          Nenhum equipamento encontrado para os filtros atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" /> Quantificacao por Cargo
              </h3>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pessoas-dia e HH</span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[820px]">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/5">
                    <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</th>
                    <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Dias c/ registro</th>
                    <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pessoas-dia</th>
                    <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">HH</th>
                    <th className="py-4 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Media pessoas/dia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {roleSummaries.map((role) => (
                    <tr key={role.role} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-5 text-white font-semibold">{role.role}</td>
                      <td className="py-4 px-5 text-center text-slate-200 font-semibold">{role.daysWithRecords}</td>
                      <td className="py-4 px-5 text-center text-blue-300 font-semibold">{role.totalWorkers}</td>
                      <td className="py-4 px-5 text-center text-emerald-300 font-semibold">{formatDecimal(role.totalManHours)}</td>
                      <td className="py-4 px-5 text-center text-indigo-300 font-semibold">{formatDecimal(role.avgWorkersPerDay)}</td>
                    </tr>
                  ))}
                  {roleSummaries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500">
                        Nenhum cargo encontrado para os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-white/5 px-5 py-4 flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              HH = Horas Homem informadas nos RDOs
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              H. Maq. = Horas de operacao de equipamentos
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              Sem alertas automaticos nesta versao
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Pessoas-dia = soma do efetivo diario por cargo
            </div>
          </div>
        </>
      )}

      {selectedDate && (
        <div className="fixed inset-0 z-50">
          <button
            onClick={() => setSelectedDate(null)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Fechar detalhe do dia"
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-3xl bg-slate-950 border-l border-white/10 shadow-2xl overflow-y-auto custom-scrollbar">
            <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-white/10 px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Detalhamento Diario</p>
                <h3 className="text-2xl font-black text-white mt-1">{selectedDate}</h3>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {selectedDaySummary ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Equipes</p>
                      <p className="text-xl font-black text-blue-300 mt-2">{selectedDaySummary.activeTeams}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pessoas</p>
                      <p className="text-xl font-black text-white mt-2">{selectedDaySummary.totalWorkers}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HH</p>
                      <p className="text-xl font-black text-emerald-300 mt-2">{formatDecimal(selectedDaySummary.totalManHours)}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Maquinas</p>
                      <p className="text-xl font-black text-amber-300 mt-2">{selectedDaySummary.totalMachines}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Horas Maq.</p>
                      <p className="text-xl font-black text-amber-200 mt-2">{formatDecimal(selectedDaySummary.totalMachineHours)}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ocorrencias</p>
                      <p className="text-xl font-black text-red-300 mt-2">{selectedDaySummary.totalOccurrences}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Impacto (min)</p>
                      <p className="text-xl font-black text-red-200 mt-2">{selectedDaySummary.occurrenceImpactMinutes}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chuva media</p>
                      <p className="text-xl font-black text-sky-300 mt-2">{formatDecimal(selectedDaySummary.avgRainMm)} mm</p>
                    </div>
                  </div>

                  <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10">
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Por Equipe</h4>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full min-w-[860px] text-left">
                        <thead>
                          <tr className="bg-white/[0.03] border-b border-white/10">
                            <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe</th>
                            <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Obra</th>
                            <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">RDOs</th>
                            <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pessoas</th>
                            <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">HH</th>
                            <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Maq.</th>
                            <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ocorr.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {selectedDayTeamDetails.map((item) => (
                            <tr key={item.teamId} className="hover:bg-white/[0.02]">
                              <td className="py-3 px-4 text-white font-semibold">{item.teamName}</td>
                              <td className="py-3 px-4 text-slate-300">{item.projectName}</td>
                              <td className="py-3 px-4 text-center text-blue-300 font-semibold">{item.rdosCount}</td>
                              <td className="py-3 px-4 text-center text-slate-200 font-semibold">{item.workers}</td>
                              <td className="py-3 px-4 text-center text-emerald-300 font-semibold">{formatDecimal(item.manHours)}</td>
                              <td className="py-3 px-4 text-center text-amber-300 font-semibold">{item.machines}</td>
                              <td className="py-3 px-4 text-center text-red-300 font-semibold">{item.occurrences}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/10">
                        <h4 className="text-sm font-black text-white uppercase tracking-widest">Por Cargo</h4>
                      </div>
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-[520px] text-left">
                          <thead>
                            <tr className="bg-white/[0.03] border-b border-white/10">
                              <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</th>
                              <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pessoas</th>
                              <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">HH</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {selectedDayRoleDetails.map((role) => (
                              <tr key={role.role} className="hover:bg-white/[0.02]">
                                <td className="py-3 px-4 text-white font-semibold">{role.role}</td>
                                <td className="py-3 px-4 text-center text-slate-200 font-semibold">{role.totalWorkers}</td>
                                <td className="py-3 px-4 text-center text-emerald-300 font-semibold">{formatDecimal(role.totalManHours)}</td>
                              </tr>
                            ))}
                            {selectedDayRoleDetails.length === 0 && (
                              <tr>
                                <td colSpan={3} className="py-8 px-4 text-center text-slate-500">
                                  Sem cargos para a data selecionada.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/10">
                        <h4 className="text-sm font-black text-white uppercase tracking-widest">Por Equipamento</h4>
                      </div>
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-[520px] text-left">
                          <thead>
                            <tr className="bg-white/[0.03] border-b border-white/10">
                              <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipamento</th>
                              <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qtd.</th>
                              <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Horas</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {selectedDayEquipmentDetails.map((eq) => (
                              <tr key={eq.name} className="hover:bg-white/[0.02]">
                                <td className="py-3 px-4 text-white font-semibold">{eq.name}</td>
                                <td className="py-3 px-4 text-center text-amber-300 font-semibold">{eq.totalCount}</td>
                                <td className="py-3 px-4 text-center text-amber-200 font-semibold">{formatDecimal(eq.totalHours)}</td>
                              </tr>
                            ))}
                            {selectedDayEquipmentDetails.length === 0 && (
                              <tr>
                                <td colSpan={3} className="py-8 px-4 text-center text-slate-500">
                                  Sem equipamentos para a data selecionada.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>

                  <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10">
                      <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" /> RDOs do Dia
                      </h4>
                    </div>
                    <div className="divide-y divide-white/[0.03]">
                      {selectedDayRdos.map((rdo) => {
                        const team = teamById.get(rdo.teamId);
                        const project = team ? projectById.get(team.projectId) : undefined;
                        const workers = rdo.workforce.reduce((acc, curr) => acc + (curr.count || 0), 0);
                        const manHours = rdo.workforce.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
                        const occurrences = (rdo.occurrences || []).length;

                        return (
                          <div key={rdo.id} className="px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-white font-bold">RDO #{rdo.reportNumber || 'S/N'}</p>
                              <p className="text-xs text-slate-400">
                                {project?.name || 'Obra removida'} - {team?.name || 'Equipe removida'}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {workers} pessoas | {formatDecimal(manHours)} HH | {occurrences} ocorr.
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  onOpenRdoDetail(rdo);
                                  setSelectedDate(null);
                                }}
                                className="px-3 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-black uppercase tracking-widest"
                              >
                                Abrir RDO
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {selectedDayRdos.length === 0 && (
                        <div className="px-4 py-10 text-center text-slate-500">Sem RDOs para a data selecionada.</div>
                      )}
                    </div>
                  </section>
                </>
              ) : (
                <div className="py-20 text-center text-slate-500">Nao foi possivel carregar os dados desta data.</div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
