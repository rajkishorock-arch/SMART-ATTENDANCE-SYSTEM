import { 
  Bot, X, Send, Paperclip, Mic, Volume2, VolumeX, Trash2, 
  Settings, Video, ShieldCheck, Clock, Phone, FileDown 
} from 'lucide-react';
import useCyberBot from '../hooks/useCyberBot';
import useUI from '../hooks/useUI';

export default function CyberBotWidget({ activeTab, showChatBot: propShowChatBot, setShowChatBot: propSetShowChatBot }) {
  const botState = useCyberBot();
  const { playCyberSound } = useUI();

  // Use props if provided, otherwise internal state
  const isVisible = propShowChatBot !== undefined ? propShowChatBot : botState.showChatBot;
  const toggleVisibility = propSetShowChatBot || botState.setShowChatBot;

  const {
    chatInput,
    setChatInput,
    chatMessages,
    isChatLoading,
    botPersonality,
    setBotPersonality,
    botWakeWordEnabled,
    setBotWakeWordEnabled,
    botVoiceSpeed,
    setBotVoiceSpeed,
    botVoicePitch,
    setBotVoicePitch,
    botSuggestionCategory,
    setBotSuggestionCategory,
    botAttachedImage,
    setBotAttachedImage,
    botAttachedImageMime,
    setBotAttachedImageMime,
    botAttachedImageName,
    setBotAttachedImageName,
    isListeningSpeech,
    botVoiceSelected,
    setBotVoiceSelected,
    availableVoices,
    botAutoSpeak,
    setBotAutoSpeak,
    chatBottomRef,
    chatListRef,
    handleSendChatMessage,
    handleSpeechToText,
    handleSpeakText,
    handleImageUpload,
    handleBotFileSelect,
    handleChatPaste,
    handleChatDragOver,
    handleChatDrop,
    clearChatHistory,
    exportChatHistory,
    getSuggestions,
    startVoiceAssistantMode,
  } = botState;

  // Render interactive SVG diagrams
  const renderInteractiveDiagram = (diagramType) => {
    if (diagramType === 'face_recognition') {
      return (
        <div className="ai-diagram-card">
          <div className="ai-diagram-title">
            <Video size={14} /> Biometric Facial Recognition Scanner
          </div>
          <svg width="100%" height="150" viewBox="0 0 400 150" style={{ background: '#020617', borderRadius: '8px' }}>
            <rect x="135" y="15" width="130" height="120" rx="8" fill="none" stroke="rgba(0, 242, 254, 0.3)" strokeWidth="1" />
            <circle cx="200" cy="50" r="3" fill="#00f2fe" />
            <circle cx="170" cy="40" r="3" fill="#00f2fe" />
            <circle cx="230" cy="40" r="3" fill="#00f2fe" />
            <circle cx="175" cy="80" r="3" fill="#00f2fe" />
            <circle cx="225" cy="80" r="3" fill="#00f2fe" />
            <circle cx="200" cy="110" r="3" fill="#00f2fe" />
            <circle cx="200" cy="125" r="3" fill="#00f2fe" />
            
            <line x1="170" y1="40" x2="200" y2="50" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="230" y1="40" x2="200" y2="50" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="170" y1="40" x2="175" y2="80" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="230" y1="40" x2="225" y2="80" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="200" y1="50" x2="200" y2="110" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="175" y1="80" x2="200" y2="110" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="225" y1="80" x2="200" y2="110" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="200" y1="110" x2="200" y2="125" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="175" y1="80" x2="200" y2="125" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="225" y1="80" x2="200" y2="125" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />

            <line x1="125" y1="75" x2="275" y2="75" stroke="#00f2fe" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 6px #00f2fe)', animation: 'radarBeam 3s ease-in-out infinite' }} />
            
            <text x="280" y="40" fill="#a78bfa" fontSize="8" fontFamily="monospace">MODEL: RESNET-50</text>
            <text x="280" y="55" fill="#a78bfa" fontSize="8" fontFamily="monospace">LANDMARKS: 68 PTS</text>
            <text x="280" y="70" fill="#a78bfa" fontSize="8" fontFamily="monospace">CONFIDENCE: 99.4%</text>
            <text x="280" y="85" fill="#00f2fe" fontSize="8" fontFamily="monospace">BIOMETRIC: MATCH</text>

            <text x="20" y="40" fill="#6b7280" fontSize="8" fontFamily="monospace">FEED: WEBCAM_0</text>
            <text x="20" y="55" fill="#6b7280" fontSize="8" fontFamily="monospace">STATUS: ACQUIRING</text>
            <text x="20" y="70" fill="#6b7280" fontSize="8" fontFamily="monospace">FPS: 30.00</text>
          </svg>
        </div>
      );
    }

    if (diagramType === 'geofencing') {
      return (
        <div className="ai-diagram-card">
          <div className="ai-diagram-title">
            <ShieldCheck size={14} /> Geofencing Perimeter Map
          </div>
          <svg width="100%" height="150" viewBox="0 0 400 150" style={{ background: '#020617', borderRadius: '8px' }}>
            <circle cx="200" cy="75" r="50" fill="rgba(16, 185, 129, 0.05)" stroke="#10b981" strokeWidth="2" strokeDasharray="4 3" style={{ animation: 'radarPulse 3s linear infinite' }} />
            <circle cx="200" cy="75" r="4" fill="#10b981" />
            <text x="210" y="79" fill="#10b981" fontSize="8" fontFamily="monospace">CAMPUS CENTER</text>
            
            <circle cx="230" cy="55" r="6" fill="#00f2fe" style={{ animation: 'pulse 1.5s infinite' }} />
            <line x1="200" y1="75" x2="230" y2="55" stroke="rgba(0, 242, 254, 0.5)" strokeWidth="1" strokeDasharray="2 2" />
            <text x="242" y="59" fill="#00f2fe" fontSize="8" fontFamily="monospace">YOUR DEVICE (INSIDE)</text>
            
            <text x="20" y="30" fill="#9ca3af" fontSize="8" fontFamily="monospace">GEOFENCE LIMIT: 500m</text>
            <text x="20" y="45" fill="#9ca3af" fontSize="8" fontFamily="monospace">CURRENT DIST: 124m</text>
            <text x="20" y="60" fill="#10b981" fontSize="8" fontFamily="monospace">VERIFICATION: ALLOWED</text>
            
            <text x="290" y="30" fill="#6b7280" fontSize="8" fontFamily="monospace">LAT: 28.7041° N</text>
            <text x="290" y="45" fill="#6b7280" fontSize="8" fontFamily="monospace">LON: 77.1025° E</text>
            <text x="290" y="60" fill="#6b7280" fontSize="8" fontFamily="monospace">ACCURACY: 4.2m</text>
          </svg>
        </div>
      );
    }

    if (diagramType === 'attendance_flow') {
      return (
        <div className="ai-diagram-card">
          <div className="ai-diagram-title">
            <Clock size={14} /> Attendance Verification Workflow
          </div>
          <svg width="100%" height="80" viewBox="0 0 400 80" style={{ background: '#020617', borderRadius: '8px' }}>
            <rect x="15" y="20" width="90" height="40" rx="6" fill="rgba(167, 139, 250, 0.1)" stroke="rgba(167, 139, 250, 0.4)" strokeWidth="1" />
            <text x="25" y="44" fill="#a78bfa" fontSize="9" fontFamily="monospace" fontWeight="bold">1. Capture Face</text>
            
            <path d="M 115 40 L 135 40 M 130 36 L 135 40 L 130 44" stroke="#00f2fe" strokeWidth="1.5" fill="none" />

            <rect x="145" y="20" width="110" height="40" rx="6" fill="rgba(0, 242, 254, 0.1)" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <text x="155" y="44" fill="#00f2fe" fontSize="9" fontFamily="monospace" fontWeight="bold">2. Anti-Spoofing</text>

            <path d="M 265 40 L 285 40 M 280 36 L 285 40 L 280 44" stroke="#10b981" strokeWidth="1.5" fill="none" />

            <rect x="295" y="20" width="90" height="40" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="1" />
            <text x="305" y="44" fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">3. Mark Present</text>
          </svg>
        </div>
      );
    }

    return null;
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleImageUpload(file);
  };

  // Full-page CyberBot view when activeTab === 'ai-assistant'
  if (activeTab === 'ai-assistant') {
    return (
      <div className="ai-assistant-wrapper" onDragOver={handleChatDragOver} onDrop={handleChatDrop} onPaste={handleChatPaste} style={{ animation: 'fadeInUp 0.5s ease' }}>
        {/* Left Pane: Chat */}
        <div className="ai-chat-pane" style={{ position: 'relative' }}>
          <div className="ai-chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                padding: '4px 10px',
                borderRadius: '20px'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700, letterSpacing: '0.03em' }}>
                  ONLINE & READY
                </span>
              </div>
              <span className="ai-header-desktop-title" style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                • Smart Attendance AI
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {isListeningSpeech && (
                <div style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                  LISTENING...
                </div>
              )}

              {/* Tools hidden on mobile to keep header clean */}
              <div className="ai-header-desktop-tools" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button 
                  type="button" 
                  className="ai-icon-btn" 
                  onClick={() => {
                    const enabled = !botWakeWordEnabled;
                    if (playCyberSound) playCyberSound('click'); 
                    setBotWakeWordEnabled(enabled); 
                    localStorage.setItem('botWakeWordEnabled', enabled ? 'true' : 'false');
                  }} 
                  title={botWakeWordEnabled ? "Wake Word Listening Active" : "Wake Word Off"}
                  style={{ 
                    width: 'auto', 
                    height: '32px', 
                    borderRadius: '6px', 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    padding: '0 8px',
                    border: botWakeWordEnabled ? '1px solid #86efac' : '1px solid #e2e8f0',
                    background: botWakeWordEnabled ? '#f0fdf4' : '#f8fafc',
                    color: botWakeWordEnabled ? '#15803d' : '#64748b'
                  }}
                >
                  WAKE: {botWakeWordEnabled ? 'ON' : 'OFF'}
                </button>
                <button 
                  type="button" 
                  className="ai-icon-btn" 
                  onClick={startVoiceAssistantMode} 
                  title="Voice Call"
                  style={{ width: '32px', height: '32px', borderRadius: '6px', color: '#2563eb' }}
                >
                  <Phone size={14} />
                </button>
                <button 
                  type="button" 
                  className="ai-icon-btn" 
                  onClick={exportChatHistory} 
                  title="Export Chat History"
                  style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                >
                  <FileDown size={14} />
                </button>
              </div>

              {/* Clear chat icon (always accessible) */}
              <button 
                type="button" 
                className="ai-icon-btn" 
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear your conversation history?")) {
                    clearChatHistory();
                  }
                }} 
                title="Clear Conversation History"
                style={{ width: '32px', height: '32px', borderRadius: '6px', color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="ai-chat-messages" ref={chatListRef}>
            {chatMessages.length === 0 && !isChatLoading && (
              <div className="gpt-empty-state">
                <div className="gpt-empty-logo">
                  <Bot size={36} />
                </div>
                <div className="gpt-empty-title">How can I help you today?</div>
                <div className="gpt-empty-subtitle">Ask me anything about attendance, geofencing, or schedule</div>
              </div>
            )}

            {chatMessages.map((msg) => {
              let diagramType = null;
              if (msg.role === 'model') {
                if (msg.content.includes('[ShowDiagram: face_recognition]')) {
                  diagramType = 'face_recognition';
                } else if (msg.content.includes('[ShowDiagram: geofencing]')) {
                  diagramType = 'geofencing';
                } else if (msg.content.includes('[ShowDiagram: attendance_flow]')) {
                  diagramType = 'attendance_flow';
                }
              }

              const displayContent = msg.content
                .replace(/\[ShowDiagram: face_recognition\]/g, '')
                .replace(/\[ShowDiagram: geofencing\]/g, '')
                .replace(/\[ShowDiagram: attendance_flow\]/g, '');

              return (
                <div key={msg.id} className={`ai-message-bubble ${msg.role}`}>
                  {msg.role === 'model' && (
                    <div className="gpt-ai-row">
                      <div className="gpt-ai-icon" style={{ flexShrink: 0 }}>
                        <Bot size={14} />
                      </div>
                      <div className="ai-message-content">
                        <div className="ai-message-text">
                          {displayContent.split('\n').map((para, i) => (
                            <p key={i} style={{ margin: i < displayContent.split('\n').length - 1 ? '0 0 12px 0' : 0, color: '#0f172a' }}>
                              {para.split('**').map((text, idx) =>
                                idx % 2 === 1 ? <strong key={idx} style={{ color: '#020617', fontWeight: 700 }}>{text}</strong> : text
                              )}
                            </p>
                          ))}
                          {diagramType && renderInteractiveDiagram(diagramType)}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          <button
                            type="button"
                            className="ai-voice-action"
                            onClick={() => { if (playCyberSound) playCyberSound('click'); handleSpeakText(displayContent); }}
                            title="Listen to Response"
                          >
                            <Volume2 size={14} />
                            <span>Listen</span>
                          </button>
                          <button
                            type="button"
                            className="ai-voice-action"
                            onClick={() => { if (playCyberSound) playCyberSound('click'); window.speechSynthesis && window.speechSynthesis.cancel(); }}
                            title="Stop Audio"
                            style={{ color: '#8e8ea0' }}
                          >
                            <VolumeX size={14} />
                            <span>Stop</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div className="ai-message-content">
                      <div className="ai-message-text">
                        {displayContent.split('\n').map((para, i) => (
                          <p key={i} style={{ margin: i < displayContent.split('\n').length - 1 ? '0 0 8px 0' : 0 }}>
                            {para}
                          </p>
                        ))}
                        {msg.attachedImage && (
                          <div style={{ marginTop: '8px' }}>
                            <img src={msg.attachedImage} alt="User attachment" style={{ maxWidth: '220px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }} />
                            {msg.attachedImageName && <div style={{ fontSize: '0.72rem', color: '#8e8ea0', marginTop: '4px' }}>{msg.attachedImageName}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {isChatLoading && (
              <div className="ai-message-bubble model">
                <div className="gpt-ai-row">
                  <div className="gpt-ai-icon" style={{ flexShrink: 0 }}>
                    <Bot size={14} />
                  </div>
                  <div className="ai-message-content">
                    <div className="ai-message-text">
                      <div className="chatbot-typing-indicator">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Attachment Preview Bar */}
          {botAttachedImage && (
            <div className="ai-attachment-preview-bar">
              <img src={`data:${botAttachedImageMime};base64,${botAttachedImage}`} alt="Preview" className="ai-attachment-thumbnail" />
              <div className="ai-attachment-file-pill">
                <span>{botAttachedImageName || 'image_attachment.png'}</span>
                <button type="button" className="ai-attachment-remove-btn" onClick={() => { setBotAttachedImage(null); setBotAttachedImageMime(null); setBotAttachedImageName(''); }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Input Form Bar - Strictly Horizontal Single Row */}
          <div className="ai-chat-input-bar">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                alignItems: 'center',
                width: '100%',
                maxWidth: '800px',
                gap: '8px',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '24px',
                padding: '4px 6px 4px 12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                boxSizing: 'border-box'
              }}
            >
              <input
                type="file"
                accept="image/*,.txt,.py,.js,.json,.csv,.c,.cpp"
                onChange={handleBotFileSelect}
                style={{ display: 'none' }}
                id="bot-file-upload-panel"
              />
              <label
                htmlFor="bot-file-upload-panel"
                className="ai-icon-btn"
                title="Attach file or image"
                style={{
                  width: '34px',
                  minWidth: '34px',
                  maxWidth: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  margin: 0,
                  padding: 0,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#475569'
                }}
              >
                <Paperclip size={16} />
              </label>

              <button
                type="button"
                onClick={handleSpeechToText}
                className={`ai-icon-btn ${isListeningSpeech ? 'recording' : ''}`}
                title={isListeningSpeech ? "Stop voice listening" : "Ask using your voice"}
                style={{
                  width: '34px',
                  minWidth: '34px',
                  maxWidth: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  margin: 0,
                  padding: 0,
                  background: isListeningSpeech ? '#fee2e2' : '#f8fafc',
                  border: isListeningSpeech ? '1px solid #f87171' : '1px solid #e2e8f0',
                  color: isListeningSpeech ? '#ef4444' : '#475569'
                }}
              >
                <Mic size={16} />
              </button>

              <input
                type="text"
                className="ai-chat-input-text"
                placeholder="Ask anything (doubts, code, attendance)..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatLoading}
                style={{
                  flex: '1 1 auto',
                  minWidth: 0,
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#0f172a',
                  fontSize: '0.92rem',
                  padding: '8px 4px',
                  margin: 0
                }}
              />

              <button
                type="submit"
                className="ai-send-btn"
                disabled={isChatLoading || !chatInput.trim()}
                style={{
                  width: '36px',
                  minWidth: '36px',
                  maxWidth: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: !chatInput.trim() ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  margin: 0,
                  padding: 0,
                  border: 'none',
                  background: !chatInput.trim() ? '#e2e8f0' : '#2563eb',
                  color: !chatInput.trim() ? '#94a3b8' : '#ffffff',
                  boxShadow: !chatInput.trim() ? 'none' : '0 2px 6px rgba(37, 99, 235, 0.3)'
                }}
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>

        {/* Right Pane: Settings */}
        <div className="ai-settings-pane">
          <h2 className="ai-settings-title">
            <Settings size={18} />
            Bot Configurator
          </h2>

          <div className="ai-settings-section">
            <label className="ai-settings-label">Bot Personality</label>
            <div className="ai-settings-grid">
              {[
                { id: 'futuristic', label: 'Futuristic', desc: 'Cyber robotic tone' },
                { id: 'casual', label: 'Casual', desc: 'Friendly classmate' },
                { id: 'tutor', label: 'Tutor', desc: 'Patient study advisor' },
                { id: 'robotic', label: 'Robotic', desc: 'Strict factual data' }
              ].map((p) => (
                <div key={p.id} className={`ai-settings-card ${botPersonality === p.id ? 'active' : ''}`} onClick={() => { if (playCyberSound) playCyberSound('click'); setBotPersonality(p.id); }}>
                  <span>{p.label}</span>
                  <small>{p.desc}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="ai-settings-section">
            <label className="ai-settings-label">Help Suggestions Category</label>
            <select className="ai-select-dropdown" value={botSuggestionCategory} onChange={(e) => { if (playCyberSound) playCyberSound('click'); setBotSuggestionCategory(e.target.value); }}>
              <option value="general">General System FAQs</option>
              <option value="attendance">Face Scanning & Geofence</option>
              <option value="profile">Student Profile & Selfie Registration</option>
              <option value="security">Portal Security & Passwords</option>
            </select>
          </div>

          <div className="ai-settings-section">
            <label className="ai-settings-label">Speech Synthesis Engine</label>
            
            <div className="ai-toggle-group" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Voice Activation Mode</span>
                <small style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Listen for "Hey Raj" in background</small>
              </div>
              <label className="ai-toggle-switch">
                <input 
                  type="checkbox" 
                  checked={botWakeWordEnabled} 
                  onChange={(e) => { 
                    const enabled = e.target.checked;
                    if (playCyberSound) playCyberSound('click'); 
                    setBotWakeWordEnabled(enabled); 
                    localStorage.setItem('botWakeWordEnabled', enabled ? 'true' : 'false');
                  }} 
                />
                <span className="ai-toggle-slider" />
              </label>
            </div>

            <div className="ai-toggle-group">
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Auto-Read Bot Replies</span>
              <label className="ai-toggle-switch">
                <input type="checkbox" checked={botAutoSpeak} onChange={(e) => { if (playCyberSound) playCyberSound('click'); setBotAutoSpeak(e.target.checked); }} />
                <span className="ai-toggle-slider" />
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Select Voice Accent</span>
              <select className="ai-select-dropdown" value={botVoiceSelected} onChange={(e) => setBotVoiceSelected(e.target.value)}>
                {availableVoices.length === 0 ? (
                  <option>System Default Voice</option>
                ) : (
                  availableVoices.map((v, idx) => (
                    <option key={idx} value={v.name}>{v.name} ({v.lang})</option>
                  ))
                )}
              </select>
            </div>

            <div className="ai-range-control">
              <div className="ai-range-val">
                <span>Voice Speed (Rate)</span>
                <span>{botVoiceSpeed.toFixed(1)}x</span>
              </div>
              <input type="range" className="ai-range-slider" min="0.5" max="2.0" step="0.1" value={botVoiceSpeed} onChange={(e) => setBotVoiceSpeed(parseFloat(e.target.value))} />
            </div>

            <div className="ai-range-control">
              <div className="ai-range-val">
                <span>Voice Pitch</span>
                <span>{botVoicePitch.toFixed(1)}</span>
              </div>
              <input type="range" className="ai-range-slider" min="0.5" max="2.0" step="0.1" value={botVoicePitch} onChange={(e) => setBotVoicePitch(parseFloat(e.target.value))} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Floating button & drawer overlay view on other pages
  if (!isVisible) {
    return (
      <button
        type="button"
        className="cyber-fab-btn"
        onClick={() => {
          if (playCyberSound) playCyberSound('click');
          toggleVisibility(true);
        }}
        title="Open CyberBot AI Assistant"
      >
        <Bot size={24} />
      </button>
    );
  }

  return (
    <div className="ai-chatbot-drawer-overlay">
      <div className="ai-chatbot-drawer-container">
        {/* Header */}
        <div className="ai-chatbot-header">
          <div className="ai-chatbot-header-title">
            <div className="gpt-ai-icon">
              <Bot size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="ai-chatbot-name">CyberBot AI</span>
                <span className="ai-personality-badge">{botPersonality.toUpperCase()}</span>
              </div>
              <div className="ai-chatbot-subtitle">Smart Attendance Neural Assistant</div>
            </div>
          </div>

          <div className="ai-chatbot-header-actions">
            <button
              type="button"
              className="ai-icon-btn"
              onClick={clearChatHistory}
              title="Clear Chat History"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              className="ai-icon-btn close-btn"
              onClick={() => {
                if (playCyberSound) playCyberSound('click');
                toggleVisibility(false);
              }}
              title="Close Assistant"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body Split View */}
        <div className="ai-chatbot-body">
          {/* Main Chat Pane */}
          <div className="ai-chat-pane">
            <div className="ai-messages-scroll-area">
              {chatMessages.length === 0 && (
                <div className="gpt-empty-state">
                  <div className="gpt-empty-icon">
                    <Bot size={36} />
                  </div>
                  <div className="gpt-empty-title">How can I help you today?</div>
                  <div className="gpt-empty-subtitle">Ask me anything about attendance, geofencing, or schedule</div>
                </div>
              )}

              {chatMessages.map((msg) => {
                let diagramType = null;
                if (msg.role === 'model') {
                  if (msg.content.includes('[ShowDiagram: face_recognition]')) {
                    diagramType = 'face_recognition';
                  } else if (msg.content.includes('[ShowDiagram: geofencing]')) {
                    diagramType = 'geofencing';
                  } else if (msg.content.includes('[ShowDiagram: attendance_flow]')) {
                    diagramType = 'attendance_flow';
                  }
                }

                const displayContent = msg.content
                  .replace(/\[ShowDiagram: face_recognition\]/g, '')
                  .replace(/\[ShowDiagram: geofencing\]/g, '')
                  .replace(/\[ShowDiagram: attendance_flow\]/g, '');

                return (
                  <div key={msg.id} className={`ai-message-bubble ${msg.role}`}>
                    {msg.role === 'model' && (
                      <div className="gpt-ai-row">
                        <div className="gpt-ai-icon" style={{ flexShrink: 0 }}>
                          <Bot size={14} />
                        </div>
                        <div className="ai-message-content">
                          <div className="ai-message-text">
                            {displayContent.split('\n').map((para, i) => (
                              <p key={i} style={{ margin: i < displayContent.split('\n').length - 1 ? '0 0 12px 0' : 0, color: '#0f172a' }}>
                                {para.split('**').map((text, idx) =>
                                  idx % 2 === 1 ? <strong key={idx} style={{ color: '#020617', fontWeight: 700 }}>{text}</strong> : text
                                )}
                              </p>
                            ))}
                            {diagramType && renderInteractiveDiagram(diagramType)}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                            <button
                              type="button"
                              className="ai-voice-action"
                              onClick={() => { if (playCyberSound) playCyberSound('click'); handleSpeakText(displayContent); }}
                              title="Listen to Response"
                            >
                              <Volume2 size={14} />
                              <span>Listen</span>
                            </button>
                            <button
                              type="button"
                              className="ai-voice-action"
                              onClick={() => { if (playCyberSound) playCyberSound('click'); window.speechSynthesis && window.speechSynthesis.cancel(); }}
                              title="Stop Audio"
                              style={{ color: '#8e8ea0' }}
                            >
                              <VolumeX size={14} />
                              <span>Stop</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {msg.role === 'user' && (
                      <div className="ai-message-content">
                        <div className="ai-message-text">
                          {displayContent.split('\n').map((para, i) => (
                            <p key={i} style={{ margin: i < displayContent.split('\n').length - 1 ? '0 0 8px 0' : 0 }}>
                              {para}
                            </p>
                          ))}
                          {msg.attachedImage && (
                            <div style={{ marginTop: '8px' }}>
                              <img src={msg.attachedImage} alt="User attachment" style={{ maxWidth: '220px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }} />
                              {msg.attachedImageName && <div style={{ fontSize: '0.72rem', color: '#8e8ea0', marginTop: '4px' }}>{msg.attachedImageName}</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {isChatLoading && (
                <div className="ai-message-bubble model">
                  <div className="gpt-ai-row">
                    <div className="gpt-ai-icon" style={{ flexShrink: 0 }}>
                      <Bot size={14} />
                    </div>
                    <div className="ai-message-content">
                      <div className="ai-message-text">
                        <div className="chatbot-typing-indicator">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Suggestions */}
            <div className="ai-chat-suggestions">
              {getSuggestions().map((s, idx) => (
                <button key={idx} type="button" className="ai-suggestion-chip" onClick={() => handleSendChatMessage(s)}>
                  {s}
                </button>
              ))}
            </div>

            {/* Attachment Bar */}
            {botAttachedImage && (
              <div className="ai-attachment-preview-bar">
                <img src={`data:${botAttachedImageMime};base64,${botAttachedImage}`} alt="Preview" className="ai-attachment-thumbnail" />
                <div className="ai-attachment-file-pill">
                  <span>{botAttachedImageName || 'image_attachment.png'}</span>
                  <button type="button" className="ai-attachment-remove-btn" onClick={() => { setBotAttachedImage(null); setBotAttachedImageMime(null); setBotAttachedImageName(''); }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Input Form Bar */}
            <div className="ai-chat-input-bar">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
              >
                <input
                  type="file"
                  accept="image/*,.txt,.py,.js,.json,.csv,.c,.cpp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="bot-file-upload-panel"
                />
                <label htmlFor="bot-file-upload-panel" className="ai-icon-btn" title="Attach file or image">
                  <Paperclip size={16} />
                </label>

                <button
                  type="button"
                  onClick={handleSpeechToText}
                  className={`ai-icon-btn ${isListeningSpeech ? 'recording' : ''}`}
                  title={isListeningSpeech ? "Stop voice listening" : "Ask using your voice"}
                >
                  <Mic size={16} />
                </button>

                <input
                  type="text"
                  className="ai-chat-input-text"
                  placeholder="Message Smart Attendance AI..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isChatLoading}
                />

                <button
                  type="submit"
                  className="ai-send-btn"
                  disabled={isChatLoading || !chatInput.trim()}
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>

          {/* Right Pane: Settings */}
          <div className="ai-settings-pane">
            <h2 className="ai-settings-title">
              <Settings size={18} />
              Bot Configurator
            </h2>

            <div className="ai-settings-section">
              <label className="ai-settings-label">Bot Personality</label>
              <div className="ai-settings-grid">
                {[
                  { id: 'futuristic', label: 'Futuristic', desc: 'Cyber robotic tone' },
                  { id: 'casual', label: 'Casual', desc: 'Friendly classmate' },
                  { id: 'tutor', label: 'Tutor', desc: 'Patient study advisor' },
                  { id: 'robotic', label: 'Robotic', desc: 'Strict factual data' }
                ].map((p) => (
                  <div key={p.id} className={`ai-settings-card ${botPersonality === p.id ? 'active' : ''}`} onClick={() => { if (playCyberSound) playCyberSound('click'); setBotPersonality(p.id); }}>
                    <span>{p.label}</span>
                    <small>{p.desc}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="ai-settings-section">
              <label className="ai-settings-label">Help Suggestions Category</label>
              <select className="ai-select-dropdown" value={botSuggestionCategory} onChange={(e) => { if (playCyberSound) playCyberSound('click'); setBotSuggestionCategory(e.target.value); }}>
                <option value="general">General System FAQs</option>
                <option value="attendance">Face Scanning & Geofence</option>
                <option value="profile">Student Profile & Selfie Registration</option>
                <option value="security">Portal Security & Passwords</option>
              </select>
            </div>

            <div className="ai-settings-section">
              <label className="ai-settings-label">Speech Synthesis Engine</label>

              <div className="ai-toggle-group" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Voice Activation Mode</span>
                  <small style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Listen for "Hey Raj" in background</small>
                </div>
                <label className="ai-toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={botWakeWordEnabled} 
                    onChange={(e) => { 
                      const enabled = e.target.checked;
                      if (playCyberSound) playCyberSound('click'); 
                      setBotWakeWordEnabled(enabled); 
                      localStorage.setItem('botWakeWordEnabled', enabled ? 'true' : 'false');
                    }} 
                  />
                  <span className="ai-toggle-slider" />
                </label>
              </div>

              <div className="ai-toggle-group">
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Auto-Read Bot Replies</span>
                <label className="ai-toggle-switch">
                  <input type="checkbox" checked={botAutoSpeak} onChange={(e) => { if (playCyberSound) playCyberSound('click'); setBotAutoSpeak(e.target.checked); }} />
                  <span className="ai-toggle-slider" />
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Select Voice Accent</span>
                <select className="ai-select-dropdown" value={botVoiceSelected} onChange={(e) => setBotVoiceSelected(e.target.value)}>
                  {availableVoices.length === 0 ? (
                    <option>System Default Voice</option>
                  ) : (
                    availableVoices.map((v, idx) => (
                      <option key={idx} value={v.name}>{v.name} ({v.lang})</option>
                    ))
                  )}
                </select>
              </div>

              <div className="ai-range-control">
                <div className="ai-range-val">
                  <span>Voice Speed (Rate)</span>
                  <span>{botVoiceSpeed.toFixed(1)}x</span>
                </div>
                <input type="range" className="ai-range-slider" min="0.5" max="2.0" step="0.1" value={botVoiceSpeed} onChange={(e) => setBotVoiceSpeed(parseFloat(e.target.value))} />
              </div>

              <div className="ai-range-control">
                <div className="ai-range-val">
                  <span>Voice Pitch</span>
                  <span>{botVoicePitch.toFixed(1)}</span>
                </div>
                <input type="range" className="ai-range-slider" min="0.5" max="2.0" step="0.1" value={botVoicePitch} onChange={(e) => setBotVoicePitch(parseFloat(e.target.value))} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
