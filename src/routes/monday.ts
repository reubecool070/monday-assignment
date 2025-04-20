import { Router } from 'express';
import { authenticationMiddleware } from '../middlewares/authentication';
import * as mondayController from '../controllers/monday-controller';

const router = Router();

router.post('/monday/execute_action', authenticationMiddleware, mondayController.executeAction);
router.post('/monday/get_remote_list_options', authenticationMiddleware, mondayController.getRemoteListOptions);

export default router;
