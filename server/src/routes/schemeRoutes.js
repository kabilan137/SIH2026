import { Router } from 'express';
import { listSchemes, matchSchemesHandler } from '../controllers/schemeController.js';

const router = Router();

// GET /api/schemes — list all active schemes
router.get('/', listSchemes);

// POST /api/schemes/match — run matching engine
router.post('/match', matchSchemesHandler);

export default router;
