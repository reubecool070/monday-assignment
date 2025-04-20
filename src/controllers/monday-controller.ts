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
    transformationType?: {
      value: string;
    };
  };
}

interface RequestBody {
  payload: ActionPayload;
}

async function executeAction(req: AuthenticatedRequest, res: Response): Promise<Response> {
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

async function getRemoteListOptions(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    return res.status(200).send(TRANSFORMATION_TYPES);
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'internal server error' });
  }
}

export { executeAction, getRemoteListOptions };
