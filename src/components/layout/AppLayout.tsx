import React, { useState } from 'react';
import {
  LayoutDashboard,
  FilePlus,
  ListOrdered,
  Building2,
  Users2,
  GraduationCap,
  History,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../common/BrandLogo';
import { NotificationPanel } from '../common/NotificationPanel';

export type ActiveTab =
  | 'dashboard'
  | 'submit-complaint'
  | 'my-complaints'
  | 'assigned-complaints'
  | 'all-complaints'
  | 'departments'
  | 'staff'
  | 'users'
  | 'audit-logs';

interface AppLayoutProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  children: React.ReactNode;
  onSelectComplaint?: (id: number) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onTabChange,
  children,
  onSelectComplaint,
}) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return <>{children}</>;

  const isStudent = user.role === 'STUDENT';
  const isStaff = user.role === 'STAFF';
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      id: 'submit-complaint' as ActiveTab,
      label: 'Report Issue',
      icon: FilePlus,
      show: isStudent,
    },
    {
      id: 'my-complaints' as ActiveTab,
      label: 'My Complaints',
      icon: ListOrdered,
      show: isStudent,
    },
    {
      id: 'assigned-complaints' as ActiveTab,
      label: 'Assigned Work',
      icon: CheckCircle2,
      show: isStaff,
    },
    {
      id: 'all-complaints' as ActiveTab,
      label: 'Complaints',
      icon: ListOrdered,
      show: isAdmin,
    },
    {
      id: 'departments' as ActiveTab,
      label: 'Departments',
      icon: Building2,
      show: isAdmin,
    },
    {
      id: 'staff' as ActiveTab,
      label: 'Staff Directory',
      icon: Users2,
      show: isAdmin,
    },
    {
      id: 'users' as ActiveTab,
      label: 'Students & Users',
      icon: GraduationCap,
      show: isAdmin,
    },
    {
      id: 'audit-logs' as ActiveTab,
      label: 'Audit Trail',
      icon: History,
      show: isAdmin,
    },
  ].filter((item) => item.show);

  const handleNavClick = (tabId: ActiveTab) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-neutral-200 shrink-0">
        <div className="p-5 border-b border-neutral-200">
          <BrandLogo size="md" showTagline />
        </div>

        {/* User Role Tag */}
        <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/60 flex items-center gap-2 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
          <span className="text-neutral-500 font-medium">Logged in as:</span>
          <span className="font-semibold text-neutral-800">
            {user.role === 'SUPER_ADMIN'
              ? 'Super Admin'
              : user.role === 'ADMIN'
              ? 'Administrator'
              : user.role === 'STAFF'
              ? 'Staff'
              : 'Student'}
          </span>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-orange-50 text-orange-700 font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-orange-600' : 'text-neutral-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-neutral-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-200 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0 font-tabular">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-neutral-900 truncate">
                {user.full_name}
              </p>
              <p className="text-[11px] text-neutral-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200 sticky top-0 z-30">
        <BrandLogo size="sm" />
        <div className="flex items-center gap-2">
          <NotificationPanel onSelectComplaint={onSelectComplaint} />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-neutral-600 hover:text-neutral-900 rounded-md hover:bg-neutral-100"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-neutral-900/30 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80%] bg-white h-full flex flex-col shadow-xl z-50">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <BrandLogo size="sm" showTagline />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-orange-50 text-orange-700 font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-orange-600" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-neutral-200 flex items-center justify-between">
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-neutral-900 truncate">
                  {user.full_name}
                </p>
                <p className="text-[11px] text-neutral-500 truncate">{user.role}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-md"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-white border-b border-neutral-200 sticky top-0 z-20">
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="font-semibold text-neutral-900 capitalize">
              {activeTab.replace('-', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationPanel onSelectComplaint={onSelectComplaint} />
            <div className="h-4 w-px bg-neutral-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-xs font-tabular">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-neutral-800">{user.full_name}</span>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
};
