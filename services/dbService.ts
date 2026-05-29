import { 
  PutCommand, 
  GetCommand, 
  ScanCommand, 
  QueryCommand, 
  DeleteCommand, 
  UpdateCommand 
} from "@aws-sdk/lib-dynamodb";
import { ddbDocClient, TABLES } from "./awsConfig";
import { Project, Team, RDOData, HistogramItem } from "../types";
import {
  DimensionStoredRecord,
  DimensionImportResult,
  CompositionAIExtractionResult,
} from "../src/analytics/types/analyticsTypes";

// --- Project Operations ---

export const getProjects = async (): Promise<Project[]> => {
  const result = await ddbDocClient.send(new ScanCommand({
    TableName: TABLES.PROJECTS,
  }));
  return (result.Items as Project[]) || [];
};

export const saveProject = async (project: Project): Promise<void> => {
  await ddbDocClient.send(new PutCommand({
    TableName: TABLES.PROJECTS,
    Item: project,
  }));
};

export const deleteProject = async (id: string): Promise<void> => {
  await ddbDocClient.send(new DeleteCommand({
    TableName: TABLES.PROJECTS,
    Key: { id },
  }));
};

// --- Team Operations ---

export const getTeams = async (): Promise<Team[]> => {
  const result = await ddbDocClient.send(new ScanCommand({
    TableName: TABLES.TEAMS,
  }));
  return (result.Items as Team[]) || [];
};

export const saveTeam = async (team: Team): Promise<void> => {
  await ddbDocClient.send(new PutCommand({
    TableName: TABLES.TEAMS,
    Item: team,
  }));
};

export const deleteTeam = async (id: string): Promise<void> => {
  await ddbDocClient.send(new DeleteCommand({
    TableName: TABLES.TEAMS,
    Key: { id },
  }));
};

// --- RDO (Report) Operations ---

export const getRdos = async (): Promise<RDOData[]> => {
  const result = await ddbDocClient.send(new ScanCommand({
    TableName: TABLES.RDOS,
  }));
  return (result.Items as RDOData[]) || [];
};

export const getRdosByTeam = async (teamId: string): Promise<RDOData[]> => {
  const result = await ddbDocClient.send(new QueryCommand({
    TableName: TABLES.RDOS,
    IndexName: "teamId-index",
    KeyConditionExpression: "teamId = :teamId",
    ExpressionAttributeValues: {
      ":teamId": teamId,
    },
  }));
  return (result.Items as RDOData[]) || [];
};

export const saveRdo = async (rdo: RDOData): Promise<void> => {
  await ddbDocClient.send(new PutCommand({
    TableName: TABLES.RDOS,
    Item: rdo,
  }));
};

export const deleteRdo = async (id: string): Promise<void> => {
  await ddbDocClient.send(new DeleteCommand({
    TableName: TABLES.RDOS,
    Key: { id },
  }));
};

// --- Histogram Operations ---

export const getHistograms = async (projectId: string): Promise<HistogramItem[]> => {
  try {
    const result = await ddbDocClient.send(new QueryCommand({
      TableName: TABLES.HISTOGRAMS,
      KeyConditionExpression: "projectId = :projectId",
      ExpressionAttributeValues: {
        ":projectId": projectId,
      },
    }));
    return (result.Items as HistogramItem[]) || [];
  } catch (e) {
    console.warn("DynamoDB Histogram query failed, falling back to localStorage", e);
    const local = localStorage.getItem(`histograms_${projectId}`);
    return local ? JSON.parse(local) : [];
  }
};

export const saveHistograms = async (projectId: string, items: HistogramItem[]): Promise<void> => {
  try {
    // For simplicity in MVP, we save the whole set for a project
    // In a real app, we'd use batchWrite or save individually
    for (const item of items) {
      await ddbDocClient.send(new PutCommand({
        TableName: TABLES.HISTOGRAMS,
        Item: item,
      }));
    }
  } catch (e) {
    console.warn("DynamoDB Histogram save failed, falling back to localStorage", e);
  } finally {
    localStorage.setItem(`histograms_${projectId}`, JSON.stringify(items));
  }
};

export const deleteHistograms = async (projectId: string): Promise<void> => {
  try {
    const items = await getHistograms(projectId);
    for (const item of items) {
      await ddbDocClient.send(new DeleteCommand({
        TableName: TABLES.HISTOGRAMS,
        Key: { id: item.id },
      }));
    }
  } catch (e) {
    console.warn("DynamoDB Histogram delete failed", e);
  } finally {
    localStorage.removeItem(`histograms_${projectId}`);
  }
};

