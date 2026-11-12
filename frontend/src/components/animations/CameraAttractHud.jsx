/**
 * CameraAttractHud — Professional, clean and user-friendly viewfinder frame.
 * Soft natural white rounded frame, transitioning smoothly to emerald green on verification.
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

  // Professional, natural colors (no harsh sci-fi neon)
  let borderColor = 'rgba(255, 255, 255, 0.8)';
  let glowColor = 'rgba(0, 0, 0, 0.25)';

  if (isVerified) {
    borderColor = '#10b981';
    glowColor = 'rgba(16, 185, 129, 0.3)';
  } else if (isVerifying) {
    borderColor = 'rgba(255, 255, 255, 0.95)';
    glowColor = 'rgba(255, 255, 255, 0.2)';
  } else if (isError) {
    borderColor = '#ef4444';
    glowColor = 'rgba(239, 68, 68, 0.25)';
  }

  return (
    <div
      className={`camera-attract-hud camera-attract-${mode} clean-attract-hud`}
      style={{
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
      {/* Friendly, Clean Rounded Viewfinder Frame (Face ID / Mobile KYC style) */}
      <div
        style={{
          width: 'min(72vw, 260px)',
          height: 'min(78vw, 320px)',
          maxHeight: 'min(58vh, 320px)',
          borderRadius: '32px',
          border: isVerified ? '2.5px solid #10b981' : isError ? '2px solid #ef4444' : `2px solid ${borderColor}`,
          boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.38), 0 0 20px ${glowColor}`,
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          position: 'relative',
        }}
      />
    </div>
  );
}
