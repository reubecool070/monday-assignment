import { Response } from 'express';
import * as mondayService from '../services/monday-service';
import * as transformationService from '../services/transformation-service';
import { TRANSFORMATION_TYPES } from '../constants/transformation';
import { AuthenticatedRequest } from '../middlewares/authentication';
import { TransformationType } from '../services/transformation-service';
import { Request } from 'express';
import * as calculationService from '../services/calculation-service';

interface ActionPayload {
  inputFields: {
    boardId: string;
    itemId: string;
    sourceColumnId: string;
    targetColumnId: string;
    factorColumnId: string;
    transformationType?: {
      value: string;
    };
  };
}

interface TriggerPayload {
  payload: {
    blockKind: string;
    credentialsValues: Record<string, any>;
    inboundFieldValues: {
      itemId: number;
    };
    inputFields: {
      itemId: number;
    };
    recipeId: number;
    integrationId: number;
  };
  runtimeMetadata: {
    actionUuid: string;
    triggerUuid: string;
  };
}

interface RequestBody {
  payload: ActionPayload;
}

// New interface for webhook subscription payload
interface SubscriptionPayload {
  clientId: string;
  webhookUrl: string;
  boardId?: number;
  userId?: number;
  itemId?: number;
  columnId?: string;
  event: string;
  config?: Record<string, any>;
}

async function executeAction(req: AuthenticatedRequest, res: Response): Promise<Response> {
  console.log('executeAction');
  const { shortLivedToken } = req.session || {};
  const { payload } = req.body as RequestBody;

  try {
    if (!shortLivedToken) {
      return res.status(401).send({ message: 'Unauthorized' });
    }

    const { inputFields } = payload;
    const { boardId, itemId, sourceColumnId, targetColumnId, transformationType } = inputFields;

    const text = await mondayService.getColumnValue(shortLivedToken, itemId, sourceColumnId);
    if (!text) {
      return res.status(200).send({});
    }

    const transformedText = transformationService.transformText(
      text,
      (transformationType ? transformationType.value : 'TO_UPPER_CASE') as TransformationType
    );

    await mondayService.changeColumnValue(shortLivedToken, boardId, itemId, targetColumnId, transformedText);

    return res.status(200).send({});
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'internal server error' });
  }
}

