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
    search: { type: mongoose.Schema.Types.ObjectId, ref: 'Search', required: true, index: true },
    placeId: { type: String, required: true, index: true },
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
    }
  },
  { timestamps: true }
);

competitorSchema.index({ search: 1, placeId: 1 }, { unique: true });
competitorSchema.index({ name: 'text', address: 'text' });

export default mongoose.model('Competitor', competitorSchema);
