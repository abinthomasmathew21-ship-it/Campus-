import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateUser, requireRole, AuthenticatedRequest, hashPassword } from '../auth.js';
import { logAuditAction } from '../audit.js';

export const adminRouter = Router();

// Protect all routes under /api/admin
adminRouter.use(authenticateUser);
adminRouter.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

/**
 * GET /api/admin/staff
 * Lists registered staff members with department info and assigned counts
 */
adminRouter.get('/staff', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const staff = db.prepare(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.department_id,
        u.is_active,
        u.created_at,
        u.last_login_at,
        d.name as department_name,
        (
          SELECT COUNT(*) 
          FROM assignments a 
          JOIN complaints c ON a.complaint_id = c.id 
          WHERE a.staff_id = u.id AND c.status IN ('ASSIGNED', 'IN_PROGRESS')
        ) as active_assignments_count,
        (
          SELECT COUNT(*) 
          FROM assignments a 
          JOIN complaints c ON a.complaint_id = c.id 
          WHERE a.staff_id = u.id AND c.status = 'RESOLVED'
        ) as resolved_count
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.role = 'STAFF'
      ORDER BY u.full_name ASC
    `).all();

    res.json({
      success: true,
      staff,
    });
  } catch (error) {
    console.error('Fetch staff error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve staff members.' });
  }
});

/**
 * POST /api/admin/staff
 * Register a new staff member manually by administrator
 */
adminRouter.post('/staff', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { full_name, email, password, department_id } = req.body;

  if (!full_name || !email || !password || !department_id) {
    res.status(400).json({ success: false, message: 'Full name, email, department, and password are required.' });
    return;
  }

  const trimmedName = String(full_name).trim();
  const trimmedEmail = String(email).trim().toLowerCase();
  const deptIdNum = parseInt(department_id, 10);

  if (password.length < 6) {
    res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    return;
  }

  try {
    // Verify department exists
    const dept = db.prepare('SELECT id, name FROM departments WHERE id = ?').get(deptIdNum) as any;
    if (!dept) {
      res.status(400).json({ success: false, message: 'Selected department does not exist.' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const result = db.prepare(`
      INSERT INTO users (full_name, email, password_hash, role, department_id, is_active, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'STAFF', ?, 1, 1, datetime('now'), datetime('now'))
    `).run(trimmedName, trimmedEmail, passwordHash, deptIdNum);

    const newStaffId = Number(result.lastInsertRowid);

    logAuditAction({
      userId: req.user!.id,
      action: 'CREATE_STAFF',
      entityType: 'USER',
      entityId: newStaffId,
      description: `Registered staff member ${trimmedName} (${trimmedEmail}) in department ${dept.name}`,
      req,
    });

    res.status(201).json({
      success: true,
      message: `Staff member ${trimmedName} registered successfully.`,
      staff: {
        id: newStaffId,
        full_name: trimmedName,
        email: trimmedEmail,
        role: 'STAFF',
        department_name: dept.name,
      },
    });
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE constraint failed: users.email')) {
      res.status(400).json({ success: false, message: 'Email address is already registered.' });
      return;
    }
    console.error('Create staff error:', error);
    res.status(500).json({ success: false, message: 'Failed to create staff member.' });
  }
});

/**
 * GET /api/admin/users
 * Lists users (students, staff, admins) with search and filters
 */
adminRouter.get('/users', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, role, page = '1', limit = '15' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];

    if (role && role !== 'ALL') {
      conditions.push('u.role = ?');
      params.push(role);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.student_id LIKE ?)');
      params.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalRow = db.prepare(`
      SELECT COUNT(*) as total 
      FROM users u 
      ${whereClause}
    `).get(...params) as { total: number };
    const total = totalRow ? totalRow.total : 0;

    const users = db.prepare(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.student_id,
        u.role,
        u.department_id,
        u.is_active,
        u.created_at,
        u.last_login_at,
        d.name as department_name,
        (SELECT COUNT(*) FROM complaints c WHERE c.student_id = u.id) as complaint_count
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
});

/**
 * PUT /api/admin/users/:id/status
 * Toggle user active/deactivated state
 */
adminRouter.put('/users/:id/status', (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  const { is_active } = req.body;

  if (isNaN(id) || is_active === undefined) {
    res.status(400).json({ success: false, message: 'User ID and target status are required.' });
    return;
  }

  // Prevent admin from deactivating themselves
  if (id === req.user!.id) {
    res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    return;
  }

  const activeVal = is_active ? 1 : 0;

  try {
    const user = db.prepare('SELECT id, full_name, email, role FROM users WHERE id = ?').get(id) as any;
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    db.prepare(`
      UPDATE users 
      SET is_active = ?, updated_at = datetime('now') 
      WHERE id = ?
    `).run(activeVal, id);

    logAuditAction({
      userId: req.user!.id,
      action: activeVal === 1 ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      entityType: 'USER',
      entityId: id,
      description: `${activeVal === 1 ? 'Activated' : 'Deactivated'} user ${user.email} (${user.role})`,
      req,
    });

    res.json({
      success: true,
      message: `User ${user.full_name} has been ${activeVal === 1 ? 'activated' : 'deactivated'}.`,
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
});

/**
 * GET /api/admin/audit-logs
 * View audit trail for sensitive administrative operations
 */
adminRouter.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const totalRow = db.prepare('SELECT COUNT(*) as total FROM audit_logs').get() as { total: number };
    const total = totalRow ? totalRow.total : 0;

    const logs = db.prepare(`
      SELECT 
        l.*,
        u.full_name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM audit_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limitNum, offset);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve audit logs.' });
  }
});
