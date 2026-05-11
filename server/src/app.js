import cors from 'cors';
import express from 'express';
import brandRoutes from './routes/brands.js';
import dashboardRoutes from './routes/dashboard.js';
import marketRoutes from './routes/markets.js';
import projectRoutes from './routes/projects.js';
import resourceRoutes from './routes/resources.js';
import timesheetRoutes from './routes/timesheets.js';

import fs from 'fs';
import path from 'path';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

app.post('/upload', (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: 'No image provided' });

    // Assuming image is a base64 string like "data:image/png;base64,iVBORw0KGgo..."
    const matches = image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ message: 'Invalid base64 format' });
    }

    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `photo-${Date.now()}-${Math.round(Math.random() * 1000)}.${extension}`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, buffer);
    res.json({ url: `http://localhost:${process.env.PORT || 5000}/uploads/${filename}` });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Failed to upload image' });
  }
});

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
