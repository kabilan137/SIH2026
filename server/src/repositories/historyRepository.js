import Analysis from '../models/Analysis.js';
import Search from '../models/Search.js';

export async function findHistory({ sessionId, limit = 25 } = {}) {
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
    return [];
  }
  return Analysis.find({ sessionId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('search')
    .select('-rawAiResponse')
    .exec();
}

export async function findHistoryById(id, sessionId) {
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
    // Never do an unscoped lookup — throw immediately so the controller
    // surfaces a 401/500 rather than fetching an arbitrary document.
    throw new Error('[historyRepository] findHistoryById called without a valid sessionId — refusing unscoped lookup.');
  }
  // Ownership is enforced at the database level: the query only succeeds if
  // the document's sessionId matches. Returns null (→ 404) if the id exists but
  // belongs to another session, preventing data-existence timing attacks.
  return Analysis.findOne({ _id: id, sessionId }).populate('search').populate('competitors').exec();
}


export async function deleteHistoryById(id, sessionId) {
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
    throw new Error('[historyRepository] deleteHistoryById called without a valid sessionId — refusing unscoped deletion.');
  }

  const analysis = await Analysis.findOne({ _id: id, sessionId }).exec();

  if (!analysis) {
    return null;
  }

  // Competitors are shared place-cache data — never deleted per-analysis.
  // Only the analysis record and its search metadata are removed.
  await Search.deleteOne({ _id: analysis.search }).exec();
  await Analysis.deleteOne({ _id: analysis._id }).exec();

  return analysis;
}
