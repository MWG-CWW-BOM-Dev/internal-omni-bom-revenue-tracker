import express from 'express';
import Project from '../models/Project.js';
import Resource from '../models/Resource.js';
import TimesheetEntry from '../models/TimesheetEntry.js';

const router = express.Router();

const populate = ['resourceId', 'projectId'];

router.get('/', async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.startDate || req.query.endDate) {
      filters.date = {};
      if (req.query.startDate) filters.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filters.date.$lte = new Date(req.query.endDate);
    }

    let query = TimesheetEntry.find(filters).sort({ date: -1 });
    populate.forEach((path) => {
      query = query.populate(path);
    });
    res.json(await query);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const bodies = Array.isArray(req.body) ? req.body : [req.body];
    const createdEntries = [];

    for (const body of bodies) {
      const resource = await Resource.findById(body.resourceId);
      if (!resource) return res.status(400).json({ message: 'Resource not found' });
      
      let revenue = 0;
      let project = null;
      
      if (body.projectId) {
        project = await Project.findById(body.projectId);
        if (!project) return res.status(400).json({ message: 'Project not found' });
        revenue = revenueForEntry(project, resource, body.hoursWorked);
      } else if (!body.leaveType) {
        return res.status(400).json({ message: 'Either Project or Leave Type is required' });
      }

      const entry = await TimesheetEntry.create({ ...body, revenue });
      createdEntries.push(await entry.populate(populate));
    }

    res.status(201).json(Array.isArray(req.body) ? createdEntries : createdEntries[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await TimesheetEntry.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const resourceId = req.body.resourceId || existing.resourceId;
    const projectId = req.body.projectId !== undefined ? req.body.projectId : existing.projectId;
    const leaveType = req.body.leaveType !== undefined ? req.body.leaveType : existing.leaveType;
    const hoursWorked = req.body.hoursWorked ?? existing.hoursWorked;
    
    const resource = await Resource.findById(resourceId);
    if (!resource) return res.status(400).json({ message: 'Resource not found' });
    
    let revenue = 0;
    let project = null;
    
    if (projectId) {
      project = await Project.findById(projectId);
      if (!project) return res.status(400).json({ message: 'Project not found' });
      revenue = revenueForEntry(project, resource, hoursWorked);
    } else if (!leaveType) {
      return res.status(400).json({ message: 'Either Project or Leave Type is required' });
    }

    Object.assign(existing, req.body, {
      projectId: projectId || null,
      leaveType: leaveType || null,
      revenue
    });
    await existing.save();

    res.json(await existing.populate(populate));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const item = await TimesheetEntry.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/export.csv', async (req, res, next) => {
  try {
    let entries = TimesheetEntry.find().sort({ date: -1 });
    populate.forEach((path) => {
      entries = entries.populate(path);
    });

    const rows = await entries;
    const header = ['date', 'resource', 'project', 'hoursWorked', 'revenue'];
    const csv = [
      header.join(','),
      ...rows.map((entry) =>
        [
          entry.date.toISOString().slice(0, 10),
          entry.resourceId?.name || '',
          entry.projectId?.name || '',
          entry.hoursWorked,
          entry.revenue
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(',')
      )
    ].join('\n');

    res.header('Content-Type', 'text/csv');
    res.attachment('timesheets.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

export default router;

function hourlyRateForMarket(resource, marketId) {
  const rate = resource.marketRates?.find((item) => item.marketId?.toString() === marketId?.toString());
  return rate?.hourlyRate ?? resource.hourlyRate;
}

function revenueForEntry(project, resource, hoursWorked) {
  if (project.billingType === 'fixed') return 0;
  return Number(hoursWorked) * hourlyRateForMarket(resource, project.marketId);
}
