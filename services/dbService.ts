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