// --- Dimensions Operations (Contract Intelligence) ---

/**
 * Persiste as dimensões de uma obra no DynamoDB (Obras_Dimensions).
 * Estratégia: PutItem com chave projectId (substitui o registro anterior).
 * Fallback automático em localStorage com chave dimensions_${projectId}.
 */
export const saveDimensions = async (
  projectId: string,
  result: DimensionImportResult
): Promise<void> => {
  const record: DimensionStoredRecord = {
    projectId,
    type: 'DIMENSIONS',
    items:     result.items,
    holidays:  result.holidays,
    metadata:  result.metadata,
    updatedAt: new Date().toISOString(),
  };

  // Sempre persiste no localStorage como cache local
  localStorage.setItem(`dimensions_${projectId}`, JSON.stringify(record));

  try {
    await ddbDocClient.send(new PutCommand({
      TableName: TABLES.DIMENSIONS,
      Item: record,
    }));
  } catch (e) {
    console.warn(
      `DynamoDB Dimensions save failed for project ${projectId} — dados salvos em localStorage.`,
      e
    );
  }
};

/**
 * Recupera as dimensões de uma obra.
 * Tenta DynamoDB primeiro; usa localStorage como fallback.
 */
export const getDimensions = async (
  projectId: string
): Promise<DimensionStoredRecord | null> => {
  try {
    const result = await ddbDocClient.send(new GetCommand({
      TableName: TABLES.DIMENSIONS,
      Key: { projectId },
    }));
    if (result.Item) return result.Item as DimensionStoredRecord;
  } catch (e) {
    console.warn(
      `DynamoDB Dimensions get failed for project ${projectId} — tentando localStorage.`,
      e
    );
  }

  // Fallback: localStorage
  const local = localStorage.getItem(`dimensions_${projectId}`);
  return local ? (JSON.parse(local) as DimensionStoredRecord) : null;
};

/**
 * Remove as dimensões de uma obra do DynamoDB e do localStorage.
 */
export const deleteDimensions = async (projectId: string): Promise<void> => {
  localStorage.removeItem(`dimensions_${projectId}`);
  try {
    await ddbDocClient.send(new DeleteCommand({
      TableName: TABLES.DIMENSIONS,
      Key: { projectId },
    }));
  } catch (e) {
    console.warn(`DynamoDB Dimensions delete failed for project ${projectId}.`, e);
  }
};

// ---------------------------------------------------------------------------
// --- Compositions Operations (Sprint 3 Revisada) ---
// ---------------------------------------------------------------------------

export const saveCompositions = async (
  projectId: string,
  result: CompositionAIExtractionResult
): Promise<void> => {
  try {
    await ddbDocClient.send(new PutCommand({
      TableName: TABLES.COMPOSITIONS,
      Item: {
        projectId,
        ...result,
        updatedAt: new Date().toISOString()
      },
    }));
  } catch (e) {
    console.warn("DynamoDB Compositions save failed, falling back to localStorage", e);
  } finally {
    localStorage.setItem(`compositions_${projectId}`, JSON.stringify(result));
  }
};

export const getCompositions = async (
  projectId: string
): Promise<CompositionAIExtractionResult | null> => {
  try {
    const result = await ddbDocClient.send(new GetCommand({
      TableName: TABLES.COMPOSITIONS,
      Key: { projectId },
    }));
    if (result.Item) return result.Item as CompositionAIExtractionResult;
  } catch (e) {
    console.warn(`DynamoDB Compositions get failed for project ${projectId} — tentando localStorage.`, e);
  }

  // Fallback: localStorage
  const local = localStorage.getItem(`compositions_${projectId}`);
  return local ? (JSON.parse(local) as CompositionAIExtractionResult) : null;
};

export const deleteCompositions = async (projectId: string): Promise<void> => {
  localStorage.removeItem(`compositions_${projectId}`);
  try {
    await ddbDocClient.send(new DeleteCommand({
      TableName: TABLES.COMPOSITIONS,
      Key: { projectId },
    }));
  } catch (e) {
    console.warn(`DynamoDB Compositions delete failed for project ${projectId}.`, e);
  }
};
