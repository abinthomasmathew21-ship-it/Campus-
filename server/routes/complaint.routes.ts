import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { db, generateNextComplaintNumber } from '../db.js';
import { authenticateUser, requireRole, AuthenticatedRequest } from '../auth.js';
import { logAuditAction } from '../audit.js';

export const complaintRouter = Router();

// Configure secure image upload
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `img_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (_req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedExt = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedMime.includes(file.mimetype) && allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WebP images are permitted.'));
    }
  },
});

/**
 * GET /api/complaints
 * Returns complaints with server-side filtering, searching, and pagination.
 * Role-restricted:
 * - STUDENT: strictly their own complaints
 * - STAFF: strictly complaints assigned to them
 * - ADMIN/SUPER_ADMIN: all complaints
 */
complaintRouter.get('/', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      search,
      status,
      priority,
      category,
      department_id,
      page = '1',
      limit = '10',
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];

    // Role-based scoping
    if (user.role === 'STUDENT') {
      conditions.push('c.student_id = ?');
      params.push(user.id);
    } else if (user.role === 'STAFF') {
      conditions.push('EXISTS (SELECT 1 FROM assignments a WHERE a.complaint_id = c.id AND a.staff_id = ?)');
      params.push(user.id);
    }

    // Search query
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push('(c.complaint_number LIKE ? OR c.title LIKE ? OR c.location LIKE ? OR c.description LIKE ?)');
      params.push(term, term, term, term);
    }

    // Status filter
    if (status && status !== 'ALL') {
      conditions.push('c.status = ?');
      params.push(status);
    }

    // Priority filter
    if (priority && priority !== 'ALL') {
      conditions.push('c.priority = ?');
      params.push(priority);
    }

    // Category filter
    if (category && category !== 'ALL') {
      conditions.push('c.category = ?');
      params.push(category);
    }

    // Department filter
    if (department_id && department_id !== 'ALL') {
      conditions.push('c.department_id = ?');
      params.push(parseInt(department_id, 10));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const totalRow = db.prepare(`
      SELECT COUNT(*) as total 
      FROM complaints c 
      ${whereClause}
    `).get(...params) as { total: number };
    const total = totalRow ? totalRow.total : 0;

    // Allowed sort columns
    const allowedSortColumns = ['created_at', 'priority', 'status', 'complaint_number', 'updated_at'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Data query
    const complaints = db.prepare(`
      SELECT 
        c.*,
        u.full_name as student_name,
        u.email as student_email,
        u.student_id as student_roll_id,
        d.name as department_name,
        (
          SELECT staff.full_name 
          FROM assignments a 
          JOIN users staff ON a.staff_id = staff.id 
          WHERE a.complaint_id = c.id 
          ORDER BY a.id DESC 
          LIMIT 1
        ) as assigned_staff_name,
        (
          SELECT a.staff_id 
          FROM assignments a 
          WHERE a.complaint_id = c.id 
          ORDER BY a.id DESC 
          LIMIT 1
        ) as assigned_staff_id,
        (
          SELECT f.rating 
          FROM feedback f 
          WHERE f.complaint_id = c.id 
          LIMIT 1
        ) as feedback_rating
      FROM complaints c
      LEFT JOIN users u ON c.student_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      ${whereClause}
      ORDER BY c.${safeSortBy} ${safeOrder}
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    res.json({
      success: true,
      complaints,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Fetch complaints error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve complaints.' });
  }
});

/**
 * POST /api/complaints
 * Submit a new complaint (Student role only).
 * Uses database transaction for atomicity:
 * 1. Insert complaint record with CC-YYYY-XXXXXX sequence
 * 2. Insert initial status history (SUBMITTED)
 * 3. Insert notification for user
 */
