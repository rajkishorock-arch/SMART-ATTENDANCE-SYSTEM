import { useState, useRef } from 'react';
import { 
  Camera, CheckCircle2, AlertTriangle, X,
  RefreshCw, Upload
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

export default function FaceEnrollmentModal({
  isOpen,
  onClose,
  student,
  token,
  playCyberSound = () => {},
  onEnrollmentSuccess = () => {}
}) {
  const [currentPose, setCurrentPose] = useState('FRONT'); // FRONT, LEFT, RIGHT
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [qaResult, setQaResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [completedPoses, setCompletedPoses] = useState({});

  const fileInputRef = useRef(null);

  if (!isOpen || !student) return null;

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setQaResult(null);
    setErrorMsg('');

    // Instant Pre-flight Quality Analysis
    setIsValidating(true);
    const formData = new FormData();
    formData.append('file', file);
    if (student.id) formData.append('student_id', student.id);

    try {
      const res = await fetch(`${API_BASE_URL}/enrollment/validate-sample`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'QA validation failed.');
      }
      const data = await res.json();
      setQaResult(data);
      playCyberSound(data.is_valid ? 'success' : 'alert');
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveSample = async () => {
    if (!selectedFile || !student.id) return;
    setIsSaving(true);
    setErrorMsg('');
    const formData = new FormData();
    formData.append('student_id', student.id);
    formData.append('pose', currentPose);
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${API_BASE_URL}/enrollment/save-sample`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to save sample.');
      }
      playCyberSound('success');
      setCompletedPoses(prev => ({ ...prev, [currentPose]: true }));
      setSuccessMsg(`Angle sample '${currentPose}' saved successfully!`);

      // Advance pose sequence
      if (currentPose === 'FRONT') setCurrentPose('LEFT');
      else if (currentPose === 'LEFT') setCurrentPose('RIGHT');

      setSelectedFile(null);
      setPreviewUrl('');
      setQaResult(null);
      setTimeout(() => setSuccessMsg(''), 3000);
      onEnrollmentSuccess();
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(0, 242, 254, 0.35)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '560px',
        padding: '28px',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)',
        position: 'relative',
        color: '#f8fafc'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            background: 'rgba(0, 242, 254, 0.15)',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            borderRadius: '10px',
            padding: '8px',
            color: '#00f2fe'
          }}>
            <Camera size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
              Multi-Sample Biometric QA Enrollment
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Student: <strong>{student.name}</strong> ({student.roll})
            </span>
          </div>
        </div>

        {/* Pose Sequence Selector */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
          marginBottom: '20px'
        }}>
          {[
            { key: 'FRONT', label: '1. Front View' },
            { key: 'LEFT', label: '2. Left Angle' },
            { key: 'RIGHT', label: '3. Right Angle' }
          ].map(p => {
            const isDone = completedPoses[p.key];
            const isActive = currentPose === p.key;

            return (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  setCurrentPose(p.key);
                  setSelectedFile(null);
                  setPreviewUrl('');
                  setQaResult(null);
                }}
                style={{
                  background: isActive 
                    ? 'rgba(0, 242, 254, 0.2)' 
                    : isDone 
                    ? 'rgba(16, 185, 129, 0.15)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isActive 
                    ? '1px solid rgba(0, 242, 254, 0.5)' 
                    : isDone 
                    ? '1px solid rgba(16, 185, 129, 0.4)' 
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  color: isActive ? '#00f2fe' : isDone ? '#34d399' : '#94a3b8',
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                {isDone && <CheckCircle2 size={12} />}
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Success / Error Alerts */}
        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            padding: '10px 14px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Upload Box / Image Preview */}
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/*" 
          onChange={handleFileSelect} 
          style={{ display: 'none' }} 
        />

        {!previewUrl ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: '2px dashed rgba(0, 242, 254, 0.3)',
              borderRadius: '14px',
              padding: '36px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '18px',
              transition: 'border 0.2s'
            }}
          >
            <Upload size={32} color="#00f2fe" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
              Upload {currentPose} Profile Photo
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
              JPG or PNG format • Minimum 80x80px face resolution
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            background: 'rgba(30, 41, 59, 0.5)',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '18px'
          }}>
            <img 
              src={previewUrl} 
              alt="Preview" 
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '10px',
                objectFit: 'cover',
                border: '2px solid rgba(0, 242, 254, 0.5)'
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                  {currentPose} Angle Sample
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#00f2fe',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Change Photo
                </button>
              </div>

              {isValidating ? (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={14} className="animate-spin" />
                  Running automated biometric QA checks...
                </div>
              ) : qaResult ? (
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    marginBottom: '6px',
                    background: qaResult.is_valid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: qaResult.is_valid ? '#34d399' : '#f87171'
                  }}>
                    {qaResult.is_valid ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    {qaResult.quality_rating}: {qaResult.feedback_message}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Sharpness: {qaResult.blur_score} • Brightness: {qaResult.brightness_score}/255
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              padding: '9px 18px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Close
          </button>

          {previewUrl && qaResult?.is_valid && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveSample}
              style={{
                background: 'linear-gradient(135deg, #00f2fe 0%, #0099ff 100%)',
                border: 'none',
                color: '#000',
                padding: '9px 20px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(0, 242, 254, 0.35)'
              }}
            >
              {isSaving ? 'Saving...' : `Accept & Commit ${currentPose} Sample`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
