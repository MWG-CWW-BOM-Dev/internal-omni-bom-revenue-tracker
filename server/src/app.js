import cors from 'cors';
import express from 'express';
import brandRoutes from './routes/brands.js';
import dashboardRoutes from './routes/dashboard.js';
import marketRoutes from './routes/markets.js';
import projectRoutes from './routes/projects.js';
import resourceRoutes from './routes/resources.js';
import timesheetRoutes from './routes/timesheets.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/markets', marketRoutes);
app.use('/brands', brandRoutes);
app.use('/projects', projectRoutes);
app.use('/resources', resourceRoutes);
app.use('/timesheets', timesheetRoutes);
app.use('/dashboard', dashboardRoutes);

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ message: error.message || 'Server error' });
});

export default app;
