import Job from '../models/Job.js';
import mongoose from 'mongoose';

export async function createJob(clerkId) {
  const job = await Job.create({
    progress: 0,
    status: 'Initializing AI market models...',
    result: null,
    error: null,
    clerkId
  });
  return {
    id: job._id.toString(),
    progress: job.progress,
    status: job.status,
    result: job.result,
    error: job.error,
    clerkId: job.clerkId
  };
}

export async function updateJob(jobId, updates) {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    return;
  }
  await Job.findByIdAndUpdate(jobId, updates, { new: true });
}

export async function getJob(jobId) {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    return null;
  }
  const job = await Job.findById(jobId);
  if (!job) return null;
  return {
    id: job._id.toString(),
    progress: job.progress,
    status: job.status,
    result: job.result,
    error: job.error,
    clerkId: job.clerkId
  };
}

export async function deleteJob(jobId) {
  if (mongoose.Types.ObjectId.isValid(jobId)) {
    await Job.findByIdAndDelete(jobId);
  }
}

