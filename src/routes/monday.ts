import { Router } from 'express';
import { authenticationMiddleware, logMiddleware } from '../middlewares/authentication';
import * as mondayController from '../controllers/monday-controller';

const router = Router();

router.post('/monday/execute_action', authenticationMiddleware, logMiddleware, mondayController.executeAction);
router.post(
  '/monday/get_remote_list_options',
  authenticationMiddleware,
  logMiddleware,
  mondayController.getRemoteListOptions
);
router.post('/monday/handle_trigger', authenticationMiddleware, logMiddleware, mondayController.handleTrigger);

router.post(
  '/monday/execute-multiplication',
  authenticationMiddleware,
  logMiddleware,
  mondayController.executeMultiplication
);

export default router;
