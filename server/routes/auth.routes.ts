import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { hashPassword, comparePassword, generateToken, authenticateUser, AuthenticatedRequest } from '../auth.js';
import { logAuditAction } from '../audit.js';

export const authRouter = Router();

// In-memory rate limiter for auth endpoints (prevents brute-force)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || now > record.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count += 1;
  return true;
}

/**
 * GET /api/auth/setup-status
 * Checks if the system has 0 administrators, meaning Initial Administrator Setup is required.
 */
authRouter.get('/setup-status', (_req: Request, res: Response) => {
  const row = db.prepare(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE role IN ('ADMIN', 'SUPER_ADMIN')
  `).get() as { count: number };

  const adminCount = row ? row.count : 0;
  res.json({
    success: true,
    needsSetup: adminCount === 0,
    adminCount,
  });
});

/**
 * POST /api/auth/setup-admin
 * Initial Administrator Setup.
 * Allowed ONLY if no administrators exist in the database.
 */
authRouter.post('/setup-admin', async (req: Request, res: Response): Promise<void> => {
  const adminCheck = db.prepare(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE role IN ('ADMIN', 'SUPER_ADMIN')
  `).get() as { count: number };

  if (adminCheck && adminCheck.count > 0) {
    res.status(403).json({
      success: false,
      message: 'Initial Administrator Setup is permanently disabled. An administrator account already exists.',
    });
    return;
  }

  const { full_name, email, password, confirmPassword } = req.body;

  if (!full_name || !email || !password) {
    res.status(400).json({ success: false, message: 'All fields are required.' });
    return;
  }

  const trimmedName = String(full_name).trim();
  const trimmedEmail = String(email).trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    res.status(400).json({ success: false, message: 'Please provide a valid official email address.' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ success: false, message: 'Passwords do not match.' });
    return;
  }

  try {
    const passwordHash = await hashPassword(password);
    const result = db.prepare(`
      INSERT INTO users (full_name, email, password_hash, role, is_active, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'SUPER_ADMIN', 1, 1, datetime('now'), datetime('now'))
    `).run(trimmedName, trimmedEmail, passwordHash);

    const newUserId = Number(result.lastInsertRowid);
    const userPayload = {
      id: newUserId,
      full_name: trimmedName,
      email: trimmedEmail,
      role: 'SUPER_ADMIN' as const,
      student_id: null,
      department_id: null,
    };

    const token = generateToken(userPayload);

    // Audit log initial administrator creation
    logAuditAction({
      userId: newUserId,
      action: 'INITIAL_ADMIN_SETUP',
      entityType: 'USER',
      entityId: newUserId,
      description: `First Super Administrator registered (${trimmedEmail})`,
      req,
    });

    res.cookie('campuscare_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: 'Super Administrator initialized successfully.',
      user: userPayload,
      token,
    });
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE constraint failed: users.email')) {
      res.status(400).json({ success: false, message: 'Email is already registered.' });
      return;
    }
    console.error('Admin setup error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete initial administrator setup.' });
  }
});

/**
 * POST /api/auth/register
 * Student self-registration.
 */
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { full_name, email, student_id, department_id, password, confirmPassword } = req.body;

  if (!full_name || !email || !student_id || !password) {
    res.status(400).json({ success: false, message: 'Full name, email, student ID, and password are required.' });
    return;
  }

  const trimmedName = String(full_name).trim();
  const trimmedEmail = String(email).trim().toLowerCase();
  const trimmedStudentId = String(student_id).trim().toUpperCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    res.status(400).json({ success: false, message: 'Invalid email address format.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ success: false, message: 'Passwords do not match.' });
    return;
  }

  try {
    // Check if email or student_id exists
    const existing = db.prepare(`
      SELECT email, student_id FROM users WHERE email = ? OR student_id = ?
    `).get(trimmedEmail, trimmedStudentId) as { email: string; student_id: string } | undefined;

    if (existing) {
      if (existing.email.toLowerCase() === trimmedEmail) {
        res.status(400).json({ success: false, message: 'Email address is already in use.' });
        return;
      }
      if (existing.student_id === trimmedStudentId) {
        res.status(400).json({ success: false, message: 'Student ID is already registered.' });
        return;
      }
    }

    const passwordHash = await hashPassword(password);
    const result = db.prepare(`
      INSERT INTO users (full_name, email, student_id, department_id, password_hash, role, is_active, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'STUDENT', 1, 1, datetime('now'), datetime('now'))
    `).run(trimmedName, trimmedEmail, trimmedStudentId, department_id ? Number(department_id) : null);

    const newUserId = Number(result.lastInsertRowid);
    const userPayload = {
      id: newUserId,
      full_name: trimmedName,
      email: trimmedEmail,
      role: 'STUDENT' as const,
      student_id: trimmedStudentId,
      department_id: department_id ? Number(department_id) : null,
    };

    const token = generateToken(userPayload);

    logAuditAction({
      userId: newUserId,
      action: 'STUDENT_REGISTER',
      entityType: 'USER',
      entityId: newUserId,
      description: `Student account created for ${trimmedName} (${trimmedStudentId})`,
      req,
    });

    res.cookie('campuscare_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: 'Student account registered successfully.',
      user: userPayload,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

/**
 * POST /api/auth/login
 * User login with credential validation and session token.
 */
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  const clientIp = req.socket.remoteAddress || 'ip';
  if (!checkRateLimit(clientIp, 10, 60 * 1000)) {
    res.status(429).json({ success: false, message: 'Too many login attempts. Please wait a minute and try again.' });
    return;
  }

  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required.' });
    return;
  }

  const trimmedEmail = String(email).trim().toLowerCase();

  try {
    const user = db.prepare(`
      SELECT id, full_name, email, password_hash, role, student_id, department_id, is_active
      FROM users
      WHERE email = ?
    `).get(trimmedEmail) as any;

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    if (user.is_active === 0) {
      res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact an administrator.' });
      return;
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    // Update last login timestamp
    db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(user.id);

    const userPayload = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      student_id: user.student_id,
      department_id: user.department_id,
    };

    const token = generateToken(userPayload);

    logAuditAction({
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      description: `User ${user.email} (${user.role}) logged in`,
      req,
    });

    res.cookie('campuscare_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Signed in successfully.',
      user: userPayload,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Sign in failed due to server error.' });
  }
});

/**
 * POST /api/auth/logout
 */
authRouter.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('campuscare_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * GET /api/auth/me
 * Returns currently authenticated user details.
 */
authRouter.get('/me', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    user: req.user,
  });
});