complaintRouter.post('/', authenticateUser, requireRole(['STUDENT']), upload.single('image'), (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { title, description, category, location, department_id, priority = 'MEDIUM' } = req.body;

  if (!title || !description || !category || !location) {
    res.status(400).json({ success: false, message: 'Title, description, category, and location are required.' });
    return;
  }

  const validCategories = [
    'Electrical Issues',
    'Classroom Maintenance',
    'Laboratory Issues',
    'Hostel Issues',
    'Water Supply',
    'Cleanliness',
    'Internet & Wi-Fi',
    'Library Issues',
    'Other',
  ];

  if (!validCategories.includes(category)) {
    res.status(400).json({ success: false, message: 'Please select a valid category.' });
    return;
  }

  const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const safePriority = validPriorities.includes(priority) ? priority : 'MEDIUM';

  const imagePath = req.file ? `/api/uploads/${req.file.filename}` : null;
  const deptIdNum = department_id && department_id !== '' ? Number(department_id) : null;

  try {
    const complaintNumber = generateNextComplaintNumber();

    // Transaction to ensure all related records are created atomically
    const insertTransaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO complaints (
          complaint_number, student_id, title, description, category, location, department_id,
          priority, status, image_path, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, datetime('now'), datetime('now'))
      `).run(
        complaintNumber,
        user.id,
        String(title).trim(),
        String(description).trim(),
        category,
        String(location).trim(),
        deptIdNum,
        safePriority,
        imagePath
      );

      const complaintId = Number(result.lastInsertRowid);

      // Create initial status history entry
      db.prepare(`
        INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, reason, created_at)
        VALUES (?, NULL, 'SUBMITTED', ?, 'Complaint submitted by student', datetime('now'))
      `).run(complaintId, user.id);

      // Create real confirmation notification for student
      db.prepare(`
        INSERT INTO notifications (user_id, complaint_id, type, message, is_read, created_at)
        VALUES (?, ?, 'COMPLAINT_SUBMITTED', ?, 0, datetime('now'))
      `).run(
        user.id,
        complaintId,
        `Your complaint ${complaintNumber} has been submitted successfully.`
      );

      return complaintId;
    });

    const complaintId = insertTransaction();

    logAuditAction({
      userId: user.id,
      action: 'SUBMIT_COMPLAINT',
      entityType: 'COMPLAINT',
      entityId: complaintId,
      description: `Student submitted complaint ${complaintNumber}: ${String(title).trim()}`,
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      complaint: {
        id: complaintId,
        complaint_number: complaintNumber,
      },
    });
  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit complaint.' });
  }
});

/**
 * GET /api/complaints/:id
 * Retrieve complaint details, history, assignments, and feedback.
 * Strictly verifies ownership/permissions.
 */
complaintRouter.get('/:id', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, message: 'Invalid complaint ID.' });
    return;
  }

  const user = req.user!;

  try {
    const complaint = db.prepare(`
      SELECT 
        c.*,
        u.full_name as student_name,
        u.email as student_email,
        u.student_id as student_roll_id,
        d.name as department_name
      FROM complaints c
      LEFT JOIN users u ON c.student_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.id = ?
    `).get(id) as any;

    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found.' });
      return;
    }

    // Authorization check
    if (user.role === 'STUDENT' && complaint.student_id !== user.id) {
      res.status(403).json({ success: false, message: 'Unauthorized. You can only view your own complaints.' });
      return;
    }

    if (user.role === 'STAFF') {
      const assignedCheck = db.prepare(`
        SELECT 1 FROM assignments WHERE complaint_id = ? AND staff_id = ?
      `).get(id, user.id);

      if (!assignedCheck) {
        res.status(403).json({ success: false, message: 'Unauthorized. You can only view complaints assigned to you.' });
        return;
      }
    }

    // Fetch status history
    const history = db.prepare(`
      SELECT 
        h.*,
        u.full_name as changed_by_name,
        u.role as changed_by_role
      FROM complaint_status_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.complaint_id = ?
      ORDER BY h.created_at ASC
    `).all(id);

    // Fetch assignments
    const assignments = db.prepare(`
      SELECT 
        a.*,
        staff.full_name as staff_name,
        staff.email as staff_email,
        assigner.full_name as assigned_by_name
      FROM assignments a
      JOIN users staff ON a.staff_id = staff.id
      JOIN users assigner ON a.assigned_by = assigner.id
      WHERE a.complaint_id = ?
      ORDER BY a.created_at DESC
    `).all(id);

    // Fetch feedback if any
    const feedback = db.prepare(`
      SELECT f.*, u.full_name as user_name
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      WHERE f.complaint_id = ?
    `).get(id);

    res.json({
      success: true,
      complaint: {
        ...complaint,
        history,
        assignments,
        feedback: feedback || null,
      },
    });
  } catch (error) {
    console.error('Fetch complaint details error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve complaint details.' });
  }
});

/**
 * POST /api/complaints/:id/verify
 * Admin / Super Admin only: verify a submitted complaint
 */
complaintRouter.post('/:id/verify', authenticateUser, requireRole(['ADMIN', 'SUPER_ADMIN']), (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, message: 'Invalid complaint ID.' });
    return;
  }

  const user = req.user!;

  try {
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id) as any;
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found.' });
      return;
    }

    if (complaint.status !== 'SUBMITTED') {
      res.status(400).json({ success: false, message: `Cannot verify complaint in ${complaint.status} status.` });
      return;
    }

    const verifyTx = db.transaction(() => {
      db.prepare(`
        UPDATE complaints 
        SET status = 'VERIFIED', verified_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(id);

      db.prepare(`
        INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, reason, created_at)
        VALUES (?, 'SUBMITTED', 'VERIFIED', ?, 'Complaint verified by administrator', datetime('now'))
      `).run(id, user.id);

      db.prepare(`
        INSERT INTO notifications (user_id, complaint_id, type, message, is_read, created_at)
        VALUES (?, ?, 'COMPLAINT_VERIFIED', ?, 0, datetime('now'))
      `).run(
        complaint.student_id,
        id,
        `Your complaint ${complaint.complaint_number} has been verified.`
      );
    });

    verifyTx();

    logAuditAction({
      userId: user.id,
      action: 'VERIFY_COMPLAINT',
      entityType: 'COMPLAINT',
      entityId: id,
      description: `Verified complaint ${complaint.complaint_number}`,
      req,
    });

    res.json({ success: true, message: 'Complaint verified successfully.' });
  } catch (error) {
    console.error('Verify complaint error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify complaint.' });
  }
});

