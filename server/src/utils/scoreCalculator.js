import { GRADE_BOUNDARIES } from './constants.js';

export function normalizeScore(score) {
  const numericScore = Number(score);

  if (!Number.isFinite(numericScore)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(numericScore)));
}

export function gradeFromScore(score) {
  const normalizedScore = normalizeScore(score);
  return GRADE_BOUNDARIES.find((boundary) => normalizedScore >= boundary.min)?.grade || 'F';
}

export function applyServerGrade(analysis) {
  const overallScore = normalizeScore(analysis.overallScore);

  return {
    ...analysis,
    overallScore,
    grade: gradeFromScore(overallScore)
  };
}
