/**
 * OccurrencesTable.tsx
 * Tabela de análise e classificação de ocorrências do RDO.
 */

import React, { useState, useMemo } from 'react';
import { Search, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { OccurrenceFact, OccurrenceEligibility, OccurrenceCategory } from '../../src/analytics/types/analyticsTypes';

interface OccurrencesTableProps {
  facts: OccurrenceFact[];
  projectName?: string;
}

const ELIGIBILITY_CONFIG: Record<OccurrenceEligibility, { label: string; color: string; bg: string }> = {
  POTENCIAL_PLEITO:   { label: 'Potencial Pleito',   color: '#f87171', bg: '#450a0a' },
  RISCO_CONTRATADA:   { label: 'Risco Contratada',   color: '#fbbf24', bg: '#422006' },
  REQUER_ANALISE:     { label: 'Requer Análise',     color: '#60a5fa', bg: '#1e3a8a' },
  NAO_ELEGIVEL:       { label: 'Não Elegível',       color: '#94a3b8', bg: '#0f172a' },
};

const CATEGORY_CONFIG: Record<OccurrenceCategory, string> = {
  CIRCULACAO_TRENS: 'Circulação Trens',
  FALTA_MAO_OBRA: 'Falta Mão de Obra',
  EQUIPAMENTO_FERRAMENTA: 'Equip/Ferramenta',
  CLIMA: 'Clima',
  CALENDARIO: 'Calendário',
  OUTRA: 'Outra',
};

const NUM = (v: number, dec = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      flex: '1 1 200px', minWidth: 160,
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, padding: '16px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function OccurrencesTable({ facts, projectName }: OccurrencesTableProps) {
  const [search, setSearch] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState<'ALL' | OccurrenceEligibility>('ALL');
  const [sortKey, setSortKey] = useState<keyof OccurrenceFact>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    return facts.filter(f => {
      if (eligibilityFilter !== 'ALL' && f.eligibility !== eligibilityFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          f.description.toLowerCase().includes(s) ||
          f.date.includes(s)
        );
      }
      return true;
    });
  }, [facts, search, eligibilityFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av ?? '');
      const bs = String(bv ?? '');
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [filtered, sortKey, sortDir]);

  const summary = useMemo(() => {
    const totalHours = filtered.reduce((s, f) => s + f.impactHours, 0);
    const pleitos = filtered.filter(f => f.eligibility === 'POTENCIAL_PLEITO').length;
    const riscos = filtered.filter(f => f.eligibility === 'RISCO_CONTRATADA').length;
    
    return { totalHours, pleitos, riscos, total: filtered.length };
  }, [filtered]);

  const handleSort = (key: keyof OccurrenceFact) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }: { k: keyof OccurrenceFact }) =>
    sortKey === k ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  const thStyle: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', color: '#94a3b8', fontSize: 13,
    fontWeight: 600, cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.1)',
    userSelect: 'none', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.05)',
    verticalAlign: 'middle'
  };

  const exportCsv = () => {
    const header = '"Data";"Ocorrência";"Categoria";"Responsabilidade";"Elegibilidade";"Horas Impactadas";"Status"';
    const rows = sorted.map(f => [
      f.date,
      `"${f.description.replace(/"/g, '""')}"`,
      CATEGORY_CONFIG[f.category],
      f.responsibility,
      ELIGIBILITY_CONFIG[f.eligibility].label,
      String(f.impactHours).replace('.', ','),
      f.status === 'SEM_DURACAO_EXPLICITA' ? 'Sem Duração' : 'Duração Informada'
    ].join(';'));
    
    const blob = new Blob(['\uFEFF' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocorrencias_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#e2e8f0' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Classificação de Ocorrências</h2>
        {projectName && <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: 13 }}>Projeto: <strong>{projectName}</strong></p>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Ocorrências" value={summary.total} color="#60a5fa" />
        <KpiCard label="Horas Impactadas" value={NUM(summary.totalHours)} color="#fbbf24" />
        <KpiCard label="Potencial Pleito" value={summary.pleitos} color="#f87171" />
        <KpiCard label="Risco Contratada" value={summary.riscos} color="#f59e0b" />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Buscar descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={eligibilityFilter}
          onChange={e => setEligibilityFilter(e.target.value as any)}
          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
        >
          <option value="ALL">Todas as Elegibilidades</option>
          {Object.entries(ELIGIBILITY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button onClick={exportCsv} style={{ padding: '8px 16px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 8, color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
            <tr>
              <th style={thStyle} onClick={() => handleSort('date')}>Data <SortIcon k="date" /></th>
              <th style={thStyle} onClick={() => handleSort('description')}>Descrição <SortIcon k="description" /></th>
              <th style={thStyle} onClick={() => handleSort('category')}>Categoria <SortIcon k="category" /></th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('impactHours')}>Impacto (h) <SortIcon k="impactHours" /></th>
              <th style={thStyle} onClick={() => handleSort('eligibility')}>Elegibilidade <SortIcon k="eligibility" /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f, i) => {
              const st = ELIGIBILITY_CONFIG[f.eligibility];
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <td style={{ ...tdStyle, color: '#94a3b8', whiteSpace: 'nowrap' }}>{f.date}</td>
                  <td style={{ ...tdStyle, color: '#e2e8f0', maxWidth: 400 }}>{f.description}</td>
                  <td style={{ ...tdStyle, color: '#cbd5e1', whiteSpace: 'nowrap' }}>{CATEGORY_CONFIG[f.category]}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: f.impactHours > 0 ? '#fbbf24' : '#64748b' }}>
                    {f.status === 'SEM_DURACAO_EXPLICITA' ? '—' : NUM(f.impactHours)}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, background: st.bg, color: st.color, border: `1px solid ${st.color}44` }}>
                      {st.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Nenhum registro encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
