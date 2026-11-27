import './campusAdmin.css';
import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Clock, CheckCircle2,
  AlertTriangle, RefreshCw, CreditCard,
  LogIn, LogOut, ChevronRight
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

const DEMO_PAYROLL = [
  {
    id: 1,
    staff_name: 'Dr. R. K. Singh',
    staff_email: 'rksingh@univ.edu',
    days_present: 24,
    days_half: 1,
    days_absent: 1,
    working_days: 26,
    gross_salary: 65000,
    deductions: 2500,
    net_salary: 62500,
    status: 'APPROVED'
  },
  {
    id: 2,
    staff_name: 'Dr. Priya Sen',
    staff_email: 'priyasen@univ.edu',
    days_present: 23,
    days_half: 2,
    days_absent: 1,
    working_days: 26,
    gross_salary: 58000,
    deductions: 3200,
    net_salary: 54800,
    status: 'PENDING'
  }
];

const DEMO_PUNCHES = [
  {
    id: 101,
    staff_name: 'Dr. R. K. Singh',
    date: '2026-11-27',
    check_in: '08:55 AM',
    check_out: '05:15 PM',
    hours_worked: 8.3,
    overtime_hours: 0.3,
    status: 'OVERTIME'
  },
  {
    id: 102,
    staff_name: 'Dr. Priya Sen',
    date: '2026-11-27',
    check_in: '09:04 AM',
    check_out: '04:30 PM',
    hours_worked: 7.4,
    overtime_hours: 0,
    status: 'PRESENT'
  }
];

