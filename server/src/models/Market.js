import mongoose from 'mongoose';

const marketSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    flag: { type: String, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model('Market', marketSchema);
