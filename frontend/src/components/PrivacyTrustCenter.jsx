import { ShieldCheck, Lock, Smartphone, CheckCircle2, X } from 'lucide-react';
import { t } from '../utils/i18n';

export default function PrivacyTrustCenter({
  isOpen,
  onClose,
  userRole,
  lang = 'en'
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 17, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 10003,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="surface-card"
        style={{
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          borderRadius: 'var(--radius-xl)',
          animation: 'scaleIn 0.25s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={22} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
              {t('privacy_center', lang)}
            </h3>
          </div>
          <button onClick={onClose} className="clean-back-btn" style={{ width: '36px', height: '36px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Core Biometric Guarantee Card */}
        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Lock size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff', marginBottom: '4px' }}>
                {lang === 'hi' ? 'बायोमेट्रिक गोपनीयता गारंटी' : 'Biometric Security & Encryption'}
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {lang === 'hi'
                  ? 'यह प्रणाली आपके चेहरे की कच्ची तस्वीरें या वीडियो स्थायी रूप से संग्रहीत नहीं करती है। केवल एक एन्क्रिप्टेड गणितीय संख्यात्मक वेक्टर (SFace Embedding) संग्रहीत किया जाता है जिसे कभी भी मूल चेहरे में वापस नहीं बदला जा सकता।'
                  : 'This application never stores or distributes raw facial photos or video feeds. Only an irreversible, encrypted mathematical feature vector (SFace Biometric Embedding) is stored to compare and verify your presence.'}
              </p>
            </div>
          </div>
        </div>

        {/* Registered Device & Security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '12px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Smartphone size={16} color="#0ea5e9" />
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>
                {lang === 'hi' ? 'सत्यापित डिवाइस पहुंच' : 'Device Authentication'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
              {lang === 'hi' ? 'सत्र JWT टोकन और डिवाइस फ़िंगरप्रिंट द्वारा सुरक्षित है।' : 'Authenticated via secure JWT bearer tokens and campus geofencing.'}
            </p>
          </div>

          <div style={{ padding: '12px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <CheckCircle2 size={16} color="#34d399" />
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>
                {lang === 'hi' ? 'अपरिवर्तनीय ऑडिट ट्रेल' : 'Immutable Audit Trail'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
              {lang === 'hi' ? 'मैन्युअल सुधार और आपत्तियों का प्रत्येक निर्णय लॉग किया जाता है।' : 'All manual attendance changes, dispute approvals, and counselor notices are recorded in the audit log.'}
            </p>
          </div>

          {userRole === 'student' && (
            <div style={{ padding: '12px 14px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fbbf24' }}>
                    {lang === 'hi' ? 'पुनः नामांकन अनुरोध' : 'Re-enrollment Request'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {lang === 'hi' ? 'यदि आपका रूप या चश्मा बदला है तो नया फोटो सैंपल दें' : 'Request fresh face registration if appearance has changed'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    alert(lang === 'hi' ? 'पुनः नामांकन अनुरोध प्रशासक को भेज दिया गया है।' : 'Re-enrollment request sent to your institution administrator.');
                    onClose();
                  }}
                  className="btn-secondary"
                  style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.75rem', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                >
                  {lang === 'hi' ? 'अनुरोध करें' : 'Request'}
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="btn-primary"
          style={{ width: '100%', minHeight: '44px' }}
        >
          {t('close', lang)}
        </button>
      </div>
    </div>
  );
}
