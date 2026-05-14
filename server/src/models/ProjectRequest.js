import mongoose from 'mongoose';

const projectRequestSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    requestName: { type: String, required: true, trim: true },
    requestType: { type: String, required: true, trim: true },
    quotedAmount: { type: Number, required: true, min: 0 },
    createdDate: { type: Date, required: true },
    quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Declined'], default: 'Approved', required: true },
    billingStatus: { type: String, enum: ['Pending', 'Billed'], default: 'Pending', required: true }
  },
  { timestamps: true }
);

async function updateProjectBudgets(projectId) {
  const Project = mongoose.model('Project');
  const ProjectRequest = mongoose.model('ProjectRequest');

  const project = await Project.findById(projectId);
  if (!project) return;

  const requests = await ProjectRequest.find({ projectId });
  
  let consumedBudget = 0;
  let quarterlyBilledAmount = 0;

  for (const req of requests) {
    if (req.status === 'Approved') {
      consumedBudget += req.quotedAmount;
    }
    if (req.billingStatus === 'Billed') {
      quarterlyBilledAmount += req.quotedAmount;
    }
  }

  project.consumedBudget = consumedBudget;
  project.remainingBudget = project.totalBudget - consumedBudget;
  project.quarterlyBilledAmount = quarterlyBilledAmount;
  
  if (project.billingType !== 'fixed') {
    project.billingType = 'fixed';
    const TimesheetEntry = mongoose.model('TimesheetEntry');
    if (TimesheetEntry) {
      await TimesheetEntry.updateMany({ projectId: project._id }, { $set: { revenue: 0 } });
    }
  }

  await project.save();
}

projectRequestSchema.post('save', async function (doc) {
  await updateProjectBudgets(doc.projectId);
});

projectRequestSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await updateProjectBudgets(doc.projectId);
  }
});

projectRequestSchema.post('findOneAndUpdate', async function (doc) {
  if (doc) {
    await updateProjectBudgets(doc.projectId);
  }
});

export default mongoose.model('ProjectRequest', projectRequestSchema);
