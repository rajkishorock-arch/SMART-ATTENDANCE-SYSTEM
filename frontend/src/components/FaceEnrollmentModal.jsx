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
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        padding: '28px',
        boxShadow: '0 20px 48px rgba(15, 23, 42, 0.15)',
        position: 'relative',
        color: '#0f172a'
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
            color: '#64748b',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            background: '#e0f2fe',
            border: '1px solid #bae6fd',
            borderRadius: '10px',
            padding: '8px',
            color: '#0284c7'
          }}>
            <Camera size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              Multi-Sample Biometric QA Enrollment
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Student: <strong style={{ color: '#0f172a' }}>{student.name}</strong> ({student.roll})
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
                    ? '#eff6ff' 
                    : isDone 
                    ? '#ecfdf5' 
                    : '#f8fafc',
                  border: isActive 
                    ? '1px solid #3b82f6' 
                    : isDone 
                    ? '1px solid #10b981' 
                    : '1px solid #e2e8f0',
                  color: isActive ? '#1d4ed8' : isDone ? '#059669' : '#64748b',
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
              background: '#f8fafc',
              border: '2px dashed #cbd5e1',
              borderRadius: '14px',
              padding: '36px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '18px',
              transition: 'border 0.2s'
            }}
          >
            <Upload size={32} color="#0284c7" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
              Upload {currentPose} Profile Photo
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
              JPG or PNG format • Minimum 80x80px face resolution
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
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
                border: '2px solid #0284c7'
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                  {currentPose} Angle Sample
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#0284c7',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    textDecoration: 'underline'
                  }}
                >
                  Change Photo
                </button>
              </div>

              {isValidating ? (
                <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                    background: qaResult.is_valid ? '#ecfdf5' : '#fef2f2',
                    border: qaResult.is_valid ? '1px solid #a7f3d0' : '1px solid #fecaca',
                    color: qaResult.is_valid ? '#059669' : '#dc2626'
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
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '9px 18px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600
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
                background: '#0284c7',
                border: 'none',
                color: '#fff',
                padding: '9px 20px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: isSaving ? 'not-allowed' : 'pointer'
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
