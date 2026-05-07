import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    photoUrl: { type: String, trim: true },
    hourlyRate: { type: Number, required: true, min: 0 },
    marketRates: [
      {
        marketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Market', required: true },
        hourlyRate: { type: Number, required: true, min: 0 }
      }
    ],
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Market', required: true }
  },
  { timestamps: true }
);

export default mongoose.model('Resource', resourceSchema);
