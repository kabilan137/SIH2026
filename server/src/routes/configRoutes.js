import { Router } from 'express';
import { env } from '../config/env.js';
import { sendSuccess } from '../utils/responseFormatter.js';

const router = Router();

router.get('/', (req, res) => {
  return sendSuccess(res, {
    googleMapsApiKey: env.googleMapsClientApiKey || env.googleMapsApiKey,
    googleMapsMapId: env.googleMapsMapId
  });
});

export default router;
