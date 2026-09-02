import mongoose from 'mongoose';

/**
 * AudienceProfile
 *
 * Caches AI-generated audience category lists keyed by businessType + niche.
 * audienceCategories contains valid Google Place Type strings
 * (e.g. 'university', 'office', 'library') that are passed directly
 * to the Google Places Nearby Search API as demand signal probes.
 *
 * BUG-05 FIX: Added a 90-day TTL index so stale audience profiles are
 * automatically expired and regenerated. Previously profiles were cached
 * indefinitely, meaning a profile generated months ago with outdated
 * category mappings would continue to be served forever.
 */
const audienceProfileSchema = new mongoose.Schema(
  {
    businessType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    niche: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    audienceCategories: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'audienceCategories must contain at least one entry.'
      }
    },
    generatedBy: {
      type: String,
      enum: ['mistral', 'cache'],
      default: 'mistral'
    }
  },
  { timestamps: true }
);

// Compound unique index — one profile per businessType+niche combination
audienceProfileSchema.index({ businessType: 1, niche: 1 }, { unique: true });

// BUG-05 FIX: 90-day TTL — profiles expire and regenerate via Mistral
// to avoid indefinitely serving stale audience category lists.
audienceProfileSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7_776_000 });

export default mongoose.model('AudienceProfile', audienceProfileSchema);
