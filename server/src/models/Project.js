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
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ['In Pipeline', 'On Hold', 'In Progress', 'Delivered', 'Cancelled'],
      default: 'In Pipeline',
      required: true
    },
    totalBudget: { type: Number, default: 0, min: 0 },
    consumedBudget: { type: Number, default: 0, min: 0 },
    remainingBudget: { type: Number, default: 0 },
    quarterlyBilledAmount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

export default mongoose.model('Project', projectSchema);
