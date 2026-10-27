import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateUser, AuthenticatedRequest } from '../auth.js';

export const notificationRouter = Router();

notificationRouter.use(authenticateUser);

/**
 * GET /api/notifications
 * Lists notifications for the authenticated user and count of unread notifications
 */
notificationRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    const unreadCountRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `).get(user.id) as { count: number };

    const notifications = db.prepare(`
      SELECT * 
      FROM notifications 
      WHERE user_id = ?
      ORDER BY created_at DESC 
      LIMIT 50
    `).all(user.id);

    res.json({
      success: true,
      unreadCount: unreadCountRow ? unreadCountRow.count : 0,
      notifications,
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read
 */
notificationRouter.put('/:id/read', (req: AuthenticatedRequest, res: Response): void => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    return;
  }

  try {
    db.prepare(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE id = ? AND user_id = ?
    `).run(id, req.user!.id);

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all user notifications as read
 */
notificationRouter.put('/read-all', (req: AuthenticatedRequest, res: Response) => {
  try {
    db.prepare(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE user_id = ?
    `).run(req.user!.id);

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
});
