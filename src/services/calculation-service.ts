import { Calculation } from '../models/calculation';

// Interface for calculation log data
export interface CalculationLogData {
  itemId: string;
  boardId: string;
  sourceColumnId: string;
  sourceValue: string | number;
  factorColumnId: string;
  factorValue: string | number;
  targetColumnId: string;
  result: string | number;
  operation?: string;
  accountId?: string;
}

/**
 * Log a calculation to the database
 */
export const logCalculation = async (calculationData: CalculationLogData): Promise<boolean> => {
  try {
    // Create a new calculation record
    const calculation = new Calculation({
      ...calculationData,
      timestamp: new Date(),
    });

    // Save to database
    await calculation.save();
    console.log(`Saved calculation for itemId: ${calculationData.itemId}`);

    return true;
  } catch (error) {
    console.error('Error logging calculation to database:', error);
    return false;
  }
};

/**
 * Get calculation history for a specific item
 */
export const getCalculationHistoryForItem = async (itemId: string, limit: number = 20): Promise<any[]> => {
  try {
    // Find all calculations for this item, sorted by timestamp (newest first)
    const calculations = await Calculation.find({ itemId }).sort({ timestamp: -1 }).limit(limit).lean().exec();

    return calculations;
  } catch (error) {
    console.error(`Error retrieving calculation history for item ${itemId}:`, error);
    return [];
  }
};

/**
 * Get calculation history for a specific board
 */
export const getCalculationHistoryForBoard = async (boardId: string, limit: number = 50): Promise<any[]> => {
  try {
    // Find all calculations for this board, sorted by timestamp (newest first)
    const calculations = await Calculation.find({ boardId }).sort({ timestamp: -1 }).limit(limit).lean().exec();

    return calculations;
  } catch (error) {
    console.error(`Error retrieving calculation history for board ${boardId}:`, error);
    return [];
  }
};

/**
 * Get all calculation history
 */
export const getAllCalculationHistory = async (
  limit: number = 100,
  page: number = 1,
  accountId?: string
): Promise<{ data: any[]; total: number; page: number; limit: number }> => {
  try {
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Create filter object
    const filter: any = {};
    if (accountId) {
      filter.accountId = accountId;
    }

    // Find all calculations with optional filtering, sorted by timestamp (newest first)
    const calculations = await Calculation.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean().exec();

    // Count total documents for pagination info
    const total = await Calculation.countDocuments(filter);

    return {
      data: calculations,
      total,
      page,
      limit,
    };
  } catch (error) {
    console.error('Error retrieving all calculation history:', error);
    return {
      data: [],
      total: 0,
      page,
      limit,
    };
  }
};

export default {
  logCalculation,
  getCalculationHistoryForItem,
  getCalculationHistoryForBoard,
  getAllCalculationHistory,
};
