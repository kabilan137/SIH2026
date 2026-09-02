export function summarizeReviews(reviews = []) {
  const ratedReviews = reviews.filter((review) => Number.isFinite(review.rating));
  const textReviewCount = reviews.filter((review) => Boolean(review.text?.trim())).length;
  const ratingTotal = ratedReviews.reduce((sum, review) => sum + review.rating, 0);
  const averageReviewRating = ratedReviews.length ? Number((ratingTotal / ratedReviews.length).toFixed(2)) : null;

  return {
    averageReviewRating,
    textReviewCount,
    positiveReviewCount: ratedReviews.filter((review) => review.rating >= 4).length,
    neutralReviewCount: ratedReviews.filter((review) => review.rating === 3).length,
    negativeReviewCount: ratedReviews.filter((review) => review.rating <= 2).length,
    missingReviewEvidence: reviews.length === 0 || textReviewCount === 0
  };
}