export default function StaffPayrollView({
  token,
  currentUser,
  isDemoMode = false,
  playCyberSound = () => {},
  routeView: propRouteView,
  setRouteView: propSetRouteView
}) {
  const isAdmin = currentUser?.role === 'admin';
  const [localRouteView, setLocalRouteView] = useState(null);
  const routeView = propSetRouteView !== undefined ? propRouteView : localRouteView;
  const setRouteView = propSetRouteView !== undefined ? propSetRouteView : setLocalRouteView;

  const [activeSubTab, setActiveSubTab] = useState('payroll'); // 'payroll' or 'attendance'
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [isPunching, setIsPunching] = useState(false);
  const [workingDays, setWorkingDays] = useState(26);
  const [baseSalary, setBaseSalary] = useState(50000);
  const [isCalculating, setIsCalculating] = useState(false);

  const isSandbox = isDemoMode || token === 'guest-demo-token';

  const fetchData = useCallback(async () => {
    if (!token) return;
    if (isSandbox) {
      setPayrollRecords(DEMO_PAYROLL);
      setAttendanceLogs(DEMO_PUNCHES);
      setErrorMsg('');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (activeSubTab === 'payroll') {
        const res = await fetch(`${API_BASE_URL}/staff/payroll?month_year=${selectedMonth}`, { headers });
        if (!res.ok) throw new Error((await res.json()).detail || 'Could not load staff payroll records.');
        const rows = await res.json();
        setPayrollRecords(Array.isArray(rows) ? rows : []);
      } else {
        const res = await fetch(`${API_BASE_URL}/staff/attendance`, { headers });
        if (!res.ok) throw new Error((await res.json()).detail || 'Could not load staff punch logs.');
        const rows = await res.json();
        setAttendanceLogs(Array.isArray(rows) ? rows : []);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch staff records.');
    } finally {
      setIsLoading(false);
    }
  }, [token, activeSubTab, selectedMonth, isSandbox]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) await fetchData();
    };
    run();
    return () => { ignore = true; };
  }, [fetchData]);

  const handlePunch = async (action) => {
    if (isSandbox) {
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      playCyberSound('success');
      setSuccessMsg(`Sandbox preview: Punch ${action.toUpperCase()} recorded at ${timeNow}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }
    setIsPunching(true);
    setErrorMsg('');
    try {
      const endpoint = action === 'in' ? '/staff/check-in' : '/staff/check-out';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error((await res.json()).detail || `Staff punch ${action} failed.`);
      const data = await res.json();
      playCyberSound('success');
      setSuccessMsg(`Punch ${action.toUpperCase()} recorded at ${action === 'in' ? data.check_in : data.check_out}!`);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsPunching(false);
    }
  };

  const handleCalculatePayroll = async (e) => {
    e.preventDefault();
    if (isSandbox) {
      playCyberSound('success');
      setSuccessMsg(`Sandbox preview: Payroll computed for ${selectedMonth}.`);
      setRouteView(null);
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }
    setIsCalculating(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/staff/payroll/calculate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          month_year: selectedMonth,
          working_days: parseInt(workingDays, 10),
          default_base_salary: parseFloat(baseSalary)
        })
      });
      if (!res.ok) throw new Error('Payroll calculation failed.');
      const data = await res.json();
      playCyberSound('success');
      setSuccessMsg(`Calculated payroll for ${data.length} staff members!`);
      setRouteView(null);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleApprovePayroll = async (recordId) => {
    if (isSandbox) {
      playCyberSound('success');
      setSuccessMsg('Sandbox preview: Payroll payout approved!');
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/staff/payroll/${recordId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to approve payroll record.');
      playCyberSound('success');
      setSuccessMsg('Payroll payout approved!');
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    }
  };

  // ── SUBPAGE 1: GENERATE MONTHLY PAYROLL ────────────────────────────────────
  if (routeView?.mode === 'generate') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {errorMsg && (
              <div className="feedback-banner error" role="alert">
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCalculatePayroll} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="golden-os-form-section">
                <div className="golden-os-form-section-title">Payroll Calculation Parameters • {selectedMonth}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div>
                    <label className="golden-os-field-label">Institutional Working Days *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={31}
                      className="golden-os-input"
                      value={workingDays}
                      onChange={e => setWorkingDays(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="golden-os-field-label">Default Base Monthly Salary (₹) *</label>
                    <input
                      type="number"
                      required
                      min={1000}
                      className="golden-os-input"
                      value={baseSalary}
                      onChange={e => setBaseSalary(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="golden-os-feedback-filter-btn" onClick={() => setRouteView(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={isCalculating} className="golden-os-action-pill">
                  <CreditCard size={15} />
                  <span>{isCalculating ? 'Computing...' : 'Calculate Payouts'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── SUBPAGE 2: STAFF PAYROLL RECORD DETAIL ─────────────────────────────────
  if (routeView?.mode === 'record') {
    const rec =
      payrollRecords.find(r => String(r.id) === String(routeView.id)) ||
      routeView.item ||
      (isSandbox ? DEMO_PAYROLL.find(r => String(r.id) === String(routeView.id)) : null) ||
      null;

    if (!rec) {
      return (
        <div className="golden-os-page-bottom-safe">
          <div className="golden-os-window">
            <div className="golden-os-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <DollarSign size={36} color="#916d30" style={{ opacity: 0.45, marginBottom: '10px' }} />
              <div style={{ fontWeight: 700, color: '#25231f', marginBottom: '8px' }}>Payroll record not found</div>
              <button type="button" className="golden-os-action-pill" onClick={() => setRouteView(null)}>
                Back to Payroll
              </button>
            </div>
          </div>
        </div>
      );
    }

    const isApproved = rec.status === 'APPROVED';

    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {successMsg && (
              <div className="feedback-banner success" role="status">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="feedback-banner error" role="alert">
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="golden-os-inset-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#25231f' }}>{rec.staff_name}</div>
                <div style={{ fontSize: '0.78rem', color: '#696358' }}>{rec.staff_email} • {selectedMonth}</div>
              </div>
              <span style={{
                background: isApproved ? '#ecfdf5' : '#fffbeb',
                border: `1px solid ${isApproved ? '#a7f3d0' : '#fde68a'}`,
                color: isApproved ? '#059669' : '#d97706',
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: '999px'
              }}>
                {rec.status}
              </span>
            </div>

            <div className="golden-os-list-shell">
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Attendance Breakdown</span>
                <strong style={{ color: '#25231f', fontSize: '0.85rem' }}>
                  {rec.days_present} Present • {rec.days_half} Half • {rec.days_absent} Absent / {rec.working_days} Days
                </strong>
              </div>
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Gross Base Salary</span>
                <strong style={{ color: '#25231f', fontSize: '0.88rem' }}>₹{rec.gross_salary.toLocaleString()}</strong>
              </div>
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Deductions</span>
                <strong style={{ color: '#dc2626', fontSize: '0.88rem' }}>-₹{rec.deductions.toLocaleString()}</strong>
              </div>
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem', fontWeight: 700 }}>Net Payout</span>
                <strong style={{ color: '#059669', fontSize: '1.05rem' }}>₹{rec.net_salary.toLocaleString()}</strong>
              </div>
            </div>

            {isAdmin && !isApproved && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => handleApprovePayroll(rec.id)}
                  className="golden-os-action-pill"
                >
                  <CheckCircle2 size={15} />
                  <span>Approve Payout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── SUBPAGE 3: STAFF PUNCH DETAIL ──────────────────────────────────────────
  if (routeView?.mode === 'punch') {
    const log =
      attendanceLogs.find(l => String(l.id) === String(routeView.id)) ||
      routeView.item ||
      (isSandbox ? DEMO_PUNCHES.find(l => String(l.id) === String(routeView.id)) : null) ||
      null;

    if (!log) {
      return (
        <div className="golden-os-page-bottom-safe">
          <div className="golden-os-window">
            <div className="golden-os-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Clock size={36} color="#916d30" style={{ opacity: 0.45, marginBottom: '10px' }} />
              <div style={{ fontWeight: 700, color: '#25231f', marginBottom: '8px' }}>Punch log not found</div>
              <button type="button" className="golden-os-action-pill" onClick={() => setRouteView(null)}>
                Back to Punch Logs
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-inset-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#25231f' }}>{log.staff_name}</div>
                <div style={{ fontSize: '0.78rem', color: '#696358' }}>Date: {log.date}</div>
              </div>
              <span style={{
                background: log.status === 'OVERTIME' ? '#f5f3ff' : '#ecfdf5',
                border: `1px solid ${log.status === 'OVERTIME' ? '#ddd6fe' : '#a7f3d0'}`,
                color: log.status === 'OVERTIME' ? '#7c3aed' : '#059669',
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: '999px'
              }}>
                {log.status}
              </span>
            </div>

            <div className="golden-os-list-shell">
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Biometric Check-In</span>
                <strong style={{ color: '#059669', fontSize: '0.88rem' }}>{log.check_in || '—'}</strong>
              </div>
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Biometric Check-Out</span>
                <strong style={{ color: '#dc2626', fontSize: '0.88rem' }}>{log.check_out || '—'}</strong>
              </div>
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Total Hours Worked</span>
                <strong style={{ color: '#25231f', fontSize: '0.88rem' }}>{log.hours_worked} hrs</strong>
              </div>
              {log.overtime_hours > 0 && (
                <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                  <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Overtime Logged</span>
                  <strong style={{ color: '#7c3aed', fontSize: '0.88rem' }}>+{log.overtime_hours} hrs</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN SCREEN: CLEAN GOLDEN GATE MASTER LIST ─────────────────────────────
  return (
    <div className="golden-os-page-bottom-safe">
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Compact Top Action Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handlePunch('in')}
                disabled={isPunching}
                className="golden-os-feedback-filter-btn"
              >
                <LogIn size={14} />
                <span>Punch In</span>
              </button>
              <button
                type="button"
                onClick={() => handlePunch('out')}
                disabled={isPunching}
                className="golden-os-feedback-filter-btn"
              >
                <LogOut size={14} />
                <span>Punch Out</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button type="button" className="golden-os-feedback-filter-btn" onClick={fetchData} disabled={isLoading}>
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => { playCyberSound('click'); setErrorMsg(''); setRouteView({ mode: 'generate' }); }}
                  className="golden-os-action-pill"
                >
                  <CreditCard size={14} />
                  <span>Generate Payroll</span>
                </button>
              )}
            </div>
          </div>

          {successMsg && (
            <div className="feedback-banner success" role="status">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="feedback-banner error" role="alert">
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Switcher & Month */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { playCyberSound('click'); setActiveSubTab('payroll'); }}
                className={`golden-os-feedback-filter-btn ${activeSubTab === 'payroll' ? 'active' : ''}`}
              >
                Payroll Register
              </button>
              <button
                type="button"
                onClick={() => { playCyberSound('click'); setActiveSubTab('attendance'); }}
                className={`golden-os-feedback-filter-btn ${activeSubTab === 'attendance' ? 'active' : ''}`}
              >
                Punch Logs
              </button>
            </div>

            {activeSubTab === 'payroll' && (
              <input
                type="month"
                aria-label="Payroll month"
                className="golden-os-input"
                value={selectedMonth.split('/').reverse().join('-')}
                onChange={e => e.target.value && setSelectedMonth(e.target.value.split('-').reverse().join('/'))}
                style={{ width: 'auto', minWidth: '145px', padding: '7px 10px' }}
              />
            )}
          </div>

          {/* Clean List View */}
          {activeSubTab === 'payroll' ? (
            <div className="golden-os-list-shell">
              {payrollRecords.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: '#696358' }}>
                  <DollarSign size={34} color="#059669" style={{ opacity: 0.55, marginBottom: '10px' }} />
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#25231f' }}>
                    No Payroll Computed for {selectedMonth}
                  </div>
                </div>
              ) : (
                payrollRecords.map(rec => {
                  const isApproved = rec.status === 'APPROVED';
                  return (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => {
                        playCyberSound('click');
                        setErrorMsg('');
                        setRouteView({ mode: 'record', id: String(rec.id), item: rec });
                      }}
                      className="golden-os-list-row"
                      style={{ width: '100%', background: 'transparent', borderLeft: 'none', borderRight: 'none', borderTop: 'none', textAlign: 'left', cursor: 'pointer' }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rec.staff_name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#696358', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rec.days_present}/{rec.working_days} days • ₹{rec.net_salary.toLocaleString()} net
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{
                          background: isApproved ? '#ecfdf5' : '#fffbeb',
                          border: `1px solid ${isApproved ? '#a7f3d0' : '#fde68a'}`,
                          color: isApproved ? '#059669' : '#d97706',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: '999px'
                        }}>
                          {rec.status}
                        </span>
                        <ChevronRight size={16} color="#9c9384" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <div className="golden-os-list-shell">
              {attendanceLogs.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: '#696358' }}>
                  <Clock size={34} color="#61471e" style={{ opacity: 0.55, marginBottom: '10px' }} />
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#25231f' }}>No Staff Punches Found</div>
                </div>
              ) : (
                attendanceLogs.map(log => (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => {
                      playCyberSound('click');
                      setRouteView({ mode: 'punch', id: String(log.id), item: log });
                    }}
                    className="golden-os-list-row"
                    style={{ width: '100%', background: 'transparent', borderLeft: 'none', borderRight: 'none', borderTop: 'none', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.staff_name}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#696358' }}>
                        {log.date} • {log.hours_worked} hrs
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{
                        background: log.status === 'OVERTIME' ? '#f5f3ff' : '#ecfdf5',
                        border: `1px solid ${log.status === 'OVERTIME' ? '#ddd6fe' : '#a7f3d0'}`,
                        color: log.status === 'OVERTIME' ? '#7c3aed' : '#059669',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: '999px'
                      }}>
                        {log.status}
                      </span>
                      <ChevronRight size={16} color="#9c9384" />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
