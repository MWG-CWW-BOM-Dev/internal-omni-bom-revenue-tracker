import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Market' }
  },
  { timestamps: true }
);

export default mongoose.model('Brand', brandSchema);
