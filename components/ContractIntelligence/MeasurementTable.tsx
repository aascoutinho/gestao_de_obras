/**
 * MeasurementTable.tsx
 * Tabela de análise de medição contratual (Valor e Custo)
 */

import React, { useState, useMemo } from 'react';
import { Search, Download, ChevronUp, ChevronDown, Info } from 'lucide-react';
import { MeasurementFact, MeasurementStatus } from '../../src/analytics/types/analyticsTypes';

interface MeasurementTableProps {
  facts: MeasurementFact[];
  projectName?: string;
}

const STATUS_CONFIG: Record<MeasurementStatus, { label: string; color: string; bg: string }> = {
  ENCONTRADA_COMPOSICAO:   { label: 'Composição Base',    color: '#4ade80', bg: '#052e16' },
  EQUIVALENCIA_NOME:       { label: 'Equivalência Nome',  color: '#fbbf24', bg: '#422006' },
  PRECO_SERVICES_FALLBACK: { label: 'Preço Contrato',     color: '#60a5fa', bg: '#1e3a8a' },
  UNIDADE_DIVERGENTE:      { label: 'Unidade Divergente', color: '#f87171', bg: '#450a0a' },
  SEM_COMPOSICAO:          { label: 'Sem Composição',     color: '#94a3b8', bg: '#0f172a' },
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const NUM = (v: number, dec = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const PCT = (v: number) => `${v >= 0 ? '+' : ''}${NUM(v * 100, 1)}%`;

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
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

function DeviationCell({ value, isCurrency, isPercent }: { value: number; isCurrency?: boolean; isPercent?: boolean }) {
  const color = value > 0 ? '#4ade80' : value < 0 ? '#f87171' : '#64748b';
  const label = isPercent ? PCT(value) : isCurrency ? BRL(value) : NUM(value);
  return <span style={{ color, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{label}</span>;
}

export function MeasurementTable({ facts, projectName }: MeasurementTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MeasurementStatus>('ALL');
  const [sortKey, setSortKey] = useState<keyof MeasurementFact>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    return facts.filter(f => {
      if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          f.activityDescription.toLowerCase().includes(s) ||
          f.activityCode.toLowerCase().includes(s) ||
          f.date.includes(s)
        );
      }
      return true;
    });
  }, [facts, search, statusFilter]);

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
    const totalExec = filtered.reduce((s, f) => s + f.measuredValue, 0);
    const totalCost = filtered.reduce((s, f) => s + f.theoreticalCost, 0);
    const margin = totalExec - totalCost;
    const marginPct = totalExec !== 0 ? margin / totalExec : 0;
    return { totalExec, totalCost, margin, marginPct };
  }, [filtered]);

  const handleSort = (key: keyof MeasurementFact) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); } // starts desc for dates/numbers usually better
  };

  const SortIcon = ({ k }: { k: keyof MeasurementFact }) =>
    sortKey === k ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  const thStyle: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', color: '#94a3b8', fontSize: 13,
    fontWeight: 600, cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.1)',
    userSelect: 'none', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.05)',
    verticalAlign: 'middle', whiteSpace: 'nowrap',
  };

  const exportCsv = () => {
    const header = '"Data";"Cód";"Atividade";"Qtd";"Unid";"Valor Unit.";"Valor Executado";"Custo Teórico";"Margem";"Margem %";"Status"';
    const rows = sorted.map(f => [
      f.date, f.activityCode, `"${f.activityDescription.replace(/"/g, '""')}"`,
      String(f.quantity).replace('.', ','), f.unit,
      String(f.unitPrice).replace('.', ','),
      String(f.measuredValue).replace('.', ','),
      String(f.theoreticalCost).replace('.', ','),
      String(f.margin).replace('.', ','),
      String(f.marginPercent).replace('.', ','),
      STATUS_CONFIG[f.status].label
    ].join(';'));
    
    const blob = new Blob(['\uFEFF' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medicao_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#e2e8f0' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Medição Contratual Diária</h2>
        {projectName && <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: 13 }}>Projeto: <strong>{projectName}</strong></p>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Valor Executado" value={BRL(summary.totalExec)} color="#60a5fa" />
        <KpiCard label="Custo Teórico" value={BRL(summary.totalCost)} color="#fbbf24" />
        <KpiCard label="Margem Absoluta" value={BRL(summary.margin)} color={summary.margin >= 0 ? '#4ade80' : '#f87171'} />
        <KpiCard label="Margem %" value={PCT(summary.marginPct)} color={summary.margin >= 0 ? '#4ade80' : '#f87171'} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Buscar atividade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
        >
          <option value="ALL">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
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
              <th style={thStyle} onClick={() => handleSort('activityDescription')}>Atividade <SortIcon k="activityDescription" /></th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('quantity')}>Qtd <SortIcon k="quantity" /></th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('measuredValue')}>Vlr Executado <SortIcon k="measuredValue" /></th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('theoreticalCost')}>Custo Teórico <SortIcon k="theoreticalCost" /></th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('margin')}>Margem <SortIcon k="margin" /></th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('marginPercent')}>% <SortIcon k="marginPercent" /></th>
              <th style={thStyle} onClick={() => handleSort('status')}>Status <SortIcon k="status" /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f, i) => {
              const st = STATUS_CONFIG[f.status];
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <td style={{ ...tdStyle, color: '#94a3b8' }}>{f.date}</td>
                  <td style={{ ...tdStyle, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{f.activityCode}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.activityDescription}</div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                    {NUM(f.quantity)} <span style={{ fontSize: 11, color: '#64748b' }}>{f.unit}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#60a5fa', fontVariantNumeric: 'tabular-nums' }}>{BRL(f.measuredValue)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#fbbf24', fontVariantNumeric: 'tabular-nums' }}>{BRL(f.theoreticalCost)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}><DeviationCell value={f.margin} isCurrency /></td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}><DeviationCell value={f.marginPercent} isPercent /></td>
                  <td style={tdStyle}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, background: st.bg, color: st.color, border: `1px solid ${st.color}44` }}>
                      {st.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Nenhum registro encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
