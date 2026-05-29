/**
 * IdlenessTable.tsx
 * Tabela de análise de improdutividade potencial para pleitos.
 */

import React, { useState, useMemo } from 'react';
import { Search, Download, ChevronUp, ChevronDown, Info } from 'lucide-react';
import { IdlenessFact } from '../../src/analytics/types/analyticsTypes';

interface IdlenessTableProps {
  facts: IdlenessFact[];
  projectName?: string;
}

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

export function IdlenessTable({ facts, projectName }: IdlenessTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof IdlenessFact>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    return facts.filter(f => {
      if (search) {
        const s = search.toLowerCase();
        return (
          f.occurrenceDescription.toLowerCase().includes(s) ||
          f.date.includes(s)
        );
      }
      return true;
    });
  }, [facts, search]);

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
    const totalValue = filtered.reduce((s, f) => s + f.totalValue, 0);
    return { totalHours, totalValue, total: filtered.length };
  }, [filtered]);

  const handleSort = (key: keyof IdlenessFact) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }: { k: keyof IdlenessFact }) =>
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
    const header = '"Data";"Ocorrência";"Horas";"MO Afetada";"Eqp Afetado";"Valor MO";"Valor Eqp";"Valor Total"';
    const rows = sorted.map(f => [
      f.date,
      `"${f.occurrenceDescription.replace(/"/g, '""')}"`,
      String(f.impactHours).replace('.', ','),
      f.workforceCount,
      f.equipmentCount,
      String(f.workforceValue).replace('.', ','),
      String(f.equipmentValue).replace('.', ','),
      String(f.totalValue).replace('.', ',')
    ].join(';'));
    
    const blob = new Blob(['\uFEFF' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `improdutividade_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#e2e8f0' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Improdutividade (Potencial Pleito)</h2>
        {projectName && <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: 13 }}>Projeto: <strong>{projectName}</strong></p>}
      </div>

      <div style={{
        background: '#422006', border: '1px solid #a16207', color: '#fde68a',
        padding: '12px 16px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 20
      }}>
        <Info size={18} />
        Os valores apresentados são preliminares de custo potencial baseados no método Conservador e não representam faturamento automático.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Ocorrências" value={summary.total} color="#60a5fa" />
        <KpiCard label="Horas de Paralisação" value={NUM(summary.totalHours)} color="#fbbf24" />
        <KpiCard label="Valor Potencial Preliminar" value={BRL(summary.totalValue)} color="#4ade80" />
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
        <button onClick={exportCsv} style={{ padding: '8px 16px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 8, color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
            <tr>
              <th style={thStyle} onClick={() => handleSort('date')}>Data <SortIcon k="date" /></th>
              <th style={thStyle} onClick={() => handleSort('occurrenceDescription')}>Ocorrência <SortIcon k="occurrenceDescription" /></th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('impactHours')}>Horas <SortIcon k="impactHours" /></th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('workforceCount')}>Qtd MO <SortIcon k="workforceCount" /></th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('equipmentCount')}>Qtd Eqp <SortIcon k="equipmentCount" /></th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('workforceValue')}>Valor MO <SortIcon k="workforceValue" /></th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('equipmentValue')}>Valor Eqp <SortIcon k="equipmentValue" /></th>
              <th style={{ ...thStyle, textAlign: 'right', color: '#4ade80' }} onClick={() => handleSort('totalValue')}>Vlr Total <SortIcon k="totalValue" /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f, i) => {
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <td style={{ ...tdStyle, color: '#94a3b8', whiteSpace: 'nowrap' }}>{f.date}</td>
                  <td style={{ ...tdStyle, color: '#e2e8f0', maxWidth: 350 }}>{f.occurrenceDescription}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#fbbf24' }}>{NUM(f.impactHours)}h</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#cbd5e1' }}>{f.workforceCount}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#cbd5e1' }}>{f.equipmentCount}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#94a3b8' }}>{BRL(f.workforceValue)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#94a3b8' }}>{BRL(f.equipmentValue)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#4ade80', fontWeight: 600 }}>{BRL(f.totalValue)}</td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Nenhum pleito potencial encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
