import React, { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  Tag,
  Building,
  User,
  Star,
  CheckCircle2,
  XCircle,
  UserCheck,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { Complaint, User as UserType } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { Modal } from '../common/Modal';

interface ComplaintDetailsModalProps {
  complaintId: number | null;
  onClose: () => void;
  onComplaintUpdated: () => void;
}

export const ComplaintDetailsModal: React.FC<ComplaintDetailsModalProps> = ({
  complaintId,
  onClose,
  onComplaintUpdated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<UserType[]>([]);

  // Action states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const fetchDetails = async (id: number) => {
    try {
      setLoading(true);
      const res = await api.getComplaint(id);
      if (res.success) {
        setComplaint(res.complaint);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to load complaint details.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (complaintId) {
      fetchDetails(complaintId);
    } else {
      setComplaint(null);
    }
  }, [complaintId]);

  // Load staff list if admin
  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      api.getStaff().then((res) => {
        if (res.success) {
          setStaffList(res.staff.filter((s) => s.is_active === 1));
        }
      }).catch(() => {});
    }
  }, [user]);

  if (!complaintId) return null;

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isStudentOwner = user?.role === 'STUDENT' && user.id === complaint?.student_id;
  const isAssignedStaff =
    user?.role === 'STAFF' &&
    complaint?.assignments?.some((a) => a.staff_id === user.id);

  // Admin actions
  const handleVerify = async () => {
    try {
      await api.verifyComplaint(complaint!.id);
      showToast('success', 'Verified', `Complaint ${complaint!.complaint_number} verified.`);
      fetchDetails(complaint!.id);
      onComplaintUpdated();
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not verify complaint.');
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;
    try {
      await api.rejectComplaint(complaint!.id, rejectionReason.trim());
      showToast('info', 'Rejected', `Complaint ${complaint!.complaint_number} has been rejected.`);
      setShowRejectModal(false);
      fetchDetails(complaint!.id);
      onComplaintUpdated();
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not reject complaint.');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;
    try {
      await api.assignComplaint(complaint!.id, Number(selectedStaffId), assignNotes.trim());
      showToast('success', 'Assigned', 'Complaint assigned to staff member.');
      setShowAssignModal(false);
      setSelectedStaffId('');
      setAssignNotes('');
      fetchDetails(complaint!.id);
      onComplaintUpdated();
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not assign complaint.');
    }
  };

  const handleStartWork = async () => {
    try {
      await api.updateComplaintStatus(complaint!.id, 'IN_PROGRESS', 'Work started by staff');
      showToast('success', 'Status Updated', 'Complaint marked as In Progress.');
      fetchDetails(complaint!.id);
      onComplaintUpdated();
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not update status.');
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateComplaintStatus(complaint!.id, 'RESOLVED', resolutionNotes.trim());
      showToast('success', 'Resolved', 'Complaint marked as Resolved.');
      setShowResolveModal(false);
      setResolutionNotes('');
      fetchDetails(complaint!.id);
      onComplaintUpdated();
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not resolve complaint.');
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      await api.updateComplaintPriority(complaint!.id, newPriority);
      showToast('success', 'Priority Changed', `Updated priority to ${newPriority}.`);
      fetchDetails(complaint!.id);
      onComplaintUpdated();
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not update priority.');
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingFeedback(true);
      await api.submitFeedback(complaint!.id, feedbackRating, feedbackComment.trim());
      showToast('success', 'Feedback Submitted', 'Thank you for your rating.');
      fetchDetails(complaint!.id);
      onComplaintUpdated();
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={Boolean(complaintId)}
        onClose={onClose}
        title={complaint ? complaint.complaint_number : 'Complaint Details'}
        maxWidth="2xl"
      >
        {loading || !complaint ? (
          <div className="py-12 text-center text-xs text-neutral-400">Loading details...</div>
        ) : (
          <div className="space-y-6">
            {/* Header badges and actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <StatusBadge status={complaint.status} size="md" />
                <PriorityBadge priority={complaint.priority} size="md" />
              </div>

              {/* Admin Priority Selector */}
              {isAdmin && complaint.status !== 'RESOLVED' && complaint.status !== 'REJECTED' && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-neutral-500 font-medium">Priority:</span>
                  <select
                    value={complaint.priority}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    className="border border-neutral-200 rounded px-2 py-0.5 text-xs bg-white text-neutral-800"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              )}
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="text-base font-bold text-neutral-900 mb-1.5">{complaint.title}</h2>
              <p className="text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed bg-neutral-50 p-3.5 rounded-md border border-neutral-100">
                {complaint.description}
              </p>
            </div>

            {/* Key Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-neutral-600 bg-white p-2.5 rounded border border-neutral-200">
                <Tag className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="text-neutral-500">Category:</span>
                <span className="font-semibold text-neutral-800">{complaint.category}</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-600 bg-white p-2.5 rounded border border-neutral-200">
                <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="text-neutral-500">Location:</span>
                <span className="font-semibold text-neutral-800">{complaint.location}</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-600 bg-white p-2.5 rounded border border-neutral-200">
                <Building className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="text-neutral-500">Department:</span>
                <span className="font-semibold text-neutral-800">
                  {complaint.department_name || 'General / Unassigned'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-neutral-600 bg-white p-2.5 rounded border border-neutral-200">
                <Calendar className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="text-neutral-500">Reported On:</span>
                <span className="font-semibold text-neutral-800 font-tabular">
                  {new Date(complaint.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Reporter details */}
            <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 text-xs">
              <div className="flex items-center justify-between text-neutral-600">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-neutral-400" />
                  <span className="text-neutral-500">Submitted by:</span>
                  <span className="font-semibold text-neutral-900">{complaint.student_name}</span>
                  {complaint.student_roll_id && (
                    <span className="text-[11px] text-neutral-500 font-tabular">
                      ({complaint.student_roll_id})
                    </span>
                  )}
                </div>
                <span className="text-neutral-400">{complaint.student_email}</span>
              </div>
            </div>

            {/* Attached Image if present */}
            {complaint.image_path && (
              <div>
                <h4 className="text-xs font-semibold text-neutral-800 mb-2">Attached Image</h4>
                <div className="max-w-md border border-neutral-200 rounded-lg overflow-hidden bg-neutral-100">
                  <img
                    src={complaint.image_path}
                    alt={`Attachment for ${complaint.complaint_number}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-auto max-h-60 object-contain mx-auto"
                  />
                </div>
              </div>
            )}

            {/* Action Bar for Admin / Staff */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100">
              {isAdmin && complaint.status === 'SUBMITTED' && (
                <>
                  <button
                    type="button"
                    onClick={handleVerify}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify Complaint</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Complaint</span>
                  </button>
                </>
              )}

              {isAdmin &&
                (complaint.status === 'VERIFIED' || complaint.status === 'ASSIGNED') && (
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{complaint.status === 'ASSIGNED' ? 'Reassign Staff' : 'Assign Staff'}</span>
                  </button>
                )}

              {/* Staff Actions */}
              {(isAssignedStaff || isAdmin) && complaint.status === 'ASSIGNED' && (
                <button
                  type="button"
                  onClick={handleStartWork}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Start Work (In Progress)</span>
                </button>
              )}

              {(isAssignedStaff || isAdmin) && complaint.status === 'IN_PROGRESS' && (
                <button
                  type="button"
                  onClick={() => setShowResolveModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark as Resolved</span>
                </button>
              )}
            </div>

            {/* Rejection Reason notice if rejected */}
            {complaint.status === 'REJECTED' && complaint.rejection_reason && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Rejection Reason:</span>
                </div>
                <p>{complaint.rejection_reason}</p>
              </div>
            )}

            {/* Resolution Feedback Section */}
            {complaint.status === 'RESOLVED' && (
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs">
                <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Resolution &amp; Student Feedback</span>
                </h4>

                {complaint.feedback ? (
                  <div className="bg-white p-3 rounded border border-emerald-100">
                    <div className="flex items-center gap-1 text-amber-500 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < complaint.feedback!.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-neutral-300'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-neutral-800 ml-1 font-tabular">
                        {complaint.feedback.rating}/5
                      </span>
                    </div>
                    {complaint.feedback.comment && (
                      <p className="text-neutral-700 italic">"{complaint.feedback.comment}"</p>
                    )}
                    <span className="text-[10px] text-neutral-400 mt-1.5 block font-tabular">
                      Submitted on {new Date(complaint.feedback.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ) : isStudentOwner ? (
                  <form onSubmit={handleFeedbackSubmit} className="space-y-3 bg-white p-3 rounded border border-emerald-100">
                    <p className="text-neutral-600">
                      This issue is resolved! Please rate the service quality:
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-600 font-medium">Rating:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFeedbackRating(star)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= feedbackRating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-neutral-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Optional feedback comment on the resolution..."
                      className="w-full p-2 text-xs border border-neutral-300 rounded focus:outline-hidden focus:border-emerald-500 bg-white"
                    />
                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                    >
                      {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                  </form>
                ) : (
                  <p className="text-neutral-500 italic">No feedback provided yet by the student.</p>
                )}
              </div>
            )}

            {/* Timeline / Status History */}
            <div>
              <h4 className="text-xs font-bold text-neutral-900 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                <span>Audit Timeline &amp; Progress History</span>
              </h4>

              {complaint.history && complaint.history.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
                  {complaint.history.map((h) => (
                    <div key={h.id} className="relative text-xs">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-orange-600 ring-4 ring-white" />
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-neutral-900">
                          {h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-tabular">
                          {new Date(h.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-neutral-600 mt-0.5">{h.reason}</p>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        By {h.changed_by_name} ({h.changed_by_role})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400">No status updates recorded.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Rejection Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Complaint"
        maxWidth="md"
      >
        <form onSubmit={handleReject} className="space-y-4">
          <p className="text-xs text-neutral-600">
            Provide a mandatory reason for rejecting this complaint. The student will be notified.
          </p>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Rejection Reason <span className="text-orange-600">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Duplicate issue already being serviced, or out of scope."
              className="w-full p-2.5 text-xs border border-neutral-300 rounded focus:outline-hidden focus:border-orange-500 bg-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRejectModal(false)}
              className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded"
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Staff Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Complaint to Staff"
        maxWidth="md"
      >
        <form onSubmit={handleAssign} className="space-y-4">
          <p className="text-xs text-neutral-600">
            Select an active staff member to take responsibility for resolving this complaint.
          </p>

          {staffList.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              No active staff members registered yet. Please register staff in the Staff Directory first.
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Assignee <span className="text-orange-600">*</span>
                </label>
                <select
                  required
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full p-2 text-xs border border-neutral-300 rounded focus:outline-hidden focus:border-orange-500 bg-white"
                >
                  <option value="">Select Staff Member</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.department_name || 'General'}) — {s.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Assignment Instructions / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="e.g. Please check circuit breaker in Lab 204."
                  className="w-full p-2 text-xs border border-neutral-300 rounded focus:outline-hidden focus:border-orange-500 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStaffId}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
                >
                  Assign Staff
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Resolve Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title="Mark Issue as Resolved"
        maxWidth="md"
      >
        <form onSubmit={handleResolve} className="space-y-4">
          <p className="text-xs text-neutral-600">
            Confirm that physical work or repair has been fully completed for this complaint.
          </p>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Resolution Summary / Actions Taken
            </label>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Replaced faulty outlet and tested voltage levels. Operational."
              className="w-full p-2.5 text-xs border border-neutral-300 rounded focus:outline-hidden focus:border-emerald-500 bg-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowResolveModal(false)}
              className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded"
            >
              Confirm Resolution
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
