/**
 * ContractIntelligencePage.tsx
 * Página de integração do módulo Contract Intelligence.
 *
 * Fluxo:
 * 1. Usuário seleciona projeto
 * 2. Sistema carrega dimensões salvas (DynamoDB / localStorage)
 * 3. Sistema carrega RDOs do projeto
 * 4. Motor buildMonthlyResourceFacts gera os fatos mensais
 * 5. ResourcesMonthlyTable exibe os fatos filtráveis
 *
 * Se não houver dimensões importadas, exibe link para a tela DimensionsUpload.
 * Não altera nenhuma rota ou estado da navegação atual.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Project, RDOData } from '../../../types';
import { getDimensions, getRdos } from '../../../services/dbService';
import { DimensionImportResult } from '../../analytics/types/analyticsTypes';
import {
  buildMonthlyResourceFacts,
  MonthlyResourceFact,
} from '../../analytics/engines/resourcesMonthlyEngine';
import { DimensionsUpload } from './DimensionsUpload';
import { ResourcesMonthlyTable } from './ResourcesMonthlyTable';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContractIntelligencePageProps {
  selectedProject: Project;
  /** Lista de RDOs já carregados pelo contexto pai, se disponível */
  rdos?: RDOData[];
}

// ---------------------------------------------------------------------------
// Estado da página
// ---------------------------------------------------------------------------

type PageView = 'dashboard' | 'import-dimensions';
type LoadingState = 'idle' | 'loading' | 'done' | 'error';

// ---------------------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------------------

