import mongoose from 'mongoose';

const timesheetEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    leaveType: { type: String, enum: ['TWT', 'SL', 'CL', 'PL'], default: null },
    hoursWorked: { type: Number, required: true, min: 0 },
    revenue: { type: Number, required: true, min: 0 },
    comments: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.model('TimesheetEntry', timesheetEntrySchema);
