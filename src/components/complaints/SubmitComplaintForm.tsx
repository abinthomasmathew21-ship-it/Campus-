import React, { useState, useEffect } from 'react';
import {
  FilePlus,
  Tag,
  MapPin,
  Building2,
  AlertTriangle,
  UploadCloud,
  X,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { Department } from '../../types';
import { useToast } from '../../context/ToastContext';

interface SubmitComplaintFormProps {
  onSuccess: (complaintId: number) => void;
  onCancel: () => void;
}

const CATEGORIES = [
  'Electrical Issues',
  'Classroom Maintenance',
  'Laboratory Issues',
  'Hostel Issues',
  'Water Supply',
  'Cleanliness',
  'Internet & Wi-Fi',
  'Library Issues',
  'Other',
];

export const SubmitComplaintForm: React.FC<SubmitComplaintFormProps> = ({ onSuccess, onCancel }) => {
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [location, setLocation] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getDepartments().then((res) => {
      if (res.success) {
        setDepartments(res.departments.filter((d) => d.is_active === 1));
      }
    }).catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

      if (!validTypes.includes(file.type)) {
        showToast('error', 'Invalid File', 'Only JPG, PNG, and WebP images are permitted.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast('error', 'File Too Large', 'Maximum image size is 5MB.');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !description.trim() || !location.trim()) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('location', location.trim());
      formData.append('priority', priority);
      if (departmentId) {
        formData.append('department_id', departmentId);
      }
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const res = await api.submitComplaint(formData);
      showToast(
        'success',
        'Complaint Submitted',
        `Registered as ${res.complaint.complaint_number}. Tracking initialized.`
      );
      onSuccess(res.complaint.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">Report Campus Problem</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Submit detailed problem descriptions for verification and assignment to campus maintenance staff.
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-xs">
        {errorMsg && (
          <div className="mb-5 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1">
              Complaint Title <span className="text-orange-600">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Broken overhead projector in Seminar Hall B"
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-neutral-500" />
                <span>Category</span> <span className="text-orange-600">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                <span>Specific Campus Location</span> <span className="text-orange-600">*</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Tech Block 3, 2nd Floor, Lab 204"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-neutral-500" />
                <span>Target Department (Optional)</span>
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="">Auto-Assign / General Maintenance</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-neutral-500" />
                <span>Initial Priority</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="LOW">Low (Routine convenience)</option>
                <option value="MEDIUM">Medium (Normal maintenance)</option>
                <option value="HIGH">High (Impairs academic activity)</option>
                <option value="URGENT">Urgent (Safety or critical hazard)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1">
              Detailed Description <span className="text-orange-600">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a clear, factual description of the issue, what equipment or area is affected, and when it started..."
              className="w-full p-3 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white leading-relaxed"
            />
          </div>

          {/* Photo attachment upload */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1">
              Photo Evidence / Attachment (Optional)
            </label>

            {previewUrl ? (
              <div className="relative inline-block border border-neutral-200 rounded-lg p-1.5 bg-neutral-50">
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="w-48 h-32 object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute -top-2 -right-2 p-1 bg-neutral-900 text-white rounded-full hover:bg-neutral-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-neutral-300 hover:border-orange-500 rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-neutral-50/50 hover:bg-orange-50/20">
                <UploadCloud className="w-8 h-8 text-neutral-400 mb-2" />
                <span className="text-xs font-medium text-neutral-700">
                  Click to select an image or drag &amp; drop
                </span>
                <span className="text-[11px] text-neutral-400 mt-0.5">
                  JPG, PNG, or WebP up to 5MB
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md shadow-xs disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting Issue...' : 'Submit Complaint'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
