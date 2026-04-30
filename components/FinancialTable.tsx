import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Building2, HardHat, Users, DollarSign, Target } from 'lucide-react';
import { Project, Team, RDOData } from '../types';
import { formatMoney, calculateRDOTotal } from '../utils';

interface FinancialTableProps {
  filteredRdos: RDOData[];
  projects: Project[];
  teams: Team[];
}

interface HierarchyNode {
  id: string;
  name: string;
  total: number;
  type: 'regional' | 'project' | 'team';
  children?: HierarchyNode[];
}

export const FinancialTable: React.FC<FinancialTableProps> = ({ filteredRdos, projects, teams }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const hierarchyData = useMemo(() => {
    if (filteredRdos.length === 0) return [];

    const regionalsMap = new Map<string, { total: number; projects: Map<string, { name: string; total: number; teams: Map<string, { name: string; total: number }> }> }>();

    filteredRdos.forEach(rdo => {
      const team = teams.find(t => t.id === rdo.teamId);
      if (!team) return;
      const project = projects.find(p => p.id === team.projectId);
      if (!project) return;

      const rdoValue = calculateRDOTotal(rdo, project);
      const regionalName = project.regional || 'Sem Regional';

      if (!regionalsMap.has(regionalName)) {
        regionalsMap.set(regionalName, { total: 0, projects: new Map() });
      }
      const regNode = regionalsMap.get(regionalName)!;
      regNode.total += rdoValue;

      if (!regNode.projects.has(project.id)) {
        regNode.projects.set(project.id, { name: project.name, total: 0, teams: new Map() });
      }
      const projNode = regNode.projects.get(project.id)!;
      projNode.total += rdoValue;

      if (!projNode.teams.has(team.id)) {
        projNode.teams.set(team.id, { name: team.name, total: 0 });
      }
      const teamNode = projNode.teams.get(team.id)!;
      teamNode.total += rdoValue;
    });

    return Array.from(regionalsMap.entries()).map(([regName, regData]) => ({
      id: `reg-${regName}`,
      name: regName,
      total: regData.total,
      type: 'regional' as const,
      children: Array.from(regData.projects.entries()).map(([projId, proj]) => ({
        id: `proj-${projId}`,
        name: proj.name,
        total: proj.total,
        type: 'project' as const,
        children: Array.from(proj.teams.entries()).map(([teamId, t]) => ({
          id: `team-${teamId}`,
          name: t.name,
          total: t.total,
          type: 'team' as const
        }))
      }))
    }));
  }, [filteredRdos, teams, projects]);

  const renderRows = (nodes: HierarchyNode[], level: number = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedRows.has(node.id);
      const hasChildren = node.children && node.children.length > 0;

      return (
        <React.Fragment key={node.id}>
          <tr 
            className={`
              transition-all duration-300 cursor-pointer border-b border-white/5 group
              ${level === 0 ? 'bg-white/[0.02] hover:bg-white/[0.05]' : level === 1 ? 'bg-white/[0.01] hover:bg-white/[0.03]' : 'hover:bg-white/[0.02]'}
            `}
            onClick={() => hasChildren && toggleRow(node.id)}
          >
            <td className="py-5 px-8">
              <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 32}px` }}>
                <div className="flex items-center justify-center w-6 h-6">
                  {hasChildren && (
                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                    </div>
                  )}
                </div>
                
                <div className={`
                  p-2 rounded-xl border border-white/5 shadow-sm transition-all duration-300
                  ${node.type === 'regional' ? 'bg-blue-500/10 group-hover:bg-blue-500/20' : 
                    node.type === 'project' ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 
                    'bg-slate-500/10 group-hover:bg-slate-500/20'}
                `}>
                  {node.type === 'regional' && <Building2 className="w-4 h-4 text-blue-400" />}
                  {node.type === 'project' && <HardHat className="w-4 h-4 text-emerald-400" />}
                  {node.type === 'team' && <Users className="w-4 h-4 text-slate-400" />}
                </div>
                
                <div className="flex flex-col">
                  <span className={`
                    text-sm transition-colors duration-300
                    ${level === 0 ? 'font-bold text-white group-hover:text-blue-400 text-base' : 
                      level === 1 ? 'font-semibold text-slate-200 group-hover:text-emerald-400' : 
                      'text-slate-400 group-hover:text-slate-200'}
                  `}>
                    {node.name}
                  </span>
                  {level === 0 && <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Regional Operativa</span>}
                </div>
              </div>
            </td>
            <td className="py-5 px-8 text-right">
              <div className="flex flex-col items-end">
                <span className={`
                  font-mono transition-all duration-300 tabular-nums
                  ${level === 0 ? 'text-xl font-bold text-blue-400 group-hover:scale-110' : 
                    level === 1 ? 'text-lg font-bold text-emerald-400' : 
                    'text-base font-semibold text-slate-400'}
                `}>
                  {formatMoney(node.total)}
                </span>
                {level === 0 && <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">Total Regional</span>}
              </div>
            </td>
          </tr>
          {isExpanded && hasChildren && renderRows(node.children!, level + 1)}
        </React.Fragment>
      );
    });
  };

  if (hierarchyData.length === 0) {
    return (
      <div className="glass-panel p-12 rounded-3xl border border-white/5 mt-8 text-center bg-white/[0.02] border-dashed">
        <Target className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-20" />
        <p className="text-slate-500 font-medium">Nenhum dado financeiro encontrado para os parâmetros selecionados.</p>
      </div>
    );
  }

  const grandTotal = hierarchyData.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="glass-panel rounded-3xl border border-white/5 mt-10 overflow-hidden shadow-2xl shadow-black/20">
      <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
             <DollarSign className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-xl font-bold text-white tracking-tight">Estrutura Financeira</h3>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Detalhamento Hierárquico</span>
          </div>
        </div>
        
        <div className="text-right p-4 px-6 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Faturamento Consolidado</p>
          <p className="text-2xl font-bold text-white font-mono tracking-tighter text-gradient">{formatMoney(grandTotal)}</p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/5">
              <th className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Estrutura Organizacional</th>
              <th className="py-5 px-8 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Resultado Realizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {renderRows(hierarchyData)}
          </tbody>
        </table>
      </div>
    </div>
  );
};
