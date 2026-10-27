import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = process.env.DATABASE_URL || path.join(dataDir, 'campuscare.db');
export const db = new Database(dbPath);

// Enable WAL mode and foreign keys for high reliability and relational integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Initialize relational database schema.
 * CRITICAL REQUIREMENT: ZERO DEMO DATA.
 * Only tables, foreign keys, constraints, and indexes are created.
 * Absolutely no INSERT statements here.
 */
export function initDatabase() {
  db.exec(`
    -- DEPARTMENTS TABLE
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- USERS TABLE
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      student_id TEXT UNIQUE,
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('STUDENT', 'STAFF', 'ADMIN', 'SUPER_ADMIN')),
      is_active INTEGER NOT NULL DEFAULT 1,
      email_verified INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT
    );

    -- COMPLAINTS TABLE
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_number TEXT NOT NULL UNIQUE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      priority TEXT NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')) DEFAULT 'MEDIUM',
      status TEXT NOT NULL CHECK(status IN ('SUBMITTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')) DEFAULT 'SUBMITTED',
      image_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      verified_at TEXT,
      assigned_at TEXT,
      resolved_at TEXT,
      rejected_at TEXT,
      rejection_reason TEXT
    );

    -- ASSIGNMENTS TABLE
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      assigned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      assigned_date TEXT NOT NULL DEFAULT (datetime('now')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- FEEDBACK TABLE
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL UNIQUE REFERENCES complaints(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- NOTIFICATIONS TABLE
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- COMPLAINT STATUS HISTORY TABLE
    CREATE TABLE IF NOT EXISTS complaint_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      old_status TEXT,
      new_status TEXT NOT NULL,
      changed_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- AUDIT LOGS TABLE
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      description TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- INDEXES FOR QUERY OPTIMIZATION AND INTEGRITY
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_complaints_complaint_number ON complaints(complaint_number);
    CREATE INDEX IF NOT EXISTS idx_complaints_student_id ON complaints(student_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
    CREATE INDEX IF NOT EXISTS idx_complaints_department_id ON complaints(department_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at);
    CREATE INDEX IF NOT EXISTS idx_assignments_staff_id ON assignments(staff_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_complaint_id ON assignments(complaint_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_status_history_complaint_id ON complaint_status_history(complaint_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  `);
}

/**
 * Dynamically generates sequential complaint number format: CC-YYYY-XXXXXX
 * (e.g., CC-2026-000001) based on current year and database record count
 */
export function generateNextComplaintNumber(): string {
  const currentYear = new Date().getFullYear();
  const prefix = `CC-${currentYear}-`;
  
  const row = db.prepare(`
    SELECT complaint_number 
    FROM complaints 
    WHERE complaint_number LIKE ? 
    ORDER BY id DESC 
    LIMIT 1
  `).get(`${prefix}%`) as { complaint_number: string } | undefined;

  let nextSequence = 1;
  if (row && row.complaint_number) {
    const parts = row.complaint_number.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSequence = parsed + 1;
      }
    }
  }

  const paddedSequence = String(nextSequence).padStart(6, '0');
  return `${prefix}${paddedSequence}`;
}
