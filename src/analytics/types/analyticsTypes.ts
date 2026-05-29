/**
 * analyticsTypes.ts
 * Contract Intelligence – tipos TypeScript para o módulo de análise analítica.
 *
 * Estes tipos são compatíveis com as entidades existentes:
 *   Project, Team, RDOData, HistogramItem, ServiceItem (definidas em types.ts)
 *
 * IMPORTANTE: Este arquivo é somente de leitura para o runtime inicial;
 * não altera nenhuma lógica de negócio existente.
 */

// ---------------------------------------------------------------------------
// Re-exportações de referência (sem importação circular)
// ---------------------------------------------------------------------------
// Os tipos abaixo referenciam as interfaces centrais por nome para manter
// rastreabilidade, mas não as importam diretamente para evitar dependências
// circulares nesta fase inicial.

// ---------------------------------------------------------------------------
// 1. AnalyticsProjectContext
// ---------------------------------------------------------------------------
/**
 * Contexto de projeto enriquecido usado como entrada central para
 * todos os motores analíticos do módulo Contract Intelligence.
 * Espelha Project + dados operacionais associados.
 */
export interface AnalyticsProjectContext {
  /** Identificador único do projeto (= Project.id) */
  projectId: string;
  /** Nome legível do projeto (= Project.name) */
  projectName: string;
  /** Data de início prevista (ISO 8601) */
  startDate: string;
  /** Data de término prevista (ISO 8601) */
  endDate: string;
  /** Valor contratual bruto (= Project.contractValue) */
  contractValue?: number;
  /** Valor orçado (= Project.budgetValue) */
  budgetValue?: number;
  /** Status corrente do projeto */
  status?: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  /** Regional responsável */
  regional?: string;
  /** Cliente contratante */
  client?: string;
  /** Período de análise (mês de referência, formato 'YYYY-MM') */
  referencePeriod?: string;
}

// ---------------------------------------------------------------------------
// 2. DimensionItem
// ---------------------------------------------------------------------------
/**
 * Representa um item de composição de dimensão (insumo, serviço ou recurso)
 * importado de planilhas externas ou extraído via IA.
 */
export interface DimensionItem {
  /** Código único do item */
  code: string;
  /** Descrição/nome do item */
  description: string;
  /** Unidade de medida (m², m³, h, un, etc.) */
  unit: string;
  /** Quantidade prevista no contrato */
  contractedQuantity: number;
  /** Preço unitário contratado */
  unitPrice: number;
  /** Categoria de custo (material, mão-de-obra, equipamento, etc.) */
  costCategory?: 'MATERIAL' | 'LABOR' | 'EQUIPMENT' | 'OTHER';
  /** Referência à tabela de preços origem (ex.: SINAPI, SETOP, PRÓPRIO) */
  priceTableRef?: string;
}

// ---------------------------------------------------------------------------
// 3. DimensionImportResult
// ---------------------------------------------------------------------------
/**
 * Resultado de uma operação de importação de dimensões.
 * Agrupa os itens importados com sucesso e os erros encontrados.
 */
export interface DimensionImportResult {
  /** Itens importados com sucesso */
  items: DimensionItem[];
  /** Total de linhas processadas */
  totalRows: number;
  /** Total de itens importados com sucesso */
  successCount: number;
  /** Total de linhas com erro ou ignoradas */
  errorCount: number;
  /** Problemas de validação encontrados durante a importação */
  issues: ValidationIssue[];
  /** Timestamp da importação (ISO 8601) */
  importedAt: string;
  /** Fonte dos dados (ex.: 'EXCEL_UPLOAD', 'AI_EXTRACTION', 'MANUAL') */
  source: 'EXCEL_UPLOAD' | 'AI_EXTRACTION' | 'MANUAL';
}

// ---------------------------------------------------------------------------
// 4. CompositionItem
// ---------------------------------------------------------------------------
/**
 * Item de composição de custo unitário.
 * Representa um insumo dentro de uma composição analítica de serviço.
 * Compatível com ServiceItem (code, scope, unit, value).
 */
export interface CompositionItem {
  /** Código do insumo na composição */
  code: string;
  /** Descrição do insumo */
  description: string;
  /** Unidade de medida */
  unit: string;
  /** Coeficiente de consumo por unidade do serviço */
  coefficient: number;
  /** Preço unitário do insumo */
  unitPrice: number;
  /** Valor total = coefficient × unitPrice */
  totalPrice: number;
  /** Tipo do insumo */
  inputType: 'MATERIAL' | 'LABOR' | 'EQUIPMENT' | 'OVERHEAD';
  /** Referência externa (SINAPI, SETOP, etc.) */
  externalRef?: string;
}

// ---------------------------------------------------------------------------
// 5. CompositionImportResult
// ---------------------------------------------------------------------------
/**
 * Resultado de uma importação de composições analíticas.
 */
