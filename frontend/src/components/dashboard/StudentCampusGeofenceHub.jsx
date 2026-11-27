import { useState, useEffect, useCallback } from 'react';
import {
  Navigation,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ChevronRight,
  Compass,
  Info,
  Trash2,
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/platform';

export default function StudentCampusGeofenceHub({
  token,
  API_BASE_URL = getApiBaseUrl(),
  geofenceStatus = { checked: false, inside: false, distance: null },
  setGeofenceStatus = () => {},
  routeView = null,
  onNavigateRoute = null,
  onNavigateBack = null,
  playCyberSound = () => {},
}) {
  const [policy, setPolicy] = useState(null);
  const [policyLoaded, setPolicyLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [lastVerifiedAt, setLastVerifiedAt] = useState(null);
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_geo_audit_logs');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const subMode = routeView?.section === 'geofence' ? routeView?.mode : null;

  const fetchServerPolicy = useCallback(async (lat = null, lng = null) => {
    if (!token) return null;
    try {
      const qs = lat != null && lng != null ? `?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}` : '';
      const res = await fetch(`${API_BASE_URL}/settings/geofence-status${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      setPolicy(data);
      setPolicyLoaded(true);
      return data;
    } catch {
      setPolicyLoaded(true);
      return null;
    }
  }, [token, API_BASE_URL]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    fetch(`${API_BASE_URL}/settings/geofence-status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled) return;
        if (data) setPolicy(data);
        setPolicyLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setPolicyLoaded(true);
      });
    return () => { cancelled = true; };
  }, [token, API_BASE_URL]);

  const handleVerifyLocation = useCallback(() => {
    playCyberSound('click');
    setIsScanning(true);
    setGpsError('');

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setIsScanning(false);
      setGpsError('Location services are not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const acc = Math.round(accuracy || 10);
        setGpsCoords({ lat: latitude, lng: longitude });
        setGpsAccuracy(acc);

        const serverRes = await fetchServerPolicy(latitude, longitude);
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastVerifiedAt(nowStr);

        let distanceM = serverRes?.distance_meters ?? null;
        let isInside = serverRes ? Boolean(serverRes.inside) : !policy?.geofencing_enabled;

        // If server policy was unreachable but local campus center exists, compute locally
        if (!serverRes && policy?.campus_calibrated && policy.center_latitude != null && policy.center_longitude != null) {
          const R = 6371000;
          const dLat = (latitude - policy.center_latitude) * (Math.PI / 180);
          const dLng = (longitude - policy.center_longitude) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(policy.center_latitude * (Math.PI / 180)) *
              Math.cos(latitude * (Math.PI / 180)) *
              Math.sin(dLng / 2) ** 2;
          distanceM = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
          isInside = !policy.geofencing_enabled || distanceM <= (policy.allowed_radius_meters || 250);
        }

        const nextStatus = {
          checked: true,
          inside: isInside,
          distance: distanceM,
        };
        setGeofenceStatus(nextStatus);

        const newLog = {
          id: Date.now(),
          timestamp: nowStr,
          distance: distanceM,
          inside: isInside,
          accuracy: acc,
          enforced: Boolean(serverRes?.geofencing_enabled ?? policy?.geofencing_enabled),
        };
        setAuditLogs(prev => {
          const updated = [newLog, ...prev.slice(0, 9)];
          try { localStorage.setItem('cached_geo_audit_logs', JSON.stringify(updated)); } catch { /* ignore */ }
          return updated;
        });

        playCyberSound(isInside ? 'success' : 'error');
        setIsScanning(false);
      },
      (err) => {
        setIsScanning(false);
        if (err?.code === 1) {
          setGpsError('Location permission denied. Allow location access in browser settings to verify.');
        } else if (err?.code === 3) {
          setGpsError('GPS signal timed out. Move near a window or retry verification.');
        } else {
          setGpsError('Unable to read device GPS coordinates right now.');
        }
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    );
  }, [fetchServerPolicy, policy, setGeofenceStatus, playCyberSound]);

  const closeSubPage = () => {
    playCyberSound('click');
    if (onNavigateBack) onNavigateBack();
    else if (onNavigateRoute) onNavigateRoute({ section: 'geofence' });
  };

  const isEnforced = Boolean(policy?.geofencing_enabled);
  const allowedRadius = policy?.allowed_radius_meters || 250;
  const isCalibrated = Boolean(policy?.campus_calibrated);
  const isInside = isEnforced ? Boolean(geofenceStatus.inside) : true;

  /* ===== DEDICATED PAGE 1: PERIMETER & CAMPUS RULES ===== */
  if (subMode === 'perimeter') {
    const rows = [
      {
        label: 'Geofence Enforcement',
        value: policyLoaded ? (isEnforced ? 'Active (Required)' : 'Optional (Not Enforced)') : 'Checking...',
        color: isEnforced ? '#785927' : '#047857',
      },
      {
        label: 'Allowed Campus Radius',
        value: `${Math.round(allowedRadius)} meters`,
      },
      {
        label: 'Campus Center GPS',
        value: isCalibrated
          ? `${Number(policy.center_latitude).toFixed(4)}°, ${Number(policy.center_longitude).toFixed(4)}°`
          : 'Not calibrated by Admin',
      },
      {
        label: 'Your Device GPS',
        value: gpsCoords
          ? `${gpsCoords.lat.toFixed(4)}°, ${gpsCoords.lng.toFixed(4)}° (±${gpsAccuracy || 10}m)`
          : 'Tap Verify Location on main screen',
      },
      {
        label: 'Distance from Campus',
        value:
          geofenceStatus.distance != null
            ? `${Math.round(geofenceStatus.distance)} meters`
            : isCalibrated
              ? 'Not measured yet'
              : 'N/A',
      },
      {
        label: 'Campus Wi-Fi Rule',
        value: policy?.wifi_restriction_enabled ? 'Restricted to Campus Wi-Fi' : 'Any network allowed',
      },
      {
        label: 'Check-In Eligibility',
        value: isEnforced
          ? geofenceStatus.checked
            ? geofenceStatus.inside
              ? 'Authorized for Attendance'
              : 'Outside Allowed Radius'
            : 'Verification Pending'
          : 'Authorized Anywhere',
        color: isInside ? '#047857' : '#b91c1c',
      },
    ];

    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div className="golden-os-form-section-title">Campus Boundary Settings</div>
              {rows.map((r, idx) => (
                <div
                  key={r.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '6px 0',
                    borderBottom: idx < rows.length - 1 ? '1px solid #f2ead9' : 'none',
                    fontSize: '0.84rem',
                  }}
                >
                  <span style={{ color: '#6b5b3e', fontWeight: 600 }}>{r.label}</span>
                  <span style={{ color: r.color || '#25231f', fontWeight: 700, textAlign: 'right' }}>{r.value}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleVerifyLocation}
              disabled={isScanning}
              className="golden-os-primary-action"
              style={{ justifyContent: 'center', padding: '11px 16px', borderRadius: '11px' }}
            >
              <RefreshCw size={15} className={isScanning ? 'spin-icon' : ''} />
              <span>{isScanning ? 'Checking GPS...' : 'Run Location Check'}</span>
            </button>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={closeSubPage}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '9px 18px', borderRadius: '10px' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== DEDICATED PAGE 2: LOCATION CHECK HISTORY ===== */
  if (subMode === 'history') {
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {auditLogs.length === 0 ? (
              <div className="golden-os-inset-card" style={{ padding: '32px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
                <Clock size={26} style={{ color: '#8f7b58' }} />
                <div style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.92rem' }}>No location checks yet</div>
                <div style={{ fontSize: '0.78rem', color: '#8f7b58' }}>
                  Run a location check from Campus Geofence Location to see history here.
                </div>
              </div>
            ) : (
              <div className="golden-os-list-shell">
                {auditLogs.map(log => (
                  <div
                    key={log.id}
                    className="golden-os-list-row"
                    style={{ cursor: 'default' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div className="golden-os-avatar" style={{ width: '32px', height: '32px' }}>
                        {log.inside ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#25231f' }}>
                          {log.inside ? 'Inside Allowed Area' : 'Outside Campus Boundary'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#6b5b3e', marginTop: '1px' }}>
                          {log.timestamp} · {log.distance != null ? `${log.distance}m away` : `Accuracy ±${log.accuracy || 10}m`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              {auditLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    playCyberSound('click');
                    setAuditLogs([]);
                    try { localStorage.removeItem('cached_geo_audit_logs'); } catch { /* ignore */ }
                  }}
                  className="golden-os-feedback-filter-btn"
                  style={{ padding: '9px 14px', borderRadius: '10px', color: '#b91c1c', borderColor: '#fecaca', background: '#fff5f5', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash2 size={14} />
                  <span>Clear History</span>
                </button>
              )}
              <button
                type="button"
                onClick={closeSubPage}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '9px 18px', borderRadius: '10px', marginLeft: 'auto' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== DEDICATED PAGE 3: HOW LOCATION CHECK WORKS ===== */
  if (subMode === 'guide') {
    const steps = [
      {
        title: '1. Campus Policy Check',
        desc: 'Your institution decides whether attendance requires being inside a GPS boundary or is open anywhere.',
      },
      {
        title: '2. Live GPS Distance',
        desc: 'When geofencing is active, your phone compares your current GPS coordinates against the campus center radius.',
      },
      {
        title: '3. Fix Permission Issues',
        desc: 'If check-in fails, turn on Device Location (GPS) and allow Location permission for your browser or app.',
      },
    ];

    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {steps.map(st => (
              <div key={st.title} className="golden-os-form-section" style={{ gap: '4px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#2b2112' }}>{st.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#6b5b3e', lineHeight: 1.45 }}>{st.desc}</div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={closeSubPage}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '9px 18px', borderRadius: '10px' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== MAIN PAGE (#/student-attendance/geofence): CLEAN GOLDEN GATE HUB ===== */
  const statusHeadline = !policyLoaded
    ? 'Checking campus policy...'
    : !isEnforced
      ? 'Open Check-In Active'
      : geofenceStatus.checked
        ? geofenceStatus.inside
          ? 'Inside Campus Boundary'
          : 'Outside Campus Boundary'
        : 'Ready to Verify Location';

  const statusDetail = !policyLoaded
    ? 'Syncing boundary rules with institution server.'
    : !isEnforced
      ? 'Geofence restriction is off for your institution. Attendance check-in works without location lock.'
      : geofenceStatus.checked
        ? geofenceStatus.distance != null
          ? `${Math.round(geofenceStatus.distance)}m from campus center (limit ${Math.round(allowedRadius)}m).`
          : `Campus boundary limit is ${Math.round(allowedRadius)}m.`
        : `Verify GPS to confirm you are within ${Math.round(allowedRadius)}m of campus.`;

  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Clean Live Status Summary */}
          <div className="golden-os-form-section" style={{ gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: isEnforced && geofenceStatus.checked && !geofenceStatus.inside ? '#fef2f2' : '#ecfdf5',
                  color: isEnforced && geofenceStatus.checked && !geofenceStatus.inside ? '#b91c1c' : '#047857',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Navigation size={20} className={isScanning ? 'spin-anim' : ''} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#25231f' }}>
                  {statusHeadline}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6b5b3e', marginTop: '2px', lineHeight: 1.4 }}>
                  {statusDetail}
                </div>
              </div>
            </div>

            {lastVerifiedAt && (
              <div style={{ fontSize: '0.74rem', color: '#786240', fontWeight: 600 }}>
                Last checked at {lastVerifiedAt}
                {gpsAccuracy ? ` · GPS precision ±${gpsAccuracy}m` : ''}
              </div>
            )}

            {gpsError && (
              <div role="alert" className="feedback-banner is-error">
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{gpsError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleVerifyLocation}
              disabled={isScanning}
              className="golden-os-primary-action"
              style={{ justifyContent: 'center', padding: '11px 16px', borderRadius: '11px' }}
            >
              <RefreshCw size={15} className={isScanning ? 'spin-icon' : ''} />
              <span>{isScanning ? 'Verifying GPS...' : 'Verify My Location'}</span>
            </button>
          </div>

          {/* Clean Organized Sub-Pages List */}
          <div className="golden-os-list-shell">
            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                if (onNavigateRoute) onNavigateRoute({ section: 'geofence', mode: 'perimeter' });
              }}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar" style={{ width: '34px', height: '34px' }}>
                  <Compass size={16} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                  Perimeter & Campus Rules
                </span>
              </div>
              <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
            </button>

            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                if (onNavigateRoute) onNavigateRoute({ section: 'geofence', mode: 'history' });
              }}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar" style={{ width: '34px', height: '34px' }}>
                  <Clock size={16} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                  Location Check History
                </span>
              </div>
              <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
            </button>

            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                if (onNavigateRoute) onNavigateRoute({ section: 'geofence', mode: 'guide' });
              }}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar" style={{ width: '34px', height: '34px' }}>
                  <Info size={16} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                  How Location Check Works
                </span>
              </div>
              <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
