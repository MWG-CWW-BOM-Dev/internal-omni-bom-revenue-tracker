import express from 'express';
import mongoose from 'mongoose';
import Project from '../models/Project.js';
import TimesheetEntry from '../models/TimesheetEntry.js';
import ProjectRequest from '../models/ProjectRequest.js';

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

    // Aggregate billed ProjectRequests
    const reqFilters = { billingStatus: 'Billed' };
    let isQuarterQuery = false;

    if (req.query.startDate && req.query.endDate) {
      const dStart = new Date(req.query.startDate);
      const dEnd = new Date(req.query.endDate);
      const sMonth = dStart.getMonth();
      const eMonth = dEnd.getMonth();
      const sDate = dStart.getDate();
      const eDate = dEnd.getDate();

      // Check if the range matches full quarters or years exactly
      if (sDate === 1 && (eDate === 30 || eDate === 31)) {
        if (sMonth === 0 && eMonth === 2) { reqFilters.quarter = 'Q1'; isQuarterQuery = true; }
        else if (sMonth === 3 && eMonth === 5) { reqFilters.quarter = 'Q2'; isQuarterQuery = true; }
        else if (sMonth === 6 && eMonth === 8) { reqFilters.quarter = 'Q3'; isQuarterQuery = true; }
        else if (sMonth === 9 && eMonth === 11) { reqFilters.quarter = 'Q4'; isQuarterQuery = true; }
        else if (sMonth === 0 && eMonth === 11) { 
          // CY Query
          reqFilters.quarter = { $in: ['Q1', 'Q2', 'Q3', 'Q4'] }; 
          isQuarterQuery = true; 
        }
        else if (sMonth === 3 && eMonth === 2 && dEnd.getFullYear() > dStart.getFullYear()) {
          // FY Query
          reqFilters.quarter = { $in: ['Q1', 'Q2', 'Q3', 'Q4'] }; 
          isQuarterQuery = true; 
        }
      }
    }

    if (!isQuarterQuery && (req.query.startDate || req.query.endDate)) {
      reqFilters.createdDate = {};
      if (req.query.startDate) reqFilters.createdDate.$gte = new Date(req.query.startDate);
      if (req.query.endDate) reqFilters.createdDate.$lte = new Date(req.query.endDate);
    }

    const reqPipeline = [{ $match: reqFilters }];
    
    if (marketId) {
      reqPipeline.push({ $lookup: { from: 'projects', localField: 'projectId', foreignField: '_id', as: 'project' } });
      reqPipeline.push({ $unwind: '$project' });
      reqPipeline.push({ $match: { 'project.marketId': marketId } });
    }
    
    reqPipeline.push({ $group: { _id: null, total: { $sum: '$quotedAmount' } } });

    const billedRequestsRevenue = await ProjectRequest.aggregate(reqPipeline);

    res.json({
      totalRevenue: (result.totals[0]?.totalRevenue || 0) + (fixedRevenue[0]?.total || 0) + (billedRequestsRevenue[0]?.total || 0),
      totalHours: result.totals[0]?.totalHours || 0,
      revenueByResource: result.revenueByResource,
      revenueByProject: result.revenueByProject
    });
  } catch (error) {
    next(error);
  }
});

export default router;
