/**
 * schemeController.js
 *
 * Handles scheme listing and matching requests.
 */

import GovernmentScheme from '../models/GovernmentScheme.js';
import { matchSchemes } from '../services/schemeMatcher.js';
import { sendSuccess } from '../utils/responseFormatter.js';

/**
 * GET /api/schemes
 * Returns all active government schemes.
 */
export async function listSchemes(req, res, next) {
  try {
    const schemes = await GovernmentScheme.find({ active: true })
      .sort({ minProjectCost: 1 })
      .lean();

    return sendSuccess(res, { schemes, total: schemes.length }, 200);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/schemes/match
 * Runs the deterministic scheme matching engine.
 *
 * Body: {
 *   totalProjectCost: number,
 *   requestedLoanAmount: number,
 *   ownContribution: number,
 *   businessCategory: string,
 *   location: string,
 *   isRural: boolean,
 *   applicantCategory: 'General' | 'SC' | 'ST' | 'OBC' | 'Women',
 * }
 */
export async function matchSchemesHandler(req, res, next) {
  try {
    const {
      totalProjectCost,
      requestedLoanAmount,
      ownContribution,
      businessCategory,
      location,
      isRural,
      applicantCategory
    } = req.body;

    if (!totalProjectCost || !requestedLoanAmount) {
      return res.status(400).json({
        success: false,
        error: { message: 'totalProjectCost and requestedLoanAmount are required.' }
      });
    }

    const result = await matchSchemes({
      totalProjectCost: Number(totalProjectCost),
      requestedLoanAmount: Number(requestedLoanAmount),
      ownContribution: Number(ownContribution) || 0,
      businessCategory: businessCategory || '',
      location: location || '',
      isRural: Boolean(isRural),
      applicantCategory: applicantCategory || 'General'
    });

    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}
