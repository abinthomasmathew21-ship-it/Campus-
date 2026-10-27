import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { InitialAdminSetup } from './components/auth/InitialAdminSetup';
import { AuthScreen } from './components/auth/AuthScreen';
import { AppLayout, ActiveTab } from './components/layout/AppLayout';
import { BrandLogo } from './components/common/BrandLogo';
import { api } from './services/api';

// Dashboards
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import { StaffDashboard } from './components/dashboard/StaffDashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';

// Complaints
import { SubmitComplaintForm } from './components/complaints/SubmitComplaintForm';
import { ComplaintsListView } from './components/complaints/ComplaintsListView';
import { ComplaintDetailsModal } from './components/complaints/ComplaintDetailsModal';

// Admin Views
import { DepartmentsView } from './components/admin/DepartmentsView';
import { StaffDirectoryView } from './components/admin/StaffDirectoryView';
import { UsersView } from './components/admin/UsersView';
import { AuditTrailView } from './components/admin/AuditTrailView';

function MainApp() {
  const { user, loading, needsSetup } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | null>(null);

  // Live dashboard data
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const fetchDashboardStats = async () => {
    if (!user) return;
    try {
      setLoadingDashboard(true);
      const res = await api.getDashboardStats();
      if (res.success) {
        setDashboardData(res);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (user && activeTab === 'dashboard') {
      fetchDashboardStats();
    }
  }, [user, activeTab]);

  // Handle default tab for user roles
  useEffect(() => {
    setActiveTab('dashboard');
  }, [user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
        <BrandLogo size="lg" showTagline />
        <div className="mt-6 flex items-center gap-2 text-xs text-neutral-500">
          <div className="w-3.5 h-3.5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <span>Connecting to campus database...</span>
        </div>
      </div>
    );
  }

  // Initial Administrator Setup Screen when DB has 0 admins
  if (needsSetup) {
    return <InitialAdminSetup />;
  }

  // Not signed in: Auth screen
  if (!user) {
    return <AuthScreen />;
  }

  const isStudent = user.role === 'STUDENT';
  const isStaff = user.role === 'STAFF';
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSelectComplaint={(id) => setSelectedComplaintId(id)}
    >
      {/* Tab: Dashboard */}
      {activeTab === 'dashboard' && (
        <>
          {loadingDashboard && !dashboardData ? (
            <div className="p-12 text-center text-xs text-neutral-400">Loading dashboard...</div>
          ) : isStudent ? (
            <StudentDashboard
              stats={dashboardData?.stats || { total: 0, pending: 0, in_progress: 0, resolved: 0, rejected: 0 }}
              recentComplaints={dashboardData?.recentComplaints || []}
              onNavigateSubmit={() => setActiveTab('submit-complaint')}
              onNavigateList={() => setActiveTab('my-complaints')}
              onSelectComplaint={(id) => setSelectedComplaintId(id)}
            />
          ) : isStaff ? (
            <StaffDashboard
              stats={dashboardData?.stats || { total_assigned: 0, assigned: 0, in_progress: 0, resolved: 0 }}
              recentAssignments={dashboardData?.recentAssignments || []}
              onNavigateList={() => setActiveTab('assigned-complaints')}
              onSelectComplaint={(id) => setSelectedComplaintId(id)}
            />
          ) : (
            <AdminDashboard
              stats={
                dashboardData?.stats || {
                  total_complaints: 0,
                  pending_verification: 0,
                  verified: 0,
                  active_resolution: 0,
                  resolved: 0,
                  rejected: 0,
                  total_students: 0,
                  total_staff: 0,
                  total_admins: 0,
                  total_departments: 0,
                }
              }
              categoryBreakdown={dashboardData?.categoryBreakdown || []}
              priorityBreakdown={dashboardData?.priorityBreakdown || []}
              recentComplaints={dashboardData?.recentComplaints || []}
              recentAudits={dashboardData?.recentAudits || []}
              onNavigateComplaints={() => setActiveTab('all-complaints')}
              onNavigateStaff={() => setActiveTab('staff')}
              onNavigateDepartments={() => setActiveTab('departments')}
              onNavigateAudit={() => setActiveTab('audit-logs')}
              onSelectComplaint={(id) => setSelectedComplaintId(id)}
            />
          )}
        </>
      )}

      {/* Tab: Submit Complaint */}
      {activeTab === 'submit-complaint' && isStudent && (
        <SubmitComplaintForm
          onSuccess={(id) => {
            setActiveTab('my-complaints');
            setSelectedComplaintId(id);
          }}
          onCancel={() => setActiveTab('dashboard')}
        />
      )}

      {/* Tab: My Complaints (Student) */}
      {activeTab === 'my-complaints' && isStudent && (
        <ComplaintsListView
          mode="student"
          onSelectComplaint={(id) => setSelectedComplaintId(id)}
          onNavigateSubmit={() => setActiveTab('submit-complaint')}
        />
      )}

      {/* Tab: Assigned Complaints (Staff) */}
      {activeTab === 'assigned-complaints' && isStaff && (
        <ComplaintsListView
          mode="staff"
          onSelectComplaint={(id) => setSelectedComplaintId(id)}
        />
      )}

      {/* Tab: All Complaints (Admin) */}
      {activeTab === 'all-complaints' && isAdmin && (
        <ComplaintsListView
          mode="admin"
          onSelectComplaint={(id) => setSelectedComplaintId(id)}
        />
      )}

      {/* Tab: Departments (Admin) */}
      {activeTab === 'departments' && isAdmin && <DepartmentsView />}

      {/* Tab: Staff Directory (Admin) */}
      {activeTab === 'staff' && isAdmin && <StaffDirectoryView />}

      {/* Tab: Students & Users (Admin) */}
      {activeTab === 'users' && isAdmin && <UsersView />}

      {/* Tab: Audit Logs (Admin) */}
      {activeTab === 'audit-logs' && isAdmin && <AuditTrailView />}

      {/* Complaint Details Modal */}
      <ComplaintDetailsModal
        complaintId={selectedComplaintId}
        onClose={() => setSelectedComplaintId(null)}
        onComplaintUpdated={() => {
          fetchDashboardStats();
        }}
      />
    </AppLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
