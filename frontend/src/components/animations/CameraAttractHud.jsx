/**
 * CameraAttractHud — Subtle live scan reticle and focus frame.
 * Renders sleek corner brackets that transition to green on verification.
 */
export default function CameraAttractHud({
  active,
  mode = 'attendance',
  livenessStatus = 'pending',
}) {
  if (!active) return null;

  const isVerified = livenessStatus === 'verified' || livenessStatus === 'success';
  const isVerifying = livenessStatus === 'verifying' || livenessStatus === 'liveness';
  const isError = livenessStatus === 'failed' || livenessStatus === 'error';

  // Semantic color based on recognition state
  let primaryColor = '#38bdf8'; // friendly clean sky-blue
  let glowColor = 'rgba(56, 189, 248, 0.2)';

  if (isVerified) {
    primaryColor = '#10b981'; // vibrant clean green
    glowColor = 'rgba(16, 185, 129, 0.3)';
  } else if (isVerifying) {
    primaryColor = '#3b82f6';
    glowColor = 'rgba(59, 130, 246, 0.25)';
  } else if (isError) {
    primaryColor = '#ef4444';
    glowColor = 'rgba(239, 68, 68, 0.25)';
  }

  return (
    <div
      className={`camera-attract-hud camera-attract-${mode} clean-attract-hud`}
      style={{
        '--hud-primary': primaryColor,
        '--hud-glow': glowColor,
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-hidden="true"
    >
      {/* Friendly, Simple Portrait Viewfinder Box */}
      <div
        style={{
          width: 'min(72vw, 260px)',
          height: 'min(90vw, 320px)',
          borderRadius: '36px',
          border: `2px solid ${primaryColor}`,
          boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.25), 0 0 20px ${glowColor}`,
          transition: 'all 0.3s ease',
          position: 'relative',
        }}
      >
        {/* Soft Corner Accents */}
        <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '24px', height: '24px', borderTop: `4px solid ${primaryColor}`, borderLeft: `4px solid ${primaryColor}`, borderTopLeftRadius: '36px' }} />
        <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '24px', height: '24px', borderTop: `4px solid ${primaryColor}`, borderRight: `4px solid ${primaryColor}`, borderTopRightRadius: '36px' }} />
        <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '24px', height: '24px', borderBottom: `4px solid ${primaryColor}`, borderLeft: `4px solid ${primaryColor}`, borderBottomLeftRadius: '36px' }} />
        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '24px', height: '24px', borderBottom: `4px solid ${primaryColor}`, borderRight: `4px solid ${primaryColor}`, borderBottomRightRadius: '36px' }} />
      </div>
    </div>
  );
}
