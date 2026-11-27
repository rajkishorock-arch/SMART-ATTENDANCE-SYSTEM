import { useState } from 'react';
import {
  FileDown,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  RefreshCw,
  GraduationCap,
  MessageSquare,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { generateLeavePdf } from '../../utils/leavePdfGenerator';
import { leaveApi } from '../../api/leaveApi.js';

const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getStatusBadge = (rawStatus) => {
  const st = String(rawStatus || 'Pending').toLowerCase();
  if (st === 'approved') {
    return {
      label: 'Approved',
      bg: 'rgba(5, 150, 105, 0.1)',
      color: '#047857',
      border: '1px solid rgba(5, 150, 105, 0.28)',
      Icon: CheckCircle2,
    };
  }
  if (st === 'rejected') {
    return {
      label: 'Rejected',
      bg: '#fef2f2',
      color: '#dc2626',
      border: '1px solid #fecaca',
      Icon: XCircle,
    };
  }
  return {
    label: 'Pending',
    bg: '#fffbeb',
    color: '#b45309',
    border: '1px solid #fde68a',
    Icon: Clock,
  };
};

export default function LeaveManagementSettings({
  token,
  playCyberSound,
  adminLeaveRequests = [],
  isFetchingLeaves,
  fetchAdminLeaves,
  routeView = null,
  setRouteView,
  onCloseSubView,
}) {
  const [localRouteView, setLocalRouteView] = useState(null);
  const activeRoute = setRouteView ? routeView : localRouteView;
  const setActiveRoute = setRouteView || setLocalRouteView;

  const [leaveTabFilter, setLeaveTabFilter] = useState('all');
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  const pendingCount = adminLeaveRequests.filter(r => (r.status || '').toLowerCase() === 'pending').length;
  const approvedCount = adminLeaveRequests.filter(r => (r.status || '').toLowerCase() === 'approved').length;
  const rejectedCount = adminLeaveRequests.filter(r => (r.status || '').toLowerCase() === 'rejected').length;
  const totalCount = adminLeaveRequests.length;

  const openLeaveDetail = (req) => {
    if (playCyberSound) playCyberSound('click');
    setReviewError('');
    setReviewSuccess('');
    setActiveRoute({ sub: 'leave_management', mode: 'detail', id: req.id, item: req });
  };

  const closeDetailView = () => {
    setReviewError('');
    setReviewSuccess('');
    if (onCloseSubView) {
      onCloseSubView();
    } else {
      setActiveRoute(null);
    }
  };

  const handleReviewLeave = async (reqId, nextStatus) => {
    setReviewError('');
    setReviewSuccess('');
    try {
      setReviewingId(reqId);
      const res = await leaveApi.reviewLeaveRequest(token, reqId, { status: nextStatus });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to update leave request.');
      }
      if (playCyberSound) playCyberSound(nextStatus === 'Approved' ? 'success' : 'click');
      setReviewSuccess(`Leave request marked as ${nextStatus}.`);
      setActiveRoute(prev => (
        prev && String(prev.id) === String(reqId) && prev.item
          ? { ...prev, item: { ...prev.item, status: nextStatus } }
          : prev
      ));
      if (fetchAdminLeaves) await fetchAdminLeaves();
    } catch (err) {
      setReviewError(err.message || 'Failed to review leave request.');
    } finally {
      setReviewingId(null);
    }
  };

  /* ===== DEDICATED LEAVE REQUEST DETAIL PAGE ===== */
  if (activeRoute?.mode === 'detail') {
    const selectedLeave =
      adminLeaveRequests.find(r => String(r.id) === String(activeRoute.id)) ||
      activeRoute.item;

    if (!selectedLeave) {
      return (
        <div className="golden-os-window golden-os-page-bottom-safe" style={{ padding: '24px', textAlign: 'center', color: '#6b5b3e' }}>
          Leave request record not found.
        </div>
      );
    }

    const badge = getStatusBadge(selectedLeave.status);
    const StatusIcon = badge.Icon;
    const isPending = String(selectedLeave.status || 'pending').toLowerCase() === 'pending';
    const isSaving = reviewingId === selectedLeave.id;

    return (
      <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
        <div className="golden-os-window" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Student Identity Card */}
          <div className="golden-os-inset-card" style={{ padding: '16px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 200px' }}>
              <div className="golden-os-avatar" style={{ width: '46px', height: '46px', fontSize: '0.96rem' }}>
                {getInitials(selectedLeave.student_name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2b2112', overflowWrap: 'anywhere' }}>
                  {selectedLeave.student_name}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#6b5b3e', fontWeight: 600, marginTop: '2px' }}>
                  Roll {selectedLeave.student_roll || 'N/A'} · {selectedLeave.student_dep || 'General'}
                </div>
              </div>
            </div>

            <span style={{
              padding: '4px 11px',
              borderRadius: '999px',
              fontSize: '0.76rem',
              fontWeight: 700,
              background: badge.bg,
              color: badge.color,
              border: badge.border,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}>
              <StatusIcon size={13} />
              <span>{badge.label}</span>
            </span>
          </div>

          {reviewError && (
            <div className="feedback-banner is-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{reviewError}</span>
            </div>
          )}

          {reviewSuccess && (
            <div className="feedback-banner is-success">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{reviewSuccess}</span>
            </div>
          )}

          {/* Application Details Section */}
          <div className="golden-os-form-section">
            <div className="golden-os-form-section-title">Application Details</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.86rem' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={14} color="#785927" /> Date Range
              </span>
              <span style={{ color: '#25231f', fontWeight: 700 }}>
                {selectedLeave.start_date} → {selectedLeave.end_date}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.86rem' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <GraduationCap size={14} color="#785927" /> Leave Type
              </span>
              <span style={{ color: '#25231f', fontWeight: 700 }}>
                {selectedLeave.leave_type || 'Casual'}
                {selectedLeave.subject_name ? ` (${selectedLeave.subject_name})` : ''}
              </span>
            </div>
            {selectedLeave.approved_by && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.86rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Reviewed By</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>{selectedLeave.approved_by}</span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingTop: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b5b3e', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <MessageSquare size={13} color="#785927" /> Reason
              </span>
              <div style={{ padding: '10px 12px', background: '#faf6ec', border: '1px solid #ece1c6', borderRadius: '10px', fontSize: '0.86rem', color: '#2b2112', lineHeight: 1.5 }}>
                {selectedLeave.reason || 'No reason specified.'}
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={() => {
                if (playCyberSound) playCyberSound('click');
                generateLeavePdf(selectedLeave);
              }}
              className="golden-os-feedback-filter-btn"
              style={{ padding: '10px 16px', borderRadius: '10px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FileDown size={15} />
              <span>Download PDF Slip</span>
            </button>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '1 1 200px', justifyContent: 'flex-end' }}>
              {isPending ? (
                <>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleReviewLeave(selectedLeave.id, 'Rejected')}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <XCircle size={15} />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleReviewLeave(selectedLeave.id, 'Approved')}
                    className="golden-os-primary-action"
                    style={{
                      width: 'auto',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #059669, #047857)',
                      gap: '5px',
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>{isSaving ? 'Updating...' : 'Approve Leave'}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closeDetailView}
                  className="golden-os-feedback-filter-btn"
                  style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem' }}
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== MAIN CLEAN LEAVE LIST (No clutter above Refresh, compact scannable rows) ===== */
  const filteredLeaves = adminLeaveRequests.filter(req => {
    const st = (req.status || '').toLowerCase();
    if (leaveTabFilter === 'pending') return st === 'pending';
    if (leaveTabFilter === 'approved') return st === 'approved';
    if (leaveTabFilter === 'rejected') return st === 'rejected';
    return true;
  });

  return (
    <div className="golden-os-window golden-os-page-bottom-safe" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
      {/* Compact Top Control Bar: Single-Row KPI Filter Tiles + Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div className="golden-os-kpi-strip" style={{ flex: '1 1 260px' }}>
          {[
            { id: 'all', label: 'All', value: totalCount, color: '#6e4e1c', activeBg: '#faf3e3' },
            { id: 'pending', label: 'Pending', value: pendingCount, color: '#b45309', activeBg: '#fffbeb' },
            { id: 'approved', label: 'Approved', value: approvedCount, color: '#047857', activeBg: '#ecfdf5' },
            { id: 'rejected', label: 'Rejected', value: rejectedCount, color: '#b91c1c', activeBg: '#fef2f2' },
          ].map(tile => {
            const isActive = leaveTabFilter === tile.id;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => {
                  if (playCyberSound) playCyberSound('click');
                  setLeaveTabFilter(tile.id);
                }}
                className="golden-os-kpi-tile"
                style={{
                  cursor: 'pointer',
                  background: isActive ? tile.activeBg : '#ffffff',
                  borderColor: isActive ? tile.color : '#e4d8bd',
                }}
              >
                <span className="golden-os-kpi-value" style={{ color: tile.color }}>{tile.value}</span>
                <span className="golden-os-kpi-label">{tile.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            if (playCyberSound) playCyberSound('click');
            if (fetchAdminLeaves) fetchAdminLeaves();
          }}
          disabled={isFetchingLeaves}
          className="golden-os-feedback-filter-btn"
          style={{
            padding: '8px 13px',
            borderRadius: '10px',
            fontSize: '0.8rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          <RefreshCw size={14} className={isFetchingLeaves ? 'spin-animation' : ''} />
          <span>{isFetchingLeaves ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Compact Leave Request Rows */}
      {isFetchingLeaves && adminLeaveRequests.length === 0 ? (
        <div className="golden-os-inset-card" style={{ padding: '28px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
          <RefreshCw size={22} className="spin-animation" style={{ color: '#8b6525' }} />
          <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#6b5b3e' }}>Loading leave requests...</span>
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="golden-os-inset-card" style={{ padding: '32px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
          <CheckCircle2 size={26} style={{ color: '#059669' }} />
          <span style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.92rem' }}>
            {adminLeaveRequests.length === 0 ? 'No leave requests yet' : `No ${leaveTabFilter} requests`}
          </span>
        </div>
      ) : (
        <div className="golden-os-list-shell">
          {filteredLeaves.map(req => {
            const badge = getStatusBadge(req.status);
            return (
              <button
                key={req.id}
                type="button"
                className="golden-os-list-row"
                onClick={() => openLeaveDetail(req)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div className="golden-os-avatar">{getInitials(req.student_name)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {req.student_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b5b3e', fontWeight: 600, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Roll {req.student_roll || 'N/A'} · {req.start_date} → {req.end_date}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{
                    padding: '3px 9px',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: badge.bg,
                    color: badge.color,
                    border: badge.border,
                  }}>
                    {badge.label}
                  </span>
                  <ChevronRight size={16} color="#8c734b" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
