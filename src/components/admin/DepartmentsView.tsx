import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Check, X, RefreshCw } from 'lucide-react';
import { Department } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';

export const DepartmentsView: React.FC = () => {
  const { showToast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.getDepartments();
      if (res.success) {
        setDepartments(res.departments);
      }
    } catch {
      showToast('error', 'Error', 'Failed to load departments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreateModal = () => {
    setEditingDept(null);
    setName('');
    setDescription('');
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description || '');
    setIsActive(dept.is_active === 1);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      if (editingDept) {
        await api.updateDepartment(editingDept.id, {
          name: name.trim(),
          description: description.trim(),
          is_active: isActive,
        });
        showToast('success', 'Updated', `Department ${name} updated.`);
      } else {
        await api.createDepartment({
          name: name.trim(),
          description: description.trim(),
        });
        showToast('success', 'Created', `Department ${name} created.`);
      }
      setShowModal(false);
      fetchDepartments();
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not save department.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept: Department) => {
    if (!confirm(`Are you sure you want to delete department "${dept.name}"?`)) return;

    try {
      const res = await api.deleteDepartment(dept.id);
      showToast('success', 'Deleted', res.message || 'Department deleted.');
      fetchDepartments();
    } catch (err: any) {
      showToast('error', 'Cannot Delete', err.message || 'Failed to delete department.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Campus Departments</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure academic and facility divisions responsible for handling campus complaints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDepartments}
            className="p-2 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-md text-neutral-600 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Department</span>
          </button>
        </div>
      </div>

      {/* Departments Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-neutral-400">Loading departments...</div>
      ) : departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments registered yet"
          description="Create your first department (e.g. Electrical, Civil & Maintenance, Computer Science, Hostel Management) to assign staff and route complaints."
          actionText="Create First Department"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-semibold">
                  <th className="py-3 px-4">Department Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 font-tabular">Staff Count</th>
                  <th className="py-3 px-4 font-tabular">Complaints</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-neutral-900">{d.name}</td>
                    <td className="py-3 px-4 text-neutral-600 max-w-sm truncate">
                      {d.description || <span className="text-neutral-400 italic">None</span>}
                    </td>
                    <td className="py-3 px-4 font-tabular text-neutral-700">
                      {d.staff_count || 0}
                    </td>
                    <td className="py-3 px-4 font-tabular text-neutral-700">
                      {d.complaint_count || 0}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                          d.is_active === 1
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                        }`}
                      >
                        {d.is_active === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(d)}
                          className="p-1 text-neutral-500 hover:text-neutral-800 rounded hover:bg-neutral-100"
                          title="Edit department"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d)}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50"
                          title="Delete department"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Department Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingDept ? 'Edit Department' : 'Create New Department'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Department Name <span className="text-orange-600">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electrical & Power Systems"
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-hidden focus:border-orange-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope of work and responsibilities..."
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-hidden focus:border-orange-500 bg-white"
            />
          </div>

          {editingDept && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dept_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
              />
              <label htmlFor="dept_active" className="text-xs text-neutral-700">
                Department is active and accepting complaints
              </label>
            </div>
          )}

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
              {saving ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