async function executeMultiplication(req: AuthenticatedRequest, res: Response): Promise<Response> {
  console.log('executeMultiplication');
  const { shortLivedToken } = req.session || {};
  const payload = req.body.payload || req.body;

  try {
    if (!shortLivedToken) {
      return res.status(401).send({ message: 'Unauthorized' });
    }

    // Log the full request body for debugging
    console.log('Multiplication request body:', JSON.stringify(req.body, null, 2));

    // Handle different payload formats
    let inputFields;
    let itemId;
    let boardId;

    // Check if this is an automation trigger payload
    if (payload.inboundFieldValues) {
      // Automation trigger format
      inputFields = {
        ...payload.inputFields,
        ...payload.inboundFieldValues,
      };

      // For automation triggers, we might need to extract these from different places
      itemId = payload.itemId || (payload.inboundFieldValues && payload.inboundFieldValues.itemId);
      boardId = payload.boardId;
    } else {
      // Standard action format
      inputFields = payload.inputFields;
      boardId = inputFields.boardId;
      itemId = inputFields.itemId;
    }

    if (!inputFields) {
      console.error('Invalid request: Missing inputFields');
      return res.status(400).send({ message: 'Missing input fields' });
    }

    // Extract column IDs from the input fields, making sourceColumnId and targetColumnId mutable
    const { factorColumnId } = inputFields;
    let { sourceColumnId, targetColumnId } = inputFields;

    console.log('Processing multiplication with inputs:', {
      boardId,
      itemId,
      sourceColumnId,
      factorColumnId,
      targetColumnId,
    });

    // Validate required fields
    if (!sourceColumnId || !factorColumnId) {
      console.error('Missing required column IDs');
      return res.status(400).send({
        message: 'Missing required fields',
        required: ['sourceColumnId', 'factorColumnId'],
      });
    }

    // If we don't have itemId, try to get it from the board
    if (!itemId && boardId) {
      console.log('No item ID provided, attempting to use the first item from the board');
      // We'll directly get the board items instead of using a separate function
      const firstItem = await mondayService.getBoardItems(shortLivedToken, boardId);
      if (firstItem && firstItem.length > 0) {
        itemId = firstItem[0].id;
        console.log(`Using first item from board: ${itemId}`);
      }
    }

    if (!itemId) {
      console.error('Missing required item ID');
      return res.status(400).send({ message: 'Missing item ID' });
    }

    if (!boardId) {
      console.log('No board ID provided, attempting to find board ID for item');
      boardId = await mondayService.getBoardIdForItem(shortLivedToken, itemId);

      if (!boardId) {
        console.error('Could not determine board ID');
        return res.status(400).send({ message: 'Could not determine board ID' });
      }

      console.log(`Determined board ID: ${boardId}`);
    }

    // If no target column specified, we'll use the source column
    if (!targetColumnId) {
      console.log('No target column specified, using source column');
      targetColumnId = sourceColumnId;
    }

    const input_number = await mondayService.getColumnValueAsNumber(shortLivedToken, itemId, sourceColumnId);
    const factor_number = await mondayService.getColumnValueAsNumber(shortLivedToken, itemId, factorColumnId);

    console.log('Extracted numbers:', { input_number, factor_number });

    // Check if either value is undefined or NaN
    if (
      input_number === undefined ||
      factor_number === undefined ||
      isNaN(Number(input_number)) ||
      isNaN(Number(factor_number))
    ) {
      console.error('Invalid number values:', { input_number, factor_number });
      return res.status(400).send({
        message: 'One or both of the input values is not a valid number',
        input_number,
        factor_number,
      });
    }

    const result = Number(input_number) * Number(factor_number);
    console.log('Multiplication result:', result);

    // The changeColumnValue service now handles formatting based on column type
    await mondayService.changeColumnValue(shortLivedToken, boardId, itemId, targetColumnId, result.toString());

    // Log calculation to MongoDB
    const accountId = req.session?.accountId; // Get account ID if available from session

    const calculationData = {
      itemId,
      boardId,
      sourceColumnId,
      sourceValue: input_number,
      factorColumnId,
      factorValue: factor_number,
      targetColumnId,
      result,
      operation: 'multiplication',
      accountId: accountId as string,
    };

    // Log the calculation to MongoDB
    await calculationService.logCalculation(calculationData);

    // Handle different response formats based on request type
    if (payload.inboundFieldValues) {
      // For automation triggers, use a simpler success response
      return res.status(200).send({
        success: true,
      });
    } else {
      // For standard actions, include more details
      return res.status(200).send({
        success: true,
        result,
        boardId,
        itemId,
        sourceColumnId,
        factorColumnId,
        targetColumnId,
      });
    }
  } catch (err) {
    console.error('Error in executeMultiplication:', err);
    return res.status(500).send({ message: 'internal server error' });
  }
}

async function handleTrigger(req: AuthenticatedRequest, res: Response): Promise<Response> {
  console.log('handle trigger');
  const { shortLivedToken } = req.session || {};
  const triggerData = req.body as TriggerPayload;

  try {
    if (!shortLivedToken) {
      return res.status(401).send({ message: 'Unauthorized' });
    }

    console.log('Received trigger data:', JSON.stringify(triggerData, null, 2));

    const itemId = triggerData.payload.inputFields.itemId.toString();

    // First, we need to get the board ID for this item
    const boardId = await mondayService.getBoardIdForItem(shortLivedToken, itemId);

    if (!boardId) {
      return res.status(400).send({ message: 'Could not find board ID for the item' });
    }

    // Get all columns for this item
    const columnValues = await mondayService.getAllColumnValuesForItem(shortLivedToken, itemId);

    if (!columnValues || columnValues.length === 0) {
      return res.status(200).send({ message: 'No column values found for this item' });
    }

    // Return the found column values
    return res.status(200).send({
      boardId,
      itemId,
      columnValues,
    });
  } catch (err) {
    console.error('Error handling trigger:', err);
    return res.status(500).send({ message: 'internal server error' });
  }
}

async function getRemoteListOptions(req: AuthenticatedRequest, res: Response): Promise<Response> {
  console.log('getRemoteListOptions');
  try {
    return res.status(200).send(TRANSFORMATION_TYPES);
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'internal server error' });
  }
}

