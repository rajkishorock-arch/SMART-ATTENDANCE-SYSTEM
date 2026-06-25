import { useState, useEffect, useCallback } from 'react';
import { Crown, Zap, Building2, Rocket, Check, CreditCard } from 'lucide-react';

const PLAN_META = {
  free: { icon: Zap, gradient: 'linear-gradient(135deg, #334155, #1e293b)', perks: ['100 students', 'Basic scanner', 'Email support'] },
  starter: { icon: Rocket, gradient: 'linear-gradient(135deg, #0891b2, #0d9488)', perks: ['500 students', 'Turbo camera', 'Bulk CSV import', 'Parent alerts'] },
  pro: { icon: Crown, gradient: 'linear-gradient(135deg, #7c3aed, #4f46e5)', perks: ['2000 students', 'Premium themes', 'Analytics AI', 'ERP API keys', 'Priority support'] },
  enterprise: { icon: Building2, gradient: 'linear-gradient(135deg, #b45309, #d97706)', perks: ['10000 students', 'Custom branding', 'SSO', 'Dedicated SLA', 'White-label APK'] },
};

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error('Razorpay script failed to load'));
    document.body.appendChild(script);
  });
}

export default function PremiumUpgradeHub({ apiBaseUrl, token, currentUser, onPlanActivated }) {
  const [plans, setPlans] = useState({});
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [plansRes, statusRes] = await Promise.all([
        fetch(`${apiBaseUrl}/billing/plans`),
        fetch(`${apiBaseUrl}/billing/status`, { headers: headers() }),
      ]);
      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans || {});
      }
      if (statusRes.ok) {
        setStatus(await statusRes.json());
      }
    } catch (e) {
      setError(e.message);
    }
  }, [apiBaseUrl, token, headers]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activateFree = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${apiBaseUrl}/billing/create-order`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ plan: 'free' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Activation failed');
      setMessage(data.message || 'Free plan active');
      await refresh();
      onPlanActivated?.(data.plan);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const purchasePlan = async (planId) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const orderRes = await fetch(`${apiBaseUrl}/billing/create-order`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ plan: planId }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.detail || 'Could not create order');

      if (!orderData.razorpay_key_id) {
        setMessage(`Demo mode: "${planId}" selected. Add RAZORPAY_KEY_ID on Render for live payments. Contact admin to activate manually.`);
        setLoading(false);
        return;
      }

      const Razorpay = await loadRazorpayScript();
      const rzp = new Razorpay({
        key: orderData.razorpay_key_id,
        amount: orderData.amount * 100,
        currency: orderData.currency || 'INR',
        name: 'Smart Attendance Premium',
        description: `${PLAN_META[planId]?.label || planId} Plan`,
        order_id: orderData.order_id,
        prefill: {
          email: currentUser?.email || '',
          name: currentUser?.name || '',
        },
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${apiBaseUrl}/billing/verify`, {
              method: 'POST',
              headers: headers(),
              body: JSON.stringify({
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                plan: planId,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.detail || 'Verification failed');
            setMessage(verifyData.message || 'Premium activated!');
            await refresh();
            onPlanActivated?.(planId);
          } catch (err) {
            setError(err.message);
          }
        },
        theme: { color: '#0891b2' },
      });
      rzp.open();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = status?.plan || 'free';

  return (
    <div className="glass-panel" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Crown size={22} color="#fbbf24" />
        <h3 style={{ color: '#f8fafc', margin: 0 }}>Premium & Subscription</h3>
      </div>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>
        Upgrade your institution to unlock advanced analytics, unlimited scanning power, ERP integrations, and white-label branding.
      </p>

      {status && (
        <div style={{
          padding: '14px 16px', borderRadius: '10px', marginBottom: '20px',
          background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(129,140,248,0.25)',
          color: '#c4b5fd', fontSize: '0.85rem',
        }}>
          Current plan: <strong>{status.plan_details?.label || status.plan}</strong>
          {' · '}Students {status.student_count}/{status.student_limit}
          {' · '}Status: {status.status}
        </div>
      )}

      {message && (
        <div style={{ padding: '10px', marginBottom: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem' }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ padding: '10px', marginBottom: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {Object.entries(plans).map(([id, plan]) => {
          const meta = PLAN_META[id] || PLAN_META.free;
          const Icon = meta.icon;
          const isCurrent = currentPlan === id;
          return (
            <div
              key={id}
              style={{
                borderRadius: '14px',
                padding: '20px',
                background: meta.gradient,
                border: isCurrent ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minHeight: '280px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Icon size={22} color="#fff" />
                {isCurrent && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'rgba(251,191,36,0.2)', color: '#fde68a', padding: '2px 8px', borderRadius: '999px' }}>
                    ACTIVE
                  </span>
                )}
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>{plan.label || id}</div>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.4rem', fontWeight: 700, marginTop: '4px' }}>
                  {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString('en-IN')}/mo`}
                </div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                {(meta.perks || []).map((perk) => (
                  <li key={perk} style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.78rem', marginBottom: '6px', display: 'flex', gap: '6px' }}>
                    <Check size={14} /> {perk}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={loading || isCurrent}
                onClick={() => (plan.price === 0 ? activateFree() : purchasePlan(id))}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isCurrent ? 'rgba(255,255,255,0.15)' : '#fff',
                  color: isCurrent ? '#fff' : '#0f172a',
                  fontWeight: 700,
                  cursor: isCurrent ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <CreditCard size={14} />
                {isCurrent ? 'Current Plan' : plan.price === 0 ? 'Use Free' : 'Upgrade Now'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
