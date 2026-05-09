import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';

export const familyRouter = Router();

familyRouter.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    res.json({
      id,
      name: 'Shared Family',
      members: [{ uid: (req as any).user?.userId || 'user-1', name: 'Admin', role: 'Admin' }],
      sharedBudgets: [],
      sharedAccounts: []
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
