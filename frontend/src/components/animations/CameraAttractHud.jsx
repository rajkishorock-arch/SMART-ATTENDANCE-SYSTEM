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
  let primaryColor = '#0ea5e9'; // default cyan
  let glowColor = 'rgba(14, 165, 233, 0.2)';

  if (isVerified) {
    primaryColor = '#10b981';
    glowColor = 'rgba(16, 185, 129, 0.3)';
  } else if (isVerifying) {
    primaryColor = '#f59e0b';
    glowColor = 'rgba(245, 158, 11, 0.25)';
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
      }}
      aria-hidden="true"
    >
      {/* ── Corner Focus Brackets ── */}
      <div
        className="camera-attract-bracket camera-attract-bracket-tl"
        style={{
          borderColor: primaryColor,
          transition: 'border-color 0.25s ease',
          filter: `drop-shadow(0 0 4px ${primaryColor})`
        }}
      />
      <div
        className="camera-attract-bracket camera-attract-bracket-tr"
        style={{
          borderColor: primaryColor,
          transition: 'border-color 0.25s ease',
          filter: `drop-shadow(0 0 4px ${primaryColor})`
        }}
      />
      <div
        className="camera-attract-bracket camera-attract-bracket-bl"
        style={{
          borderColor: primaryColor,
          transition: 'border-color 0.25s ease',
          filter: `drop-shadow(0 0 4px ${primaryColor})`
        }}
      />
      <div
        className="camera-attract-bracket camera-attract-bracket-br"
        style={{
          borderColor: primaryColor,
          transition: 'border-color 0.25s ease',
          filter: `drop-shadow(0 0 4px ${primaryColor})`
        }}
      />

      {/* Subtle Central Viewfinder Oval */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '220px',
          height: '260px',
          borderRadius: '130px',
          border: `1px dashed ${primaryColor}30`,
          transition: 'border-color 0.25s ease',
        }}
      />
    </div>
  );
}
