/**
 * dimensionsParser.ts
 * Sprint 2 — Importador de planilha de dimensões.
 *
 * Responsabilidade: ler um arquivo XLSX/XLS de dimensões de obra e retornar
 * um DimensionImportResult normalizado, com itens, feriados, metadados e meses.
 *
 * Regras críticas:
 * 1. A data i_start é âncora do plano: Mes_1 = mês de i_start, Mes_2 = +1, etc.
 * 2. i_end é apenas metadado — não corta dias do último mês.
 * 3. Itens sem custo são mantidos com hasMissingCost = true + warning.
 * 4. Itens sem grupo são mantidos com group = 'OTHER' + warning.
 * 5. Colunas não encontradas geram warnings, nunca errors fatais.
 * 6. Nenhum campo inventado: campos ausentes ficam undefined.
 */

import { read, utils } from 'xlsx';
import {
  DimensionItem,
  DimensionGroup,
  DimensionImportResult,
  DimensionImportMetadata,
  DimensionPlanMonth,
} from '../types/analyticsTypes';
import { normalizeItemName, safeNumber, parseBrazilianDate } from '../core/normalizer';

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Normaliza o header de coluna para comparação tolerante:
 * UPPER, sem acentos, sem espaços, sem underscores, sem traços.
 */
function normalizeHeader(h: unknown): string {
  if (!h) return '';
  return String(h)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_\-]/g, '');
}

/**
 * Formata uma data como 'YYYY-MM-DD' sem depender de UTC.
 */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Formata monthKey 'YYYY-MM' como rótulo 'Mmm/YYYY' (pt-BR).
 */
function monthKeyToLabel(monthKey: string): string {
  const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const [y, m] = monthKey.split('-');
  const idx = parseInt(m, 10) - 1;
  return `${labels[idx] ?? m}/${y}`;
}

/**
 * Avança um mês: '2026-04' → '2026-05'.
 */
function addMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const total = (y * 12 + m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

/**
 * Converte string de data BR ou ISO para 'YYYY-MM-DD'.
 * Retorna null se inválida.
 */
function parseDateToIso(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).trim();

  // Tenta parsear via nosso normalizer (aceita DD/MM/YYYY e YYYY-MM-DD)
  const d = parseBrazilianDate(str);
  if (d) return toIsoDate(d);

  // xlsx pode retornar número serial do Excel para datas
  const num = parseFloat(str);
  if (!isNaN(num) && num > 1000) {
    // Converte número serial Excel para Date
    const excelEpoch = new Date(1899, 11, 30);
    const d2 = new Date(excelEpoch.getTime() + num * 86400000);
    if (!isNaN(d2.getTime())) return toIsoDate(d2);
  }

  return null;
}

/**
 * Mapeia string de grupo para DimensionGroup com tolerância a variações.
 */
function normalizeGroup(raw: unknown): DimensionGroup {
  if (!raw) return 'OTHER';
  const v = normalizeHeader(raw);
  if (v.includes('MOD') || v.includes('DIRETA')) return 'MOD';
  if (v.includes('MOI') || v.includes('INDIRETA')) return 'MOI';
  if (v.includes('EQUIP') || v.includes('VEICULO') || v.includes('MAQUINA')) return 'EQUIP';
  if (v.includes('MATERIAL') || v.includes('INSUMO')) return 'MATERIAL';
  return 'OTHER';
}

/**
 * Tenta converter um valor Excel de data para 'YYYY-MM-DD'.
 * Aceita: número serial Excel, string DD/MM/YYYY, string YYYY-MM-DD.
 */
function excelCellToIsoDate(cell: unknown): string | null {
  if (cell === null || cell === undefined || cell === '') return null;

  // Se for Date object (xlsx pode entregar diretamente)
  if (cell instanceof Date) return toIsoDate(cell);

  return parseDateToIso(cell);
}

// ---------------------------------------------------------------------------
// Mapeamento tolerante de colunas
// ---------------------------------------------------------------------------

