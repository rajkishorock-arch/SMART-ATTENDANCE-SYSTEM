import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RefreshCw,
  Plus,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Trash2,
  UploadCloud,
  Send,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { leaveApi } from '../../api/leaveApi';
import { disputeApi } from '../../api/disputeApi';
import { generateLeavePdf } from '../../utils/leavePdfGenerator';
import { generateDisputePdf } from '../../utils/disputePdfGenerator';
import { getApiBaseUrl } from '../../utils/platform';

const PERIOD_SLOTS = [
  'Period 1 (09:00 - 10:00 AM)',
  'Period 2 (10:00 - 11:00 AM)',
  'Period 3 (11:00 - 12:00 PM)',
  'Period 4 (12:00 - 01:00 PM)',
  'Period 5 (01:00 - 02:00 PM)',
  'Period 6 (02:00 - 03:00 PM)',
  'Period 7 (03:00 - 04:00 PM)',
  'Period 8 (04:00 - 05:00 PM)',
];

const DISPUTE_REASONS = [
  'Face recognition failure',
  'QR failure',
  'Network failure',
  'Device failure',
  'Teacher marked incorrectly',
  'Present but marked absent',
  'Absent but marked present',
  'Medical reason',
  'Official activity',
  'Technical problem',
  'Other',
];

const LEAVE_TYPE_OPTIONS = ['Medical', 'Personal', 'Official', 'Family Emergency', 'Other'];

const getLocalTodayIso = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toIsoDateInput = (rawDate) => {
  if (!rawDate) return getLocalTodayIso();
  const str = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return getLocalTodayIso();
};

const resolvePrefillPeriodSlot = (prefill) => {
  const raw = String(prefill?.period_label || prefill?.session_time || prefill?.time || '').trim();
  if (!raw) return '';
  if (PERIOD_SLOTS.includes(raw)) return raw;
  const upper = raw.toUpperCase();
  const slotMap = [
    ['PERIOD 1', '09:', PERIOD_SLOTS[0]],
    ['PERIOD 2', '10:', PERIOD_SLOTS[1]],
    ['PERIOD 3', '11:', PERIOD_SLOTS[2]],
    ['PERIOD 4', '12:', PERIOD_SLOTS[3]],
    ['PERIOD 5', '13:', PERIOD_SLOTS[4]],
    ['PERIOD 6', '14:', PERIOD_SLOTS[5]],
    ['PERIOD 7', '15:', PERIOD_SLOTS[6]],
    ['PERIOD 8', '16:', PERIOD_SLOTS[7]],
  ];
  for (const [pTag, hTag, slot] of slotMap) {
    if (upper.includes(pTag) || upper.startsWith(hTag)) return slot;
  }
  return raw;
};

const getLeaveShortCode = (leaveType) => {
  const clean = String(leaveType || 'LV').trim().toUpperCase();
  if (clean.startsWith('MED')) return 'MED';
  if (clean.startsWith('PER')) return 'PER';
  if (clean.startsWith('OFF')) return 'OFF';
  if (clean.startsWith('FAM')) return 'FAM';
  return 'LV';
};

const formatDisputeStatus = (status) => {
  const s = String(status || 'SUBMITTED').toUpperCase();
  if (s === 'APPROVED') return 'Approved';
  if (s === 'REJECTED') return 'Rejected';
  if (s === 'UNDER_REVIEW') return 'Under Review';
  if (s === 'NEEDS_INFORMATION') return 'Info Needed';
  if (s === 'CANCELLED') return 'Cancelled';
  return 'Submitted';
};

const getStatusTextColor = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return '#047857';
  if (s === 'rejected') return '#dc2626';
  if (s === 'cancelled') return '#6b7280';
  if (s === 'under_review') return '#6d28d9';
  return '#b45309';
};

/**
 * Golden Gate Master-Detail Workspace for Student Leave Applications & Attendance Disputes.
 * No macOS 3-dot bars and no boxed status pills on list rows.
 */