/**
 * POST /api/complaints/:id/reject
 * Admin / Super Admin only: reject a complaint with reason
 */
complaintRouter.post('/:id/reject', authenticateUser, requireRole(['ADMIN', 'SUPER_ADMIN']), (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  const { reason } = req.body;

  if (isNaN(id)) {
    res.status(400).json({ success: false, message: 'Invalid complaint ID.' });
    return;
  }

  if (!reason || !String(reason).trim()) {
    res.status(400).json({ success: false, message: 'A rejection reason is required.' });
    return;
  }

  const user = req.user!;
  const trimmedReason = String(reason).trim();

  try {
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id) as any;
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found.' });
      return;
    }

    if (complaint.status === 'RESOLVED' || complaint.status === 'REJECTED') {
      res.status(400).json({ success: false, message: `Cannot reject complaint that is already ${complaint.status}.` });
      return;
    }

    const rejectTx = db.transaction(() => {
      db.prepare(`
        UPDATE complaints 
        SET status = 'REJECTED', rejected_at = datetime('now'), rejection_reason = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(trimmedReason, id);

      db.prepare(`
        INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, reason, created_at)
        VALUES (?, ?, 'REJECTED', ?, ?, datetime('now'))
      `).run(id, complaint.status, user.id, trimmedReason);

      db.prepare(`
        INSERT INTO notifications (user_id, complaint_id, type, message, is_read, created_at)
        VALUES (?, ?, 'COMPLAINT_REJECTED', ?, 0, datetime('now'))
      `).run(
        complaint.student_id,
        id,
        `Your complaint ${complaint.complaint_number} was rejected: ${trimmedReason}`
      );
    });

    rejectTx();

    logAuditAction({
      userId: user.id,
      action: 'REJECT_COMPLAINT',
      entityType: 'COMPLAINT',
      entityId: id,
      description: `Rejected complaint ${complaint.complaint_number}. Reason: ${trimmedReason}`,
      req,
    });

    res.json({ success: true, message: 'Complaint rejected.' });
  } catch (error) {
    console.error('Reject complaint error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject complaint.' });
  }
});

/**
 * POST /api/complaints/:id/assign
 * Admin / Super Admin only: assign a verified complaint to an active staff member
 */
complaintRouter.post('/:id/assign', authenticateUser, requireRole(['ADMIN', 'SUPER_ADMIN']), (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  const { staff_id, notes } = req.body;

  if (isNaN(id) || !staff_id) {
    res.status(400).json({ success: false, message: 'Complaint ID and Staff ID are required.' });
    return;
  }

  const staffIdNum = parseInt(staff_id, 10);
  const user = req.user!;

  try {
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id) as any;
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found.' });
      return;
    }

    if (complaint.status !== 'VERIFIED' && complaint.status !== 'SUBMITTED' && complaint.status !== 'ASSIGNED') {
      res.status(400).json({ success: false, message: `Cannot assign complaint in ${complaint.status} status.` });
      return;
    }

    // Verify staff exists, is staff, and is active
    const staff = db.prepare(`
      SELECT id, full_name, email, department_id, is_active 
      FROM users 
      WHERE id = ? AND role = 'STAFF'
    `).get(staffIdNum) as any;

    if (!staff) {
      res.status(400).json({ success: false, message: 'Specified staff member does not exist.' });
      return;
    }

    if (staff.is_active === 0) {
      res.status(400).json({ success: false, message: 'Staff member account is deactivated.' });
      return;
    }

    const assignTx = db.transaction(() => {
      // Record assignment
      db.prepare(`
        INSERT INTO assignments (complaint_id, staff_id, assigned_by, assigned_date, notes, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), ?, datetime('now'), datetime('now'))
      `).run(id, staffIdNum, user.id, notes ? String(notes).trim() : null);

      // Update complaint status to ASSIGNED
      db.prepare(`
        UPDATE complaints 
        SET status = 'ASSIGNED', assigned_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(id);

      // Status history entry
      db.prepare(`
        INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, reason, created_at)
        VALUES (?, ?, 'ASSIGNED', ?, ?, datetime('now'))
      `).run(id, complaint.status, user.id, `Assigned to ${staff.full_name}${notes ? ': ' + notes : ''}`);

      // Notification for assigned staff
      db.prepare(`
        INSERT INTO notifications (user_id, complaint_id, type, message, is_read, created_at)
        VALUES (?, ?, 'COMPLAINT_ASSIGNED_STAFF', ?, 0, datetime('now'))
      `).run(
        staff.id,
        id,
        `Complaint ${complaint.complaint_number} has been assigned to you.`
      );

      // Notification for student
      db.prepare(`
        INSERT INTO notifications (user_id, complaint_id, type, message, is_read, created_at)
        VALUES (?, ?, 'COMPLAINT_ASSIGNED_STUDENT', ?, 0, datetime('now'))
      `).run(
        complaint.student_id,
        id,
        `Your complaint ${complaint.complaint_number} has been assigned to ${staff.full_name}.`
      );
    });

    assignTx();

    logAuditAction({
      userId: user.id,
      action: 'ASSIGN_COMPLAINT',
      entityType: 'COMPLAINT',
      entityId: id,
      description: `Assigned complaint ${complaint.complaint_number} to staff ${staff.full_name}`,
      req,
    });

    res.json({ success: true, message: `Complaint assigned to ${staff.full_name}.` });
  } catch (error) {
    console.error('Assign complaint error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign complaint.' });
  }
});

