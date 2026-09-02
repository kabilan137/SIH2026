import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    progress: { type: Number, default: 0 },
    status: { type: String, default: 'Initializing AI market models...' },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    clerkId: { type: String, required: true, index: true, minlength: 1 },
    createdAt: { type: Date, default: Date.now, expires: 600 } // TTL: delete job documents after 10 mins
  },
  { timestamps: true }
);

export default mongoose.model('Job', jobSchema);
