import { Request } from 'express';
import { db } from './db.js';

interface AuditLogParams {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  description: string;
  req?: Request;
}

export function logAuditAction({
  userId = null,
  action,
  entityType,
  entityId = null,
  description,
  req
}: AuditLogParams) {
  try {
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (req) {
      const forwarded = req.headers['x-forwarded-for'];
      ipAddress = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || null;
      userAgent = req.headers['user-agent'] || null;
    }

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      userId,
      action,
      entityType,
      entityId ? String(entityId) : null,
      description,
      ipAddress,
      userAgent
    );
  } catch (error) {
    // Audit logging should never crash the main application, but should report to server console
    console.error('Failed to write audit log:', error);
  }
}