/**
 * POST /api/complaints/:id/status
 * Staff (if assigned) or Admin: update progress status (e.g. IN_PROGRESS, RESOLVED)
 */
complaintRouter.post('/:id/status', authenticateUser, (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  const { status, notes } = req.body;

  if (isNaN(id) || !status) {
    res.status(400).json({ success: false, message: 'Complaint ID and target status are required.' });
    return;
  }

  const validStatuses = ['IN_PROGRESS', 'RESOLVED'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ success: false, message: 'Invalid target status. Permitted: IN_PROGRESS, RESOLVED.' });
    return;
  }

  const user = req.user!;

  try {
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id) as any;
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found.' });
      return;
    }

    // Role verification: Staff must be assigned; Admin can also perform update
    if (user.role === 'STAFF') {
      const isAssigned = db.prepare(`
        SELECT 1 FROM assignments WHERE complaint_id = ? AND staff_id = ?
      `).get(id, user.id);

      if (!isAssigned) {
        res.status(403).json({ success: false, message: 'You can only update complaints assigned to you.' });
        return;
      }
    } else if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, message: 'Unauthorized to change complaint status.' });
      return;
    }

    if (complaint.status === 'RESOLVED') {
      res.status(400).json({ success: false, message: 'Complaint is already resolved.' });
      return;
    }

    const trimmedNotes = notes ? String(notes).trim() : '';

    const updateTx = db.transaction(() => {
      let resolvedClause = '';
      if (status === 'RESOLVED') {
        resolvedClause = `, resolved_at = datetime('now')`;
      }

      db.prepare(`
        UPDATE complaints 
        SET status = ?, updated_at = datetime('now') ${resolvedClause}
        WHERE id = ?
      `).run(status, id);

      db.prepare(`
        INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, reason, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(
        id,
        complaint.status,
        status,
        user.id,
        trimmedNotes || (status === 'IN_PROGRESS' ? 'Work started on complaint' : 'Complaint resolved')
      );

      // Real notification for student
      const notificationMsg = status === 'RESOLVED'
        ? `Your complaint ${complaint.complaint_number} has been resolved.${trimmedNotes ? ' Note: ' + trimmedNotes : ''}`
        : `Work has started on your complaint ${complaint.complaint_number}.`;

      db.prepare(`
        INSERT INTO notifications (user_id, complaint_id, type, message, is_read, created_at)
        VALUES (?, ?, ?, ?, 0, datetime('now'))
      `).run(complaint.student_id, id, `COMPLAINT_${status}`, notificationMsg);
    });

    updateTx();

    logAuditAction({
      userId: user.id,
      action: 'UPDATE_COMPLAINT_STATUS',
      entityType: 'COMPLAINT',
      entityId: id,
      description: `Status changed from ${complaint.status} to ${status} for ${complaint.complaint_number}`,
      req,
    });

    res.json({ success: true, message: `Status updated to ${status}.` });
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update complaint status.' });
  }
});

/**
 * POST /api/complaints/:id/priority
 * Admin / Super Admin only: update complaint priority
 */
complaintRouter.post('/:id/priority', authenticateUser, requireRole(['ADMIN', 'SUPER_ADMIN']), (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  const { priority } = req.body;

  if (isNaN(id) || !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
    res.status(400).json({ success: false, message: 'Valid priority is required (LOW, MEDIUM, HIGH, URGENT).' });
    return;
  }

  const user = req.user!;

  try {
    const complaint = db.prepare('SELECT id, complaint_number, priority FROM complaints WHERE id = ?').get(id) as any;
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found.' });
      return;
    }

    db.prepare(`
      UPDATE complaints 
      SET priority = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(priority, id);

    logAuditAction({
      userId: user.id,
      action: 'CHANGE_PRIORITY',
      entityType: 'COMPLAINT',
      entityId: id,
      description: `Changed priority from ${complaint.priority} to ${priority} for ${complaint.complaint_number}`,
      req,
    });

    res.json({ success: true, message: `Priority updated to ${priority}.` });
  } catch (error) {
    console.error('Change priority error:', error);
    res.status(500).json({ success: false, message: 'Failed to update priority.' });
  }
});