export interface CompositionImportResult {
  /** Mapa de código do serviço → lista de itens de composição */
  compositionsByService: Record<string, CompositionItem[]>;
  /** Total de serviços processados */
  totalServices: number;
  /** Total de serviços com composição completa */
  successCount: number;
  /** Total de serviços com composição incompleta ou com erro */
  errorCount: number;
  /** Problemas encontrados */
  issues: ValidationIssue[];
  /** Timestamp da importação (ISO 8601) */
  importedAt: string;
}

// ---------------------------------------------------------------------------
// 6. ContractAnalyticsResult
// ---------------------------------------------------------------------------
/**
 * Resultado consolidado de uma análise contratual.
 * Agrega métricas financeiras, físicas e de conformidade para um projeto.
 */
export interface ContractAnalyticsResult {
  /** Contexto do projeto analisado */
  context: AnalyticsProjectContext;
  /** Percentual físico executado (0–100) */
  physicalProgressPercent: number;
  /** Percentual financeiro executado (0–100) */
  financialProgressPercent: number;
  /** Valor medido acumulado */
  measuredValue: number;
  /** Valor previsto até a data de referência */
  plannedValue: number;
  /** Desvio financeiro (positivo = adiantado, negativo = atrasado) */
  financialDeviation: number;
  /** Índice de desempenho de custo (CPI = medido / planejado) */
  cpi?: number;
  /** Índice de desempenho de prazo (SPI = progresso real / progresso planejado) */
  spi?: number;
  /** Problemas de conformidade identificados */
  validationIssues: ValidationIssue[];
  /** Data de geração do resultado (ISO 8601) */
  generatedAt: string;
  /** Versão do algoritmo de análise */
  engineVersion: string;
}

// ---------------------------------------------------------------------------
// 7. ValidationIssue
// ---------------------------------------------------------------------------
/**
 * Problema de validação encontrado durante importação ou análise.
 */
export interface ValidationIssue {
  /** Identificador do campo ou entidade com problema */
  field: string;
  /** Código de erro padronizado */
  code: string;
  /** Mensagem legível descrevendo o problema */
  message: string;
  /** Severidade do problema */
  severity: 'ERROR' | 'WARNING' | 'INFO';
  /** Linha de origem (quando aplicável, ex.: importação de Excel) */
  sourceLine?: number;
  /** Valor que causou o problema */
  offendingValue?: string | number;
}

// ---------------------------------------------------------------------------
// 8. MonthlyResourceFact
// ---------------------------------------------------------------------------
/**
 * Fato de recurso mensal: registra a quantidade real de um recurso
 * (mão-de-obra ou equipamento) utilizada em determinado mês.
 * Compatível com HistogramItem.monthlyPlan e dados de RDOData.
 */
export interface MonthlyResourceFact {
  /** ID do projeto */
  projectId: string;
  /** Mês de referência (formato 'YYYY-MM') */
  monthKey: string;
  /** Rótulo legível do mês (ex.: 'Jan/2025') */
  monthLabel: string;
  /** Nome normalizado do recurso (= HistogramItem.normalizedName) */
  resourceNormalizedName: string;
  /** Categoria do recurso */
  resourceCategory: 'MAO_OBRA_DIRETA' | 'MAO_OBRA_INDIRETA' | 'EQUIPAMENTOS';
  /** Quantidade planejada no histograma */
  plannedQuantity: number;
  /** Quantidade real apontada nos RDOs */
  actualQuantity: number;
  /** Desvio = actual − planned */
  deviation: number;
  /** Percentual de desvio */
  deviationPercent: number;
}

// ---------------------------------------------------------------------------
// 9. MeasurementFact
// ---------------------------------------------------------------------------
/**
 * Fato de medição: representa uma medição periódica de serviço executado.
 * Liga ServiceItem (do contrato) à quantidade efetivamente medida.
 */
export interface MeasurementFact {
  /** ID único da medição */
  measurementId: string;
  /** ID do projeto */
  projectId: string;
  /** Código do serviço medido (= ServiceItem.code) */
  serviceCode: string;
  /** Descrição do serviço */
  serviceDescription: string;
  /** Unidade de medida */
  unit: string;
  /** Período de medição (formato 'YYYY-MM') */
  period: string;
  /** Quantidade medida no período */
  measuredQuantity: number;
  /** Quantidade acumulada até o período */
  cumulativeQuantity: number;
  /** Preço unitário contratado */
  unitPrice: number;
  /** Valor financeiro da medição (= measuredQuantity × unitPrice) */
  measuredValue: number;
  /** Valor financeiro acumulado */
  cumulativeValue: number;
  /** Status da medição */
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  /** Data de aprovação (ISO 8601), quando aplicável */
  approvedAt?: string;
}

