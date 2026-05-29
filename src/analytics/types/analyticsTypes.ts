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
// 2-A. DimensionGroup  (grupos padronizados da planilha de dimensões)
// ---------------------------------------------------------------------------
/**
 * Grupos reconhecidos na planilha de dimensões de obra.
 * Mapeados a partir da coluna "Grupo" com tolerância a variações.
 */
export type DimensionGroup =
  | 'MOD'        // Mão-de-Obra Direta
  | 'MOI'        // Mão-de-Obra Indireta
  | 'EQUIP'      // Equipamentos
  | 'MATERIAL'   // Materiais
  | 'OTHER';     // Não reconhecido

// ---------------------------------------------------------------------------
// 2-B. DimensionPlanMonth  (entrada do plano mensal por item)
// ---------------------------------------------------------------------------
/**
 * Quantidade planejada de um item de dimensão para um mês específico.
 * Derivada das colunas Qtd_Plan_Mes_1..N usando i_start como âncora.
 */
export interface DimensionPlanMonth {
  /** Chave do mês no formato 'YYYY-MM' */
  monthKey: string;
  /** Rótulo legível (ex.: 'Abr/2026') */
  monthLabel: string;
  /** Quantidade planejada para o mês */
  quantity: number;
}

// ---------------------------------------------------------------------------
// 2. DimensionItem  (item completo importado da planilha)
// ---------------------------------------------------------------------------
/**
 * Representa um item de dimensão importado da planilha de obra.
 * Compatível com ServiceItem (code, unit) e HistogramItem (normalizedName).
 */
export interface DimensionItem {
  /** Nome original conforme planilha (coluna Item_Padrao) */
  name: string;
  /** Nome normalizado para matching (uppercase, sem acentos) */
  normalizedName: string;
  /** Equivalência no RDO (coluna Item_RDO), quando informada */
  rdoEquivalent?: string;
  /** Nome normalizado da equivalência RDO */
  rdoEquivalentNormalized?: string;
  /** Grupo/categoria da planilha */
  group: DimensionGroup;
  /** Custo mensal unitário (coluna Custo_Mensal_Unitario) */
  monthlyUnitCost: number;
  /** Flag: item sem custo informado */
  hasMissingCost: boolean;
  /** Flag: item sem grupo informado */
  hasMissingGroup: boolean;
  /** Plano mensal derivado de Qtd_Plan_Mes_1..N + i_start */
  monthlyPlan: DimensionPlanMonth[];
  /** Data de início do recurso no projeto (i_start, ISO 8601 'YYYY-MM-DD') */
  iStart?: string;
  /** Data de fim do recurso no projeto (i_end, ISO 8601 'YYYY-MM-DD') */
  iEnd?: string;
}

// ---------------------------------------------------------------------------
// 2-C. DimensionImportMetadata  (metadados extraídos da planilha)
// ---------------------------------------------------------------------------
/**
 * Metadados da obra extraídos da planilha de dimensões.
 * Campos opcionais — presentes apenas quando a planilha os contém.
 */
export interface DimensionImportMetadata {
  /** Nome ou número do contrato */
  contrato?: string;
  /** Nome do cliente */
  cliente?: string;
  /** Centro de custo da obra */
  centroCusto?: string;
  /** Valor contratual total */
  valorContratual?: number;
  /** Data de início global da obra (i_start da planilha) */
  iStart?: string;
  /** Data de término global da obra (i_end da planilha) */
  iEnd?: string;
  /** Outros campos não mapeados explicitamente */
  extra?: Record<string, string | number>;
}

// ---------------------------------------------------------------------------
// 3. DimensionImportResult
// ---------------------------------------------------------------------------
/**
 * Resultado completo de uma importação de planilha de dimensões.
 * Retornado por parseDimensionsExcel().
 */
export interface DimensionImportResult {
  /** Itens de dimensão importados (incluindo os com advertências) */
  items: DimensionItem[];
  /** Feriados detectados na planilha (formato 'YYYY-MM-DD') */
  holidays: string[];
  /** Metadados da obra extraídos da planilha */
  metadata: DimensionImportMetadata;
  /** Meses detectados no plano (derivados de i_start + colunas Qtd_Plan_Mes_N) */
  months: { monthKey: string; monthLabel: string }[];
  /** Total de linhas de dados processadas */
  totalRows: number;
  /** Total de itens importados com sucesso (sem erros fatais) */
  successCount: number;
  /** Total de linhas descartadas por erro */
  errorCount: number;
  /** Erros fatais (item descartado) */
  errors: string[];
  /** Advertências não-fatais (item mantido, mas sinalizado) */
  warnings: string[];
  /** Timestamp da importação (ISO 8601) */
  importedAt: string;
}

// ---------------------------------------------------------------------------
// 3-A. DimensionStoredRecord  (shape do item DynamoDB Obras_Dimensions)
// ---------------------------------------------------------------------------
/**
 * Shape do item salvo no DynamoDB para uma obra.
 * Chave primária: projectId (String).
 */
export interface DimensionStoredRecord {
  /** Chave primária = Project.id */
  projectId: string;
  /** Discriminador de tipo para uso futuro em tabelas compartilhadas */
  type: 'DIMENSIONS';
  /** Itens de dimensão importados */
  items: DimensionItem[];
  /** Feriados da obra (formato 'YYYY-MM-DD') */
  holidays: string[];
  /** Metadados da obra */
  metadata: DimensionImportMetadata;
  /** Timestamp da última atualização (ISO 8601) */
  updatedAt: string;
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
