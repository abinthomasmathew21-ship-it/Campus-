import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateUser, requireRole, AuthenticatedRequest } from '../auth.js';
import { logAuditAction } from '../audit.js';

export const departmentRouter = Router();

/**
 * GET /api/departments
 * Accessible by anyone authenticated (or public for registration dropdown).
 */
departmentRouter.get('/', (_req, res: Response) => {
  try {
    const departments = db.prepare(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM complaints c WHERE c.department_id = d.id) as complaint_count,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.role = 'STAFF') as staff_count
      FROM departments d
      ORDER BY d.name ASC
    `).all();

    res.json({
      success: true,
      departments,
    });
  } catch (error) {
    console.error('Fetch departments error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve departments.' });
  }
});

/**
 * POST /api/departments
 * Admin / Super Admin only: create a new department
 */
departmentRouter.post('/', authenticateUser, requireRole(['ADMIN', 'SUPER_ADMIN']), (req: AuthenticatedRequest, res: Response): void => {
  const { name, description } = req.body;
  if (!name || !String(name).trim()) {
    res.status(400).json({ success: false, message: 'Department name is required.' });
    return;
  }

  const trimmedName = String(name).trim();
  const trimmedDesc = description ? String(description).trim() : null;

  try {
    const result = db.prepare(`
      INSERT INTO departments (name, description, is_active, created_at, updated_at)
      VALUES (?, ?, 1, datetime('now'), datetime('now'))
    `).run(trimmedName, trimmedDesc);

    const newDeptId = Number(result.lastInsertRowid);

    logAuditAction({
      userId: req.user!.id,
      action: 'CREATE_DEPARTMENT',
      entityType: 'DEPARTMENT',
      entityId: newDeptId,
      description: `Created department: ${trimmedName}`,
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      department: {
        id: newDeptId,
        name: trimmedName,
        description: trimmedDesc,
        is_active: 1,
      },
    });
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE constraint failed: departments.name')) {
      res.status(400).json({ success: false, message: 'A department with this name already exists.' });
      return;
    }
    console.error('Create department error:', error);
    res.status(500).json({ success: false, message: 'Failed to create department.' });
  }
});

/**
 * PUT /api/departments/:id
 * Admin / Super Admin only: update department
 */
departmentRouter.put('/:id', authenticateUser, requireRole(['ADMIN', 'SUPER_ADMIN']), (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, message: 'Invalid department ID.' });
    return;
  }

  const { name, description, is_active } = req.body;
  if (!name || !String(name).trim()) {
    res.status(400).json({ success: false, message: 'Department name is required.' });
    return;
  }

  const trimmedName = String(name).trim();
  const trimmedDesc = description !== undefined ? (description ? String(description).trim() : null) : null;
  const activeVal = is_active !== undefined ? (is_active ? 1 : 0) : 1;

  try {
    const result = db.prepare(`
      UPDATE departments 
      SET name = ?, description = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(trimmedName, trimmedDesc, activeVal, id);

    if (result.changes === 0) {
      res.status(404).json({ success: false, message: 'Department not found.' });
      return;
    }

    logAuditAction({
      userId: req.user!.id,
      action: 'UPDATE_DEPARTMENT',
      entityType: 'DEPARTMENT',
      entityId: id,
      description: `Updated department: ${trimmedName}`,
      req,
    });

    res.json({
      success: true,
      message: 'Department updated successfully.',
    });
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE constraint failed: departments.name')) {
      res.status(400).json({ success: false, message: 'Another department already uses this name.' });
      return;
    }
    console.error('Update department error:', error);
    res.status(500).json({ success: false, message: 'Failed to update department.' });
  }
});

/**
 * DELETE /api/departments/:id
 * Delete safety: Checks if complaints or staff depend on this department.
 */
departmentRouter.delete('/:id', authenticateUser, requireRole(['ADMIN', 'SUPER_ADMIN']), (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, message: 'Invalid department ID.' });
    return;
  }

  try {
    const usageCheck = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM complaints WHERE department_id = ?) as complaint_count,
        (SELECT COUNT(*) FROM users WHERE department_id = ?) as user_count
    `).get(id, id) as { complaint_count: number; user_count: number };

    if (usageCheck && (usageCheck.complaint_count > 0 || usageCheck.user_count > 0)) {
      res.status(400).json({
        success: false,
        message: `Cannot delete department: It is referenced by ${usageCheck.complaint_count} complaint(s) and ${usageCheck.user_count} user(s). You can deactivate it instead.`,
      });
      return;
    }

    const result = db.prepare('DELETE FROM departments WHERE id = ?').run(id);
    if (result.changes === 0) {
      res.status(404).json({ success: false, message: 'Department not found.' });
      return;
    }

    logAuditAction({
      userId: req.user!.id,
      action: 'DELETE_DEPARTMENT',
      entityType: 'DEPARTMENT',
      entityId: id,
      description: `Deleted department ID ${id}`,
      req,
    });

    res.json({
      success: true,
      message: 'Department deleted successfully.',
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete department.' });
  }
});
