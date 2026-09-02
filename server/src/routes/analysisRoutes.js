import { Router } from 'express';

import { createAnalysis, chatWithAnalysis, chatGeneral, getNicheSuggestions, getAnalysisStatus } from '../controllers/analysisController.js';
import { analysisLimiter, chatLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { analysisRequestSchema, chatRequestSchema, nicheSuggestionsRequestSchema } from '../validators/analysisValidator.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, analysisLimiter, validateRequest(analysisRequestSchema), createAnalysis);
router.get('/status/:id', requireAuth, getAnalysisStatus);
router.post('/niche-suggestions', requireAuth, validateRequest(nicheSuggestionsRequestSchema), getNicheSuggestions);
router.post('/chat', requireAuth, chatLimiter, validateRequest(chatRequestSchema), chatGeneral);
router.post('/:id/chat', requireAuth, chatLimiter, validateRequest(chatRequestSchema), chatWithAnalysis);

export default router;

