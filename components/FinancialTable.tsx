import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Building2, HardHat, Users, DollarSign, Target, Activity } from 'lucide-react';
import { Project, Team, RDOData } from '../types';
import { formatMoney, calculateRDOTotal } from '../utils';

interface FinancialTableProps {
  filteredRdos: RDOData[];
  projects: Project[];
  teams: Team[];
}

interface TeamNode {
  id: string;
  name: string;
  totalRdo: number;
}

interface ProjectNode {
  id: string;
  name: string;
  code?: string;
  budget: number;
  forecast: number;
  totalRdo: number;
  teams: TeamNode[];
}

interface RegionalNode {
  name: string;
  totalRdo: number;
  projects: ProjectNode[];
}

export const FinancialTable: React.FC<FinancialTableProps> = ({ filteredRdos, projects, teams }) => {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const hierarchyData = useMemo(() => {
    if (projects.length === 0) return [];

    const regionalsMap = new Map<string, RegionalNode>();

    // Primeiro, garantir que todas as obras (mesmo sem RDO) apareçam na sua respectiva regional
    projects.forEach(project => {
      const regionalName = project.regional || 'Sem Regional';

      if (!regionalsMap.has(regionalName)) {
        regionalsMap.set(regionalName, { name: regionalName, totalRdo: 0, projects: [] });
      }

      const regNode = regionalsMap.get(regionalName)!;

      regNode.projects.push({
        id: project.id,
        name: project.name,
        budget: project.budgetValue || 0,
        forecast: project.forecastValue || 0,
        totalRdo: 0,
        teams: []
      });
    });

    // Em seguida, iteramos pelos RDOs filtrados para acumular os valores
    filteredRdos.forEach(rdo => {
      const team = teams.find(t => t.id === rdo.teamId);
      if (!team) return;
      const project = projects.find(p => p.id === team.projectId);
      if (!project) return;

      const rdoValue = calculateRDOTotal(rdo, project);
      const regionalName = project.regional || 'Sem Regional';

      const regNode = regionalsMap.get(regionalName);
      if (!regNode) return;

      const projNode = regNode.projects.find(p => p.id === project.id);
      if (!projNode) return;

      let teamNode = projNode.teams.find(t => t.id === team.id);
      if (!teamNode) {
        teamNode = {
          id: team.id,
          name: team.name,
          totalRdo: 0
        };
        projNode.teams.push(teamNode);
      }

      teamNode.totalRdo += rdoValue;
      projNode.totalRdo += rdoValue;
      regNode.totalRdo += rdoValue;
    });

    return Array.from(regionalsMap.values())
      .filter(r => r.projects.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredRdos, teams, projects]);

  if (hierarchyData.length === 0) {
    return (
      <div className="glass-panel p-12 rounded-3xl border border-white/5 mt-8 text-center bg-white/[0.02] border-dashed">
        <Target className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-20" />
        <p className="text-slate-500 font-medium">Nenhum dado financeiro encontrado para os parâmetros selecionados.</p>
      </div>
    );
  }

  const grandTotal = hierarchyData.reduce((acc, curr) => acc + curr.totalRdo, 0);

  return (
    <div className="mt-10 space-y-16">
      {/* Header */}
      <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden shadow-2xl shadow-black/20">
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-xl font-bold text-white tracking-tight">Estrutura Financeira</h3>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Organograma Executivo</span>
            </div>
          </div>
          <div className="text-right p-4 px-6 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Faturamento Consolidado</p>
            <p className="text-2xl font-bold text-white font-mono tracking-tighter text-gradient">{formatMoney(grandTotal)}</p>
          </div>
        </div>
      </div>

      {/* Árvores de Organograma (Por Regional) */}
      <div className="flex flex-row items-start gap-16 overflow-x-auto w-full pb-8 custom-scrollbar">
        {hierarchyData.map(regional => {
          const regionalForecast = regional.projects.reduce((acc, p) => acc + p.forecast, 0);
          const regionalPercent = regionalForecast > 0 ? (regional.totalRdo / regionalForecast) * 100 : 0;
          const totalTeams = regional.projects.reduce((acc, p) => acc + p.teams.length, 0);

          const regionalBudget = regional.projects.reduce((acc, p) => acc + p.budget, 0);

          return (
            <div key={regional.name} className="flex flex-col items-center flex-shrink-0 relative">

              {/* Nó Central: Regional Card */}
              <div className="w-[280px] bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-5 flex flex-col shadow-2xl relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] font-bold text-blue-400 tracking-widest">
                    REGIONAL
                  </div>
                </div>

                <div className="mb-5">
                  <h4 className="text-xl font-bold text-white tracking-tight">{regional.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    {regional.projects.length} obras • {totalTeams} equipes
                  </p>
                </div>

                {/* Metrics */}
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-lg">
                    <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">Budget</span>
                    <span className="text-[10px] font-mono font-bold text-slate-300 truncate" title={formatMoney(regionalBudget)}>{formatMoney(regionalBudget)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-lg">
                    <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">Forecast</span>
                    <span className="text-[10px] font-mono font-bold text-slate-300 truncate" title={formatMoney(regionalForecast)}>{formatMoney(regionalForecast)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">
                    <span className="text-[9px] text-blue-400 font-medium uppercase tracking-widest">RDO</span>
                    <span className="text-[10px] font-mono font-bold text-white truncate" title={formatMoney(regional.totalRdo)}>{formatMoney(regional.totalRdo)}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-slate-400 whitespace-nowrap">RDO x Forecast</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(regionalPercent, 100)}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-white">{regionalForecast > 0 ? regionalPercent.toFixed(1).replace('.', ',') : '0,0'}%</span>
                </div>
              </div>

              {/* Conectores e Obras */}
              {regional.projects.length > 0 && (
                <>
                  {/* Linha vertical descendo da Regional */}
                  <div className="w-px h-10 bg-slate-700"></div>

                  {/* Container Horizontal das Obras */}
                  <div className="flex items-start overflow-x-auto max-w-full pb-8 custom-scrollbar">
                    {regional.projects.map((project, idx) => {
                      const hasForecast = project.forecast > 0;
                      const percentForecast = hasForecast ? (project.totalRdo / project.forecast) * 100 : 0;
                      const isExpanded = expandedProjects.has(project.id);

                      let statusText = "SEM FORECAST";
                      let statusColor = "slate";

                      if (hasForecast) {
                        if (percentForecast <= 40) {
                          statusText = "ATENÇÃO";
                          statusColor = "yellow";
                        } else if (percentForecast <= 85) {
                          statusText = "EM CURSO";
                          statusColor = "blue";
                        } else {
                          statusText = "NO PLANO";
                          statusColor = "emerald";
                        }
                      }

                      const isFirst = idx === 0;
                      const isLast = idx === regional.projects.length - 1;
                      const isOnly = regional.projects.length === 1;

                      return (
                        <div key={project.id} className="flex flex-col items-center relative px-3">
                          {/* Linha Horizontal Topo */}
                          {!isOnly && (
                            <div className={`absolute top-0 h-px bg-slate-700 ${isFirst ? 'w-1/2 right-0' :
                                isLast ? 'w-1/2 left-0' : 'w-full left-0'
                              }`}></div>
                          )}

                          {/* Linha vertical descendo para a Obra */}
                          <div className="w-px h-10 bg-slate-700 relative"></div>

                          {/* Card da Obra */}
                          <div
                            onClick={() => toggleProject(project.id)}
                            className={`w-[240px] flex-shrink-0 bg-[#0F172A] rounded-xl border border-slate-800 border-t-4 shadow-xl overflow-hidden transition-all cursor-pointer hover:bg-slate-900/80 group ${statusColor === 'yellow' ? 'border-t-yellow-500' :
                                statusColor === 'blue' ? 'border-t-blue-500' :
                                  statusColor === 'emerald' ? 'border-t-emerald-500' : 'border-t-slate-500'
                              }`}>
                            <div className="p-5">
                              {/* Top Row: Status Badge */}
                              {hasForecast && (
                                <div className="flex justify-end items-center mb-4">
                                  <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${statusColor === 'yellow' ? 'text-yellow-500 border-yellow-500/30' :
                                      statusColor === 'blue' ? 'text-blue-400 border-blue-400/30' :
                                        statusColor === 'emerald' ? 'text-emerald-500 border-emerald-500/30' : 'text-slate-400 border-slate-400/30'
                                    }`}>
                                    {statusText}
                                  </div>
                                </div>
                              )}

                              {/* Title */}
                              <h5 className="text-[11px] font-bold text-white mb-5 line-clamp-2" title={project.name}>{project.name}</h5>

                              {/* Teams Legend */}
                              <div className="flex items-center text-[10px] text-slate-400 font-medium mb-4 group-hover:text-slate-200 transition-colors">
                                {project.teams.length} {project.teams.length === 1 ? 'equipe oculta' : 'equipes ocultas'} • clique para {isExpanded ? 'ocultar' : 'abrir'}
                              </div>

                              {/* Metrics */}
                              <div className="flex flex-col gap-2 mb-5">
                                <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-lg">
                                  <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">Budget</span>
                                  <span className="text-[10px] font-mono font-bold text-slate-300 truncate" title={formatMoney(project.budget)}>{formatMoney(project.budget)}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-lg">
                                  <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">Forecast</span>
                                  <span className="text-[10px] font-mono font-bold text-slate-300 truncate" title={formatMoney(project.forecast)}>{formatMoney(project.forecast)}</span>
                                </div>
                                <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">
                                  <span className="text-[9px] text-blue-400 font-medium uppercase tracking-widest">RDO</span>
                                  <span className="text-[10px] font-mono font-bold text-white truncate" title={formatMoney(project.totalRdo)}>{formatMoney(project.totalRdo)}</span>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">RDO acumulado x Forecast</span>
                                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-500 ${statusColor === 'yellow' ? 'bg-yellow-500' :
                                      statusColor === 'blue' ? 'bg-blue-500' :
                                        statusColor === 'emerald' ? 'bg-emerald-500' : 'bg-slate-500'
                                    }`} style={{ width: `${Math.min(percentForecast, 100)}%` }}></div>
                                </div>
                                <span className="text-[11px] font-bold text-white">{hasForecast ? percentForecast.toFixed(1).replace('.', ',') : '0,0'}%</span>
                              </div>
                            </div>

                            {/* Expanded Teams Context */}
                            {isExpanded && project.teams.length > 0 && (
                              <div className="bg-black/30 border-t border-white/5 p-5 space-y-3">
                                {project.teams.map((team) => {
                                  const teamPercent = project.totalRdo > 0 ? (team.totalRdo / project.totalRdo) * 100 : 0;
                                  return (
                                    <div key={team.id} className="flex flex-col gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <Users className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-xs font-medium text-slate-300 truncate" title={team.name}>{team.name}</span>
                                      </div>
                                      <div className="flex items-center justify-between mt-1">
                                        <div className="flex flex-col">
                                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Partic.</span>
                                          <span className="text-xs font-medium text-slate-400">{teamPercent.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">RDO Acumul.</span>
                                          <span className="text-xs font-mono font-bold text-emerald-500">{formatMoney(team.totalRdo)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

