import { Router, Request, Response } from 'express';
import mondayRoutes from './monday';

const router = Router();

router.use(mondayRoutes);

router.get('/', function (req: Request, res: Response) {
  res.json(getHealth());
});

router.get('/health', function (req: Request, res: Response) {
  res.json(getHealth());
  res.end();
});

router.post('/hitserver', function (req: Request, res: Response) {
  console.log(req.body);
  res.end();
});

interface Health {
  ok: boolean;
  message: string;
}

function getHealth(): Health {
  return {
    ok: true,
    message: 'Healthy',
  };
}

export default router;
