import dotenv from 'dotenv';
import app from './app.js';
import { connectDb } from './db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDb(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
