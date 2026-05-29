/**
 * measurementEngine.ts
 * Motor de Medição Contratual
 *
 * Transforma atividades de RDOs em fatos de medição, cruzando-as com as
 * composições importadas e a tabela de preços do projeto (fallback).
 */

import {
  RDOData,
  Project,
  Activity,
  ServiceItem
} from '../../../types';
import {
  CompositionImportResult,
  ServiceComposition,
  MeasurementFact,
  MeasurementStatus
} from '../types/analyticsTypes';
import { normalizeText, safeNumber } from '../core/normalizer';

// ---------------------------------------------------------------------------
// 1. matchActivityToComposition
// ---------------------------------------------------------------------------

/**
 * Tenta encontrar a composição correspondente para uma atividade do RDO.
 *
 * Estratégia de fallback:
 * 1. Busca exata pelo código (activity.code).
 * 2. Busca por equivalência de nome normalizado.
 *
 * @returns { composition, isNameEquivalence }
 */
export function matchActivityToComposition(
  activity: Activity,
  compositions: CompositionImportResult | null
): { composition: ServiceComposition | null; isNameEquivalence: boolean } {
  if (!compositions || !compositions.compositionsByService) {
    return { composition: null, isNameEquivalence: false };
  }

  const { compositionsByService } = compositions;

  // 1. Busca por código
  if (activity.code && compositionsByService[activity.code]) {
    return { composition: compositionsByService[activity.code], isNameEquivalence: false };
  }

  // 2. Busca por nome normalizado
  const normalizedActivityName = normalizeText(activity.description);
  for (const comp of Object.values(compositionsByService)) {
    if (normalizeText(comp.description) === normalizedActivityName) {
      return { composition: comp, isNameEquivalence: true };
    }
  }

  return { composition: null, isNameEquivalence: false };
}

// ---------------------------------------------------------------------------
// 2. buildMeasurementFacts
// ---------------------------------------------------------------------------

export interface BuildMeasurementFactsParams {
  projectId: string;
  rdos: RDOData[];
  compositions: CompositionImportResult | null;
  projectServices: ServiceItem[];
}

export interface MeasurementFactsResult {
  facts: MeasurementFact[];
  warnings: string[];
}

/**
 * Gera fatos de medição a partir das atividades dos RDOs.
 */
export function buildMeasurementFacts(
  params: BuildMeasurementFactsParams
): MeasurementFactsResult {
  const { projectId, rdos, compositions, projectServices } = params;
  const facts: MeasurementFact[] = [];
  const warnings: string[] = [];

  for (const rdo of rdos) {
    // Ignora RDOs de outros projetos, se acidentalmente passados
    if (rdo.projectId && rdo.projectId !== projectId) continue;

    for (const activity of rdo.activities) {
      // Regra 10: quantidade zero deve ser mantida, mas precisa existir a propriedade "quantity"
      if (activity.quantity === undefined || activity.quantity === null) {
        continue; // Ignora se não houver campo quantidade
      }

      const quantity = safeNumber(activity.quantity);
      let unitPrice = 0;
      let unitCost = 0;
      let unit = 'UN';
      let status: MeasurementStatus = 'SEM_COMPOSICAO';

      const { composition, isNameEquivalence } = matchActivityToComposition(activity, compositions);

      if (composition) {
        unitPrice = composition.unitPrice;
        unitCost = composition.unitCost;
        unit = composition.unit || unit;
        status = isNameEquivalence ? 'EQUIVALENCIA_NOME' : 'ENCONTRADA_COMPOSICAO';
        
        // Verifica divergência de unidade (heurística simples por nome normalizado da unidade)
        // Se RDO não tem unidade, assumimos a da composição. 
        // Como Activity não tem unit no type padrão, usamos a unidade da composição.
        // Mas se quisermos tratar divergência no futuro, precisaria de unit na Activity.
      } else {
        // Fallback: buscar em projectServices
        const fallbackService = projectServices.find(s => 
          s.code === activity.code || normalizeText(s.scope) === normalizeText(activity.description)
        );

        if (fallbackService) {
          unitPrice = fallbackService.value; // Usamos o value do ServiceItem como unitPrice
          unitCost = 0; // Fallback não tem custo detalhado
          unit = fallbackService.unit;
          status = 'PRECO_SERVICES_FALLBACK';
        } else {
          status = 'SEM_COMPOSICAO';
          warnings.push(`RDO ${rdo.date}: Atividade '${activity.description}' sem composição e sem fallback.`);
        }
      }

      const measuredValue = quantity * unitPrice;
      const theoreticalCost = quantity * unitCost;
      const margin = measuredValue - theoreticalCost;
      const marginPercent = measuredValue !== 0 ? margin / measuredValue : 0;

      facts.push({
        projectId,
        date: rdo.date,
        activityCode: activity.code || '',
        activityDescription: activity.description,
        unit,
        quantity,
        unitPrice,
        unitCost,
        measuredValue,
        theoreticalCost,
        margin,
        marginPercent,
        status,
      });
    }
  }

  // Ordenar por data
  facts.sort((a, b) => a.date.localeCompare(b.date));

  return { facts, warnings };
}
