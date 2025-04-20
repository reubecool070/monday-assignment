import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface SessionData {
  accountId: string;
  userId: string;
  backToUrl: string;
  shortLivedToken: string;
}

interface AuthenticatedRequest extends Request {
  session?: SessionData;
}

async function authenticationMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let { authorization } = req.headers;
    if (!authorization && req.query) {
      authorization = req.query.token as string;
    }

    if (!authorization) {
      throw new Error('Authorization header or token query parameter is required');
    }

    const { accountId, userId, backToUrl, shortLivedToken } = jwt.verify(
      authorization,
      process.env.MONDAY_SIGNING_SECRET || ''
    ) as SessionData;

    req.session = { accountId, userId, backToUrl, shortLivedToken };
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'not authenticated' });
  }
}

export { authenticationMiddleware, AuthenticatedRequest, SessionData };
