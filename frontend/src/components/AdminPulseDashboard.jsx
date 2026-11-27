import { useState, useEffect } from 'react';
import {
  Camera,
  FileText,
  Smartphone,
  Calendar,
  ChevronRight,
  Edit,
} from 'lucide-react';
import { disputeApi } from '../api/disputeApi.js';
import { buildApiUrl } from '../api/client.js';

export default function AdminPulseDashboard({
  stats,
  onOpenScanner,
  onOpenManualAttendance,
  onNavigateTab,
  token,
  lang = 'en',
}) {
  const presentToday = stats?.total_present_today ?? 0;
  const absentToday = stats?.total_absent_today ?? 0;
  const totalStudents = stats?.total_students ?? (presentToday + absentToday);
  const attendanceRate = stats?.average_attendance_rate ?? (totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0);

  const [pendingDisputesCount, setPendingDisputesCount] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_disputes_pending_count');
      return cached ? parseInt(cached, 10) : (stats?.pending_disputes ?? 0);
    } catch {
      return 0;
    }
  });

  const [borderlineMatchesCount, setBorderlineMatchesCount] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_borderline_pending_count');
      return cached ? parseInt(cached, 10) : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const fetchLiveActionCounts = async () => {
      try {
        const res = await disputeApi.fetchDisputeQueue(token, 'PENDING');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && isMounted) {
            setPendingDisputesCount(data.length);
            try { localStorage.setItem('cached_disputes_pending_count', String(data.length)); } catch { /* ignore */ }
          }
        }
      } catch {
        /* silent fallback */
      }

      try {
        const reviewUrl = buildApiUrl('/review-queue?status=PENDING');
        const res = await fetch(reviewUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && isMounted) {
            setBorderlineMatchesCount(data.length);
            try { localStorage.setItem('cached_borderline_pending_count', String(data.length)); } catch { /* ignore */ }
          }
        }
      } catch {
        /* silent fallback */
      }
    };

    fetchLiveActionCounts();
    return () => { isMounted = false; };
  }, [token]);

  const priorityActions = [
    {
      key: 'disputes',
      label: lang === 'hi'
        ? `उपस्थिति आपत्तियां${pendingDisputesCount > 0 ? ` (${pendingDisputesCount})` : ''}`
        : `Attendance Disputes${pendingDisputesCount > 0 ? ` (${pendingDisputesCount})` : ''}`,
      icon: FileText,
      highlight: pendingDisputesCount > 0,
      onClick: () => onNavigateTab && onNavigateTab('disputes'),
    },
    {
      key: 'face-review',
      label: lang === 'hi'
        ? `बॉर्डरलाइन चेहरे समीक्षा${borderlineMatchesCount > 0 ? ` (${borderlineMatchesCount})` : ''}`
        : `Borderline Face Matches${borderlineMatchesCount > 0 ? ` (${borderlineMatchesCount})` : ''}`,
      icon: Camera,
      highlight: borderlineMatchesCount > 0,
      onClick: () => onNavigateTab && onNavigateTab('face-review'),
    },
    {
      key: 'devices',
      label: lang === 'hi' ? 'कियोस्क एवं कैमरा फ्लीट' : 'Scanner Kiosk Fleet',
      icon: Smartphone,
      highlight: false,
      onClick: () => onNavigateTab && onNavigateTab('devices'),
    },
    {
      key: 'broadcast',
      label: lang === 'hi' ? 'कैंपस सूचनाएं एवं नोटिस' : 'Campus Broadcasts & Notices',
      icon: Calendar,
      highlight: false,
      onClick: () => onNavigateTab && onNavigateTab('broadcast'),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* 1. Golden Gate Hero Summary & Session Launcher */}
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#785927' }}>
                {lang === 'hi' ? 'कैंपस डैशबोर्ड' : 'Campus Overview'} · {totalStudents} {lang === 'hi' ? 'छात्र' : 'Enrolled'}
              </div>
              <h2 style={{ margin: '2px 0 0', fontSize: '1.12rem', fontWeight: 800, color: '#25231f' }}>
                {lang === 'hi' ? 'आज की उपस्थिति' : "Today's Attendance"}
              </h2>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#785927' }}>
              {new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>

          <div
            className="golden-os-inset-card"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              textAlign: 'center',
              padding: '10px 8px',
            }}
          >
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#047857' }}>{presentToday}</div>
              <div style={{ fontSize: '0.68rem', color: '#6b5b3e', fontWeight: 700 }}>{lang === 'hi' ? 'उपस्थित' : 'Present'}</div>
            </div>
            <div style={{ borderLeft: '1px solid #eadfcb', borderRight: '1px solid #eadfcb' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#b91c1c' }}>{absentToday}</div>
              <div style={{ fontSize: '0.68rem', color: '#6b5b3e', fontWeight: 700 }}>{lang === 'hi' ? 'अनुपस्थित' : 'Absent'}</div>
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#684c20' }}>{attendanceRate}%</div>
              <div style={{ fontSize: '0.68rem', color: '#6b5b3e', fontWeight: 700 }}>{lang === 'hi' ? 'उपस्थिति दर' : 'Rate'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onOpenScanner}
              style={{
                flex: '1 1 180px',
                padding: '12px 16px',
                borderRadius: '11px',
                border: 'none',
                background: 'linear-gradient(135deg, #785927 0%, #5e441b 100%)',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(94, 68, 27, 0.2)',
              }}
            >
              <Camera size={16} />
              <span>{lang === 'hi' ? 'उपस्थिति सत्र शुरू करें' : 'Start Attendance Session'}</span>
            </button>

            {onOpenManualAttendance && (
              <button
                type="button"
                onClick={onOpenManualAttendance}
                className="golden-os-feedback-filter-btn"
                style={{
                  padding: '12px 15px',
                  borderRadius: '11px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                }}
              >
                <Edit size={15} />
                <span>Manual</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Priority Action Required Queue (Crisp Single-Line Golden Gate List) */}
      <div>
        <div style={{ padding: '0 4px 8px' }}>
          <span className="golden-os-field-label" style={{ marginBottom: 0 }}>
            {lang === 'hi' ? 'त्वरित कार्रवाई केंद्र' : 'Action Required'}
          </span>
        </div>
        <div className="golden-os-list-shell">
          {priorityActions.map((item) => {
            const RowIcon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                className="golden-os-list-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div
                    className="golden-os-avatar"
                    style={item.highlight ? { background: '#fffbeb', borderColor: '#f59e0b', color: '#b45309' } : undefined}
                  >
                    <RowIcon size={16} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1, fontSize: '0.9rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </div>
                </div>
                <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
