import app from '../src/app.js';
import { connectDb } from '../src/db.js';

// Connect to MongoDB when the serverless function boots up
if (!global._mongoClientPromise) {
  global._mongoClientPromise = connectDb(process.env.MONGO_URI);
}

export default app;
