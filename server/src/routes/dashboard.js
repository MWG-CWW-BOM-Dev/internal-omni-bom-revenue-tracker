import express from 'express';
import mongoose from 'mongoose';
import Project from '../models/Project.js';
import TimesheetEntry from '../models/TimesheetEntry.js';
import ProjectRequest from '../models/ProjectRequest.js';
import Market from '../models/Market.js';
import Brand from '../models/Brand.js';
import Resource from '../models/Resource.js';
import { generateWeeklyEmailHTML } from '../templates/weeklyEmailTemplate.js';

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

// GET /api/dashboard/weekly-email-template
router.get('/weekly-email-template', async (req, res, next) => {
  try {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 6); // past 7 days (today is 7th day)

    const toDateInputStr = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startDateStr = toDateInputStr(start);
    const endDateStr = toDateInputStr(today);

    const queryStartDate = new Date(startDateStr + 'T00:00:00');
    const queryEndDate = new Date(endDateStr + 'T23:59:59');

    const startFmt = start.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const endFmt = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const dateRangeText = `${startFmt} - ${endFmt}`;

    const [allMarkets, allBrands, allResources, allProjects, entries, reqs] = await Promise.all([
      Market.find(),
      Brand.find(),
      Resource.find(),
      Project.find(),
      TimesheetEntry.find({ date: { $gte: queryStartDate, $lte: queryEndDate } }),
      ProjectRequest.find({
        billingStatus: 'Billed',
        createdDate: { $gte: queryStartDate, $lte: queryEndDate }
      })
    ]);

    const idVal = (val) => {
      if (!val) return '';
      return typeof val === 'string' ? val : val._id || String(val);
    };

    let timesheetHours = 0;
    let timesheetRevenue = 0;
    const uniqueResources = new Set();
    const uniqueProjects = new Set();

    const marketSums = {};
    const brandSums = {};
    const resourceSums = {};
    const resourceHours = {};

    entries.forEach(entry => {
      const hours = entry.hoursWorked || 0;
      const rev = entry.revenue || 0;

      timesheetHours += hours;
      timesheetRevenue += rev;
      uniqueResources.add(idVal(entry.resourceId));
      uniqueProjects.add(idVal(entry.projectId));

      const resId = idVal(entry.resourceId);
      resourceSums[resId] = (resourceSums[resId] || 0) + rev;
      resourceHours[resId] = (resourceHours[resId] || 0) + hours;

      const proj = allProjects.find(p => idVal(p._id) === idVal(entry.projectId));
      if (proj) {
        const mId = idVal(proj.marketId);
        const bId = idVal(proj.brandId);
        if (mId) marketSums[mId] = (marketSums[mId] || 0) + rev;
        if (bId) brandSums[bId] = (brandSums[bId] || 0) + rev;
      }
    });

    // Fixed Projects Revenue created in this week
    const activeFixedProjects = allProjects.filter(p => 
      p.billingType === 'fixed' && 
      p.status !== 'Cancelled' &&
      p.startDate && p.startDate >= queryStartDate && p.startDate <= queryEndDate
    );

    let fixedRevenueTotal = 0;
    activeFixedProjects.forEach(p => {
      const rev = p.fixedBudget || 0;
      fixedRevenueTotal += rev;
      uniqueProjects.add(idVal(p._id));

      const mId = idVal(p.marketId);
      const bId = idVal(p.brandId);
      if (mId) marketSums[mId] = (marketSums[mId] || 0) + rev;
      if (bId) brandSums[bId] = (brandSums[bId] || 0) + rev;
    });

    // Billed Requests Revenue created in this week
    let requestRevenueTotal = 0;
    reqs.forEach(req => {
      const rev = req.quotedAmount || 0;
      requestRevenueTotal += rev;
      uniqueProjects.add(idVal(req.projectId));

      const proj = allProjects.find(p => idVal(p._id) === idVal(req.projectId));
      if (proj) {
        const mId = idVal(proj.marketId);
        const bId = idVal(proj.brandId);
        if (mId) marketSums[mId] = (marketSums[mId] || 0) + rev;
        if (bId) brandSums[bId] = (brandSums[bId] || 0) + rev;
      }
    });

    const totalRevenue = timesheetRevenue + fixedRevenueTotal + requestRevenueTotal;
    const totalHours = timesheetHours;
    const activeResourcesCount = uniqueResources.size;
    const activeProjectsCount = uniqueProjects.size;

    const marketsList = allMarkets.map(m => ({
      name: m.name,
      flag: m.flag || '',
      revenue: marketSums[idVal(m._id)] || 0
    })).filter(m => m.revenue > 0);

    const brandsList = allBrands.map(b => ({
      name: b.name,
      revenue: brandSums[idVal(b._id)] || 0
    })).filter(b => b.revenue > 0);

    const resourcesList = allResources.map(r => ({
      name: r.name,
      hours: resourceHours[idVal(r._id)] || 0,
      revenue: resourceSums[idVal(r._id)] || 0
    })).filter(r => r.revenue > 0 || r.hours > 0);

    // FTE vs Adhoc
    let fteRevenue = 0;
    let fteCount = new Set();
    let adhocRevenue = 0;
    let adhocCount = new Set();

    entries.forEach(entry => {
      const proj = allProjects.find(p => idVal(p._id) === idVal(entry.projectId));
      if (proj) {
        if (proj.projectType === 'fte') {
          fteRevenue += entry.revenue || 0;
          fteCount.add(idVal(proj._id));
        } else {
          adhocRevenue += entry.revenue || 0;
          adhocCount.add(idVal(proj._id));
        }
      }
    });

    activeFixedProjects.forEach(p => {
      if (p.projectType === 'fte') {
        fteRevenue += p.fixedBudget || 0;
        fteCount.add(idVal(p._id));
      } else {
        adhocRevenue += p.fixedBudget || 0;
        adhocCount.add(idVal(p._id));
      }
    });

    reqs.forEach(req => {
      const proj = allProjects.find(p => idVal(p._id) === idVal(req.projectId));
      if (proj) {
        if (proj.projectType === 'fte') {
          fteRevenue += req.quotedAmount || 0;
          fteCount.add(idVal(proj._id));
        } else {
          adhocRevenue += req.quotedAmount || 0;
          adhocCount.add(idVal(proj._id));
        }
      }
    });

    const emailData = {
      dateRangeText,
      kpis: {
        totalRevenue,
        totalHours,
        activeResources: activeResourcesCount,
        activeProjects: activeProjectsCount
      },
      markets: marketsList,
      brands: brandsList,
      resources: resourcesList,
      projectTypes: {
        fte: { count: fteCount.size, revenue: fteRevenue },
        adhoc: { count: adhocCount.size, revenue: adhocRevenue }
      }
    };

    const html = generateWeeklyEmailHTML(emailData);

    res.json({
      success: true,
      data: emailData,
      html
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/weekly-email-template/preview
router.get('/weekly-email-template/preview', async (req, res, next) => {
  try {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 6);

    const toDateInputStr = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startDateStr = toDateInputStr(start);
    const endDateStr = toDateInputStr(today);

    const queryStartDate = new Date(startDateStr + 'T00:00:00');
    const queryEndDate = new Date(endDateStr + 'T23:59:59');

    const startFmt = start.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const endFmt = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const dateRangeText = `${startFmt} - ${endFmt}`;

    const [allMarkets, allBrands, allResources, allProjects, entries, reqs] = await Promise.all([
      Market.find(),
      Brand.find(),
      Resource.find(),
      Project.find(),
      TimesheetEntry.find({ date: { $gte: queryStartDate, $lte: queryEndDate } }),
      ProjectRequest.find({
        billingStatus: 'Billed',
        createdDate: { $gte: queryStartDate, $lte: queryEndDate }
      })
    ]);

    const idVal = (val) => {
      if (!val) return '';
      return typeof val === 'string' ? val : val._id || String(val);
    };

    let timesheetHours = 0;
    let timesheetRevenue = 0;
    const uniqueResources = new Set();
    const uniqueProjects = new Set();

    const marketSums = {};
    const brandSums = {};
    const resourceSums = {};
    const resourceHours = {};

    entries.forEach(entry => {
      const hours = entry.hoursWorked || 0;
      const rev = entry.revenue || 0;

      timesheetHours += hours;
      timesheetRevenue += rev;
      uniqueResources.add(idVal(entry.resourceId));
      uniqueProjects.add(idVal(entry.projectId));

      const resId = idVal(entry.resourceId);
      resourceSums[resId] = (resourceSums[resId] || 0) + rev;
      resourceHours[resId] = (resourceHours[resId] || 0) + hours;

      const proj = allProjects.find(p => idVal(p._id) === idVal(entry.projectId));
      if (proj) {
        const mId = idVal(proj.marketId);
        const bId = idVal(proj.brandId);
        if (mId) marketSums[mId] = (marketSums[mId] || 0) + rev;
        if (bId) brandSums[bId] = (brandSums[bId] || 0) + rev;
      }
    });

    const activeFixedProjects = allProjects.filter(p => 
      p.billingType === 'fixed' && 
      p.status !== 'Cancelled' &&
      p.startDate && p.startDate >= queryStartDate && p.startDate <= queryEndDate
    );

    let fixedRevenueTotal = 0;
    activeFixedProjects.forEach(p => {
      const rev = p.fixedBudget || 0;
      fixedRevenueTotal += rev;
      uniqueProjects.add(idVal(p._id));

      const mId = idVal(p.marketId);
      const bId = idVal(p.brandId);
      if (mId) marketSums[mId] = (marketSums[mId] || 0) + rev;
      if (bId) brandSums[bId] = (brandSums[bId] || 0) + rev;
    });

    let requestRevenueTotal = 0;
    reqs.forEach(req => {
      const rev = req.quotedAmount || 0;
      requestRevenueTotal += rev;
      uniqueProjects.add(idVal(req.projectId));

      const proj = allProjects.find(p => idVal(p._id) === idVal(req.projectId));
      if (proj) {
        const mId = idVal(proj.marketId);
        const bId = idVal(proj.brandId);
        if (mId) marketSums[mId] = (marketSums[mId] || 0) + rev;
        if (bId) brandSums[bId] = (brandSums[bId] || 0) + rev;
      }
    });

    const totalRevenue = timesheetRevenue + fixedRevenueTotal + requestRevenueTotal;
    const totalHours = timesheetHours;
    const activeResourcesCount = uniqueResources.size;
    const activeProjectsCount = uniqueProjects.size;

    const marketsList = allMarkets.map(m => ({
      name: m.name,
      flag: m.flag || '',
      revenue: marketSums[idVal(m._id)] || 0
    })).filter(m => m.revenue > 0);

    const brandsList = allBrands.map(b => ({
      name: b.name,
      revenue: brandSums[idVal(b._id)] || 0
    })).filter(b => b.revenue > 0);

    const resourcesList = allResources.map(r => ({
      name: r.name,
      hours: resourceHours[idVal(r._id)] || 0,
      revenue: resourceSums[idVal(r._id)] || 0
    })).filter(r => r.revenue > 0 || r.hours > 0);

    let fteRevenue = 0;
    let fteCount = new Set();
    let adhocRevenue = 0;
    let adhocCount = new Set();

    entries.forEach(entry => {
      const proj = allProjects.find(p => idVal(p._id) === idVal(entry.projectId));
      if (proj) {
        if (proj.projectType === 'fte') {
          fteRevenue += entry.revenue || 0;
          fteCount.add(idVal(proj._id));
        } else {
          adhocRevenue += entry.revenue || 0;
          adhocCount.add(idVal(proj._id));
        }
      }
    });

    activeFixedProjects.forEach(p => {
      if (p.projectType === 'fte') {
        fteRevenue += p.fixedBudget || 0;
        fteCount.add(idVal(p._id));
      } else {
        adhocRevenue += p.fixedBudget || 0;
        adhocCount.add(idVal(p._id));
      }
    });

    reqs.forEach(req => {
      const proj = allProjects.find(p => idVal(p._id) === idVal(req.projectId));
      if (proj) {
        if (proj.projectType === 'fte') {
          fteRevenue += req.quotedAmount || 0;
          fteCount.add(idVal(proj._id));
        } else {
          adhocRevenue += req.quotedAmount || 0;
          adhocCount.add(idVal(proj._id));
        }
      }
    });

    const emailData = {
      dateRangeText,
      kpis: {
        totalRevenue,
        totalHours,
        activeResources: activeResourcesCount,
        activeProjects: activeProjectsCount
      },
      markets: marketsList,
      brands: brandsList,
      resources: resourcesList,
      projectTypes: {
        fte: { count: fteCount.size, revenue: fteRevenue },
        adhoc: { count: adhocCount.size, revenue: adhocRevenue }
      }
    };

    const html = generateWeeklyEmailHTML(emailData);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
});

export default router;
