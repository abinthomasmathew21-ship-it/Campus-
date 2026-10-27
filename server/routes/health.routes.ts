import { Router, Request, Response } from 'express';
import { db } from '../db.js';

export const healthRouter = Router();

/**
 * GET /api/health
 * Health check endpoint checking application and relational database availability
 * Never exposes credentials, internal paths, or stack traces.
 */
healthRouter.get('/', (_req: Request, res: Response) => {
  try {
    const row = db.prepare('SELECT 1 as alive').get() as { alive: number } | undefined;
    
    if (row && row.alive === 1) {
      res.json({
        success: true,
        status: 'UP',
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'DOWN',
        database: 'UNREACHABLE',
        timestamp: new Date().toISOString(),
      });
    }
  } catch {
    res.status(503).json({
      success: false,
      status: 'DOWN',
      database: 'ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});
