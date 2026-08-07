import cors from 'cors';
import express from 'express';
import brandRoutes from './routes/brands.js';
import dashboardRoutes from './routes/dashboard.js';
import marketRoutes from './routes/markets.js';
import projectRoutes from './routes/projects.js';
import resourceRoutes from './routes/resources.js';
import timesheetRoutes from './routes/timesheets.js';
import projectRequestRoutes from './routes/projectRequests.js';
import authRoutes from './routes/auth.js';
import { authenticateToken } from './middleware/auth.js';

import path from 'path';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static uploads directory removed for Vercel/Base64 compatibility

app.post('/api/upload', (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: 'No image provided' });

    // Return the base64 string directly so it is saved in the database
    res.json({ url: image });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Failed to upload image' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

// Protect all following routes with authentication
app.use(authenticateToken);

app.use('/api/markets', marketRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/project-requests', projectRequestRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ message: error.message || 'Server error' });
});

export default app;
