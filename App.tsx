import React, { useEffect } from 'react';
import {
  Building2, FileText, LayoutDashboard, ClipboardList, Menu, X, BarChart2
} from 'lucide-react';
import { useUiState, useUiActions } from './src/stores/uiStore';
import { useProjectActions } from './src/stores/projectStore';
import { useTeamActions } from './src/stores/teamStore';
import { useRdoActions } from './src/stores/rdoStore';
import { usePlanningActions } from './src/stores/planningStore';
import { DashboardPage } from './src/modules/dashboard/pages/DashboardPage';
import { ProjectsPage } from './src/modules/projects/pages/ProjectsPage';
import { ContractIntelligencePage } from './src/modules/contract-intelligence/pages/ContractIntelligencePage';
import { PlanningPage } from './src/modules/planning/pages/PlanningPage';
import { ProjectModal } from './src/modules/projects/components/ProjectModal';

function App() {
  const {
    activeMenu,
    isMobileMenuOpen
  } = useUiState();

  const {
    setActiveMenu,
    setIsMobileMenuOpen,
    setLoading,
    setError
  } = useUiActions();

  const { loadProjects } = useProjectActions();
  const { loadTeams } = useTeamActions();
  const { loadRdos } = useRdoActions();
  const { loadPlanningData } = usePlanningActions();

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const loadedProjects = await loadProjects();
        await loadTeams();
        await loadRdos();
        await loadPlanningData(loadedProjects);
      } catch (e) {
        console.error("Error loading initial data", e);
        setError("Erro ao carregar dados. Verifique a conexão com o banco.");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [loadProjects, loadTeams, loadRdos, loadPlanningData, setLoading, setError]);

  const Sidebar = () => (
    <div className={`
      fixed inset-y-0 left-0 z-40 w-72 glass-panel text-white transform transition-transform duration-300 ease-in-out
      ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:inset-0
      border-r border-white/5
    `}>
      <div className="flex flex-col h-full">
        <div className="p-8 border-b border-white/5 flex items-center gap-4">
          <div className="bg-gradient-premium p-2.5 rounded-2xl shadow-lg shadow-blue-500/20 animate-float">
            <BarChart2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">RDO Pro</h1>
            <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mt-1">Analytics Dashboard</span>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-3">
          <button
            onClick={() => { setActiveMenu('DASHBOARD'); useRdoStore.getState().actions.setCurrentRDO(null); }}
            className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${activeMenu === 'DASHBOARD'
                ? 'bg-gradient-premium text-white shadow-xl shadow-blue-600/20 scale-[1.02]'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-semibold text-sm">Painel Geral</span>
          </button>

          <button
            onClick={() => {
              setActiveMenu('PROJECTS');
              const currentView = useUiStore.getState().currentView;
              if (currentView === 'UPLOAD_ANALYSIS') useUiStore.getState().actions.setCurrentView('RDO_LIST');
            }}
            className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${activeMenu === 'PROJECTS'
                ? 'bg-gradient-premium text-white shadow-xl shadow-blue-600/20 scale-[1.02]'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            <Building2 className="w-5 h-5" />
            <span className="font-semibold text-sm">Minhas Obras</span>
          </button>

          <button
            onClick={() => { setActiveMenu('CONTRACT_INTELLIGENCE'); useRdoStore.getState().actions.setCurrentRDO(null); }}
            className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${activeMenu === 'CONTRACT_INTELLIGENCE'
                ? 'bg-gradient-premium text-white shadow-xl shadow-blue-600/20 scale-[1.02]'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-semibold text-sm">Inteligência Contratual</span>
          </button>

          <button
            onClick={() => { setActiveMenu('PLANNING'); useRdoStore.getState().actions.setCurrentRDO(null); }}
            className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${activeMenu === 'PLANNING'
                ? 'bg-gradient-premium text-white shadow-xl shadow-blue-600/20 scale-[1.02]'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="font-semibold text-sm">Planejamento</span>
          </button>
        </nav>

        <div className="p-6">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-3 text-slate-400 text-xs mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              Gemini Intelligence Active
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Analysis powered by Google Gemini 1.5 Flash for maximum precision.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 font-inter overflow-hidden selection:bg-blue-500/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="md:hidden glass-panel border-b border-white/5 p-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-premium p-1.5 rounded-lg">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">RDO Pro</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-10 relative z-10 custom-scrollbar">
          {activeMenu === 'DASHBOARD' && <DashboardPage />}
          {activeMenu === 'PROJECTS' && <ProjectsPage />}
          {activeMenu === 'CONTRACT_INTELLIGENCE' && <ContractIntelligencePage />}
          {activeMenu === 'PLANNING' && <PlanningPage />}
        </main>
      </div>

      <ProjectModal />
    </div>
  );
}

// Import useRdoStore inside App component or dynamically to access inside onClick handlers
import { useRdoStore } from './src/stores/rdoStore';
import { useUiStore } from './src/stores/uiStore';

export default App;