interface ColumnMap {
  grupo?: number;
  itemPadrao?: number;
  itemRdo?: number;
  custoMensal?: number;
  iStart?: number;
  iEnd?: number;
  feriados?: number;
  contrato?: number;
  cliente?: number;
  centroCusto?: number;
  valorContratual?: number;
  qtdPlanMes: number[]; // índices das colunas Qtd_Plan_Mes_N (em ordem)
}

function buildColumnMap(headers: string[]): { map: ColumnMap; warnings: string[] } {
  const warnings: string[] = [];
  const map: ColumnMap = { qtdPlanMes: [] };

  // Padrões tolerantes por coluna
  const patterns: Record<keyof Omit<ColumnMap, 'qtdPlanMes'>, string[]> = {
    grupo:            ['GRUPO', 'CATEGORY', 'CATEGORIA', 'TIPO'],
    itemPadrao:       ['ITEMPADRAO', 'ITEM_PADRAO', 'ITEM', 'NOME', 'RECURSO', 'DESCRICAO'],
    itemRdo:          ['ITEMRDO', 'ITEM_RDO', 'EQUIVALENCIA', 'NOMERNO', 'NOME_RDO'],
    custoMensal:      ['CUSTOMENSALUNITARIO', 'CUSTOMENSAL', 'CUSTO', 'VALORMENSAL'],
    iStart:           ['ISTART', 'I_START', 'INICIO', 'DATAINICIO', 'START'],
    iEnd:             ['IEND', 'I_END', 'FIM', 'DATAFIM', 'END'],
    feriados:         ['FERIADOS', 'HOLIDAY', 'HOLIDAYS', 'FERIADO'],
    contrato:         ['CONTRATO', 'NUMERODOCONTRATO', 'NROCONTRATO', 'CONTRACT'],
    cliente:          ['CLIENTE', 'CLIENT', 'CONTRATANTE'],
    centroCusto:      ['CENTRODECUSTO', 'CENTROCUSTO', 'CENTROCUSTO', 'CC'],
    valorContratual:  ['VALORCONTRATUAL', 'VALORCONTRATO', 'VLRCONTRATO', 'CONTRACTVALUE'],
  };

  const normHeaders = headers.map(normalizeHeader);

  // Mapeia colunas de negócio com atribuição explícita por campo
  const findCol = (candidates: string[]) =>
    normHeaders.findIndex(h => candidates.some(c => h.includes(c)));

  const gi = findCol(patterns.grupo);           if (gi !== -1) map.grupo = gi;
  const ii = findCol(patterns.itemPadrao);      if (ii !== -1) map.itemPadrao = ii;
  const ri = findCol(patterns.itemRdo);         if (ri !== -1) map.itemRdo = ri;
  const ci = findCol(patterns.custoMensal);     if (ci !== -1) map.custoMensal = ci;
  const si = findCol(patterns.iStart);          if (si !== -1) map.iStart = si;
  const ei = findCol(patterns.iEnd);            if (ei !== -1) map.iEnd = ei;
  const fi = findCol(patterns.feriados);        if (fi !== -1) map.feriados = fi;
  const coi = findCol(patterns.contrato);       if (coi !== -1) map.contrato = coi;
  const cli = findCol(patterns.cliente);        if (cli !== -1) map.cliente = cli;
  const cci = findCol(patterns.centroCusto);    if (cci !== -1) map.centroCusto = cci;
  const vi = findCol(patterns.valorContratual); if (vi !== -1) map.valorContratual = vi;

  // Detecta colunas Qtd_Plan_Mes_N (qualquer header que contenha QTDPLAN + número)
  const qtdPlanPattern = /QTDPLAN|QTDMES|QTD_PLAN|PLANO_MES|QTD_MES|PLANEJADO_MES/;
  normHeaders.forEach((h, idx) => {
    if (qtdPlanPattern.test(h)) {
      map.qtdPlanMes.push(idx);
    }
  });

  // Ordena por posição na planilha (garante Mes_1 < Mes_2 < ...)
  map.qtdPlanMes.sort((a, b) => a - b);

  // Warnings para colunas importantes não encontradas
  if (map.grupo === undefined)        warnings.push("Coluna 'Grupo' não encontrada — todos os itens ficarão com grupo 'OTHER'.");
  if (map.itemPadrao === undefined)   warnings.push("Coluna 'Item_Padrao' não encontrada — parser tentará usar a primeira coluna.");
  if (map.custoMensal === undefined)  warnings.push("Coluna 'Custo_Mensal_Unitario' não encontrada — hasMissingCost = true para todos.");
  if (map.iStart === undefined)       warnings.push("Coluna 'i_start' não encontrada — meses serão indexados como Mes_1, Mes_2, ...");
  if (map.qtdPlanMes.length === 0)   warnings.push("Nenhuma coluna 'Qtd_Plan_Mes_N' encontrada — monthlyPlan ficará vazio.");

  return { map, warnings };
}

