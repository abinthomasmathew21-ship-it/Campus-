import {
  User,
  Complaint,
  Department,
  NotificationItem,
  AuditLogItem,
  Pagination,
} from '../types';

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    try {
      localStorage.setItem('campuscare_jwt', token);
    } catch {
      // Storage unavailable fallback
    }
  } else {
    try {
      localStorage.removeItem('campuscare_jwt');
    } catch {
      // Storage unavailable fallback
    }
  }
}

export function getStoredToken(): string | null {
  if (authToken) return authToken;
  try {
    authToken = localStorage.getItem('campuscare_jwt');
    return authToken;
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({ success: false, message: 'Server communication error.' }));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth & Setup
  async checkSetupStatus(): Promise<{ success: boolean; needsSetup: boolean; adminCount: number }> {
    return request('/api/auth/setup-status');
  },

  async setupAdmin(data: any): Promise<{ success: boolean; user: User; token: string }> {
    const res = await request<{ success: boolean; user: User; token: string }>('/api/auth/setup-admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) setToken(res.token);
    return res;
  },

  async login(data: any): Promise<{ success: boolean; user: User; token: string }> {
    const res = await request<{ success: boolean; user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) setToken(res.token);
    return res;
  },

  async register(data: any): Promise<{ success: boolean; user: User; token: string }> {
    const res = await request<{ success: boolean; user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) setToken(res.token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setToken(null);
    }
  },

  async getMe(): Promise<{ success: boolean; user: User }> {
    return request('/api/auth/me');
  },

  // Health
  async checkHealth(): Promise<{ success: boolean; status: string; database: string }> {
    return request('/api/health');
  },

  // Departments
  async getDepartments(): Promise<{ success: boolean; departments: Department[] }> {
    return request('/api/departments');
  },

  async createDepartment(data: { name: string; description?: string }): Promise<{ success: boolean; department: Department }> {
    return request('/api/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateDepartment(id: number, data: { name: string; description?: string; is_active?: boolean }): Promise<{ success: boolean }> {
    return request(`/api/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteDepartment(id: number): Promise<{ success: boolean; message: string }> {
    return request(`/api/departments/${id}`, {
      method: 'DELETE',
    });
  },

  // Complaints
  async getComplaints(params: Record<string, string | number> = {}): Promise<{
    success: boolean;
    complaints: Complaint[];
    pagination: Pagination;
  }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    const q = searchParams.toString();
    return request(`/api/complaints${q ? `?${q}` : ''}`);
  },

  async getComplaint(id: number): Promise<{ success: boolean; complaint: Complaint }> {
    return request(`/api/complaints/${id}`);
  },

  async submitComplaint(formData: FormData): Promise<{ success: boolean; complaint: { id: number; complaint_number: string } }> {
    return request('/api/complaints', {
      method: 'POST',
      body: formData,
    });
  },

  async verifyComplaint(id: number): Promise<{ success: boolean; message: string }> {
    return request(`/api/complaints/${id}/verify`, { method: 'POST' });
  },

  async rejectComplaint(id: number, reason: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/complaints/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async assignComplaint(id: number, staff_id: number, notes?: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/complaints/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ staff_id, notes }),
    });
  },

  async updateComplaintStatus(id: number, status: 'IN_PROGRESS' | 'RESOLVED', notes?: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/complaints/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    });
  },

  async updateComplaintPriority(id: number, priority: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/complaints/${id}/priority`, {
      method: 'POST',
      body: JSON.stringify({ priority }),
    });
  },

  async submitFeedback(id: number, rating: number, comment?: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/complaints/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
  },

  // Admin Management
  async getStaff(): Promise<{ success: boolean; staff: User[] }> {
    return request('/api/admin/staff');
  },

  async createStaff(data: any): Promise<{ success: boolean; staff: User }> {
    return request('/api/admin/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getUsers(params: Record<string, string | number> = {}): Promise<{
    success: boolean;
    users: User[];
    pagination: Pagination;
  }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    return request(`/api/admin/users?${searchParams.toString()}`);
  },

  async toggleUserStatus(id: number, is_active: boolean): Promise<{ success: boolean; message: string }> {
    return request(`/api/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active }),
    });
  },

  async getAuditLogs(page = 1, limit = 20): Promise<{
    success: boolean;
    logs: AuditLogItem[];
    pagination: Pagination;
  }> {
    return request(`/api/admin/audit-logs?page=${page}&limit=${limit}`);
  },

  // Notifications
  async getNotifications(): Promise<{
    success: boolean;
    unreadCount: number;
    notifications: NotificationItem[];
  }> {
    return request('/api/notifications');
  },

  async markNotificationRead(id: number): Promise<{ success: boolean }> {
    return request(`/api/notifications/${id}/read`, { method: 'PUT' });
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return request('/api/notifications/read-all', { method: 'PUT' });
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<any> {
    return request('/api/dashboard/stats');
  },
};
