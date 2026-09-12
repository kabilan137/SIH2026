import mongoose from 'mongoose';

const coordinateSchema = new mongoose.Schema(
  {
    lat: Number,
    lng: Number
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    authorName: String,
    rating: Number,
    text: String,
    relativeTimeDescription: String,
    time: Number,
    language: String,
    translated: Boolean
  },
  { _id: false }
);

const competitorSchema = new mongoose.Schema(
  {
    // No longer tied to a specific Search document — shared global place cache.
    // Uniqueness is enforced at the placeId level (one doc per real-world place).
    placeId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    rating: { type: Number, min: 0, max: 5, default: null },
    reviewCount: { type: Number, min: 0, default: 0 },
    reviews: { type: [reviewSchema], default: [] },
    location: coordinateSchema,
    businessStatus: String,
    businessCategory: {
      primaryType: String,
      types: { type: [String], default: [] }
    },
    sentimentSummary: {
      averageReviewRating: Number,
      textReviewCount: Number,
      positiveReviewCount: Number,
      neutralReviewCount: Number,
      negativeReviewCount: Number,
      missingReviewEvidence: Boolean
    },
    evidence: {
      detailsAvailable: { type: Boolean, default: false },
      reviewsAvailable: { type: Boolean, default: false },
      reviewTextAvailable: { type: Boolean, default: false }
    },
    googleMetadata: {
      website: String,
      phoneNumber: String,
      googleMapsUrl: String,
      priceLevel: Number,
      priceRange: {
        startPrice: {
          currencyCode: String,
          units: String,
          nanos: Number
        },
        endPrice: {
          currencyCode: String,
          units: String,
          nanos: Number
        },
        displayString: String
      }
    },

    // ── Cache control fields ──────────────────────────────────────────────────
    // lastFetchedAt: when this place's data was last refreshed from Google.
    // Used to determine cache staleness (TTL = COMPETITOR_CACHE_TTL_DAYS env var, default 14d).
    lastFetchedAt: { type: Date, default: Date.now, index: true },

    // fetchCount: how many distinct analyses have referenced this place.
    // Purely observability — tracks how much cache value this record provides.
    fetchCount: { type: Number, default: 1 }
  },
  { timestamps: true }
);

// Primary lookup index — one document per real-world Google place.
competitorSchema.index({ placeId: 1 }, { unique: true });

// Full-text search index (unchanged).
competitorSchema.index({ name: 'text', address: 'text' });

export default mongoose.model('Competitor', competitorSchema);
