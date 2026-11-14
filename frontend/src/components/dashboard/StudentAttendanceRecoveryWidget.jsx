import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, ShieldCheck, UserCheck, Calendar, Clock, AlertTriangle, 
  ArrowRight, MessageSquare, Send, CheckCircle2, RefreshCw, FileText, 
  PlusCircle, Download, Check, X, HelpCircle, ChevronRight, Scale
} from 'lucide-react';
import { interventionApi } from '../../api/interventionApi';
import { disputeApi } from '../../api/disputeApi';
import { generateDisputePdf } from '../../utils/disputePdfGenerator';

export default function StudentAttendanceRecoveryWidget({ 
  token, 
  currentUser, 
  studentLogs = [], 
  subjects = [],
  playCyberSound = () => {},
  triggerHaptic = () => {}
}) {
  const [data, setData] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('complaints'); // 'complaints' | 'regulatory'

  // New Grievance Complaint Form State
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintDate, setComplaintDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [complaintSubjectId, setComplaintSubjectId] = useState('');
  const [complaintReason, setComplaintReason] = useState('UNRECORDED_BIOMETRIC');
  const [complaintNotes, setComplaintNotes] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintFeedback, setComplaintFeedback] = useState(null);

  // Counselor request modal state
  const [showCounselorModal, setShowCounselorModal] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [submittingCounselor, setSubmittingCounselor] = useState(false);
  const [counselorFeedback, setCounselorFeedback] = useState(null);

  // Fetch both Intervention status and Student's Dispute complaints
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statusRes, disputesRes] = await Promise.allSettled([
        interventionApi.getMyStatus(token),
        disputeApi.fetchMyDisputes(token)
      ]);

      if (statusRes.status === 'fulfilled' && statusRes.value) {
        setData(statusRes.value);
      }
      if (disputesRes.status === 'fulfilled' && disputesRes.value) {
        const raw = disputesRes.value;
        const list = Array.isArray(raw) ? raw : (raw?.disputes || []);
        setDisputes(list);
      }
    } catch (err) {
      console.warn('Error syncing compliance & disputes:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute accurate metrics fallback from real studentLogs
  const totalConducted = data?.total_classes || studentLogs.length || 0;
  const totalAttended = data?.attended_classes || studentLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late').length || 0;
  const attendancePct = totalConducted > 0 
    ? parseFloat(((totalAttended / totalConducted) * 100).toFixed(1)) 
    : 100.0;
  const isCompliant = attendancePct >= 75.0;

  // Safe buffer calculation
  const safeBuffer = isCompliant 
    ? Math.max(0, Math.floor((totalAttended - 0.75 * totalConducted) / 0.75))
    : 0;
  const neededClasses = !isCompliant 
    ? Math.ceil((0.75 * totalConducted - totalAttended) / 0.25)
    : 0;

  // Handle lodging a new grievance complaint
  const handleLodgeComplaint = async (e) => {
    if (e) e.preventDefault();
    if (!complaintDate) {
      setComplaintFeedback({ type: 'error', message: 'Please select the session date.' });
      return;
    }

    setSubmittingComplaint(true);
    setComplaintFeedback(null);
    try {
      const payload = {
        date: complaintDate,
        subject_id: complaintSubjectId ? parseInt(complaintSubjectId, 10) : null,
        reason: complaintReason,
        notes: complaintNotes.trim() || `Student filed attendance grievance claim for session on ${complaintDate}.`,
        student_id: currentUser?.details?.id || currentUser?.id,
        student_name: currentUser?.name || 'Student',
        student_roll: currentUser?.details?.roll || currentUser?.roll || ''
      };

      await fetch(`/api/v1/disputes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (playCyberSound) playCyberSound('success');
      setComplaintFeedback({ type: 'success', message: 'Attendance Grievance Complaint filed successfully! Our grievance desk is reviewing it.' });
      
      // Optimistic addition
      const optimisticDispute = {
        id: Date.now(),
        date: complaintDate,
        subject_id: complaintSubjectId ? parseInt(complaintSubjectId, 10) : null,
        reason: complaintReason,
        status: 'PENDING',
        notes: complaintNotes.trim(),
        created_at: new Date().toISOString()
      };
      setDisputes(prev => [optimisticDispute, ...prev]);

      setTimeout(() => {
        setShowComplaintForm(false);
        setComplaintFeedback(null);
        setComplaintNotes('');
        loadData();
      }, 1500);
    } catch (err) {
      console.error('Error filing dispute complaint:', err);
      setComplaintFeedback({ type: 'error', message: 'Failed to lodge complaint. Please try again.' });
    } finally {
      setSubmittingComplaint(false);
    }
  };

  // Handle requesting Counselor session
  const handleRequestCounselor = async (e) => {
    if (e) e.preventDefault();
    setSubmittingCounselor(true);
    setCounselorFeedback(null);
    try {
      const res = await interventionApi.requestCounselor(token, {
        reason: requestReason.trim() || 'Student requested attendance recovery counseling.',
        preferred_date: preferredDate || null,
      });
      if (playCyberSound) playCyberSound('success');
      setCounselorFeedback({ type: 'success', message: res.message || 'Counseling meeting requested successfully.' });
      setTimeout(() => {
        setShowCounselorModal(false);
        setCounselorFeedback(null);
        setRequestReason('');
        setPreferredDate('');
        loadData();
      }, 1500);
    } catch (err) {
      setCounselorFeedback({ type: 'error', message: err.message || 'Failed to submit counselor request.' });
    } finally {
      setSubmittingCounselor(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      animation: 'fadeInUp 0.3s ease'
    }}>
      {/* ── Top Bar: Title & Refresh Action ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: isCompliant ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${isCompliant ? '#a7f3d0' : '#fecaca'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isCompliant ? '#059669' : '#dc2626'
          }}>
            <Scale size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Attendance Compliance & Grievance Complaints Desk
            </h3>
          </div>
        </div>

        <button
          onClick={() => { playCyberSound('click'); loadData(); }}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            color: '#475569',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
          title="Refresh Compliance & Grievances"
        >
          <RefreshCw size={13} className={loading ? 'spin-anim' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Horizontal Executive KPI Strip (4 Compact Cards) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '10px',
        width: '100%'
      }}>
        {/* Card 1: Statutory Compliance Status */}
        <div className="surface-card" style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: isCompliant ? '#059669' : '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>
            Standing Status
          </span>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isCompliant ? '#059669' : '#dc2626', marginTop: '3px' }}>
            {isCompliant ? 'GOOD STANDING' : 'ATTENTION REQUIRED'}
          </div>
        </div>

        {/* Card 2: Attendance Rate */}
        <div className="surface-card" style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Current Attendance
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '3px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{attendancePct}%</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>({totalAttended}/{totalConducted} classes)</span>
          </div>
        </div>

        {/* Card 3: Safe Buffer or Recovery Need */}
        <div className="surface-card" style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: isCompliant ? '#0284c7' : '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>
            {isCompliant ? 'Safe Leave Buffer' : 'Recovery Classes'}
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isCompliant ? '#0284c7' : '#d97706', marginTop: '3px' }}>
            {isCompliant ? `${safeBuffer} classes safe` : `+${neededClasses} to 75%`}
          </div>
        </div>

        {/* Card 4: Grievance Complaints */}
        <div className="surface-card" style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase' }}>
            Filed Complaints
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7c3aed', marginTop: '3px' }}>
            {disputes.length} Registered
          </div>
        </div>
      </div>

      {/* ── Horizontal Navigation Pill Switcher ── */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '8px'
      }}>
        <button
          type="button"
          onClick={() => { playCyberSound('click'); setActiveTab('complaints'); }}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: activeTab === 'complaints' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
            background: activeTab === 'complaints' ? '#eff6ff' : '#ffffff',
            color: activeTab === 'complaints' ? '#1d4ed8' : '#64748b'
          }}
        >
          📋 Grievance Complaints & Disputes ({disputes.length})
        </button>

        <button
          type="button"
          onClick={() => { playCyberSound('click'); setActiveTab('regulatory'); }}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: activeTab === 'regulatory' ? '1.5px solid #059669' : '1px solid #e2e8f0',
            background: activeTab === 'regulatory' ? '#f0fdf4' : '#ffffff',
            color: activeTab === 'regulatory' ? '#047857' : '#64748b'
          }}
        >
          🛡️ Statutory 75% Rule & Mentor Desk
        </button>
      </div>

      {/* ═════ TAB 1: GRIEVANCE COMPLAINTS & DISPUTE DESK ═════ */}
      {activeTab === 'complaints' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>
              Official Attendance Grievance Records
            </span>

            <button
              type="button"
              onClick={() => { playCyberSound('click'); setShowComplaintForm(prev => !prev); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)'
              }}
            >
              <PlusCircle size={15} />
              <span>{showComplaintForm ? 'Close Complaint Form' : 'Lodge Attendance Grievance Complaint'}</span>
            </button>
          </div>

          {/* Collapsible New Complaint Filing Form */}
          {showComplaintForm && (
            <form
              onSubmit={handleLodgeComplaint}
              className="surface-card"
              style={{
                padding: '16px 18px',
                borderRadius: '14px',
                border: '1.5px solid #bfdbfe',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                animation: 'fadeInUp 0.2s ease'
              }}
            >
              <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#1e40af' }}>
                Lodge Official Attendance Grievance Complaint
              </h4>

              {/* Horizontal Form Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Session Date *
                  </label>
                  <input
                    type="date"
                    value={complaintDate}
                    onChange={(e) => setComplaintDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '0.86rem',
                      background: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Affected Subject (Optional)
                  </label>
                  <select
                    value={complaintSubjectId}
                    onChange={(e) => setComplaintSubjectId(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '0.86rem',
                      background: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">General Attendance</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code || s.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Grievance Type *
                  </label>
                  <select
                    value={complaintReason}
                    onChange={(e) => setComplaintReason(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '0.86rem',
                      background: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="UNRECORDED_BIOMETRIC">Biometric / Face Scan Not Registered</option>
                    <option value="MARKED_ABSENT_ERRONEOUSLY">Present in Lecture, Marked Absent</option>
                    <option value="KIOSK_HARDWARE_FAILURE">Scanner Kiosk Device Offline / Frozen</option>
                    <option value="MEDICAL_LEAVE_NOT_COUNTED">Approved Medical Certificate Not Counted</option>
                    <option value="OTHER_DISCREPANCY">Other Timetable / Period Discrepancy</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Detailed Grievance Explanation *
                </label>
                <textarea
                  value={complaintNotes}
                  onChange={(e) => setComplaintNotes(e.target.value)}
                  placeholder="Provide period details, room number, or explanation of attendance..."
                  rows={2}
                  required
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '8px 10px',
                    fontSize: '0.86rem',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              {complaintFeedback && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  background: complaintFeedback.type === 'error' ? '#fef2f2' : '#f0fdf4',
                  color: complaintFeedback.type === 'error' ? '#b91c1c' : '#15803d',
                  border: `1px solid ${complaintFeedback.type === 'error' ? '#fecaca' : '#bbf7d0'}`
                }}>
                  {complaintFeedback.message}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowComplaintForm(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingComplaint}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '8px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: submittingComplaint ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingComplaint ? 'Submitting...' : 'Submit Official Grievance'}
                </button>
              </div>
            </form>
          )}

          {/* List of Filed Complaints */}
          {disputes.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '32px 16px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              color: '#64748b'
            }}>
              <CheckCircle2 size={30} color="#10b981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
              <h4 style={{ margin: '0 0 4px', fontSize: '0.94rem', color: '#1e293b' }}>
                No Attendance Grievance Claims Registered
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem' }}>
                All class session records are currently consistent. Click the button above to lodge an attendance complaint anytime.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {disputes.map(dispute => {
                const isResolved = dispute.status === 'APPROVED' || dispute.status === 'RESOLVED';
                const isRejected = dispute.status === 'REJECTED';
                const statusColor = isResolved ? '#059669' : isRejected ? '#dc2626' : '#d97706';
                const statusBg = isResolved ? '#f0fdf4' : isRejected ? '#fef2f2' : '#fffbeb';
                const statusBorder = isResolved ? '#bbf7d0' : isRejected ? '#fecaca' : '#fde68a';

                return (
                  <div
                    key={dispute.id}
                    className="surface-card"
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    {/* Left Meta */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: statusBg,
                          border: `1px solid ${statusBorder}`,
                          color: statusColor
                        }}>
                          {dispute.status}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                          Session: {dispute.date}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155' }}>
                        {dispute.reason ? dispute.reason.replace(/_/g, ' ') : 'Attendance Discrepancy'}
                      </div>

                      {dispute.notes && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                          "{dispute.notes}"
                        </div>
                      )}
                    </div>

                    {/* Right Action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isResolved && (
                        <button
                          type="button"
                          onClick={() => {
                            if (playCyberSound) playCyberSound('click');
                            generateDisputePdf(dispute, currentUser?.institution_name || 'Smart Attendance System');
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <Download size={13} />
                          <span>Correction Certificate</span>
                        </button>
                      )}
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        ID: #{dispute.id}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═════ TAB 2: STATUTORY 75% COMPLIANCE & MENTOR DESK ═════ */}
      {activeTab === 'regulatory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Statutory Rule Banner */}
          <div style={{
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#065f46' }}>
                75% Statutory Academic Regulatory Minimum
              </div>
              <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '2px' }}>
                Students maintaining ≥ 75.0% are unconditionally certified for end-term examinations and campus recruitment drives.
              </div>
            </div>

            <span style={{
              padding: '4px 10px',
              borderRadius: '8px',
              background: '#059669',
              color: '#ffffff',
              fontSize: '0.76rem',
              fontWeight: 800
            }}>
              UGC / AICTE Compliant
            </span>
          </div>

          {/* Horizontal Mentor & Counselor Guidance Card */}
          <div className="surface-card" style={{
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}>
                <UserCheck size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  {data?.counselor_name || 'Academic Counselor Desk'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {data?.counselor_email || 'Assigned per academic department'} • Academic Guidance Office
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { playCyberSound('click'); setShowCounselorModal(true); }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Request 1-on-1 Guidance Session
            </button>
          </div>

          {/* Counselor Meeting Modal */}
          {showCounselorModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}>
              <form
                onSubmit={handleRequestCounselor}
                style={{
                  width: '100%',
                  maxWidth: '460px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '20px 22px',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    Request Academic Counselor Session
                  </h4>
                  <button type="button" onClick={() => setShowCounselorModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Preferred Session Date
                  </label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.86rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Discussion Topic / Reason
                  </label>
                  <textarea
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="Enter attendance recovery query, timetable clashes, or medical leave submission..."
                    rows={3}
                    required
                    style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px 10px', fontSize: '0.86rem', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                {counselorFeedback && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    background: counselorFeedback.type === 'error' ? '#fef2f2' : '#f0fdf4',
                    color: counselorFeedback.type === 'error' ? '#b91c1c' : '#15803d'
                  }}>
                    {counselorFeedback.message}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  <button type="button" onClick={() => setShowCounselorModal(false)} style={{ padding: '7px 14px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingCounselor} style={{ padding: '7px 18px', borderRadius: '8px', background: '#059669', color: '#ffffff', border: 'none', fontSize: '0.84rem', fontWeight: 700, cursor: submittingCounselor ? 'not-allowed' : 'pointer' }}>
                    {submittingCounselor ? 'Booking...' : 'Confirm Request'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}