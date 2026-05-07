import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    pointOfContact: { type: String, required: true, trim: true },
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Market', required: true },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    billingType: {
      type: String,
      enum: ['hourly', 'fixed'],
      default: 'hourly',
      required: true
    },
    fixedBudget: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['In Pipeline', 'On Hold', 'In Progress', 'Delivered', 'Cancelled'],
      default: 'In Pipeline',
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('Project', projectSchema);