// ---------------------------------------------------------------------------
// 10. ProductivityFact
// ---------------------------------------------------------------------------
/**
 * Fato de produtividade: razão entre quantidade produzida e recursos
 * consumidos em um período, derivada dos RDOs.
 */
export interface ProductivityFact {
  /** ID do projeto */
  projectId: string;
  /** ID do time (= Team.id) */
  teamId: string;
  /** Código do serviço / atividade */
  serviceCode: string;
  /** Mês de referência (formato 'YYYY-MM') */
  monthKey: string;
  /** Total de horas-homem consumidas no período */
  totalManHours: number;
  /** Total de horas-equipamento consumidas no período */
  totalEquipmentHours: number;
  /** Quantidade produzida no período */
  producedQuantity: number;
  /** Unidade de medida da produção */
  unit: string;
  /** Índice de produtividade (quantidade / horas-homem) */
  productivityIndex: number;
  /** Índice de produtividade referencial (do orçamento) */
  referenceProductivityIndex?: number;
  /** Desvio do índice de produtividade (real − referência) */
  productivityDeviation?: number;
}

// ---------------------------------------------------------------------------
// 11. OccurrenceFact
// ---------------------------------------------------------------------------
/**
 * Fato de ocorrência: agrega as ocorrências dos RDOs para análise
 * de frequência e impacto no prazo/custo.
 * Compatível com RDOData.occurrences.
 */
export interface OccurrenceFact {
  /** ID do projeto */
  projectId: string;
  /** ID do time (= Team.id) */
  teamId?: string;
  /** Mês de referência (formato 'YYYY-MM') */
  monthKey: string;
  /** Tipo de ocorrência (= Occurrence.type) */
  occurrenceType: string;
  /** Nível de impacto */
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  /** Quantidade de registros no período */
  count: number;
  /** Total de minutos de impacto no período */
  totalImpactMinutes: number;
  /** Total de horas de impacto (totalImpactMinutes / 60) */
  totalImpactHours: number;
  /** Custo estimado do impacto (quando calculável) */
  estimatedImpactCost?: number;
}

// ---------------------------------------------------------------------------
// 12. IdlenessFact
// ---------------------------------------------------------------------------
/**
 * Fato de ociosidade: registra períodos em que recursos (mão-de-obra
 * ou equipamentos) estiveram disponíveis mas não produziram.
 */
export interface IdlenessFact {
  /** ID do projeto */
  projectId: string;
  /** ID do time */
  teamId?: string;
  /** Mês de referência (formato 'YYYY-MM') */
  monthKey: string;
  /** Nome do recurso ocioso */
  resourceName: string;
  /** Categoria do recurso */
  resourceCategory: 'MAO_OBRA_DIRETA' | 'MAO_OBRA_INDIRETA' | 'EQUIPAMENTOS';
  /** Total de horas disponíveis no período */
  availableHours: number;
  /** Total de horas efetivamente trabalhadas no período */
  workedHours: number;
  /** Horas ociosas = available − worked */
  idleHours: number;
  /** Percentual de ociosidade (0–100) */
  idlenessPercent: number;
  /** Custo da ociosidade (quando calculável) */
  idlenessCost?: number;
  /** Motivo principal da ociosidade */
  primaryReason?: string;
}

// ---------------------------------------------------------------------------
// 13. PowerBIModel
// ---------------------------------------------------------------------------
/**
 * Modelo de exportação para Power BI via tabela estrela simplificada.
 * Agrega todos os fatos em um único objeto pronto para serialização
 * como arquivo JSON ou para geração de Excel multi-abas.
 */
export interface PowerBIModel {
  /** Metadados do modelo */
  metadata: {
    /** ID do projeto */
    projectId: string;
    /** Nome do projeto */
    projectName: string;
    /** Data de geração do modelo (ISO 8601) */
    generatedAt: string;
    /** Período coberto – início (YYYY-MM) */
    periodStart: string;
    /** Período coberto – fim (YYYY-MM) */
    periodEnd: string;
    /** Versão do modelo de exportação */
    modelVersion: string;
  };
  /** Tabela de dimensões de insumos/serviços */
  dimItems: DimensionItem[];
  /** Tabela de fatos de recursos mensais (histograma) */
  factMonthlyResources: MonthlyResourceFact[];
  /** Tabela de fatos de medição */
  factMeasurements: MeasurementFact[];
  /** Tabela de fatos de produtividade */
  factProductivity: ProductivityFact[];
  /** Tabela de fatos de ocorrências */
  factOccurrences: OccurrenceFact[];
  /** Tabela de fatos de ociosidade */
  factIdleness: IdlenessFact[];
  /** Resultado consolidado da análise contratual */
  analyticsResult?: ContractAnalyticsResult;
}