// ---------------------------------------------------------------------------
// Extração de metadados globais (primeira linha ou linha de cabeçalho extra)
// ---------------------------------------------------------------------------

function extractMetadata(
  rows: unknown[][],
  map: ColumnMap,
  headers: string[]
): DimensionImportMetadata {
  const meta: DimensionImportMetadata = {};

  // Varre todas as linhas para encontrar valores de metadata
  // (às vezes metadados ficam em linhas antes do cabeçalho real)
  const scanRows = rows.slice(0, Math.min(rows.length, 5));

  for (const row of scanRows) {
    const getCell = (idx: number | undefined) =>
      idx !== undefined ? row[idx] : undefined;

    if (map.contrato !== undefined && !meta.contrato) {
      const v = getCell(map.contrato);
      if (v) meta.contrato = String(v).trim();
    }
    if (map.cliente !== undefined && !meta.cliente) {
      const v = getCell(map.cliente);
      if (v) meta.cliente = String(v).trim();
    }
    if (map.centroCusto !== undefined && !meta.centroCusto) {
      const v = getCell(map.centroCusto);
      if (v) meta.centroCusto = String(v).trim();
    }
    if (map.valorContratual !== undefined && !meta.valorContratual) {
      const v = getCell(map.valorContratual);
      const n = safeNumber(v);
      if (n > 0) meta.valorContratual = n;
    }
    if (map.iStart !== undefined && !meta.iStart) {
      const v = getCell(map.iStart);
      const iso = excelCellToIsoDate(v);
      if (iso) meta.iStart = iso;
    }
    if (map.iEnd !== undefined && !meta.iEnd) {
      const v = getCell(map.iEnd);
      const iso = excelCellToIsoDate(v);
      if (iso) meta.iEnd = iso;
    }
  }

  // Campos não mapeados que podem conter info útil: varre headers e mapeia
  const extraPatterns: Record<string, string[]> = {};
  headers.forEach((h, idx) => {
    const norm = normalizeHeader(h);
    const isKnown = Object.values(map).some(v =>
      typeof v === 'number' ? v === idx : Array.isArray(v) && v.includes(idx)
    );
    if (!isKnown && h && norm.length > 2) {
      extraPatterns[h] = [`${idx}`];
    }
  });

  return meta;
}

// ---------------------------------------------------------------------------
// Extração de feriados
// ---------------------------------------------------------------------------

function extractHolidays(rows: unknown[][], map: ColumnMap): string[] {
  if (map.feriados === undefined) return [];

  const holidays: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const cell = row[map.feriados];
    if (!cell) continue;

    // Célula pode conter múltiplas datas separadas por vírgula, quebra de linha ou ponto-e-vírgula
    const parts = String(cell).split(/[,;\n\r]+/);
    for (const part of parts) {
      const iso = excelCellToIsoDate(part.trim());
      if (iso && !seen.has(iso)) {
        holidays.push(iso);
        seen.add(iso);
      }
    }
  }

  return holidays.sort();
}

