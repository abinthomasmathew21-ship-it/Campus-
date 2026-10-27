import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase } from './server/db.js';
import { authRouter } from './server/routes/auth.routes.js';
import { departmentRouter } from './server/routes/department.routes.js';
import { complaintRouter } from './server/routes/complaint.routes.js';
import { adminRouter } from './server/routes/admin.routes.js';
import { notificationRouter } from './server/routes/notification.routes.js';
import { dashboardRouter } from './server/routes/dashboard.routes.js';
import { healthRouter } from './server/routes/health.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize relational database (zero demo data, only tables/indexes)
initDatabase();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Safe static serving for uploaded complaint attachments
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/api/uploads', express.static(uploadDir));

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/complaints', complaintRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/dashboard', dashboardRouter);

// Global API error handler
app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  const status = err.status || 500;
  const message = err.message || 'An unexpected error occurred.';
  res.status(status).json({ success: false, message });
});

// Frontend Vite Integration
const isProduction = process.env.NODE_ENV === 'production';
const distPath = path.resolve(__dirname, 'dist');

async function startServer() {
  if (!isProduction || !fs.existsSync(distPath)) {
    // Development mode: Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CampusCare] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
