export default function CameraAttractHud({ active, mode = 'attendance', livenessStatus = 'pending' }) {
  if (!active) return null;

  const isVerified = livenessStatus === 'verified';

  return (
    <div className={`camera-attract-hud camera-attract-${mode}`}>
      <div className="camera-attract-vignette" />

      <div className="camera-attract-face-ring">
        <div className="camera-attract-face-ring-pulse" />
        <div className="camera-attract-face-oval" />
      </div>

      <div className="camera-attract-crosshair">
        <span className="camera-attract-crosshair-h" />
        <span className="camera-attract-crosshair-v" />
      </div>

      <div className="camera-attract-bracket camera-attract-bracket-tl" />
      <div className="camera-attract-bracket camera-attract-bracket-tr" />
      <div className="camera-attract-bracket camera-attract-bracket-bl" />
      <div className="camera-attract-bracket camera-attract-bracket-br" />

      <div className="camera-attract-callout">
        <span className="camera-attract-dot" />
        {isVerified ? 'IDENTITY VERIFIED' : 'LOOK AT CAMERA — ALIGN FACE'}
      </div>

      <div className="camera-attract-you-label">YOU</div>

      <div className="camera-attract-scan-arc" />
      <div className="camera-attract-mirror-shine" />
    </div>
  );
}
