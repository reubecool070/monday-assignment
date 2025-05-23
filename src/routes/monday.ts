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
router.post('/monday/calculate', logMiddleware, authenticationMiddleware, mondayController.executeMultiplication);

router.post('/monday/subscribe', authenticationMiddleware, logMiddleware, mondayController.subscribe);
router.post('/monday/unsubscribe', authenticationMiddleware, logMiddleware, mondayController.unsubscribe);
router.post('/monday/webhook', logMiddleware, mondayController.handleWebhook);
router.get('/monday/subscriptions', authenticationMiddleware, logMiddleware, mondayController.listAllSubscriptions);

// New routes for calculation history with MongoDB
router.get('/monday/calculations', authenticationMiddleware, logMiddleware, mondayController.getAllCalculationHistory);
router.get(
  '/monday/board/:boardId/calculations',
  // authenticationMiddleware,
  logMiddleware,
  mondayController.getBoardCalculationHistory
);
router.get(
  '/monday/item/history',
  // authenticationMiddleware,
  logMiddleware,
  mondayController.getItemCalculationHistory
);

export default router;
