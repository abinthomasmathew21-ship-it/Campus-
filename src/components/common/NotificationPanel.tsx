import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { NotificationItem } from '../../types';
import { api } from '../../services/api';

interface NotificationPanelProps {
  onSelectComplaint?: (complaintId: number) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ onSelectComplaint }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // Ignore network hiccup
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore error
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch {
      // Ignore error
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 text-neutral-600 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition-colors focus:outline-hidden"
        aria-label="View notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-orange-600 rounded-full font-tabular">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-neutral-200 rounded-lg shadow-xl z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-neutral-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-medium text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded font-tabular">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
              {loading && notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-400">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs font-medium text-neutral-700">You're all caught up</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">No notifications yet.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (n.complaint_id && onSelectComplaint) {
                        onSelectComplaint(n.complaint_id);
                        setIsOpen(false);
                      }
                    }}
                    className={`p-3 text-xs flex items-start justify-between gap-2 hover:bg-neutral-50 transition-colors cursor-pointer ${
                      n.is_read === 0 ? 'bg-orange-50/30' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <p className={`text-neutral-800 ${n.is_read === 0 ? 'font-medium' : ''}`}>
                        {n.message}
                      </p>
                      <span className="text-[10px] text-neutral-400 font-tabular mt-1 inline-block">
                        {new Date(n.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {n.is_read === 0 && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        title="Mark as read"
                        className="text-neutral-400 hover:text-orange-600 p-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
