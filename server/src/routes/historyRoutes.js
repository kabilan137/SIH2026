import { Router } from 'express';

import { deleteHistory, getHistory, getHistoryById } from '../controllers/historyController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, getHistory);
router.get('/:id', requireAuth, getHistoryById);
router.delete('/:id', requireAuth, deleteHistory);

export default router;