export default function StudentLeaveDisputesHub({
  token,
  API_BASE_URL,
  currentUser,
  subjects = [],
  studentLeaveRequests = [],
  onUpdateLeaveRequests,
  myDisputes = [],
  onUpdateDisputes,
  onRefreshLeaves,
  onRefreshDisputes,
  routeView = null,
  onNavigateRoute,
  onNavigateBack,
  playCyberSound = () => {},
}) {
  const activeApiUrl = useMemo(() => {
    let url = API_BASE_URL || getApiBaseUrl();
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:')) {
      url = url.replace('http:', 'https:');
    }
    return url.replace(/\/+$/, '');
  }, [API_BASE_URL]);

  const safeSubjects = useMemo(() => (Array.isArray(subjects) ? subjects : []), [subjects]);
  const mode = routeView?.mode || 'list';

  const [listFilter, setListFilter] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [banner, setBanner] = useState(null); // { type: 'success' | 'error', text: string }

  // Apply Leave Form State (supports prefill when opened from Calendar Date Breakdown)
  const prefill = routeView?.prefill || null;
  const leaveResetSig = `${mode}|${prefill?.fromDate || prefill?.start_date || ''}|${prefill?.toDate || prefill?.end_date || ''}|${prefill?.subjectId || prefill?.subject_id || ''}`;
  const [appliedLeaveSig, setAppliedLeaveSig] = useState(leaveResetSig);
  const [leaveForm, setLeaveForm] = useState({
    start_date: toIsoDateInput(prefill?.fromDate || prefill?.start_date),
    end_date: toIsoDateInput(prefill?.toDate || prefill?.end_date),
    leave_type: 'Medical',
    subject_id: prefill?.subjectId ? String(prefill.subjectId) : (prefill?.subject_id ? String(prefill.subject_id) : ''),
    reason: '',
  });
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  if (mode === 'apply-leave' && appliedLeaveSig !== leaveResetSig) {
    setAppliedLeaveSig(leaveResetSig);
    setLeaveForm({
      start_date: toIsoDateInput(prefill?.fromDate || prefill?.start_date),
      end_date: toIsoDateInput(prefill?.toDate || prefill?.end_date),
      leave_type: 'Medical',
      subject_id: prefill?.subjectId ? String(prefill.subjectId) : (prefill?.subject_id ? String(prefill.subject_id) : ''),
      reason: '',
    });
    setBanner(null);
  }

  // Request Dispute Form State (prefillKey ensures fresh form state cleanly when prefill or mode changes)
  const formResetSignature = `${mode}|${prefill?.date || ''}|${prefill?.subject_id || ''}|${prefill?.time || prefill?.period_label || prefill?.session_time || ''}|${prefill?.attendance || ''}`;
  const [appliedDisputeSig, setAppliedDisputeSig] = useState(formResetSignature);
  const [disputeDate, setDisputeDate] = useState(() => toIsoDateInput(prefill?.date));
  const [sessionTime, setSessionTime] = useState(() => resolvePrefillPeriodSlot(prefill));
  const [selectedSubjectId, setSelectedSubjectId] = useState(() => (prefill?.subject_id ? String(prefill.subject_id) : ''));
  const [originalStatus, setOriginalStatus] = useState(() => prefill?.attendance || 'Absent');
  const [requestedStatus, setRequestedStatus] = useState('Present');
  const [disputeReason, setDisputeReason] = useState(DISPUTE_REASONS[0]);
  const [disputeDescription, setDisputeDescription] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  if (mode === 'apply-dispute' && appliedDisputeSig !== formResetSignature) {
    setAppliedDisputeSig(formResetSignature);
    setDisputeDate(toIsoDateInput(prefill?.date));
    setSessionTime(resolvePrefillPeriodSlot(prefill));
    setSelectedSubjectId(prefill?.subject_id ? String(prefill.subject_id) : '');
    setOriginalStatus(prefill?.attendance || 'Absent');
    setRequestedStatus('Present');
    setDisputeDescription('');
    setProofFile(null);
    setBanner(null);
  }

  // Detail Actions State (reset synchronously during render when detail record key changes — avoids cascading effects)
  const detailRouteKey = `${mode}|${routeView?.id ?? ''}`;
  const [activeDetailKey, setActiveDetailKey] = useState(detailRouteKey);
  const [confirmWithdrawType, setConfirmWithdrawType] = useState(null); // 'leave' | 'dispute' | null
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [fetchedDispute, setFetchedDispute] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  if (activeDetailKey !== detailRouteKey) {
    setActiveDetailKey(detailRouteKey);
    setConfirmWithdrawType(null);
    setFetchedDispute(null);
    setCommentInput('');
  }

  // Deep-link fallback fetch when visiting dispute-detail before list contains item
  const detailDisputeId = mode === 'dispute-detail' ? routeView?.id : null;
  const matchedDispute = useMemo(
    () => (detailDisputeId ? myDisputes.find(d => String(d.id) === String(detailDisputeId)) : null),
    [myDisputes, detailDisputeId]
  );

  useEffect(() => {
    let ignore = false;
    if (token && detailDisputeId && !matchedDispute && !routeView?.item) {
      disputeApi.fetchDispute(token, detailDisputeId)
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (!ignore && data) setFetchedDispute(data);
        })
        .catch(() => {});
    }
    return () => {
      ignore = true;
    };
  }, [token, detailDisputeId, matchedDispute, routeView?.item]);

  const sortedLeaves = useMemo(() => {
    return [...(Array.isArray(studentLeaveRequests) ? studentLeaveRequests : [])].sort((a, b) => {
      const idDiff = Number(b?.id || 0) - Number(a?.id || 0);
      if (idDiff !== 0) return idDiff;
      return String(b?.start_date || '').localeCompare(String(a?.start_date || ''));
    });
  }, [studentLeaveRequests]);

  const sortedDisputes = useMemo(() => {
    return [...(Array.isArray(myDisputes) ? myDisputes : [])].sort((a, b) => {
      return Number(b?.id || 0) - Number(a?.id || 0);
    });
  }, [myDisputes]);

  const handleRefreshAll = useCallback(async () => {
    if (playCyberSound) playCyberSound('click');
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        onRefreshLeaves ? onRefreshLeaves(token) : Promise.resolve(),
        onRefreshDisputes ? onRefreshDisputes(token) : Promise.resolve(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [playCyberSound, onRefreshLeaves, onRefreshDisputes, token]);

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason.trim()) {
      setBanner({ type: 'error', text: 'Please select start date, end date, and enter a reason.' });
      return;
    }
    if (leaveForm.end_date < leaveForm.start_date) {
      setBanner({ type: 'error', text: 'End date cannot be earlier than start date.' });
      return;
    }
    setIsSubmittingLeave(true);
    setBanner(null);
    if (playCyberSound) playCyberSound('click');

    try {
      const res = await leaveApi.submitStudentLeaveRequest(token, {
        ...leaveForm,
        subject_id: leaveForm.subject_id ? parseInt(leaveForm.subject_id, 10) : null,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = typeof data?.detail === 'string' ? data.detail : 'Failed to submit leave request.';
        setBanner({ type: 'error', text: msg });
        return;
      }

      if (data && data.id && onUpdateLeaveRequests) {
        onUpdateLeaveRequests(prev => [data, ...(Array.isArray(prev) ? prev.filter(r => r.id !== data.id) : [])]);
      } else if (onRefreshLeaves) {
        await onRefreshLeaves(token);
      }

      setLeaveForm({ start_date: '', end_date: '', leave_type: 'Medical', subject_id: '', reason: '' });
      setBanner({ type: 'success', text: `Leave request${data?.id ? ` #${data.id}` : ''} submitted successfully.` });
      if (playCyberSound) playCyberSound('success');
      if (onNavigateRoute) onNavigateRoute({ section: 'disputes' });
    } catch {
      setBanner({ type: 'error', text: 'Network error while submitting leave request.' });
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleProofFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setBanner({ type: 'error', text: 'Proof file must be smaller than 5MB.' });
      return;
    }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) {
      setBanner({ type: 'error', text: 'Only JPG, PNG, and PDF files are allowed.' });
      return;
    }
    setBanner(null);
    setProofFile(file);
  };

  const handleSubmitDispute = async (e) => {
    e.preventDefault();
    if (!disputeDate || !disputeReason) {
      setBanner({ type: 'error', text: 'Please select a date and dispute reason.' });
      return;
    }
    setIsSubmittingDispute(true);
    setBanner(null);
    if (playCyberSound) playCyberSound('click');

    try {
      let formattedDate = disputeDate.trim();
      if (formattedDate.includes('-')) {
        const parts = formattedDate.split('-');
        if (parts.length === 3) {
          formattedDate = `${String(parts[2]).padStart(2, '0')}/${String(parts[1]).padStart(2, '0')}/${parts[0]}`;
        }
      }

      const formData = new FormData();
      formData.append('date', formattedDate);
      if (sessionTime) formData.append('session_time', sessionTime.trim());
      if (selectedSubjectId) {
        const numId = parseInt(selectedSubjectId, 10);
        if (!Number.isNaN(numId)) formData.append('subject_id', numId);
      }
      formData.append('original_status', originalStatus);
      formData.append('requested_status', requestedStatus);
      formData.append('reason', disputeReason);
      if (disputeDescription.trim()) formData.append('description', disputeDescription.trim());
      if (proofFile) formData.append('proof', proofFile);

      const res = await fetch(`${activeApiUrl}/disputes`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        let detailMsg = 'Failed to submit dispute.';
        if (typeof data.detail === 'string') {
          detailMsg = data.detail;
        } else if (Array.isArray(data.detail)) {
          detailMsg = data.detail.map(d => d.msg || d.detail || JSON.stringify(d)).join(', ');
        } else if (data.detail && typeof data.detail === 'object') {
          detailMsg = JSON.stringify(data.detail);
        }
        throw new Error(detailMsg);
      }

      if (data && data.id && onUpdateDisputes) {
        onUpdateDisputes(prev => [data, ...(Array.isArray(prev) ? prev.filter(d => d.id !== data.id) : [])]);
      } else if (onRefreshDisputes) {
        await onRefreshDisputes(token);
      }

      setDisputeDescription('');
      setProofFile(null);
      setBanner({ type: 'success', text: `Attendance dispute${data?.id ? ` #${data.id}` : ''} submitted successfully.` });
      if (playCyberSound) playCyberSound('success');
      if (onNavigateRoute) onNavigateRoute({ section: 'disputes' });
    } catch (err) {
      let errorText = err.message || 'Error submitting dispute.';
      if (errorText === 'Failed to fetch' || errorText.includes('fetch')) {
        errorText = 'Network connection to backend server failed. Please try again.';
      }
      setBanner({ type: 'error', text: errorText });
      if (playCyberSound) playCyberSound('error');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const handleWithdrawLeave = async (leaveId) => {
    setIsProcessingAction(true);
    setBanner(null);
    if (playCyberSound) playCyberSound('click');
    try {
      const res = await leaveApi.cancelStudentLeaveRequest(token, leaveId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({ type: 'error', text: data.detail || 'Could not withdraw leave request.' });
        return;
      }
      if (onUpdateLeaveRequests) {
        onUpdateLeaveRequests(prev => (Array.isArray(prev) ? prev.filter(r => String(r.id) !== String(leaveId)) : []));
      }
      setConfirmWithdrawType(null);
      setBanner({ type: 'success', text: `Leave request #${leaveId} withdrawn.` });
      if (playCyberSound) playCyberSound('success');
      if (onNavigateRoute) onNavigateRoute({ section: 'disputes' });
    } catch {
      setBanner({ type: 'error', text: 'Failed to withdraw leave request.' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCancelDispute = async (disputeId) => {
    setIsProcessingAction(true);
    setBanner(null);
    if (playCyberSound) playCyberSound('click');
    try {
      const res = await disputeApi.cancelDispute(token, disputeId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({ type: 'error', text: data.detail || 'Could not cancel dispute request.' });
        return;
      }
      if (onUpdateDisputes) {
        onUpdateDisputes(prev =>
          Array.isArray(prev)
            ? prev.map(d => (String(d.id) === String(disputeId) ? { ...d, status: 'CANCELLED' } : d))
            : []
        );
      }
      setConfirmWithdrawType(null);
      setBanner({ type: 'success', text: `Dispute #${disputeId} has been cancelled.` });
      if (playCyberSound) playCyberSound('success');
    } catch {
      setBanner({ type: 'error', text: 'Failed to cancel dispute.' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handlePostComment = async (dispute) => {
    if (!commentInput.trim()) return;
    setIsPostingComment(true);
    setBanner(null);
    try {
      const res = await disputeApi.addDisputeComment(token, dispute.id, { message: commentInput.trim() });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to send reply.');
      }
      const savedComment = await res.json();
      setCommentInput('');
      if (onUpdateDisputes) {
        onUpdateDisputes(prev =>
          Array.isArray(prev)
            ? prev.map(d =>
                String(d.id) === String(dispute.id)
                  ? { ...d, comments: [...(d.comments || []), savedComment] }
                  : d
              )
            : []
        );
      }
    } catch (err) {
      setBanner({ type: 'error', text: err.message || 'Could not post reply.' });
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleOpenProof = async (disputeId) => {
    setBanner(null);
    try {
      const res = await fetch(`${activeApiUrl}/disputes/${disputeId}/proof`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Unavailable');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      setBanner({ type: 'error', text: 'Could not open proof document.' });
    }
  };

  const renderBanner = () =>
    banner ? (
      <div role={banner.type === 'error' ? 'alert' : 'status'} className={`feedback-banner ${banner.type === 'error' ? 'is-error' : 'is-success'}`}>
        {banner.type === 'error' ? <AlertCircle size={16} style={{ flexShrink: 0 }} /> : <CheckCircle2 size={16} style={{ flexShrink: 0 }} />}
        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{banner.text}</span>
      </div>
    ) : null;

  /* ===== SUB-PAGE 1: DEDICATED APPLY FOR LEAVE PAGE ===== */
  if (mode === 'apply-leave') {
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {renderBanner()}
            <form onSubmit={handleSubmitLeave} className="golden-os-form-section">
              <div className="golden-os-form-section-title">Leave Application Form</div>

              <div className="golden-os-fields-2">
                <div>
                  <label className="golden-os-field-label">From Date *</label>
                  <input
                    type="date"
                    className="golden-os-input"
                    value={leaveForm.start_date}
                    onChange={e => setLeaveForm(p => ({ ...p, start_date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="golden-os-field-label">To Date *</label>
                  <input
                    type="date"
                    className="golden-os-input"
                    value={leaveForm.end_date}
                    onChange={e => setLeaveForm(p => ({ ...p, end_date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="golden-os-fields-2">
                <div>
                  <label className="golden-os-field-label">Leave Type</label>
                  <select
                    className="golden-os-input"
                    value={leaveForm.leave_type}
                    onChange={e => setLeaveForm(p => ({ ...p, leave_type: e.target.value }))}
                  >
                    {LEAVE_TYPE_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="golden-os-field-label">Subject (Optional)</label>
                  <select
                    className="golden-os-input"
                    value={leaveForm.subject_id}
                    onChange={e => setLeaveForm(p => ({ ...p, subject_id: e.target.value }))}
                  >
                    <option value="">Personal / General Leave (All Subjects)</option>
                    {safeSubjects.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} {sub.code ? `(${sub.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="golden-os-field-label">Reason for Leave *</label>
                <textarea
                  rows={3}
                  className="golden-os-input"
                  value={leaveForm.reason}
                  onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Briefly explain your reason for leave..."
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    setBanner(null);
                    if (onNavigateBack) onNavigateBack();
                  }}
                  className="golden-os-feedback-filter-btn"
                  style={{ width: 'auto', padding: '10px 16px', borderRadius: '11px', flexShrink: 0 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLeave}
                  style={{
                    width: 'auto',
                    flex: 1,
                    padding: '10px 18px',
                    borderRadius: '11px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: isSubmittingLeave ? 'not-allowed' : 'pointer',
                    background: isSubmittingLeave ? '#b8a98c' : 'linear-gradient(135deg, #785927, #684c20)',
                    color: '#ffffff',
                    boxShadow: isSubmittingLeave ? 'none' : '0 2px 8px rgba(104, 76, 32, 0.25)',
                  }}
                >
                  {isSubmittingLeave ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ===== SUB-PAGE 2: DEDICATED REQUEST ATTENDANCE DISPUTE PAGE ===== */
  if (mode === 'apply-dispute') {
    const hasCustomSlot = Boolean(sessionTime && !PERIOD_SLOTS.includes(sessionTime));
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {renderBanner()}
            <form onSubmit={handleSubmitDispute} className="golden-os-form-section">
              <div className="golden-os-form-section-title">Attendance Correction Request</div>

              <div className="golden-os-fields-2">
                <div>
                  <label className="golden-os-field-label">Attendance Date *</label>
                  <input
                    type="date"
                    className="golden-os-input"
                    value={disputeDate}
                    onChange={e => setDisputeDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="golden-os-field-label">Session Time / Period *</label>
                  <select
                    className="golden-os-input"
                    value={sessionTime}
                    onChange={e => setSessionTime(e.target.value)}
                    required
                  >
                    <option value="">Select Period / Class Slot</option>
                    {hasCustomSlot && <option value={sessionTime}>{sessionTime}</option>}
                    {PERIOD_SLOTS.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="golden-os-fields-2">
                <div>
                  <label className="golden-os-field-label">Subject / Class</label>
                  <select
                    className="golden-os-input"
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                  >
                    <option value="">General Class (All Subjects)</option>
                    {safeSubjects.map((s, idx) => {
                      const sid = s.id ?? s.subject_id ?? '';
                      const sname = s.name ?? s.subject_name ?? 'Subject';
                      const scode = s.code ?? s.subject_code ?? '';
                      return (
                        <option key={sid || idx} value={sid}>
                          {sname} {scode ? `(${scode})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="golden-os-field-label">Dispute Reason Category *</label>
                  <select
                    className="golden-os-input"
                    value={disputeReason}
                    onChange={e => setDisputeReason(e.target.value)}
                    required
                  >
                    {DISPUTE_REASONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="golden-os-fields-2">
                <div>
                  <label className="golden-os-field-label">Current Recorded Status</label>
                  <select
                    className="golden-os-input"
                    value={originalStatus}
                    onChange={e => setOriginalStatus(e.target.value)}
                  >
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                    <option value="Present">Present (Incorrect class)</option>
                  </select>
                </div>
                <div>
                  <label className="golden-os-field-label">Requested Correction *</label>
                  <select
                    className="golden-os-input"
                    value={requestedStatus}
                    onChange={e => setRequestedStatus(e.target.value)}
                    required
                  >
                    <option value="Present">Mark as Present</option>
                    <option value="Late">Mark as Late (Attended)</option>
                    <option value="Excused">Mark as Excused Duty / Medical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="golden-os-field-label">Detailed Description &amp; Notes</label>
                <textarea
                  rows={3}
                  className="golden-os-input"
                  value={disputeDescription}
                  onChange={e => setDisputeDescription(e.target.value)}
                  placeholder="Explain why attendance should be corrected..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="golden-os-field-label">Supporting Proof (Optional · JPG, PNG, PDF up to 5MB)</label>
                <div style={{ padding: '14px', borderRadius: '12px', border: '1.5px dashed #d6c5a3', background: '#faf6eb', textAlign: 'center' }}>
                  <input
                    type="file"
                    id="student-dispute-proof-upload"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleProofFileChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="student-dispute-proof-upload" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#6e4e1c', fontWeight: 700, fontSize: '0.82rem' }}>
                    <UploadCloud size={18} />
                    <span>{proofFile ? `${proofFile.name} (${(proofFile.size / 1024).toFixed(1)} KB)` : 'Select Proof Document or Photo'}</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    setBanner(null);
                    if (onNavigateBack) onNavigateBack();
                  }}
                  className="golden-os-feedback-filter-btn"
                  style={{ width: 'auto', padding: '10px 16px', borderRadius: '11px', flexShrink: 0 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispute}
                  style={{
                    width: 'auto',
                    flex: 1,
                    padding: '10px 18px',
                    borderRadius: '11px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: isSubmittingDispute ? 'not-allowed' : 'pointer',
                    background: isSubmittingDispute ? '#b8a98c' : 'linear-gradient(135deg, #785927, #684c20)',
                    color: '#ffffff',
                    boxShadow: isSubmittingDispute ? 'none' : '0 2px 8px rgba(104, 76, 32, 0.25)',
                  }}
                >
                  {isSubmittingDispute ? 'Submitting...' : 'Submit Dispute Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ===== SUB-PAGE 3: DEDICATED LEAVE DETAIL PAGE ===== */
  if (mode === 'leave-detail') {
    const req = sortedLeaves.find(r => String(r.id) === String(routeView?.id)) || routeView?.item || null;
    if (!req) {
      return (
        <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
          <div className="golden-os-window">
            <div className="golden-os-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', padding: '24px' }}>
              <Clock size={24} style={{ color: '#8c7a5b' }} />
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2b2112' }}>Leave application record unavailable.</div>
              <button
                type="button"
                onClick={() => onNavigateBack && onNavigateBack()}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '8px 16px', borderRadius: '10px' }}
              >
                Back to Requests
              </button>
            </div>
          </div>
        </div>
      );
    }

    const isPending = String(req.status || 'Pending').toLowerCase() === 'pending';

    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {renderBanner()}

            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div className="golden-os-form-section-title">Leave Application #{req.id}</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Status</span>
                <span style={{ color: getStatusTextColor(req.status), fontWeight: 800, textAlign: 'right' }}>{req.status || 'Pending'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Leave Type</span>
                <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>{req.leave_type || 'General'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Subject</span>
                <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>
                  {req.subject_name ? `${req.subject_name}${req.subject_code ? ` (${req.subject_code})` : ''}` : 'General (All Subjects)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Duration</span>
                <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>{req.start_date} → {req.end_date}</span>
              </div>
              {req.created_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                  <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Submitted</span>
                  <span style={{ color: '#25231f', fontWeight: 600, textAlign: 'right' }}>{new Date(req.created_at).toLocaleDateString()}</span>
                </div>
              )}

              {req.reason && (
                <div style={{ marginTop: '4px', fontSize: '0.84rem', color: '#3b3324', background: '#faf8f2', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ede4d2', lineHeight: 1.5 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#785927', marginBottom: '3px', textTransform: 'uppercase' }}>Reason</div>
                  {req.reason}
                </div>
              )}

              {(req.reviewer_comments || req.admin_reply) && (
                <div style={{ fontSize: '0.82rem', color: '#61471e', background: '#faf5ea', padding: '10px 12px', borderRadius: '10px', border: '1px solid #dfcfaf' }}>
                  <strong>Reviewer Note:</strong> {req.reviewer_comments || req.admin_reply}
                </div>
              )}
            </div>

            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Documents &amp; Controls</div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    generateLeavePdf({
                      ...req,
                      student_name: currentUser?.name || req.student_name,
                      student_roll: currentUser?.details?.roll || currentUser?.roll || req.student_roll,
                    });
                  }}
                  className="golden-os-feedback-filter-btn"
                  style={{ padding: '9px 14px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} />
                  <span>Download Official PDF</span>
                </button>

                {isPending && confirmWithdrawType !== 'leave' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (playCyberSound) playCyberSound('click');
                      setConfirmWithdrawType('leave');
                    }}
                    style={{
                      padding: '9px 14px',
                      borderRadius: '10px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Withdraw Leave</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    if (onNavigateBack) onNavigateBack();
                  }}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #785927, #684c20)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                >
                  Done
                </button>
              </div>

              {confirmWithdrawType === 'leave' && (
                <div style={{ padding: '12px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991b1b' }}>Withdraw this pending leave request?</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setConfirmWithdrawType(null)}
                      className="golden-os-feedback-filter-btn"
                      style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem' }}
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingAction}
                      onClick={() => handleWithdrawLeave(req.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#dc2626',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: isProcessingAction ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isProcessingAction ? 'Withdrawing...' : 'Confirm Withdraw'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== SUB-PAGE 4: DEDICATED DISPUTE DETAIL PAGE ===== */
  if (mode === 'dispute-detail') {
    const d =
      matchedDispute ||
      (String(fetchedDispute?.id) === String(routeView?.id) ? fetchedDispute : null) ||
      routeView?.item ||
      null;

    if (!d) {
      return (
        <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
          <div className="golden-os-window">
            <div className="golden-os-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', padding: '24px' }}>
              <Clock size={24} style={{ color: '#8c7a5b' }} />
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2b2112' }}>Loading dispute details...</div>
              <button
                type="button"
                onClick={() => onNavigateBack && onNavigateBack()}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '8px 16px', borderRadius: '10px' }}
              >
                Back to Disputes
              </button>
            </div>
          </div>
        </div>
      );
    }

    const stUpper = String(d.status || 'SUBMITTED').toUpperCase();
    const isActive = ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFORMATION'].includes(stUpper);

    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {renderBanner()}

            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={13} />
                <span>Attendance Dispute #{d.id}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Status</span>
                <span style={{ color: getStatusTextColor(d.status), fontWeight: 800, textAlign: 'right' }}>{formatDisputeStatus(d.status)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Subject</span>
                <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>
                  {d.subject_name ? `${d.subject_name}${d.subject_code ? ` (${d.subject_code})` : ''}` : 'General Class'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Date &amp; Slot</span>
                <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>
                  {d.date}{d.session_time ? ` · ${d.session_time}` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Adjustment</span>
                <span style={{ fontWeight: 800 }}>
                  <span style={{ color: '#dc2626' }}>{d.original_status}</span>
                  {' → '}
                  <span style={{ color: '#047857' }}>{d.requested_status}</span>
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Reason</span>
                <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>{d.reason}</span>
              </div>
              {d.created_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                  <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Submitted</span>
                  <span style={{ color: '#25231f', fontWeight: 600, textAlign: 'right' }}>{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              )}

              {d.description && (
                <div style={{ marginTop: '4px', fontSize: '0.84rem', color: '#3b3324', background: '#faf8f2', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ede4d2', lineHeight: 1.5 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#785927', marginBottom: '3px', textTransform: 'uppercase' }}>Evidence Note</div>
                  {d.description}
                </div>
              )}

              {(d.reviewer_comments || d.hod_comments) && (
                <div style={{ fontSize: '0.82rem', color: '#61471e', background: '#faf5ea', padding: '10px 12px', borderRadius: '10px', border: '1px solid #dfcfaf' }}>
                  <strong>{d.reviewed_by ? `Reviewer (${d.reviewed_by})` : 'Teacher / HOD Note'}:</strong> {d.reviewer_comments || d.hod_comments}
                </div>
              )}
            </div>

            {((Array.isArray(d.comments) && d.comments.length > 0) || isActive) && (
              <div className="golden-os-form-section">
                <div className="golden-os-form-section-title">Follow-up Messages</div>

                {Array.isArray(d.comments) && d.comments.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {d.comments.map(c => (
                      <div key={c.id} style={{ padding: '9px 12px', borderRadius: '10px', background: '#faf8f2', border: '1px solid #ede4d2', fontSize: '0.82rem' }}>
                        <div style={{ fontWeight: 700, color: '#6e4e1c', marginBottom: '2px', fontSize: '0.75rem' }}>
                          {c.author_name || c.author_email} · {String(c.author_role || '').toUpperCase()}
                        </div>
                        <div style={{ color: '#25231f' }}>{c.message}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#8c7a5b' }}>No follow-up messages yet.</div>
                )}

                {isActive && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="golden-os-input"
                      value={commentInput}
                      onChange={e => setCommentInput(e.target.value)}
                      placeholder="Add a note for reviewer..."
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      disabled={isPostingComment || !commentInput.trim()}
                      onClick={() => handlePostComment(d)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '11px',
                        border: 'none',
                        background: !commentInput.trim() ? '#d7cbb0' : 'linear-gradient(135deg, #785927, #684c20)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: !commentInput.trim() ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Send size={14} />
                      <span>{isPostingComment ? '...' : 'Send'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Documents &amp; Controls</div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {d.has_proof && (
                  <button
                    type="button"
                    onClick={() => handleOpenProof(d.id)}
                    className="golden-os-feedback-filter-btn"
                    style={{ padding: '9px 14px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <FileText size={14} />
                    <span>View Proof</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    generateDisputePdf({
                      ...d,
                      student_name: currentUser?.name || d.student_name,
                      student_roll: currentUser?.details?.roll || currentUser?.roll || d.student_roll || currentUser?.email,
                    });
                  }}
                  className="golden-os-feedback-filter-btn"
                  style={{ padding: '9px 14px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} />
                  <span>Download PDF Proof</span>
                </button>

                {isActive && confirmWithdrawType !== 'dispute' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (playCyberSound) playCyberSound('click');
                      setConfirmWithdrawType('dispute');
                    }}
                    style={{
                      padding: '9px 14px',
                      borderRadius: '10px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Cancel Dispute</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    if (onNavigateBack) onNavigateBack();
                  }}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #785927, #684c20)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                >
                  Done
                </button>
              </div>

              {confirmWithdrawType === 'dispute' && (
                <div style={{ padding: '12px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991b1b' }}>Withdraw this attendance dispute?</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setConfirmWithdrawType(null)}
                      className="golden-os-feedback-filter-btn"
                      style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem' }}
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingAction}
                      onClick={() => handleCancelDispute(d.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#dc2626',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: isProcessingAction ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isProcessingAction ? 'Cancelling...' : 'Confirm Cancel'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== LANDING VIEW: ORGANIZED LEAVE APPLICATIONS & ATTENDANCE DISPUTES DIRECTORY ===== */
  const showLeaves = listFilter === 'ALL' || listFilter === 'LEAVES';
  const showDisputes = listFilter === 'ALL' || listFilter === 'DISPUTES';

  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Compact Top Action Bar */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="golden-os-feedback-filter-btn"
              style={{ padding: '9px 12px', borderRadius: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
              <span>{isRefreshing ? 'Syncing' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (playCyberSound) playCyberSound('click');
                setBanner(null);
                if (onNavigateRoute) onNavigateRoute({ section: 'disputes', mode: 'apply-leave' });
              }}
              style={{
                padding: '9px 14px',
                borderRadius: '11px',
                border: 'none',
                background: 'linear-gradient(135deg, #785927, #684c20)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(104, 76, 32, 0.2)',
              }}
            >
              <Plus size={15} />
              <span>Apply Leave</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (playCyberSound) playCyberSound('click');
                setBanner(null);
                if (onNavigateRoute) onNavigateRoute({ section: 'disputes', mode: 'apply-dispute', prefill: null });
              }}
              className="golden-os-feedback-filter-btn"
              style={{
                padding: '9px 14px',
                borderRadius: '11px',
                background: '#faf5ea',
                border: '1px solid #d9c496',
                color: '#6e4e1c',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={15} />
              <span>Request Dispute</span>
            </button>
          </div>

          {/* Clean Segmented Filter */}
          <div className="golden-os-segmented">
            <button
              type="button"
              onClick={() => {
                if (playCyberSound) playCyberSound('click');
                setListFilter('ALL');
              }}
              className={`golden-os-segmented-btn ${listFilter === 'ALL' ? 'active' : ''}`}
            >
              All ({sortedLeaves.length + sortedDisputes.length})
            </button>
            <button
              type="button"
              onClick={() => {
                if (playCyberSound) playCyberSound('click');
                setListFilter('LEAVES');
              }}
              className={`golden-os-segmented-btn ${listFilter === 'LEAVES' ? 'active' : ''}`}
            >
              Leaves ({sortedLeaves.length})
            </button>
            <button
              type="button"
              onClick={() => {
                if (playCyberSound) playCyberSound('click');
                setListFilter('DISPUTES');
              }}
              className={`golden-os-segmented-btn ${listFilter === 'DISPUTES' ? 'active' : ''}`}
            >
              Disputes ({sortedDisputes.length})
            </button>
          </div>

          {renderBanner()}

          {/* Section 1: Leave Applications Single-Line List */}
          {showLeaves && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#785927' }}>
                  Leave Applications
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8c7a5b' }}>
                  {sortedLeaves.length} {sortedLeaves.length === 1 ? 'record' : 'records'}
                </span>
              </div>

              {sortedLeaves.length === 0 ? (
                <div style={{ padding: '20px 14px', textAlign: 'center', background: '#ffffff', border: '1px dashed #d6c5a3', borderRadius: '14px', color: '#6b5b3e', fontSize: '0.82rem' }}>
                  No leave applications submitted yet.
                </div>
              ) : (
                <div className="golden-os-list-shell">
                  {sortedLeaves.map(req => (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => {
                        if (playCyberSound) playCyberSound('click');
                        setBanner(null);
                        if (onNavigateRoute) {
                          onNavigateRoute({ section: 'disputes', mode: 'leave-detail', id: req.id, item: req });
                        }
                      }}
                      className="golden-os-list-row"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        <div className="golden-os-avatar">{getLeaveShortCode(req.leave_type)}</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {req.leave_type || 'General'} Leave ({req.start_date} → {req.end_date})
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Attendance Disputes Single-Line List */}
          {showDisputes && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#785927' }}>
                  Attendance Disputes
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8c7a5b' }}>
                  {sortedDisputes.length} {sortedDisputes.length === 1 ? 'record' : 'records'}
                </span>
              </div>

              {sortedDisputes.length === 0 ? (
                <div style={{ padding: '20px 14px', textAlign: 'center', background: '#ffffff', border: '1px dashed #d6c5a3', borderRadius: '14px', color: '#6b5b3e', fontSize: '0.82rem' }}>
                  No attendance disputes submitted yet.
                </div>
              ) : (
                <div className="golden-os-list-shell">
                  {sortedDisputes.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        if (playCyberSound) playCyberSound('click');
                        setBanner(null);
                        if (onNavigateRoute) {
                          onNavigateRoute({ section: 'disputes', mode: 'dispute-detail', id: d.id, item: d });
                        }
                      }}
                      className="golden-os-list-row"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        <div className="golden-os-avatar">#{d.id}</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {d.subject_name ? `${d.subject_name}${d.subject_code ? ` (${d.subject_code})` : ''}` : 'General Class'} · {d.date}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