// ---------------------------------------------------------------------------
// Geração do monthlyPlan a partir de i_start + colunas Qtd_Plan_Mes_N
// ---------------------------------------------------------------------------

function buildMonthlyPlan(
  row: unknown[],
  map: ColumnMap,
  globalIStart: string | undefined
): { plan: DimensionPlanMonth[]; iStart: string | undefined } {
  const plan: DimensionPlanMonth[] = [];

  // i_start: tenta a coluna da própria linha, fallback no global
  let rowIStart: string | undefined;
  if (map.iStart !== undefined) {
    const v = row[map.iStart];
    const iso = excelCellToIsoDate(v);
    if (iso) rowIStart = iso;
  }
  const anchorIso = rowIStart ?? globalIStart;

  // Mês âncora: se temos i_start → usa o mês; senão → usa placeholder 'MES_N'
  let anchorMonthKey: string | null = null;
  if (anchorIso) {
    const d = parseBrazilianDate(anchorIso) ?? new Date(anchorIso);
    if (!isNaN(d.getTime())) {
      anchorMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  map.qtdPlanMes.forEach((colIdx, i) => {
    const qty = safeNumber(row[colIdx]);
    const monthKey = anchorMonthKey ? addMonths(anchorMonthKey, i) : `MES_${i + 1}`;
    const monthLabel = anchorMonthKey ? monthKeyToLabel(monthKey) : `Mês ${i + 1}`;
    plan.push({ monthKey, monthLabel, quantity: qty });
  });

  return { plan, iStart: anchorIso };
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

/**
 * Importa e normaliza uma planilha de dimensões de obra.
 *
 * @param file      - Arquivo XLSX/XLS selecionado pelo usuário
 * @param projectId - ID do projeto a associar os dados
 * @returns Promise<DimensionImportResult>
 *
 * @example
 * const result = await parseDimensionsExcel(file, 'proj-001');
 * // result.items[0] → { name: 'Pedreiro', group: 'MOD', monthlyPlan: [...], ... }
 * // result.months   → [{ monthKey: '2026-04', monthLabel: 'Abr/2026' }, ...]
 * // result.holidays → ['2026-04-21', '2026-09-07']
 */
export async function parseDimensionsExcel(
  file: File,
  _projectId: string
): Promise<DimensionImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Converte para array de arrays (header na linha 0)
        const jsonData = utils.sheet_to_json<unknown[]>(worksheet, {
          header: 1,
          defval: '',
          blankrows: false,
        });

        if (jsonData.length < 2) {
          resolve(emptyResult('O arquivo está vazio ou não possui dados.'));
          return;
        }

        const rawHeaders = jsonData[0] as unknown[];
        const headers = rawHeaders.map(h => String(h ?? '').trim());
        const dataRows = jsonData.slice(1) as unknown[][];

        // ── Mapeamento de colunas ─────────────────────────────────────────
        const { map, warnings } = buildColumnMap(headers);
        const errors: string[] = [];

        // Fallback: se itemPadrao não encontrado, usa coluna 0
        if (map.itemPadrao === undefined) {
          map.itemPadrao = 0;
        }

        // ── Metadados globais ─────────────────────────────────────────────
        const metadata = extractMetadata(dataRows, map, headers);
        const globalIStart = metadata.iStart;

        // ── Feriados ──────────────────────────────────────────────────────
        const holidays = extractHolidays(dataRows, map);

        // ── Itens ─────────────────────────────────────────────────────────
        const items: DimensionItem[] = [];
        const seenNames = new Set<string>();
        let totalRows = 0;
        let errorCount = 0;

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          if (!row || row.length === 0) continue;

          // Nome do item (obrigatório)
          const rawName = String(row[map.itemPadrao!] ?? '').trim();
          if (!rawName) continue; // linha vazia ou apenas espaços → ignora silenciosamente

          totalRows++;

          // Normalização
          const normalizedName = normalizeItemName(rawName);

          // Duplicatas: mantém o primeiro, warning nos subsequentes
          if (seenNames.has(normalizedName)) {
            warnings.push(`Linha ${i + 2}: item duplicado '${rawName}' — linha ignorada.`);
            errorCount++;
            continue;
          }
          seenNames.add(normalizedName);

          // Grupo
          const rawGroup = map.grupo !== undefined ? row[map.grupo] : undefined;
          const group = normalizeGroup(rawGroup);
          const hasMissingGroup = !rawGroup || String(rawGroup).trim() === '';

          // Custo mensal unitário
          const rawCusto = map.custoMensal !== undefined ? row[map.custoMensal] : undefined;
          const monthlyUnitCost = safeNumber(rawCusto);
          const hasMissingCost = rawCusto === undefined || rawCusto === '' || rawCusto === null;

          // Equivalência RDO (opcional)
          let rdoEquivalent: string | undefined;
          let rdoEquivalentNormalized: string | undefined;
          if (map.itemRdo !== undefined) {
            const raw = String(row[map.itemRdo] ?? '').trim();
            if (raw) {
              rdoEquivalent = raw;
              rdoEquivalentNormalized = normalizeItemName(raw);
            }
          }

          // i_end por linha
          let iEnd: string | undefined;
          if (map.iEnd !== undefined) {
            const iso = excelCellToIsoDate(row[map.iEnd]);
            if (iso) iEnd = iso;
          }

          // Plano mensal
          const { plan: monthlyPlan, iStart: rowIStart } = buildMonthlyPlan(
            row, map, globalIStart
          );

          // Warnings não-fatais
          if (hasMissingCost) {
            warnings.push(`Linha ${i + 2}: '${rawName}' sem custo mensal unitário.`);
          }
          if (hasMissingGroup) {
            warnings.push(`Linha ${i + 2}: '${rawName}' sem grupo — classificado como 'OTHER'.`);
          }
          if (monthlyPlan.length === 0 && map.qtdPlanMes.length > 0) {
            warnings.push(`Linha ${i + 2}: '${rawName}' sem quantidades planejadas.`);
          }

          items.push({
            name: rawName,
            normalizedName,
            rdoEquivalent,
            rdoEquivalentNormalized,
            group,
            monthlyUnitCost,
            hasMissingCost,
            hasMissingGroup,
            monthlyPlan,
            iStart: rowIStart ?? globalIStart,
            iEnd,
          });
        }

        // ── Meses detectados (union de todos os planos) ───────────────────
        const monthSet = new Map<string, string>(); // monthKey → monthLabel
        items.forEach(item =>
          item.monthlyPlan.forEach(mp => {
            if (!monthSet.has(mp.monthKey)) monthSet.set(mp.monthKey, mp.monthLabel);
          })
        );
        const months = Array.from(monthSet.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([monthKey, monthLabel]) => ({ monthKey, monthLabel }));

        // ── Resultado ─────────────────────────────────────────────────────
        resolve({
          items,
          holidays,
          metadata,
          months,
          totalRows,
          successCount: items.length,
          errorCount,
          errors,
          warnings,
          importedAt: new Date().toISOString(),
        });
      } catch (err) {
        resolve(emptyResult(
          `Erro fatal ao processar XLSX: ${err instanceof Error ? err.message : String(err)}`
        ));
      }
    };

    reader.onerror = () => resolve(emptyResult('Erro ao ler o arquivo.'));
    reader.readAsBinaryString(file);
  });
}

// ---------------------------------------------------------------------------
// Helpers de resultado vazio
// ---------------------------------------------------------------------------

function emptyResult(error: string): DimensionImportResult {
  return {
    items: [],
    holidays: [],
    metadata: {},
    months: [],
    totalRows: 0,
    successCount: 0,
    errorCount: 1,
    errors: [error],
    warnings: [],
    importedAt: new Date().toISOString(),
  };
}
