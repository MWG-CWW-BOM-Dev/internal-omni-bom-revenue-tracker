import mongoose from 'mongoose';

export function connectDb(uri) {
  if (!uri) {
    throw new Error('MONGO_URI is required');
  }

  return mongoose.connect(uri);
}
