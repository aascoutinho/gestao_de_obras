/**
 * resourcesMonthlyEngine.ts
 * Motor de cálculo de presença média mensal de recursos.
 *
 * ============================================================
 * DIFERENÇA CONCEITUAL CRÍTICA
 * ============================================================
 *
 * REGRA ANTIGA (calculateDailyAverageFromRdos — histogramUtils.ts):
 *   média = soma dos apontamentos no mês / número de RDOs (dias COM relatório)
 *
 *   Problema: se apenas 4 RDOs foram emitidos em março (o restante não foi
 *   registrado), a média é calculada sobre 4, não sobre os 22 dias úteis
 *   reais do mês. Isso superestima artificialmente a presença.
 *
 *   Exemplo: Pedreiro apontado 4 dias em março →
 *     REGRA ANTIGA: 4 / 4 = 1,00 (pedreiro "sempre presente")  ← ERRADO
 *
 * REGRA CORRETA (calculateValidDailyPresenceAverage — este arquivo):
 *   média = apontamentos válidos do item no mês / dias úteis válidos do mês
 *
 *   Exemplo: Pedreiro apontado 4 dias em março (22 dias úteis) →
 *     REGRA NOVA: 4 / 22 = 0,181818  ← CORRETO
 *
 * A regra antiga NÃO foi removida para garantir compatibilidade com
 * o componente HistogramAnalysis.tsx durante esta sprint.
 * ============================================================
 */

import { RDOData } from '../../../types';
import { getMonthKeyFromDateString, countBusinessDaysInMonth } from '../core/calendarRules';
import { getValidDailyPresenceKeys, ResourceSourceGroup } from '../core/contractRules';
import { normalizeItemName } from '../core/normalizer';

// ---------------------------------------------------------------------------
// Tipos de entrada / saída
// ---------------------------------------------------------------------------

/**
 * Parâmetros da função calculateValidDailyPresenceAverage.
 */
export interface ValidDailyPresenceParams {
  /** Lista completa de RDOs do projeto (não precisa estar filtrada por mês). */
  rdos: RDOData[];

  /**
   * Mês de referência no formato 'YYYY-MM'.
   * Apenas RDOs cuja data pertencer a este mês serão considerados.
   */
  monthKey: string;

  /**
   * Grupo de recursos a calcular.
   * - 'WORKFORCE': mão-de-obra direta e indireta
   * - 'EQUIPMENT': equipamentos e veículos
   */
  sourceGroup: ResourceSourceGroup;

  /**
   * Lista opcional de feriados no formato 'YYYY-MM-DD'.
   * Quando não informado, apenas fins de semana são excluídos dos dias úteis.
   */
  holidays?: string[];

  /**
   * Sobrescreve o número de dias úteis calculado automaticamente.
   * Use quando a obra adota calendário diferente (ex.: trabalha sábados).
   *
   * Exemplo: para o enunciado "22 dias úteis em março", passe
   * businessDaysOverride = 22.
   */
  businessDaysOverride?: number;
}

/**
 * Resultado detalhado por item para auditoria e debug.
 */
export interface ItemPresenceDetail {
  /** Nome normalizado do recurso */
  normalizedName: string;
  /** Número de dias úteis válidos com apontamento deste item */
  validAppointmentDays: number;
  /** Denominador usado no cálculo (dias úteis do mês) */
  businessDaysInMonth: number;
  /** Média correta: validAppointmentDays / businessDaysInMonth */
  average: number;
}

/**
 * Resultado completo de calculateValidDailyPresenceAverage.
 */
export interface ValidDailyPresenceResult {
  /**
   * Mapa simplificado nome_normalizado → média.
   * Compatível com o retorno de calculateDailyAverageFromRdos.
   */
  averages: Record<string, number>;

  /** Detalhamento por item para auditoria */
  details: ItemPresenceDetail[];

  /** Número total de dias úteis usados como denominador */
  businessDaysInMonth: number;

  /** Mês de referência (passado como entrada) */
  monthKey: string;

  /** Número de RDOs do mês que passaram na validação de dia útil */
  validRdoCount: number;

