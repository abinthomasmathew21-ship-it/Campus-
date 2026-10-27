import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateUser, AuthenticatedRequest } from '../auth.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticateUser);

/**
 * GET /api/dashboard/stats
 * Strictly queries the relational database for live counts.
 * Returns role-specific calculated metrics with ZERO mocked or hardcoded statistics.
 */
dashboardRouter.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    if (user.role === 'STUDENT') {
      const counts = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('SUBMITTED', 'VERIFIED') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status IN ('ASSIGNED', 'IN_PROGRESS') THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected
        FROM complaints
        WHERE student_id = ?
      `).get(user.id) as any;

      const recentComplaints = db.prepare(`
        SELECT c.*, d.name as department_name
        FROM complaints c
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE c.student_id = ?
        ORDER BY c.created_at DESC
        LIMIT 5
      `).all(user.id);

      res.json({
        success: true,
        role: 'STUDENT',
        stats: {
          total: counts?.total || 0,
          pending: counts?.pending || 0,
          in_progress: counts?.in_progress || 0,
          resolved: counts?.resolved || 0,
          rejected: counts?.rejected || 0,
        },
        recentComplaints,
      });
      return;
    }

    if (user.role === 'STAFF') {
      const counts = db.prepare(`
        SELECT 
          COUNT(*) as total_assigned,
          SUM(CASE WHEN c.status = 'ASSIGNED' THEN 1 ELSE 0 END) as assigned,
          SUM(CASE WHEN c.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN c.status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved
        FROM assignments a
        JOIN complaints c ON a.complaint_id = c.id
        WHERE a.staff_id = ?
      `).get(user.id) as any;

      const recentAssignments = db.prepare(`
        SELECT c.*, a.assigned_date, a.notes as assignment_notes, u.full_name as student_name
        FROM assignments a
        JOIN complaints c ON a.complaint_id = c.id
        LEFT JOIN users u ON c.student_id = u.id
        WHERE a.staff_id = ?
        ORDER BY a.created_at DESC
        LIMIT 5
      `).all(user.id);

      res.json({
        success: true,
        role: 'STAFF',
        stats: {
          total_assigned: counts?.total_assigned || 0,
          assigned: counts?.assigned || 0,
          in_progress: counts?.in_progress || 0,
          resolved: counts?.resolved || 0,
        },
        recentAssignments,
      });
      return;
    }

    // ADMIN and SUPER_ADMIN
    const counts = db.prepare(`
      SELECT 
        COUNT(*) as total_complaints,
        SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END) as pending_verification,
        SUM(CASE WHEN status = 'VERIFIED' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN status IN ('ASSIGNED', 'IN_PROGRESS') THEN 1 ELSE 0 END) as active_resolution,
        SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected
      FROM complaints
    `).get() as any;

    const userCounts = db.prepare(`
      SELECT 
        SUM(CASE WHEN role = 'STUDENT' THEN 1 ELSE 0 END) as total_students,
        SUM(CASE WHEN role = 'STAFF' THEN 1 ELSE 0 END) as total_staff,
        SUM(CASE WHEN role IN ('ADMIN', 'SUPER_ADMIN') THEN 1 ELSE 0 END) as total_admins
      FROM users
    `).get() as any;

    const deptCountRow = db.prepare('SELECT COUNT(*) as count FROM departments').get() as { count: number };

    const categoryBreakdown = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM complaints 
      GROUP BY category 
      ORDER BY count DESC
    `).all();

    const priorityBreakdown = db.prepare(`
      SELECT priority, COUNT(*) as count 
      FROM complaints 
      GROUP BY priority
    `).all();

    const recentComplaints = db.prepare(`
      SELECT c.*, u.full_name as student_name, d.name as department_name
      FROM complaints c
      LEFT JOIN users u ON c.student_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      ORDER BY c.created_at DESC
      LIMIT 6
    `).all();

    const recentAudits = db.prepare(`
      SELECT l.*, u.full_name as user_name
      FROM audit_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 6
    `).all();

    res.json({
      success: true,
      role: user.role,
      stats: {
        total_complaints: counts?.total_complaints || 0,
        pending_verification: counts?.pending_verification || 0,
        verified: counts?.verified || 0,
        active_resolution: counts?.active_resolution || 0,
        resolved: counts?.resolved || 0,
        rejected: counts?.rejected || 0,
        total_students: userCounts?.total_students || 0,
        total_staff: userCounts?.total_staff || 0,
        total_admins: userCounts?.total_admins || 0,
        total_departments: deptCountRow?.count || 0,
      },
      categoryBreakdown,
      priorityBreakdown,
      recentComplaints,
      recentAudits,
    });
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve dashboard analytics.' });
  }
});
