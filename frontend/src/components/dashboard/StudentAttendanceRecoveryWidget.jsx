import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  RefreshCw,
  FileText,
  Download,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Scale,
  PlusCircle,
  Send,
} from 'lucide-react';
import { interventionApi } from '../../api/interventionApi';
import { disputeApi } from '../../api/disputeApi';
import { generateDisputePdf } from '../../utils/disputePdfGenerator';
import { getActiveTenantSlug } from '../../utils/tenantConfig';

const readCompCache = (token, key) => {
  try {
    if (!token || typeof localStorage === 'undefined') return null;
    const slug = getActiveTenantSlug() || 'default';
    const raw = localStorage.getItem(`sg_st_${key}_v1_${slug}_${String(token).slice(-16)}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCompCache = (token, key, val) => {
  try {
    if (!token || typeof localStorage === 'undefined' || val == null) return;
    const slug = getActiveTenantSlug() || 'default';
    localStorage.setItem(`sg_st_${key}_v1_${slug}_${String(token).slice(-16)}`, JSON.stringify(val));
  } catch {
    // ignore quota
  }
};

const REASON_LABELS = {
  UNRECORDED_BIOMETRIC: 'Biometric / Face Scan Not Registered',
  MARKED_ABSENT_ERRONEOUSLY: 'Present in Lecture, Marked Absent',
  KIOSK_HARDWARE_FAILURE: 'Scanner Kiosk Offline / Frozen',
  MEDICAL_LEAVE_NOT_COUNTED: 'Medical Certificate Not Counted',
  OTHER_DISCREPANCY: 'Timetable / Period Discrepancy',
};

const STATUS_LABELS = {
  PENDING: 'Pending Review',
  ESCALATED: 'Escalated to HOD',
  APPROVED: 'Approved & Resolved',
  RESOLVED: 'Resolved',
  REJECTED: 'Declined',
  CANCELLED: 'Withdrawn',
};

export default function StudentAttendanceRecoveryWidget({
  token,
  API_BASE_URL,
  currentUser,
  studentLogs = [],
  subjects = [],
  myDisputes = null,
  onUpdateDisputes = null,
  routeView = null,
  onNavigateRoute = null,
  playCyberSound = () => {},
}) {
  const [data, setData] = useState(() => readCompCache(token, 'comp_status'));
  const [localDisputes, setLocalDisputes] = useState(() => readCompCache(token, 'comp_disputes') || []);
  const [loading, setLoading] = useState(false);

  // Grievance filing state
  const [complaintDate, setComplaintDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [complaintSubjectId, setComplaintSubjectId] = useState('');
  const [complaintReason, setComplaintReason] = useState('UNRECORDED_BIOMETRIC');
  const [complaintNotes, setComplaintNotes] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintFeedback, setComplaintFeedback] = useState(null);

  // Counselor request state
  const [requestReason, setRequestReason] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [submittingCounselor, setSubmittingCounselor] = useState(false);
  const [counselorFeedback, setCounselorFeedback] = useState(null);

  // Case action state
  const [actionBusy, setActionBusy] = useState(false);
  const [detailFeedback, setDetailFeedback] = useState(null);

  const disputes = useMemo(() => {
    if (Array.isArray(myDisputes)) return myDisputes;
    return Array.isArray(localDisputes) ? localDisputes : [];
  }, [myDisputes, localDisputes]);

  const setDisputesList = useCallback((updater) => {
    setLocalDisputes(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      writeCompCache(token, 'comp_disputes', next);
      return next;
    });
    if (onUpdateDisputes) {
      onUpdateDisputes(updater);
    }
  }, [token, onUpdateDisputes]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statusRes, disputesRes] = await Promise.allSettled([
        interventionApi.getMyStatus(token),
        disputeApi.fetchMyDisputes(token),
      ]);

      if (statusRes.status === 'fulfilled' && statusRes.value) {
        setData(statusRes.value);
        writeCompCache(token, 'comp_status', statusRes.value);
      }

      if (disputesRes.status === 'fulfilled' && disputesRes.value) {
        const rawRes = disputesRes.value;
        let parsed = null;
        if (typeof rawRes.json === 'function') {
          if (rawRes.ok) parsed = await rawRes.json().catch(() => null);
        } else {
          parsed = rawRes;
        }
        const list = Array.isArray(parsed) ? parsed : (parsed?.disputes || null);
        if (Array.isArray(list)) {
          setDisputesList(list);
        }
      }
    } catch (err) {
      console.warn('Error syncing compliance & disputes:', err);
    } finally {
      setLoading(false);
    }
  }, [token, setDisputesList]);

  useEffect(() => {
    let ignore = false;
    if (!token) return undefined;
    Promise.allSettled([
      interventionApi.getMyStatus(token),
      disputeApi.fetchMyDisputes(token),
    ])
      .then(async ([statusRes, disputesRes]) => {
        if (ignore) return;
        if (statusRes.status === 'fulfilled' && statusRes.value) {
          setData(statusRes.value);
          writeCompCache(token, 'comp_status', statusRes.value);
        }
        if (disputesRes.status === 'fulfilled' && disputesRes.value) {
          const rawRes = disputesRes.value;
          let parsed = null;
          if (typeof rawRes.json === 'function') {
            if (rawRes.ok) parsed = await rawRes.json().catch(() => null);
          } else {
            parsed = rawRes;
          }
          const list = Array.isArray(parsed) ? parsed : (parsed?.disputes || null);
          if (!ignore && Array.isArray(list)) {
            setDisputesList(list);
          }
        }
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, [token, setDisputesList]);

  // Scoped metrics strictly from branch-filtered studentLogs
  const safeSubjects = useMemo(() => (Array.isArray(subjects) ? subjects : []), [subjects]);
  const conductedLogs = useMemo(
    () => (Array.isArray(studentLogs) ? studentLogs : []).filter(l => String(l?.attendance || '').toUpperCase() !== 'CLASS_CANCELLED'),
    [studentLogs]
  );

  const totalConducted = conductedLogs.length > 0 ? conductedLogs.length : (data?.total_classes || 0);
  const totalAttended = conductedLogs.length > 0
    ? conductedLogs.filter(l => ['Present', 'Late', 'Excused'].includes(l.attendance)).length
    : (data?.attended_classes || 0);
  const attendancePct = totalConducted > 0
    ? parseFloat(((totalAttended / totalConducted) * 100).toFixed(1))
    : 100.0;
  const isCompliant = attendancePct >= 75.0 || totalConducted === 0;
  const safeBuffer = isCompliant && totalConducted > 0
    ? Math.max(0, Math.floor((totalAttended - 0.75 * totalConducted) / 0.75))
    : 0;
  const neededClasses = !isCompliant && totalConducted > 0
    ? Math.max(0, Math.ceil((0.75 * totalConducted - totalAttended) / 0.25))
    : 0;

  const navigateTo = (next) => {
    if (playCyberSound) playCyberSound('click');
    setComplaintFeedback(null);
    setCounselorFeedback(null);
    setDetailFeedback(null);
    if (onNavigateRoute) onNavigateRoute(next);
  };

  const activeApiUrl = API_BASE_URL || '/api/v1';

  const handleLodgeComplaint = async (e) => {
    e.preventDefault();
    if (!complaintDate) {
      setComplaintFeedback({ type: 'error', message: 'Please select the session date.' });
      return;
    }
    setSubmittingComplaint(true);
    setComplaintFeedback(null);
    try {
      const formData = new FormData();
      formData.append('date', complaintDate);
      if (complaintSubjectId) formData.append('subject_id', String(complaintSubjectId));
      formData.append('reason', REASON_LABELS[complaintReason] || complaintReason);
      formData.append(
        'description',
        complaintNotes.trim() || `Student filed attendance grievance for session on ${complaintDate}.`
      );

      const res = await fetch(`${activeApiUrl}/disputes`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.detail || 'Could not lodge grievance complaint.');
      }

      if (playCyberSound) playCyberSound('success');
      if (resData?.id) {
        setDisputesList(prev => [resData, ...(Array.isArray(prev) ? prev.filter(x => String(x.id) !== String(resData.id)) : [])]);
      } else {
        await loadData();
      }
      setComplaintNotes('');
      setComplaintFeedback({ type: 'success', message: 'Grievance filed! You can track status below or click View Records.' });
    } catch (err) {
      setComplaintFeedback({ type: 'error', message: err.message || 'Failed to file complaint.' });
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const handleRequestCounselor = async (e) => {
    e.preventDefault();
    setSubmittingCounselor(true);
    setCounselorFeedback(null);
    try {
      const res = await interventionApi.requestCounselor(token, {
        reason: requestReason.trim() || 'Student requested attendance recovery counseling.',
        preferred_date: preferredDate || null,
      });
      if (playCyberSound) playCyberSound('success');
      setCounselorFeedback({ type: 'success', message: res.message || 'Counseling meeting request recorded.' });
      setRequestReason('');
      setPreferredDate('');
      loadData();
    } catch (err) {
      setCounselorFeedback({ type: 'error', message: err.message || 'Failed to submit counselor request.' });
    } finally {
      setSubmittingCounselor(false);
    }
  };

  const handleCancelDispute = async (disputeId) => {
    setActionBusy(true);
    setDetailFeedback(null);
    if (playCyberSound) playCyberSound('click');
    try {
      const res = await disputeApi.cancelDispute(token, disputeId);
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.detail || 'Could not withdraw complaint.');
      }
      setDisputesList(prev => (Array.isArray(prev) ? prev.map(item => (String(item.id) === String(disputeId) ? resData : item)) : prev));
      setDetailFeedback({ type: 'success', message: 'Grievance complaint withdrawn successfully.' });
    } catch (err) {
      setDetailFeedback({ type: 'error', message: err.message || 'Failed to withdraw complaint.' });
    } finally {
      setActionBusy(false);
    }
  };

  /* ===== SUB-PAGE 1: COMPLIANCE STANDING & 75% BUFFER ===== */
  if (routeView?.mode === 'standing') {
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <div
                  className="golden-os-avatar"
                  style={{
                    width: '44px',
                    height: '44px',
                    ...(isCompliant
                      ? { background: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }
                      : { background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }),
                  }}
                >
                  <Scale size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#25231f' }}>
                    {isCompliant ? 'Compliant Standing (>= 75%)' : 'Attention Required (< 75%)'}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#6b5b3e', fontWeight: 600 }}>
                    Statutory Academic Regulatory Threshold
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.84rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Current Rate</span>
                <span style={{ color: isCompliant ? '#047857' : '#b91c1c', fontWeight: 800 }}>
                  {attendancePct}% ({totalAttended}/{totalConducted} classes)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.84rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>{isCompliant ? 'Safe Leave Buffer' : 'Recovery Requirement'}</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>
                  {isCompliant ? `${safeBuffer} safe class(es)` : `Attend +${neededClasses} consecutive classes`}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.84rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Filed Grievances</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>{disputes.length} registered</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              <button
                type="button"
                onClick={() => navigateTo({ section: 'compliance', mode: 'mentor' })}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '10px 14px', borderRadius: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}
              >
                <UserCheck size={14} />
                <span>Mentor Desk</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTo({ section: 'compliance', mode: 'file' })}
                style={{
                  padding: '10px 14px',
                  borderRadius: '11px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #785927, #684c20)',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                }}
              >
                <PlusCircle size={14} />
                <span>Lodge Grievance</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== SUB-PAGE 2: STATUTORY 75% RULE & MENTOR DESK (INLINE FORM, NO MODAL) ===== */
  if (routeView?.mode === 'mentor') {
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-inset-card" style={{ padding: '14px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#25231f' }}>
                {data?.counselor_name || 'Academic Counselor Desk'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b5b3e', marginTop: '3px', lineHeight: 1.45 }}>
                {data?.counselor_email || 'Assigned Department Advisor'} · Maintaining 75.0%+ ensures uninterrupted exam & placement eligibility.
              </div>
            </div>

            <form onSubmit={handleRequestCounselor} className="golden-os-form-section">
              <div className="golden-os-form-section-title">Request 1-on-1 Guidance Session</div>

              {counselorFeedback && (
                <div className={`feedback-banner ${counselorFeedback.type === 'error' ? 'is-error' : 'is-success'}`}>
                  {counselorFeedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{counselorFeedback.message}</span>
                </div>
              )}

              <div>
                <label className="golden-os-field-label">Preferred Session Date</label>
                <input
                  type="date"
                  className="golden-os-input"
                  value={preferredDate}
                  onChange={e => setPreferredDate(e.target.value)}
                />
              </div>

              <div>
                <label className="golden-os-field-label">Discussion Topic / Recovery Query *</label>
                <textarea
                  rows={3}
                  className="golden-os-input"
                  value={requestReason}
                  onChange={e => setRequestReason(e.target.value)}
                  placeholder="Enter recovery query, timetable conflict, or medical document discussion..."
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={submittingCounselor}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '11px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: submittingCounselor ? 'not-allowed' : 'pointer',
                    background: 'linear-gradient(135deg, #785927, #684c20)',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                >
                  <Send size={14} />
                  <span>{submittingCounselor ? 'Requesting...' : 'Confirm Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ===== SUB-PAGE 3: FILE NEW GRIEVANCE COMPLAINT ===== */
  if (routeView?.mode === 'file') {
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <form onSubmit={handleLodgeComplaint} className="golden-os-form-section">
              <div className="golden-os-form-section-title">Lodge Official Grievance Complaint</div>

              {complaintFeedback && (
                <div className={`feedback-banner ${complaintFeedback.type === 'error' ? 'is-error' : 'is-success'}`}>
                  {complaintFeedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, flex: 1 }}>{complaintFeedback.message}</span>
                  {complaintFeedback.type === 'success' && (
                    <button
                      type="button"
                      onClick={() => navigateTo({ section: 'compliance' })}
                      className="golden-os-feedback-filter-btn"
                      style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.74rem' }}
                    >
                      View Records
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="golden-os-field-label">Session Date *</label>
                <input
                  type="date"
                  className="golden-os-input"
                  value={complaintDate}
                  onChange={e => setComplaintDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="golden-os-field-label">Affected Subject (Branch Scoped)</label>
                <select
                  className="golden-os-input"
                  value={complaintSubjectId}
                  onChange={e => setComplaintSubjectId(e.target.value)}
                >
                  <option value="">General Attendance</option>
                  {safeSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code || s.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="golden-os-field-label">Grievance Type *</label>
                <select
                  className="golden-os-input"
                  value={complaintReason}
                  onChange={e => setComplaintReason(e.target.value)}
                >
                  <option value="UNRECORDED_BIOMETRIC">Biometric / Face Scan Not Registered</option>
                  <option value="MARKED_ABSENT_ERRONEOUSLY">Present in Lecture, Marked Absent</option>
                  <option value="KIOSK_HARDWARE_FAILURE">Scanner Kiosk Device Offline / Frozen</option>
                  <option value="MEDICAL_LEAVE_NOT_COUNTED">Approved Medical Certificate Not Counted</option>
                  <option value="OTHER_DISCREPANCY">Other Timetable / Period Discrepancy</option>
                </select>
              </div>

              <div>
                <label className="golden-os-field-label">Detailed Grievance Explanation *</label>
                <textarea
                  rows={3}
                  className="golden-os-input"
                  value={complaintNotes}
                  onChange={e => setComplaintNotes(e.target.value)}
                  placeholder="Provide room number, lecture timing, or context..."
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={submittingComplaint}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '11px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: submittingComplaint ? 'not-allowed' : 'pointer',
                    background: 'linear-gradient(135deg, #785927, #684c20)',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                >
                  <Send size={14} />
                  <span>{submittingComplaint ? 'Submitting...' : 'Submit Grievance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ===== SUB-PAGE 4: GRIEVANCE CASE DETAIL ===== */
  if (routeView?.mode === 'detail' && routeView?.id != null) {
    const selectedCase = disputes.find(d => String(d.id) === String(routeView.id)) || routeView.item || null;
    if (!selectedCase) {
      return (
        <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
          <div className="golden-os-window">
            <div className="golden-os-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>Grievance record not found</div>
            </div>
          </div>
        </div>
      );
    }

    const st = String(selectedCase.status || 'PENDING').toUpperCase();
    const isResolved = st === 'APPROVED' || st === 'RESOLVED';
    const canCancel = st === 'PENDING';
    const subMatch = safeSubjects.find(s => String(s.id) === String(selectedCase.subject_id));

    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {detailFeedback && (
              <div className={`feedback-banner ${detailFeedback.type === 'error' ? 'is-error' : 'is-success'}`}>
                {detailFeedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{detailFeedback.message}</span>
              </div>
            )}

            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.84rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Case ID</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>#{selectedCase.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.84rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Status</span>
                <span style={{ color: isResolved ? '#047857' : '#785927', fontWeight: 800 }}>
                  {STATUS_LABELS[st] || st}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.84rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Session Date</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>{selectedCase.date || 'N/A'}</span>
              </div>
              {subMatch && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.84rem' }}>
                  <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Subject</span>
                  <span style={{ color: '#25231f', fontWeight: 700 }}>{subMatch.name} ({subMatch.code})</span>
                </div>
              )}
              <div style={{ paddingTop: '6px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6b5b3e', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Reason & Details
                </div>
                <div style={{ fontSize: '0.86rem', color: '#25231f', fontWeight: 600 }}>
                  {selectedCase.reason ? String(selectedCase.reason).replace(/_/g, ' ') : 'Attendance Discrepancy'}
                </div>
                {(selectedCase.description || selectedCase.notes) && (
                  <div style={{ fontSize: '0.82rem', color: '#5c4b30', marginTop: '4px', lineHeight: 1.45 }}>
                    {selectedCase.description || selectedCase.notes}
                  </div>
                )}
              </div>
              {selectedCase.review_comment && (
                <div className="golden-os-inset-card" style={{ marginTop: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#785927', textTransform: 'uppercase' }}>Admin / Faculty Remarks</div>
                  <div style={{ fontSize: '0.82rem', color: '#25231f', marginTop: '3px' }}>{selectedCase.review_comment}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              {canCancel && (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => handleCancelDispute(selectedCase.id)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '11px',
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: actionBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionBusy ? 'Withdrawing...' : 'Withdraw Complaint'}
                </button>
              )}

              {isResolved && (
                <button
                  type="button"
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    generateDisputePdf(selectedCase, currentUser?.institution_name || 'Smart Attendance System');
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '11px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #785927, #684c20)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Download size={14} />
                  <span>Correction Certificate</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== MAIN DIRECTORY VIEW (ZERO KPI BOXES, CLEAN ROWS) ===== */
  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Top Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span className="golden-os-field-label" style={{ marginBottom: 0 }}>Compliance & Grievance Controls</span>
            <button
              type="button"
              onClick={() => {
                if (playCyberSound) playCyberSound('click');
                loadData();
              }}
              disabled={loading}
              className="golden-os-feedback-filter-btn"
              style={{ padding: '7px 12px', borderRadius: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
            >
              <RefreshCw size={13} className={loading ? 'spin-icon' : ''} />
              <span>{loading ? 'Syncing' : 'Refresh'}</span>
            </button>
          </div>

          {/* Control Actions Directory */}
          <div className="golden-os-list-shell">
            <button
              type="button"
              onClick={() => navigateTo({ section: 'compliance', mode: 'standing' })}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar">
                  <ShieldCheck size={16} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                    Compliance Standing &amp; Buffer
                  </div>
                </div>
              </div>
              <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
            </button>

            <button
              type="button"
              onClick={() => navigateTo({ section: 'compliance', mode: 'mentor' })}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar">
                  <UserCheck size={16} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                    Statutory 75% Rule &amp; Mentor Desk
                  </div>
                </div>
              </div>
              <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
            </button>

            <button
              type="button"
              onClick={() => navigateTo({ section: 'compliance', mode: 'file' })}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar">
                  <PlusCircle size={16} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                    Lodge Grievance Complaint
                  </div>
                </div>
              </div>
              <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
            </button>
          </div>

          {/* Filed Grievances List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 8px' }}>
              <span className="golden-os-field-label" style={{ marginBottom: 0 }}>Filed Grievance Records</span>
              <span style={{ fontSize: '0.73rem', color: '#6b5b3e', fontWeight: 700 }}>
                {disputes.length} {disputes.length === 1 ? 'case' : 'cases'}
              </span>
            </div>

            {disputes.length === 0 ? (
              <div className="golden-os-inset-card" style={{ textAlign: 'center', padding: '22px 14px', fontSize: '0.82rem', color: '#6b5b3e' }}>
                No grievance complaints filed yet.
              </div>
            ) : (
              <div className="golden-os-list-shell">
                {disputes.map(dispute => (
                  <button
                    key={dispute.id}
                    type="button"
                    onClick={() => navigateTo({ section: 'compliance', mode: 'detail', id: dispute.id, item: dispute })}
                    className="golden-os-list-row"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div className="golden-os-avatar">
                        <FileText size={16} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Session {dispute.date} · {dispute.reason ? String(dispute.reason).replace(/_/g, ' ') : 'Attendance Discrepancy'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
