// Define the interface for a calculation record
export interface CalculationRecord {
  _id?: string;
  itemId: string;
  boardId: string;
  timestamp: Date;
  sourceColumnId: string;
  sourceValue: any;
  factorColumnId: string;
  factorValue: any;
  targetColumnId: string;
  result: any;
  operation: string;
  accountId?: string;
}

// Define the interface for paginated calculation results
export interface PaginatedCalculations {
  data: CalculationRecord[];
  total: number;
  page: number;
  limit: number;
}

// Define the interface for item calculation history response
export interface ItemCalculationHistoryResponse {
  itemId: string;
  count: number;
  history: CalculationRecord[];
}

// Define the interface for board calculation history response
export interface BoardCalculationHistoryResponse {
  boardId: string;
  count: number;
  history: CalculationRecord[];
}
