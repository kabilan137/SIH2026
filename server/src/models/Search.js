import mongoose from 'mongoose';

const coordinateSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  { _id: false }
);

const searchSchema = new mongoose.Schema(
  {
    location: { type: String, required: true, trim: true },
    normalizedLocation: { type: String, trim: true },
    businessType: { type: String, required: true, trim: true },
    niche: { type: String, trim: true },
    radiusMeters: { type: Number, required: true },
    coordinates: { type: coordinateSchema, required: true },
    status: {
      type: String,
      enum: ['completed', 'failed'],
      default: 'completed',
      index: true
    },
    requestedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

searchSchema.index({ createdAt: -1 });
searchSchema.index({ location: 'text', businessType: 'text', niche: 'text' });

export default mongoose.model('Search', searchSchema);
