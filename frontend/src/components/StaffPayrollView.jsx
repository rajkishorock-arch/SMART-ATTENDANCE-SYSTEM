import { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, Clock, CheckCircle2,
  AlertTriangle, RefreshCw, CreditCard,
  LogIn, LogOut, X
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

export default function StaffPayrollView({
  token,
  currentUser,
  playCyberSound = () => {}
}) {
  const isAdmin = currentUser?.role === 'admin';

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

  // Punch states
  const [isPunching, setIsPunching] = useState(false);

  // Payroll modal states
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [workingDays, setWorkingDays] = useState(26);
  const [baseSalary, setBaseSalary] = useState(50000);
  const [isCalculating, setIsCalculating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (activeSubTab === 'payroll') {
        const res = await fetch(`${API_BASE_URL}/staff/payroll?month_year=${selectedMonth}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setPayrollRecords(await res.json());
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/staff/attendance`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setAttendanceLogs(await res.json());
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch staff records.');
    } finally {
      setIsLoading(false);
    }
  }, [token, activeSubTab, selectedMonth]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await fetchData();
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, [fetchData]);

  // ── Staff Punch In / Out ──────────────────────────────────────────────────
  const handlePunch = async (action) => {
    setIsPunching(true);
    setErrorMsg('');
    try {
      const endpoint = action === 'in' ? '/staff/check-in' : '/staff/check-out';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Staff punch ${action} failed.`);
      const data = await res.json();
      playCyberSound('success');
      setSuccessMsg(`Punched ${action.toUpperCase()} recorded at ${action === 'in' ? data.check_in : data.check_out}!`);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsPunching(false);
    }
  };

  // ── Calculate Payroll ─────────────────────────────────────────────────────
  const handleCalculatePayroll = async (e) => {
    e.preventDefault();
    setIsCalculating(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/staff/payroll/calculate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          month_year: selectedMonth,
          working_days: parseInt(workingDays),
          default_base_salary: parseFloat(baseSalary)
        })
      });
      if (!res.ok) throw new Error('Payroll calculation failed.');
      const data = await res.json();
      playCyberSound('success');
      setSuccessMsg(`Calculated payroll for ${data.length} staff members!`);
      setShowCalcModal(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsCalculating(false);
    }
  };

  // ── Approve Payroll Record ────────────────────────────────────────────────
  const handleApprovePayroll = async (recordId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/payroll/${recordId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
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

  return (
    <div className="staff-payroll-container" style={{
      color: 'var(--color-text-main)',
      padding: '24px',
      maxWidth: '1280px',
      margin: '0 auto',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* Banner Header */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-card)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                background: 'rgba(5, 150, 105, 0.08)',
                border: '1px solid #a7f3d0',
                borderRadius: '10px',
                padding: '8px',
                color: '#059669',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <DollarSign size={22} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
                Staff Attendance & Payroll
              </h2>
              <span style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#059669',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '16px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                FACULTY & STAFF
              </span>
            </div>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.88rem', maxWidth: '750px', lineHeight: 1.5 }}>
              Biometric check-in and check-out logs, overtime auditing, leave deductions, 
              and monthly salary disbursement calculations.
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handlePunch('in')}
              disabled={isPunching}
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399', padding: '10px 16px', borderRadius: '10px',
                cursor: isPunching ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '0.88rem', fontWeight: 600
              }}
            >
              <LogIn size={16} />
              Punch In
            </button>

            <button
              onClick={() => handlePunch('out')}
              disabled={isPunching}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171', padding: '10px 16px', borderRadius: '10px',
                cursor: isPunching ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '0.88rem', fontWeight: 600
              }}
            >
              <LogOut size={16} />
              Punch Out
            </button>

            {isAdmin && (
              <button
                onClick={() => { playCyberSound('click'); setShowCalcModal(true); }}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none', color: '#fff',
                  padding: '10px 18px', borderRadius: '10px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                  fontSize: '0.88rem', fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                <CreditCard size={16} />
                Generate Payroll
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#f87171', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem'
        }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs & Month Filter */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px',
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { playCyberSound('click'); setActiveSubTab('payroll'); }}
            style={{
              background: activeSubTab === 'payroll' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              border: activeSubTab === 'payroll' ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid transparent',
              color: activeSubTab === 'payroll' ? '#34d399' : '#94a3b8',
              padding: '6px 16px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Monthly Payroll Register
          </button>

          <button
            onClick={() => { playCyberSound('click'); setActiveSubTab('attendance'); }}
            style={{
              background: activeSubTab === 'attendance' ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
              border: activeSubTab === 'attendance' ? '1px solid rgba(0, 242, 254, 0.5)' : '1px solid transparent',
              color: activeSubTab === 'attendance' ? '#00f2fe' : '#94a3b8',
              padding: '6px 16px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Staff Punch Logs
          </button>
        </div>

        {activeSubTab === 'payroll' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Month:</span>
            <input
              type="text"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              placeholder="MM/YYYY"
              style={{
                background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem',
                width: '100px', textAlign: 'center', fontFamily: 'monospace'
              }}
            />
            <button
              onClick={() => { playCyberSound('click'); fetchData(); }}
              style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#cbd5e1', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem' }}
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* ── SUBTAB 1: PAYROLL REGISTER ────────────────────────────────────── */}
      {activeSubTab === 'payroll' && (
        <div>
          {payrollRecords.length === 0 ? (
            <div style={{
              background: '#ffffff', border: '1px dashed var(--border-subtle)',
              borderRadius: '16px', padding: '48px 24px', textAlign: 'center', color: '#64748b'
            }}>
              <DollarSign size={40} color="#059669" style={{ opacity: 0.6, marginBottom: '12px' }} />
              <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '1.1rem' }}>
                No Payroll Computed for {selectedMonth}
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                Click "Generate Payroll" above to automatically calculate attendance-based payouts.
              </p>
            </div>
          ) : (
            <div style={{
              background: '#ffffff',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              overflowX: 'auto',
              boxShadow: 'var(--shadow-card)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '14px 18px', color: '#64748b', fontWeight: 600, position: 'sticky', left: 0, zIndex: 10, background: '#f8fafc' }}>Staff Member</th>
                    <th style={{ padding: '14px 18px', color: '#64748b', fontWeight: 600 }}>Attendance Breakdown</th>
                    <th style={{ padding: '14px 18px', color: '#64748b', fontWeight: 600 }}>Gross Base</th>
                    <th style={{ padding: '14px 18px', color: '#64748b', fontWeight: 600 }}>Deductions</th>
                    <th style={{ padding: '14px 18px', color: '#64748b', fontWeight: 600 }}>Net Payout</th>
                    <th style={{ padding: '14px 18px', color: '#64748b', fontWeight: 600 }}>Status</th>
                    {isAdmin && <th style={{ padding: '14px 18px', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {payrollRecords.map(rec => (
                    <tr key={rec.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '14px 18px', position: 'sticky', left: 0, zIndex: 5, background: '#0f172a' }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{rec.staff_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{rec.staff_email}</div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ color: '#34d399', fontWeight: 600 }}>{rec.days_present} Present</span> •{' '}
                        <span style={{ color: '#fbbf24' }}>{rec.days_half} Half</span> •{' '}
                        <span style={{ color: '#f87171' }}>{rec.days_absent} Absent</span> / {rec.working_days} Days
                      </td>
                      <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>
                        ₹{rec.gross_salary.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#f87171', fontWeight: 600 }}>
                        -₹{rec.deductions.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#34d399', fontWeight: 800, fontSize: '1rem' }}>
                        ₹{rec.net_salary.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          background: rec.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          border: rec.status === 'APPROVED' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                          color: rec.status === 'APPROVED' ? '#34d399' : '#fbbf24',
                          fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px'
                        }}>
                          {rec.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          {rec.status !== 'APPROVED' ? (
                            <button
                              onClick={() => handleApprovePayroll(rec.id)}
                              style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                color: '#34d399', padding: '6px 12px', borderRadius: '6px',
                                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
                              }}
                            >
                              Approve Payout
                            </button>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Approved</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SUBTAB 2: STAFF PUNCH LOGS ────────────────────────────────────── */}
      {activeSubTab === 'attendance' && (
        <div>
          {attendanceLogs.length === 0 ? (
            <div style={{
              background: '#ffffff', border: '1px dashed var(--border-subtle)',
              borderRadius: '16px', padding: '48px 24px', textAlign: 'center', color: '#64748b'
            }}>
              <Clock size={40} color="#1e40af" style={{ opacity: 0.6, marginBottom: '12px' }} />
              <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '1.1rem' }}>
                No Staff Punches Found
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                Staff members can record daily biometric check-in using the "Punch In" button.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px'
            }}>
              {attendanceLogs.map(log => (
                <div
                  key={log.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '14px', padding: '18px',
                    boxShadow: 'var(--shadow-card)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.05rem' }}>{log.staff_name}</h4>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>📅 {log.date}</span>
                    </div>

                    <span style={{
                      background: log.status === 'OVERTIME' ? 'rgba(139, 92, 246, 0.2)' : log.status === 'HALF_DAY' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      border: log.status === 'OVERTIME' ? '1px solid rgba(139, 92, 246, 0.4)' : log.status === 'HALF_DAY' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                      color: log.status === 'OVERTIME' ? '#a78bfa' : log.status === 'HALF_DAY' ? '#fbbf24' : '#34d399',
                      fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px'
                    }}>
                      {log.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '10px' }}>
                    <div>
                      <span style={{ color: '#94a3b8' }}>In: </span>
                      <strong style={{ color: '#34d399' }}>{log.check_in || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Out: </span>
                      <strong style={{ color: '#f87171' }}>{log.check_out || '—'}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#cbd5e1' }}>
                    <span>Hours Worked: <strong>{log.hours_worked} hrs</strong></span>
                    {log.overtime_hours > 0 && (
                      <span style={{ color: '#a78bfa', fontWeight: 600 }}>+{log.overtime_hours} hrs Overtime</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: GENERATE PAYROLL */}
      {showCalcModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', border: '1px solid var(--border-subtle)',
            borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '28px', position: 'relative',
            boxShadow: 'var(--shadow-modal)'
          }}>
            <button
              onClick={() => setShowCalcModal(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#0f172a' }}>Generate Monthly Payroll</h3>
            <p style={{ margin: '0 0 18px 0', color: '#64748b', fontSize: '0.85rem' }}>
              Target Cycle: <strong>{selectedMonth}</strong>
            </p>

            <form onSubmit={handleCalculatePayroll}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '6px', fontWeight: 600 }}>
                  Institutional Working Days *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={31}
                  value={workingDays}
                  onChange={e => setWorkingDays(e.target.value)}
                  style={{
                    width: '100%', background: '#ffffff',
                    border: '1px solid var(--border-subtle)', color: '#0f172a',
                    padding: '10px 12px', borderRadius: '8px', fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '6px', fontWeight: 600 }}>
                  Default Base Monthly Salary (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={baseSalary}
                  onChange={e => setBaseSalary(e.target.value)}
                  style={{
                    width: '100%', background: '#ffffff',
                    border: '1px solid var(--border-subtle)', color: '#059669',
                    padding: '10px 12px', borderRadius: '8px', fontSize: '1rem', fontWeight: 700
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCalcModal(false)}
                  style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCalculating}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none', color: '#fff', padding: '8px 20px', borderRadius: '8px',
                    fontWeight: 700, cursor: isCalculating ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isCalculating ? 'Computing...' : 'Calculate Payouts'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
