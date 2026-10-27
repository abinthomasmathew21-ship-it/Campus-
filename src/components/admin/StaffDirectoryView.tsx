import React, { useState, useEffect } from 'react';
import { Users2, UserPlus, Shield, RefreshCw, Power } from 'lucide-react';
import { User, Department } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';

export const StaffDirectoryView: React.FC = () => {
  const { showToast } = useToast();
  const [staffList, setStaffList] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Register modal
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, deptRes] = await Promise.all([
        api.getStaff(),
        api.getDepartments(),
      ]);

      if (staffRes.success) setStaffList(staffRes.staff);
      if (deptRes.success) setDepartments(deptRes.departments.filter((d) => d.is_active === 1));
    } catch {
      showToast('error', 'Error', 'Failed to retrieve staff directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setDepartmentId(departments.length > 0 ? String(departments[0].id) : '');
    setShowModal(true);
  };

  const handleRegisterStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password || !departmentId) {
      showToast('error', 'Validation', 'All fields are required.');
      return;
    }

    try {
      setSaving(true);
      await api.createStaff({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        department_id: Number(departmentId),
      });
      showToast('success', 'Staff Registered', `Account created for ${fullName}.`);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not register staff member.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (staff: User) => {
    const nextStatus = staff.is_active === 1 ? false : true;
    try {
      await api.toggleUserStatus(staff.id, nextStatus);
      showToast(
        'success',
        'Status Changed',
        `${staff.full_name} is now ${nextStatus ? 'active' : 'deactivated'}.`
      );
      fetchData();
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not change status.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Staff Directory</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Register and manage authorized maintenance personnel assigned to facility repair queues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            className="p-2 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-md text-neutral-600 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Staff Member</span>
          </button>
        </div>
      </div>

      {/* Staff Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-neutral-400">Loading staff directory...</div>
      ) : staffList.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No staff members registered yet"
          description="Register your first staff member with an assigned department to start delegating and resolving complaints."
          actionText="Register First Staff Member"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-semibold">
                  <th className="py-3 px-4">Staff Name</th>
                  <th className="py-3 px-4">Official Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 font-tabular">Active Tasks</th>
                  <th className="py-3 px-4 font-tabular">Completed Tasks</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-neutral-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-[10px] shrink-0 font-tabular">
                        {s.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span>{s.full_name}</span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">{s.email}</td>
                    <td className="py-3 px-4 font-medium text-neutral-800">
                      {s.department_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 font-tabular font-semibold text-amber-700">
                      {s.active_assignments_count || 0}
                    </td>
                    <td className="py-3 px-4 font-tabular font-semibold text-emerald-700">
                      {s.resolved_count || 0}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                          s.is_active === 1
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {s.is_active === 1 ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(s)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                          s.is_active === 1
                            ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                            : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{s.is_active === 1 ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Staff Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Register New Staff Member"
        maxWidth="md"
      >
        <form onSubmit={handleRegisterStaff} className="space-y-4">
          {departments.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              Please create at least one department first before registering staff.
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Full Name <span className="text-orange-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Miller"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-hidden focus:border-orange-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Official Email Address <span className="text-orange-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. jmiller@college.edu"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-hidden focus:border-orange-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Assigned Department <span className="text-orange-600">*</span>
                </label>
                <select
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-hidden focus:border-orange-500 bg-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Initial Password <span className="text-orange-600">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-hidden focus:border-orange-500 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded shadow-xs"
                >
                  {saving ? 'Creating Account...' : 'Register Staff'}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
};
