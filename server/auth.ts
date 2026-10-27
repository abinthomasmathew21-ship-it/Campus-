import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

export interface UserPayload {
  id: number;
  full_name: string;
  email: string;
  role: 'STUDENT' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';
  student_id: string | null;
  department_id: number | null;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'campuscare_secure_jwt_secret_token_default_key_2026';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: UserPayload): string {
  return jwt.sign(
    {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      student_id: user.student_id,
      department_id: user.department_id,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  let token = req.cookies?.campuscare_token;
  
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. Please sign in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    
    // Verify that user still exists and is active in database
    const userRow = db.prepare(`
      SELECT id, full_name, email, role, student_id, department_id, is_active 
      FROM users 
      WHERE id = ?
    `).get(decoded.id) as (UserPayload & { is_active: number }) | undefined;

    if (!userRow || userRow.is_active === 0) {
      res.status(401).json({ success: false, message: 'Account is deactivated or does not exist.' });
      return;
    }

    req.user = {
      id: userRow.id,
      full_name: userRow.full_name,
      email: userRow.email,
      role: userRow.role,
      student_id: userRow.student_id,
      department_id: userRow.department_id,
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired session. Please sign in again.' });
    return;
  }
}

export function requireRole(allowedRoles: Array<'STUDENT' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to access this resource.' });
      return;
    }

    next();
  };
}
