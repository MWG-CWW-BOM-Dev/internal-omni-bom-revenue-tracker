import express from 'express';
import mongoose from 'mongoose';
import Project from '../models/Project.js';
import TimesheetEntry from '../models/TimesheetEntry.js';

const router = express.Router();

function matchFilters(query) {
  const match = {};
  if (query.startDate || query.endDate) {
    match.date = {};
    if (query.startDate) match.date.$gte = new Date(query.startDate);
    if (query.endDate) match.date.$lte = new Date(query.endDate);
  }
  return match;
}

router.get('/summary', async (req, res, next) => {
  try {
    const match = matchFilters(req.query);
    const marketId = req.query.marketId ? new mongoose.Types.ObjectId(req.query.marketId) : null;

    const pipeline = [
      { $match: match },
      { $lookup: { from: 'projects', localField: 'projectId', foreignField: '_id', as: 'project' } },
      { $unwind: '$project' }
    ];

    if (marketId) {
      pipeline.push({ $match: { 'project.marketId': marketId } });
    }

    pipeline.push({
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$revenue' },
              totalHours: { $sum: '$hoursWorked' }
            }
          }
        ],
        revenueByProject: [
          { $group: { _id: '$projectId', revenue: { $sum: '$revenue' }, hours: { $sum: '$hoursWorked' } } },
          { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'project' } },
          { $unwind: '$project' },
          { $project: { name: '$project.name', revenue: 1, hours: 1 } },
          { $sort: { revenue: -1 } }
        ],
        revenueByResource: [
          { $group: { _id: '$resourceId', revenue: { $sum: '$revenue' }, hours: { $sum: '$hoursWorked' } } },
          { $lookup: { from: 'resources', localField: '_id', foreignField: '_id', as: 'resource' } },
          { $unwind: '$resource' },
          { $project: { name: '$resource.name', revenue: 1, hours: 1 } },
          { $sort: { revenue: -1 } }
        ]
      }
    });

    const [result] = await TimesheetEntry.aggregate(pipeline);
    const fixedProjectFilters = { billingType: 'fixed', status: { $ne: 'Cancelled' } };
    if (marketId) fixedProjectFilters.marketId = marketId;
    
    if (req.query.startDate || req.query.endDate) {
      fixedProjectFilters.startDate = {};
      if (req.query.startDate) fixedProjectFilters.startDate.$gte = new Date(req.query.startDate);
      if (req.query.endDate) fixedProjectFilters.startDate.$lte = new Date(req.query.endDate);
    }

    const fixedRevenue = await Project.aggregate([
      { $match: fixedProjectFilters },
      { $group: { _id: null, total: { $sum: '$fixedBudget' } } }
    ]);

    res.json({
      totalRevenue: (result.totals[0]?.totalRevenue || 0) + (fixedRevenue[0]?.total || 0),
      totalHours: result.totals[0]?.totalHours || 0,
      revenueByResource: result.revenueByResource,
      revenueByProject: result.revenueByProject
    });
  } catch (error) {
    next(error);
  }
});

export default router;