async function subscribe(req: AuthenticatedRequest, res: Response): Promise<Response> {
  console.log('subscribe endpoint called');
  const { shortLivedToken } = req.session || {};

  try {
    // Log the request body to help debugging
    console.log('Subscribe request body:', JSON.stringify(req.body, null, 2));

    if (!shortLivedToken) {
      console.error('Authentication error: No shortLivedToken in session');
      return res.status(401).send({
        message: 'Unauthorized',
        error: 'Missing authentication token',
      });
    }

    // Handle the automation system payload format
    const payload = req.body.payload;
    if (!payload) {
      console.error('Invalid request format: Missing payload object');
      return res.status(400).send({
        message: 'Invalid request format',
        error: 'Missing payload object',
      });
    }

    // Extract relevant information from the automation payload
    const { webhookUrl, subscriptionId, recipeId, integrationId, inputFields } = payload;

    // For automation payloads, the webhook URL is typically provided
    if (!webhookUrl) {
      console.error('Subscribe validation error: Missing webhookUrl');
      return res.status(400).send({
        message: 'Missing required parameter: webhookUrl',
        error: 'A valid webhook URL is required',
      });
    }

    // Determine the board ID and column IDs from the payload if available
    const boardId = payload.boardId;
    let columnIds = [];

    // Extract column IDs from the input fields
    if (inputFields) {
      // Collect all column IDs mentioned in the input fields
      Object.entries(inputFields).forEach(([key, value]) => {
        if (key.includes('ColumnId') && typeof value === 'string') {
          columnIds.push(value);
        }
      });
    }

    console.log('Subscription request processed from automation payload:', {
      webhookUrl,
      subscriptionId,
      recipeId,
      integrationId,
      boardId: boardId ? Number(boardId) : undefined,
      columnIds,
    });

    // If we already have a subscription ID, no need to create a new one
    if (subscriptionId) {
      console.log('Subscription already exists with ID:', subscriptionId);
      return res.status(200).send({
        message: 'Subscription already exists',
        subscriptionId,
        status: 'success',
      });
    }

    // For automation payloads, we'll just return success without creating an actual webhook
    // as Monday.com's automation system handles this differently
    return res.status(200).send({
      message: 'Automation subscription processed successfully',
      success: true,
      webhookUrl,
      recipeId,
      integrationId,
    });
  } catch (err) {
    console.error('Unhandled error in subscribe controller:');
    console.error(err);

    if (err instanceof Error) {
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);

      return res.status(500).send({
        message: 'Internal server error',
        error: err.message,
      });
    }

    return res.status(500).send({
      message: 'Internal server error',
      error: 'Unknown error occurred',
    });
  }
}

async function unsubscribe(req: AuthenticatedRequest, res: Response): Promise<Response> {
  console.log('unsubscribe');
  const { shortLivedToken } = req.session || {};

  try {
    if (!shortLivedToken) {
      return res.status(401).send({ message: 'Unauthorized' });
    }

    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).send({
        message: 'Missing required parameter: subscriptionId',
      });
    }

    console.log('Unsubscribing webhook:', subscriptionId);

    // Call Monday.com API to delete the subscription
    const success = await mondayService.deleteSubscription(shortLivedToken, subscriptionId);

    if (!success) {
      return res.status(500).send({
        message: 'Failed to delete subscription',
        details: 'Check server logs for more information',
      });
    }

    return res.status(200).send({
      message: 'Subscription deleted successfully',
      subscriptionId,
    });
  } catch (err) {
    console.error('Error deleting subscription:', err);
    return res.status(500).send({ message: 'Internal server error' });
  }
}

async function handleWebhook(req: Request, res: Response): Promise<Response> {
  try {
    console.log('Received webhook:', JSON.stringify(req.body, null, 2));

    const webhookData = req.body;

    // You don't necessarily need authentication here as this is a webhook from Monday.com
    // Process the webhook data based on event type

    if (webhookData.event && webhookData.event.type) {
      const eventType = webhookData.event.type;

      switch (eventType) {
        case 'create_item':
          await processItemCreation(webhookData);
          break;

        case 'update_column_value':
          await processColumnUpdate(webhookData);
          break;

        // Add more event types as needed

        default:
          console.log(`Unhandled event type: ${eventType}`);
      }
    }

    // Always respond with 200 OK to acknowledge receipt of the webhook
    return res.status(200).send({
      status: 'success',
      message: 'Webhook received and processed',
    });
  } catch (err) {
    console.error('Error handling webhook:', err);
    // Still return 200 to avoid Monday.com retrying the webhook
    return res.status(200).send({
      status: 'error',
      message: 'Error processing webhook, but received',
    });
  }
}

// Helper functions for webhook processing
async function processItemCreation(webhookData: any): Promise<void> {
  try {
    const { event, itemId, boardId } = webhookData;
    console.log(`Processing item creation: Item ${itemId} on Board ${boardId}`);

    // Implement your business logic for item creation here
    // For example, you might want to initialize certain column values or
    // trigger other integrations
  } catch (err) {
    console.error('Error processing item creation:', err);
  }
}