  /** Número de RDOs do mês descartados (fim de semana, feriado, sem atividade) */
  discardedRdoCount: number;
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

/**
 * Calcula a média diária de presença de recursos usando a REGRA CORRETA:
 *
 *   média(item) = apontamentos válidos no mês / dias úteis válidos do mês
 *
 * Diferente de calculateDailyAverageFromRdos (histogramUtils.ts), que divide
 * pelo número de RDOs existentes no mês (não pelos dias úteis reais).
 *
 * @param params - Veja ValidDailyPresenceParams
 * @returns ValidDailyPresenceResult com médias e detalhamento
 *
 * ─── Exemplo de uso (caso março com 22 dias úteis) ───────────────
 *
 * const result = calculateValidDailyPresenceAverage({
 *   rdos: allRdos,
 *   monthKey: '2025-03',
 *   sourceGroup: 'WORKFORCE',
 *   businessDaysOverride: 22,   // obra trabalha sábados
 * });
 *
 * // Pedreiro apontado em apenas 4 RDOs válidos:
 * result.averages['PEDREIRO'] // → 0.181818 (4 / 22)
 * ─────────────────────────────────────────────────────────────────
 */
export function calculateValidDailyPresenceAverage(
  params: ValidDailyPresenceParams
): ValidDailyPresenceResult {
  const { rdos, monthKey, sourceGroup, holidays, businessDaysOverride } = params;

  // ── 1. Extrair ano e mês do monthKey ─────────────────────────────────────
  const [yearStr, monthStr] = monthKey.split('-');
  const year  = parseInt(yearStr,  10);
  const month = parseInt(monthStr, 10); // 1-indexed

  // ── 2. Determinar denominador (dias úteis do mês) ────────────────────────
  const businessDaysInMonth =
    businessDaysOverride !== undefined && businessDaysOverride > 0
      ? businessDaysOverride
      : countBusinessDaysInMonth(year, month, holidays);

  // ── 3. Filtrar RDOs do mês de referência ─────────────────────────────────
  const monthRdos = rdos.filter(
    rdo => getMonthKeyFromDateString(rdo.date) === monthKey
  );

  // ── 4. Contabilizar apontamentos válidos por item ─────────────────────────
  //
  // Para cada RDO do mês:
  //   - Verifica se é um dia útil válido de execução (contractRules)
  //   - Se válido, adiciona os nomes normalizados dos recursos ao Set do dia
  //
  // Estrutura: Map<normalizedName, Set<dateKey>>
  // → O Set de datas garante que um item conta no máximo 1x por dia
  //   mesmo que haja múltiplos RDOs para a mesma data.
  //
  const appointmentsByItem = new Map<string, Set<string>>();

  let validRdoCount     = 0;
  let discardedRdoCount = 0;

  monthRdos.forEach(rdo => {
    const presenceKeys = getValidDailyPresenceKeys(rdo, sourceGroup, holidays);

    if (presenceKeys.size === 0) {
      // Dia descartado: fim de semana, feriado ou sem atividade
      // (presenceKeys pode ser vazio por ausência de recursos mesmo em dia válido)
      // Conta como descartado apenas se isValidExecutionDay retornou false
      // Para a contagem de validRdoCount, usamos a heurística de presença > 0
      discardedRdoCount++;
      return;
    }

    validRdoCount++;

    presenceKeys.forEach(normalizedName => {
      if (!appointmentsByItem.has(normalizedName)) {
        appointmentsByItem.set(normalizedName, new Set());
      }
      // Usa a data do RDO como chave de deduplicação por dia
      appointmentsByItem.get(normalizedName)!.add(rdo.date);
    });
  });

  // ── 5. Calcular médias ────────────────────────────────────────────────────
  const averages: Record<string, number> = {};
  const details: ItemPresenceDetail[] = [];

  // Denominador seguro: nunca dividir por zero
  const safeDenominator = businessDaysInMonth > 0 ? businessDaysInMonth : 1;

  appointmentsByItem.forEach((dateDays, normalizedName) => {
    const validAppointmentDays = dateDays.size;
    const average = validAppointmentDays / safeDenominator;

    averages[normalizedName] = average;
    details.push({
      normalizedName,
      validAppointmentDays,
      businessDaysInMonth,
      average,
    });
  });

  // Ordena o detalhamento por nome para facilitar leitura
  details.sort((a, b) => a.normalizedName.localeCompare(b.normalizedName));

  return {
    averages,
    details,
    businessDaysInMonth,
    monthKey,
    validRdoCount,
    discardedRdoCount,
  };
}

// ---------------------------------------------------------------------------
// Função de compatibilidade: bridge para o formato antigo
// ---------------------------------------------------------------------------

/**
 * Wrapper que retorna apenas o Record<string, number> de médias,
 * no mesmo formato de calculateDailyAverageFromRdos (histogramUtils.ts).
 *
 * Útil para substituição gradual sem quebrar assinaturas existentes.
 *
 * @param rdos                - RDOs do projeto
 * @param monthKey            - 'YYYY-MM'
 * @param sourceGroup         - 'WORKFORCE' | 'EQUIPMENT'
 * @param holidays            - Lista opcional de feriados
 * @param businessDaysOverride - Override do denominador
 *
 * @example
 * // Substitui calculateDailyAverageFromRdos com a regra correta:
 * const averages = getValidPresenceAveragesCompat(rdos, '2025-03', 'WORKFORCE', [], 22);
 * averages['PEDREIRO'] // → 0.181818
 */
export function getValidPresenceAveragesCompat(
  rdos: RDOData[],
  monthKey: string,
  sourceGroup: ResourceSourceGroup,
  holidays?: string[],
  businessDaysOverride?: number
): Record<string, number> {
  const result = calculateValidDailyPresenceAverage({
    rdos,
    monthKey,
    sourceGroup,
    holidays,
    businessDaysOverride,
  });
  return result.averages;
}

// ---------------------------------------------------------------------------
// Função auxiliar: formata resultado para console/log de auditoria
// ---------------------------------------------------------------------------

/**
 * Gera um relatório de texto da análise de presença para fins de debug.
 *
 * @example
 * console.log(formatPresenceReport(result));
 * // → "Mês: 2025-03 | Dias úteis: 22 | RDOs válidos: 4 | Descartados: 0"
 * // → "PEDREIRO: 4 dias / 22 = 0,1818 (18,18%)"
 */
export function formatPresenceReport(result: ValidDailyPresenceResult): string {
  const lines: string[] = [
    `Mês: ${result.monthKey} | Dias úteis: ${result.businessDaysInMonth} | RDOs válidos: ${result.validRdoCount} | Descartados: ${result.discardedRdoCount}`,
    `${'─'.repeat(70)}`,
  ];

  if (result.details.length === 0) {
    lines.push('Nenhum apontamento válido encontrado para este mês.');
  } else {
    result.details.forEach(d => {
      const pct = (d.average * 100).toFixed(2);
      lines.push(
        `${d.normalizedName.padEnd(30)} ${d.validAppointmentDays.toString().padStart(3)} dias / ${d.businessDaysInMonth} = ${d.average.toFixed(6)} (${pct}%)`
      );
    });
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Validação interna (chamada em desenvolvimento para checar resultado)
// ---------------------------------------------------------------------------

/**
 * Valida o caso-base do enunciado:
 *   4 apontamentos / 22 dias úteis = 0,181818...
 *
 * Lança erro se o cálculo estiver errado. Use em ambiente de desenvolvimento.
 *
 * @internal
 */
export function _validateBaseCase(): void {
  const EXPECTED = 4 / 22; // 0.18181818...

  // Cria um RDO mínimo para cada um dos 4 dias válidos
  // Usando datas de segunda a quinta da primeira semana de março/2025
  const mockRdos: RDOData[] = [
    { id: 'rdo-1', teamId: 't1', date: '03/03/2025', workforce: [{ role: 'Pedreiro', count: 2 }], equipment: [], activities: [{ description: 'Alvenaria', status: 'DONE', quantity: 10 }], occurrences: [] },
    { id: 'rdo-2', teamId: 't1', date: '04/03/2025', workforce: [{ role: 'Pedreiro', count: 2 }], equipment: [], activities: [{ description: 'Alvenaria', status: 'DONE', quantity: 8  }], occurrences: [] },
    { id: 'rdo-3', teamId: 't1', date: '05/03/2025', workforce: [{ role: 'Pedreiro', count: 2 }], equipment: [], activities: [{ description: 'Alvenaria', status: 'DONE', quantity: 9  }], occurrences: [] },
    { id: 'rdo-4', teamId: 't1', date: '06/03/2025', workforce: [{ role: 'Pedreiro', count: 2 }], equipment: [], activities: [{ description: 'Alvenaria', status: 'DONE', quantity: 7  }], occurrences: [] },
  ];

  const result = calculateValidDailyPresenceAverage({
    rdos: mockRdos,
    monthKey: '2025-03',
    sourceGroup: 'WORKFORCE',
    businessDaysOverride: 22,
  });

  const actual = result.averages[normalizeItemName('Pedreiro')] ?? -1;
  const tolerance = 1e-9;

  if (Math.abs(actual - EXPECTED) > tolerance) {
    throw new Error(
      `[resourcesMonthlyEngine] Validação falhou!\n` +
      `  Esperado: ${EXPECTED}\n` +
      `  Obtido:   ${actual}`
    );
  }

  console.info(
    `[resourcesMonthlyEngine] ✓ Caso-base válido: PEDREIRO = ${actual.toFixed(6)} ` +
    `(4 / 22 = ${EXPECTED.toFixed(6)})`
  );
}