function Alert({ type, children }: { type: 'warning' | 'success' | 'error'; children: React.ReactNode }) {
  const cfg = {
    warning: { bg: '#422006', border: '#a16207', color: '#fde68a', icon: <AlertTriangle size={15} /> },
    success: { bg: '#052e16', border: '#166534', color: '#4ade80', icon: <CheckCircle size={15} /> },
    error:   { bg: '#450a0a', border: '#7f1d1d', color: '#f87171', icon: <AlertTriangle size={15} /> },
  }[type];
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '10px 14px', borderRadius: 8, fontSize: 13,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
      marginBottom: 12,
    }}>
      {cfg.icon}
      <span>{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function ContractIntelligencePage({ selectedProject, rdos: propsRdos }: ContractIntelligencePageProps) {
  const [view,           setView]           = useState<PageView>('dashboard');
  const [loadingState,   setLoadingState]   = useState<LoadingState>('idle');
  const [dimensions,     setDimensions]     = useState<DimensionImportResult | null>(null);
  const [rdos,           setRdos]           = useState<RDOData[]>(propsRdos ?? []);
  const [facts,          setFacts]          = useState<MonthlyResourceFact[]>([]);
  const [engineWarnings, setEngineWarnings] = useState<string[]>([]);
  const [errorMessage,   setErrorMessage]   = useState('');

  // ── Carga de dados ──────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoadingState('loading');
    setErrorMessage('');
    setFacts([]);
    setEngineWarnings([]);

    try {
      // 1. Carrega dimensões
      const stored = await getDimensions(selectedProject.id);
      let dimResult: DimensionImportResult | null = null;

      if (stored) {
        // Reconstrói DimensionImportResult a partir do DimensionStoredRecord
        const monthSet = new Map<string, string>();
        stored.items.forEach(item =>
          item.monthlyPlan.forEach(mp => {
            if (!monthSet.has(mp.monthKey)) monthSet.set(mp.monthKey, mp.monthLabel);
          })
        );
        const months = Array.from(monthSet.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([monthKey, monthLabel]) => ({ monthKey, monthLabel }));

        dimResult = {
          items:        stored.items,
          holidays:     stored.holidays,
          metadata:     stored.metadata,
          months,
          totalRows:    stored.items.length,
          successCount: stored.items.length,
          errorCount:   0,
          errors:       [],
          warnings:     [],
          importedAt:   stored.updatedAt,
        };
        setDimensions(dimResult);
      }

      // 2. Carrega RDOs se não foram passados via props
      let rdoList = propsRdos ?? rdos;
      if (!propsRdos || propsRdos.length === 0) {
        try {
          // Carrega todos os RDOs e filtra por projectId (sem GSI específico)
          const allRdos = await getRdos();
          rdoList = allRdos.filter(r => r.projectId === selectedProject.id);
          setRdos(rdoList);
        } catch (e) {
          console.warn('Erro ao carregar RDOs:', e);
        }
      }

      // 3. Gera fatos se há dimensões
      if (dimResult && dimResult.items.length > 0) {
        const { facts: newFacts, warnings } = buildMonthlyResourceFacts({
          projectId:  selectedProject.id,
          rdos:       rdoList,
          dimensions: dimResult,
        });
        setFacts(newFacts);
        setEngineWarnings(warnings);
      }

      setLoadingState('done');
    } catch (err) {
      setErrorMessage(`Erro ao carregar dados: ${err instanceof Error ? err.message : String(err)}`);
      setLoadingState('error');
    }
  }, [selectedProject.id, propsRdos]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Atualiza fatos quando dimensões mudam (após import)
  const handleDimensionsSaved = useCallback(() => {
    setView('dashboard');
    loadData();
  }, [loadData]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (view === 'import-dimensions') {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setView('dashboard')}
            id="btn-ci-back-to-dashboard"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13,
            }}
          >
            ← Voltar ao painel
          </button>
        </div>
        <DimensionsUpload
          selectedProject={selectedProject}
          onDimensionsSaved={handleDimensionsSaved}
        />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#e2e8f0' }}>

      {/* Cabeçalho da página */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={24} color="#60a5fa" />
            Contract Intelligence
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
            Projeto: <strong style={{ color: '#94a3b8' }}>{selectedProject.name}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            id="btn-ci-import-dimensions"
            onClick={() => setView('import-dimensions')}
            style={actionBtn('#1e3a5f', '#60a5fa')}
          >
            <Upload size={14} /> Importar Dimensões
          </button>
          <button
            id="btn-ci-refresh"
            onClick={loadData}
            disabled={loadingState === 'loading'}
            style={actionBtn('#1e2d3d', '#94a3b8')}
          >
            <RefreshCw size={14} style={loadingState === 'loading' ? { animation: 'spin 1s linear infinite' } : {}} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Status da carga */}
      {loadingState === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', marginBottom: 16 }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          Carregando dados...
        </div>
      )}

      {loadingState === 'error' && (
        <Alert type="error">{errorMessage}</Alert>
      )}

      {/* Sem dimensões importadas */}
      {loadingState === 'done' && !dimensions && (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          border: '2px dashed rgba(255,255,255,0.08)', borderRadius: 16,
        }}>
          <BarChart3 size={48} color="#334155" style={{ marginBottom: 16 }} />
          <h3 style={{ color: '#475569', margin: '0 0 8px', fontSize: 18 }}>
            Nenhuma dimensão importada
          </h3>
          <p style={{ color: '#374151', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Importe a planilha de dimensões da obra para gerar a análise mensal de MOI, MOD e Equipamentos.
          </p>
          <button
            id="btn-ci-import-dimensions-empty"
            onClick={() => setView('import-dimensions')}
            style={{ ...actionBtn('#1d4ed8', '#93c5fd'), padding: '10px 24px', fontSize: 15 }}
          >
            <Upload size={16} /> Importar Dimensões
          </button>
        </div>
      )}

      {/* Dimensões sem RDOs */}
      {loadingState === 'done' && dimensions && rdos.length === 0 && (
        <Alert type="warning">
          Dimensões carregadas ({dimensions.items.length} itens), mas nenhum RDO encontrado para este projeto.
          Os fatos exibirão realizado = 0 em todos os itens.
        </Alert>
      )}

      {/* Motor gerou warnings */}
      {engineWarnings.length > 0 && (
        <details style={{ marginBottom: 16 }}>
          <summary style={{ color: '#fb923c', cursor: 'pointer', fontSize: 13, marginBottom: 6 }}>
            ⚠️ {engineWarnings.length} aviso{engineWarnings.length !== 1 ? 's' : ''} do motor de análise
          </summary>
          <ul style={{ margin: '8px 0 0', padding: '0 0 0 20px', color: '#fb923c', fontSize: 12 }}>
            {engineWarnings.map((w, i) => <li key={i} style={{ marginBottom: 3 }}>{w}</li>)}
          </ul>
        </details>
      )}

      {/* Info cards de contexto */}
      {loadingState === 'done' && dimensions && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Itens de Dimensão', value: dimensions.items.length,  color: '#60a5fa' },
            { label: 'Meses no Plano',    value: dimensions.months.length, color: '#a78bfa' },
            { label: 'Feriados',          value: dimensions.holidays.length, color: '#f59e0b' },
            { label: 'RDOs Carregados',   value: rdos.length,              color: '#4ade80' },
            { label: 'Fatos Gerados',     value: facts.length,             color: '#e2e8f0' },
          ].map(k => (
            <div key={k.label} style={{
              flex: '1 1 120px', minWidth: 100,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10, padding: '10px 14px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabela de fatos */}
      {facts.length > 0 && (
        <ResourcesMonthlyTable
          facts={facts}
          projectName={selectedProject.name}
        />
      )}

      {/* Spin keyframes inline */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper de estilo de botão
// ---------------------------------------------------------------------------

function actionBtn(bg: string, color: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: bg, color, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  };
}

export default ContractIntelligencePage;
