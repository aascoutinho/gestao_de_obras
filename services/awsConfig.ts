import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const region = import.meta.env.VITE_AWS_REGION || "us-east-1";
const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;

if (!accessKeyId || !secretAccessKey) {
  console.error("AWS Credentials not found in environment variables.");
}

const client = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const ddbDocClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export { ddbDocClient };
export const TABLES = {
  PROJECTS:   import.meta.env.VITE_DYNAMODB_TABLE_PROJECTS   || "Obras_Projects",
  TEAMS:      import.meta.env.VITE_DYNAMODB_TABLE_TEAMS      || "Obras_Teams",
  RDOS:       import.meta.env.VITE_DYNAMODB_TABLE_RDOS       || "Obras_RDOs",
  HISTOGRAMS: import.meta.env.VITE_DYNAMODB_TABLE_HISTOGRAMS || "Obras_Histograms",
  DIMENSIONS: import.meta.env.VITE_DYNAMODB_TABLE_DIMENSIONS || "Obras_Dimensions",
};
