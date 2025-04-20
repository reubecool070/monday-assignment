export interface MondayApiResponse {
  data?: any;
  errors?: Array<{ message: string }>;
  account_id?: number;
}

export interface TransformationRequest {
  boardId: string;
  itemId: string;
  sourceColumnId: string;
  targetColumnId: string;
}

export interface MondayCredentials {
  apiToken: string;
}

export interface EnvironmentVariables {
  PORT: string;
  MONDAY_SIGNING_SECRET: string;
  TUNNEL_SUBDOMAIN: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvironmentVariables {}
  }
}
