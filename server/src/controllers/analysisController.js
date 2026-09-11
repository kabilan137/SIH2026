import { createMarketAnalysis } from '../services/analysisService.js';
import { findAnalysisById } from '../repositories/analysisRepository.js';
import { generateChatResponse, generateNicheSuggestions } from '../services/mistralService.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess, formatAnalysisDocument } from '../utils/responseFormatter.js';
import { createJob, updateJob, getJob } from '../services/jobTracker.js';

export async function createAnalysis(req, res, next) {
  try {
    const sessionId = req.sessionId;
    const job = await createJob(sessionId);

    const runAnalysis = async () => {
      try {
        const result = await createMarketAnalysis(req.validatedBody, job.id, sessionId);
        await updateJob(job.id, { progress: 100, result });
      } catch (error) {
        console.error('Analysis background job failed:', error);
        await updateJob(job.id, { progress: 100, error: error.message || 'Analysis failed.' });
      }
    };

    const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
    if (isVercel) {
      const { waitUntil } = await import('@vercel/functions');
      waitUntil(runAnalysis());
    } else {
      runAnalysis(); // Fire and forget in standard Node.js
    }

    return sendSuccess(res, {
      id: job.id,
      progress: job.progress,
      status: job.status
    }, 201);
  } catch (error) {
    return next(error);
  }
}

export async function getAnalysisStatus(req, res, next) {
  try {
    const { id } = req.params;
    const sessionId = req.sessionId;

    const job = await getJob(id);
    if (!job) {
      // Fallback: check if the analysis document exists in database (e.g. if job completed and cleaned up)
      const analysis = await findAnalysisById(id);
      if (analysis) {
        if (String(analysis.sessionId) !== String(sessionId)) {
          throw new AppError(403, 'You are not authorized to view this analysis status.');
        }
        return sendSuccess(res, {
          id,
          progress: 100,
          status: 'Analysis complete!',
          result: formatAnalysisDocument(analysis),
          error: null
        });
      }
      throw new AppError(404, 'Analysis job or record not found.');
    }
    if (String(job.sessionId) !== String(sessionId)) {
      throw new AppError(403, 'You are not authorized to view this analysis status.');
    }
    return sendSuccess(res, job);
  } catch (error) {
    return next(error);
  }
}

export async function chatWithAnalysis(req, res, next) {
  try {
    const { id } = req.params;
    const { messages, provider, apiKey, model } = req.validatedBody;
    const sessionId = req.sessionId;

    const analysis = await findAnalysisById(id);
    if (!analysis) {
      throw new AppError(404, 'Analysis record not found.');
    }

    if (String(analysis.sessionId) !== String(sessionId)) {
      throw new AppError(403, 'You are not authorized to access this analysis.');
    }

    const chatResponse = await generateChatResponse({ analysis, messages, provider, apiKey, model });
    return sendSuccess(res, chatResponse);
  } catch (error) {
    return next(error);
  }
}

export async function chatGeneral(req, res, next) {
  try {
    const { messages, provider, apiKey, model } = req.validatedBody;
    const chatResponse = await generateChatResponse({ analysis: null, messages, provider, apiKey, model });
    return sendSuccess(res, chatResponse);
  } catch (error) {
    return next(error);
  }
}

export async function getNicheSuggestions(req, res, next) {
  try {
    const { businessType, location } = req.validatedBody;
    const niches = await generateNicheSuggestions({ businessType, location });
    return sendSuccess(res, niches);
  } catch (error) {
    return next(error);
  }
}
