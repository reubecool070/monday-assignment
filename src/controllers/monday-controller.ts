import { Response } from 'express';
import * as mondayService from '../services/monday-service';
import * as transformationService from '../services/transformation-service';
import { TRANSFORMATION_TYPES } from '../constants/transformation';
import { AuthenticatedRequest } from '../middlewares/authentication';
import { TransformationType } from '../services/transformation-service';

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
  const { payload } = req.body as RequestBody;

  try {
    if (!shortLivedToken) {
      return res.status(401).send({ message: 'Unauthorized' });
    }

    const { inputFields } = payload;
    const { boardId, itemId, sourceColumnId, factorColumnId, targetColumnId } = inputFields;
    console.log('Processing multiplication with inputs:', {
      boardId,
      itemId,
      sourceColumnId,
      factorColumnId,
      targetColumnId,
    });

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

    return res.status(200).send({
      success: true,
      result,
    });
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

export { executeAction, getRemoteListOptions, handleTrigger, executeMultiplication };
