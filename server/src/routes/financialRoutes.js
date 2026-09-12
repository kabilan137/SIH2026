import { Router } from 'express';

import { generateFinancialPlan } from '../controllers/financialController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { financialStructuringRequestSchema } from '../validators/financialValidator.js';

const router = Router();

router.post('/', requireAuth, validateRequest(financialStructuringRequestSchema), generateFinancialPlan);

export default router;