async function processColumnUpdate(webhookData: any): Promise<void> {
  try {
    const { event, itemId, boardId, columnId, value } = webhookData;
    console.log(`Processing column update: Item ${itemId}, Column ${columnId}, New value: ${value}`);

    // Implement your business logic for column updates here
    // For example, you might want to trigger calculations or
    // synchronize data with other systems
  } catch (err) {
    console.error('Error processing column update:', err);
  }
}

async function listAllSubscriptions(req: AuthenticatedRequest, res: Response): Promise<Response> {
  console.log('listAllSubscriptions endpoint called');
  const { shortLivedToken } = req.session || {};

  try {
    if (!shortLivedToken) {
      console.error('Authentication error: No shortLivedToken in session');
      return res.status(401).send({
        message: 'Unauthorized',
        error: 'Missing authentication token',
      });
    }

    console.log('Requesting all subscriptions from Monday.com API');

    const subscriptions = await mondayService.listSubscriptions(shortLivedToken);

    if (!subscriptions) {
      console.error('Failed to retrieve subscriptions list');
      return res.status(500).send({
        message: 'Failed to retrieve subscriptions',
        error: 'The Monday.com API did not return subscription data',
      });
    }

    console.log(`Successfully retrieved ${subscriptions.length} subscriptions`);
    return res.status(200).send({
      message: 'Subscriptions retrieved successfully',
      count: subscriptions.length,
      subscriptions,
    });
  } catch (err) {
    console.error('Unhandled error in listAllSubscriptions controller:');
    console.error(err);

    if (err instanceof Error) {
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);

      return res.status(500).send({
        message: 'Internal server error',
        error: err.message,
      });
    }

    return res.status(500).send({
      message: 'Internal server error',
      error: 'Unknown error occurred',
    });
  }
}

// Add new endpoint to get calculation history for an item
async function getItemCalculationHistory(req: AuthenticatedRequest, res: Response): Promise<Response> {
  console.log('getItemCalculationHistory');
  try {
    // Extract the itemId from the request
    const itemId = req.params.itemId;

    if (!itemId) {
      return res.status(400).send({ message: 'Missing item ID' });
    }

    // Extract optional limit parameter
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    console.log(`Retrieving calculation history for item: ${itemId}`);

    // Get the calculation history for this item
    const history = await calculationService.getCalculationHistoryForItem(itemId, limit);

    return res.status(200).send({
      itemId,
      count: history.length,
      history,
    });
  } catch (err) {
    console.error('Error retrieving item calculation history:', err);
    return res.status(500).send({ message: 'internal server error' });
  }
}

// Add new endpoint to get calculation history for a board
async function getBoardCalculationHistory(req: AuthenticatedRequest, res: Response): Promise<Response> {
  console.log('getBoardCalculationHistory');
  try {
    // Extract the boardId from the request
    const boardId = req.params.boardId;

    if (!boardId) {
      return res.status(400).send({ message: 'Missing board ID' });
    }

    // Extract optional limit parameter
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    console.log(`Retrieving calculation history for board: ${boardId}`);

    // Get the calculation history for this board
    const history = await calculationService.getCalculationHistoryForBoard(boardId, limit);

    return res.status(200).send({
      boardId,
      count: history.length,
      history,
    });
  } catch (err) {
    console.error('Error retrieving board calculation history:', err);
    return res.status(500).send({ message: 'internal server error' });
  }
}

// Add new endpoint to get all calculation history with pagination
async function getAllCalculationHistory(req: AuthenticatedRequest, res: Response): Promise<Response> {
  console.log('getAllCalculationHistory');
  try {
    // Extract pagination parameters
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    // Get account ID from session if available for filtering
    const accountId = req.query.accountId || req.session?.accountId;

    console.log(`Retrieving all calculation history (page ${page}, limit ${limit})`);

    // Get all calculation history with pagination
    const result = await calculationService.getAllCalculationHistory(limit, page, accountId as string);

    return res.status(200).send(result);
  } catch (err) {
    console.error('Error retrieving all calculation history:', err);
    return res.status(500).send({ message: 'internal server error' });
  }
}

export {
  executeAction,
  getRemoteListOptions,
  handleTrigger,
  executeMultiplication,
  subscribe,
  unsubscribe,
  handleWebhook,
  listAllSubscriptions,
  getItemCalculationHistory,
  getBoardCalculationHistory,
  getAllCalculationHistory,
};