/**
 * POST /api/complaints/:id/feedback
 * Student only: submit resolution feedback (1-5 rating + comment)
 * Rules:
 * - Only the complaint owner can submit feedback
 * - Allowed only after resolution
 * - One complaint has only one final feedback record
 */
complaintRouter.post('/:id/feedback', authenticateUser, requireRole(['STUDENT']), (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  const { rating, comment } = req.body;

  if (isNaN(id)) {
    res.status(400).json({ success: false, message: 'Invalid complaint ID.' });
    return;
  }

  const ratingNum = parseInt(rating, 10);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    return;
  }

  const user = req.user!;
  const trimmedComment = comment ? String(comment).trim() : null;

  try {
    const complaint = db.prepare('SELECT id, student_id, status, complaint_number FROM complaints WHERE id = ?').get(id) as any;
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found.' });
      return;
    }

    if (complaint.student_id !== user.id) {
      res.status(403).json({ success: false, message: 'Only the student who submitted this complaint can provide feedback.' });
      return;
    }

    if (complaint.status !== 'RESOLVED') {
      res.status(400).json({ success: false, message: 'Feedback can only be submitted after the complaint is resolved.' });
      return;
    }

    // Check if feedback already exists
    const existingFeedback = db.prepare('SELECT id FROM feedback WHERE complaint_id = ?').get(id);
    if (existingFeedback) {
      res.status(400).json({ success: false, message: 'Feedback has already been submitted for this complaint.' });
      return;
    }

    db.prepare(`
      INSERT INTO feedback (complaint_id, user_id, rating, comment, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(id, user.id, ratingNum, trimmedComment);

    logAuditAction({
      userId: user.id,
      action: 'SUBMIT_FEEDBACK',
      entityType: 'FEEDBACK',
      entityId: id,
      description: `Submitted ${ratingNum}-star feedback for ${complaint.complaint_number}`,
      req,
    });

    res.status(201).json({ success: true, message: 'Thank you! Your feedback has been recorded.' });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to record feedback.' });
  }
});
