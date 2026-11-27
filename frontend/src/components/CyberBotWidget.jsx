import { useState, Fragment } from 'react';
import {
  X,
  Paperclip,
  Mic,
  Volume2,
  VolumeX,
  Trash2,
  Video,
  ShieldCheck,
  Clock,
  Phone,
  FileDown,
  ArrowLeft,
  ArrowUp,
  Square,
  Copy,
  Check,
  RotateCcw,
  Plus,
  History,
  SlidersHorizontal,
  Menu,
  Calendar,
  FileText,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import useCyberBot from '../hooks/useCyberBot';
import useUI from '../hooks/useUI';
import useAuth from '../hooks/useAuth';

const MODE_LABELS = {
  casual: 'Standard',
  tutor: 'Tutor',
  robotic: 'Concise',
  futuristic: 'Technical',
};

function renderInlineFormatting(text, keyPrefix = 'in') {
  if (!text) return null;
  const segments = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return segments.map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) {
      return <strong key={`${keyPrefix}-${i}`}>{seg.slice(2, -2)}</strong>;
    }
    if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2) {
      return (
        <code key={`${keyPrefix}-${i}`} className="gg-ai-inline-code">
          {seg.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={`${keyPrefix}-${i}`}>{seg}</Fragment>;
  });
}

function CodeBlockCard({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="gg-ai-code-block">
      <div className="gg-ai-code-header">
        <span>{lang || 'code'}</span>
        <button type="button" onClick={handleCopyCode} className="gg-ai-code-copy">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderFormattedMarkdown(rawContent) {
  if (!rawContent) return null;
  const blocks = rawContent.split(/(```[\s\S]*?```)/g);

  return blocks.map((block, blockIdx) => {
    if (block.startsWith('```') && block.endsWith('```')) {
      const inner = block.slice(3, -3);
      const newlineIdx = inner.indexOf('\n');
      const lang = newlineIdx >= 0 ? inner.slice(0, newlineIdx).trim() : '';
      const code = (newlineIdx >= 0 ? inner.slice(newlineIdx + 1) : inner).trimEnd();
      return <CodeBlockCard key={`cb-${blockIdx}`} lang={lang} code={code} />;
    }

    const lines = block.split('\n');
    return (
      <div key={`tx-${blockIdx}`} className="gg-ai-prose">
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={lineIdx} style={{ height: '6px' }} />;

          if (trimmed.startsWith('### ')) {
            return <h4 key={lineIdx}>{renderInlineFormatting(trimmed.slice(4), `${blockIdx}-${lineIdx}`)}</h4>;
          }
          if (trimmed.startsWith('## ')) {
            return <h3 key={lineIdx}>{renderInlineFormatting(trimmed.slice(3), `${blockIdx}-${lineIdx}`)}</h3>;
          }
          if (/^[-*•]\s+/.test(trimmed)) {
            return (
              <div key={lineIdx} className="gg-ai-list-item">
                <span className="gg-ai-bullet">•</span>
                <span>{renderInlineFormatting(trimmed.replace(/^[-*•]\s+/, ''), `${blockIdx}-${lineIdx}`)}</span>
              </div>
            );
          }
          if (/^\d+\.\s+/.test(trimmed)) {
            const num = trimmed.match(/^(\d+\.)\s+/)[1];
            return (
              <div key={lineIdx} className="gg-ai-list-item">
                <span className="gg-ai-bullet">{num}</span>
                <span>{renderInlineFormatting(trimmed.replace(/^\d+\.\s+/, ''), `${blockIdx}-${lineIdx}`)}</span>
              </div>
            );
          }

          return <p key={lineIdx}>{renderInlineFormatting(line, `${blockIdx}-${lineIdx}`)}</p>;
        })}
      </div>
    );
  });
}

export default function CyberBotWidget({
  activeTab,
  showChatBot: propShowChatBot,
  setShowChatBot: propSetShowChatBot,
  onGoBack = null,
  onOpenMenu = null,
}) {
  const botState = useCyberBot();
  const { playCyberSound } = useUI();
  const { currentUser, userRole } = useAuth();

  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  const isVisible = propShowChatBot !== undefined ? propShowChatBot : botState.showChatBot;
  const toggleVisibility = propSetShowChatBot || botState.setShowChatBot;

  const {
    chatInput,
    setChatInput,
    threads = [],
    activeThreadId,
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
    startNewChat,
    loadThread,
    deleteThread,
    stopGenerating,
    regenerateResponse,
    handleSendChatMessage,
    handleSpeechToText,
    handleSpeakText,
    handleBotFileSelect,
    handleChatPaste,
    handleChatDragOver,
    handleChatDrop,
    clearChatHistory,
    exportChatHistory,
    getSuggestions,
    startVoiceAssistantMode,
  } = botState;

  const firstName = (currentUser?.name || currentUser?.email || 'there').split(' ')[0];

  const starterCards =
    userRole === 'student'
      ? [
          {
            icon: <Calendar size={16} />,
            title: '75% Attendance Plan',
            prompt: 'Calculate how many lectures I need to maintain 75% attendance.',
          },
          {
            icon: <FileText size={16} />,
            title: 'Draft Leave Letter',
            prompt: 'Draft a short, formal medical leave application for my department mentor.',
          },
          {
            icon: <ShieldCheck size={16} />,
            title: 'Biometric & Geofence Help',
            prompt: 'Explain how face recognition attendance and campus geofence check-in work.',
          },
          {
            icon: <BookOpen size={16} />,
            title: 'Study & Concept Helper',
            prompt: 'Help me prepare a study summary for my upcoming internal exams.',
          },
        ]
      : [
          {
            icon: <FileText size={16} />,
            title: 'Draft Campus Circular',
            prompt: 'Draft a clean, formal attendance compliance notice for undergraduate students.',
          },
          {
            icon: <ShieldCheck size={16} />,
            title: 'Dispute & Match Policy',
            prompt: 'Summarize recommended steps for verifying borderline face matches and disputes.',
          },
          {
            icon: <Calendar size={16} />,
            title: 'Session & Schedule Guide',
            prompt: 'How do cancelled classes and substitute faculty affect attendance analytics?',
          },
          {
            icon: <Sparkles size={16} />,
            title: 'Attendance Audit Checklist',
            prompt: 'Give me a concise weekly checklist for reviewing attendance logs and defaulters.',
          },
        ];

  const handleCopyMessage = (msgId, text) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 1800);
  };

  const renderInteractiveDiagram = (diagramType) => {
    if (diagramType === 'face_recognition') {
      return (
        <div className="ai-diagram-card">
          <div className="ai-diagram-title">
            <Video size={14} /> Biometric Verification Overview
          </div>
          <div style={{ fontSize: '0.8rem', color: '#46423b', textAlign: 'center' }}>
            Camera Capture → Liveness Check → Landmark Alignment → Attendance Verified
          </div>
        </div>
      );
    }
    if (diagramType === 'geofencing') {
      return (
        <div className="ai-diagram-card">
          <div className="ai-diagram-title">
            <ShieldCheck size={14} /> Campus Geofence Verification
          </div>
          <div style={{ fontSize: '0.8rem', color: '#46423b', textAlign: 'center' }}>
            GPS Radius Check + Campus Wi-Fi Subnet Check → Session Unlocked
          </div>
        </div>
      );
    }
    if (diagramType === 'attendance_flow') {
      return (
        <div className="ai-diagram-card">
          <div className="ai-diagram-title">
            <Clock size={14} /> Attendance Check-in Flow
          </div>
          <div style={{ fontSize: '0.8rem', color: '#46423b', textAlign: 'center' }}>
            1. Open Scanner → 2. Verify Face & Location → 3. Instant Log Sync
          </div>
        </div>
      );
    }
    return null;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isChatLoading && (chatInput.trim() || botAttachedImage)) {
        handleSendChatMessage();
      }
    }
  };

  const renderMessageList = () => (
    <>
      {chatMessages.length === 0 && !isChatLoading && (
        <div className="gg-ai-empty">
          <div className="gg-ai-empty-badge">
            <Sparkles size={14} />
            <span>{MODE_LABELS[botPersonality] || 'Standard'} Mode</span>
          </div>
          <h2 className="gg-ai-greeting">Hello, {firstName}</h2>
          <p className="gg-ai-subgreeting">What would you like to work on today?</p>

          <div className="gg-ai-starter-grid">
            {starterCards.map((card) => (
              <button
                key={card.title}
                type="button"
                onClick={() => handleSendChatMessage(card.prompt)}
                className="gg-ai-starter-card"
              >
                <div className="gg-ai-starter-icon">{card.icon}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="gg-ai-starter-title">{card.title}</div>
                  <div className="gg-ai-starter-desc">{card.prompt}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {chatMessages.map((msg) => {
        let diagramType = null;
        if (msg.role === 'model') {
          if (msg.content.includes('[ShowDiagram: face_recognition]')) diagramType = 'face_recognition';
          else if (msg.content.includes('[ShowDiagram: geofencing]')) diagramType = 'geofencing';
          else if (msg.content.includes('[ShowDiagram: attendance_flow]')) diagramType = 'attendance_flow';
        }

        const displayContent = (msg.content || '')
          .replace(/\[ShowDiagram: face_recognition\]/g, '')
          .replace(/\[ShowDiagram: geofencing\]/g, '')
          .replace(/\[ShowDiagram: attendance_flow\]/g, '')
          .trim();

        return (
          <div key={msg.id} className={`gg-ai-msg-row ${msg.role}`}>
            {msg.role === 'user' ? (
              <div className="gg-ai-user-bubble">
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{displayContent}</div>
                {msg.attachedImage && (
                  <div style={{ marginTop: '8px' }}>
                    <img
                      src={msg.attachedImage}
                      alt="Attachment"
                      style={{ maxWidth: '210px', borderRadius: '10px', border: '1px solid #dfd0ae' }}
                    />
                    {msg.attachedImageName && (
                      <div style={{ fontSize: '0.72rem', color: '#786240', marginTop: '4px' }}>
                        {msg.attachedImageName}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="gg-ai-model-card">
                <div className="gg-ai-model-label">
                  <Sparkles size={13} />
                  <span>Assistant</span>
                </div>
                <div className="gg-ai-model-body">
                  {renderFormattedMarkdown(displayContent)}
                  {diagramType && renderInteractiveDiagram(diagramType)}
                </div>
                <div className="gg-ai-msg-actions">
                  <button
                    type="button"
                    className="gg-ai-action-chip"
                    onClick={() => handleCopyMessage(msg.id, displayContent)}
                    title="Copy response"
                  >
                    {copiedMsgId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    className="gg-ai-action-chip"
                    disabled={isChatLoading}
                    onClick={() => regenerateResponse(msg.id)}
                    title="Regenerate response"
                  >
                    <RotateCcw size={13} />
                    <span>Retry</span>
                  </button>
                  <button
                    type="button"
                    className="gg-ai-action-chip"
                    onClick={() => handleSpeakText(displayContent)}
                    title="Listen to response"
                  >
                    <Volume2 size={13} />
                    <span>Listen</span>
                  </button>
                  <button
                    type="button"
                    className="gg-ai-action-chip"
                    onClick={() => window.speechSynthesis && window.speechSynthesis.cancel()}
                    title="Stop voice"
                  >
                    <VolumeX size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {isChatLoading && (
        <div className="gg-ai-msg-row model">
          <div className="gg-ai-model-card">
            <div className="gg-ai-model-label">
              <Sparkles size={13} />
              <span>Thinking...</span>
            </div>
            <div className="chatbot-typing-indicator" style={{ padding: '4px 0' }}>
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      <div ref={chatBottomRef} />
    </>
  );

  // Full-page Modern Golden Gate AI Workspace (#/ai-assistant)
  if (activeTab === 'ai-assistant') {
    return (
      <div
        className="ai-assistant-wrapper gg-ai-workspace"
        onDragOver={handleChatDragOver}
        onDrop={handleChatDrop}
        onPaste={handleChatPaste}
      >
        {/* Top Control Bar */}
        <div className="gg-ai-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            {onGoBack && (
              <button
                type="button"
                onClick={onGoBack}
                className="gg-ai-top-btn hide-on-desktop"
                aria-label="Go Back"
                title="Go Back"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                setShowHistoryDrawer(true);
              }}
              className="gg-ai-top-btn"
              title="Conversation History"
              aria-label="Conversation History"
              style={{ width: 'auto', padding: '0 9px', gap: '5px' }}
            >
              <History size={15} />
              <span className="gg-ai-hide-mobile-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                Chats
              </span>
              {threads.length > 0 && (
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#785927' }}>
                  ({threads.length})
                </span>
              )}
            </button>

            <select
              aria-label="Assistant Mode"
              className="gg-ai-mode-select"
              value={botPersonality}
              onChange={(e) => {
                playCyberSound('click');
                setBotPersonality(e.target.value);
              }}
            >
              <option value="casual">Standard</option>
              <option value="tutor">Study Tutor</option>
              <option value="robotic">Concise</option>
              <option value="futuristic">Technical</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isListeningSpeech && (
              <span className="gg-ai-listening-pill">Listening</span>
            )}
            <button
              type="button"
              onClick={startNewChat}
              className="gg-ai-top-btn"
              title="New Conversation"
              aria-label="New Conversation"
              style={{ width: 'auto', padding: '0 9px', gap: '5px', background: '#faf3e3', borderColor: '#dfd0ae', color: '#5c4218' }}
            >
              <Plus size={15} />
              <span className="gg-ai-hide-mobile-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>New</span>
            </button>
            <button
              type="button"
              onClick={startVoiceAssistantMode}
              className="gg-ai-top-btn"
              title="Voice Assistant Mode"
              aria-label="Voice Assistant Mode"
            >
              <Phone size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                setShowSettingsDrawer(true);
              }}
              className="gg-ai-top-btn"
              title="Assistant Settings"
              aria-label="Assistant Settings"
            >
              <SlidersHorizontal size={15} />
            </button>
            {onOpenMenu && (
              <button
                type="button"
                onClick={onOpenMenu}
                className="gg-ai-top-btn hide-on-desktop"
                title="Open Navigation Menu"
                aria-label="Open Navigation Menu"
              >
                <Menu size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Conversation Area */}
        <div className="gg-ai-messages" ref={chatListRef}>
          {renderMessageList()}
        </div>

        {/* Attachment Preview */}
        {botAttachedImage && (
          <div className="ai-attachment-preview-bar" style={{ borderTop: '1px solid #f0e6d2' }}>
            <img
              src={`data:${botAttachedImageMime};base64,${botAttachedImage}`}
              alt="Attachment Preview"
              className="ai-attachment-thumbnail"
            />
            <div className="ai-attachment-file-pill">
              <span>{botAttachedImageName || 'image_attachment.png'}</span>
              <button
                type="button"
                className="ai-attachment-remove-btn"
                onClick={() => {
                  setBotAttachedImage(null);
                  setBotAttachedImageMime(null);
                  setBotAttachedImageName('');
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Modern Multi-Line Composer */}
        <div className="gg-ai-composer-wrap">
          <form
            className="gg-ai-composer"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChatMessage();
            }}
          >
            <input
              type="file"
              accept="image/*,.txt,.py,.js,.json,.csv,.c,.cpp,.md"
              onChange={handleBotFileSelect}
              style={{ display: 'none' }}
              id="bot-file-upload-panel"
            />
            <label
              htmlFor="bot-file-upload-panel"
              className="gg-ai-composer-btn"
              title="Attach image or document"
            >
              <Paperclip size={16} />
            </label>

            <textarea
              rows={1}
              className="gg-ai-textarea"
              placeholder="Message Campus Assistant..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isChatLoading}
            />

            <button
              type="button"
              onClick={handleSpeechToText}
              className={`gg-ai-composer-btn ${isListeningSpeech ? 'is-recording' : ''}`}
              title={isListeningSpeech ? 'Stop voice input' : 'Speak prompt'}
            >
              <Mic size={16} />
            </button>

            {isChatLoading ? (
              <button
                type="button"
                onClick={stopGenerating}
                className="gg-ai-send-btn is-stop"
                title="Stop generating"
                aria-label="Stop generating"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                className="gg-ai-send-btn"
                disabled={!chatInput.trim() && !botAttachedImage}
                title="Send message"
                aria-label="Send message"
              >
                <ArrowUp size={17} strokeWidth={2.5} />
              </button>
            )}
          </form>
        </div>

        {/* Saved Threads History Drawer */}
        {showHistoryDrawer && (
          <div className="gg-notif-backdrop" onClick={() => setShowHistoryDrawer(false)}>
            <div className="gg-notif-panel" style={{ maxWidth: '340px' }} onClick={(e) => e.stopPropagation()}>
              <div className="gg-notif-header">
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#2b2112' }}>
                  Recent Chats
                </h3>
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(false)}
                  className="gg-notif-action-btn"
                >
                  <X size={16} />
                </button>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', borderBottom: '1px solid #ede2cc' }}>
                <button
                  type="button"
                  onClick={() => {
                    startNewChat();
                    setShowHistoryDrawer(false);
                  }}
                  className="golden-os-primary-action"
                  style={{ flex: 1, justifyContent: 'center', padding: '9px 12px', fontSize: '0.82rem', borderRadius: '10px' }}
                >
                  <Plus size={15} />
                  <span>New Conversation</span>
                </button>
                {chatMessages.length > 0 && (
                  <button
                    type="button"
                    onClick={exportChatHistory}
                    className="golden-os-feedback-filter-btn"
                    style={{ padding: '9px 12px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    title="Export current chat"
                  >
                    <FileDown size={14} />
                    <span>Export</span>
                  </button>
                )}
              </div>
              <div className="gg-notif-feed">
                {threads.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: '#8f7b58', fontSize: '0.82rem' }}>
                    Your saved conversations will appear here.
                  </div>
                ) : (
                  <div className="golden-os-list-shell">
                    {threads.map(th => (
                      <div
                        key={th.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          loadThread(th.id);
                          setShowHistoryDrawer(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            loadThread(th.id);
                            setShowHistoryDrawer(false);
                          }
                        }}
                        className={`gg-notif-row ${th.id === activeThreadId ? 'is-unread' : ''}`}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="gg-notif-row-title">{th.title}</div>
                          <div className="gg-notif-row-summary">
                            {th.messages?.length || 0} messages
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteThread(th.id);
                          }}
                          className="gg-notif-delete-btn"
                          title="Delete conversation"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Assistant Settings Drawer */}
        {showSettingsDrawer && (
          <div className="gg-notif-backdrop" onClick={() => setShowSettingsDrawer(false)}>
            <div className="gg-notif-panel" style={{ maxWidth: '360px' }} onClick={(e) => e.stopPropagation()}>
              <div className="gg-notif-header">
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#2b2112' }}>
                  Assistant Preferences
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSettingsDrawer(false)}
                  className="gg-notif-action-btn"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="gg-notif-feed" style={{ gap: '14px' }}>
                <div className="golden-os-form-section" style={{ gap: '10px' }}>
                  <div className="golden-os-form-section-title">Response Style</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { id: 'casual', label: 'Standard', desc: 'Natural & clear' },
                      { id: 'tutor', label: 'Study Tutor', desc: 'Step-by-step help' },
                      { id: 'robotic', label: 'Concise', desc: 'Short & direct' },
                      { id: 'futuristic', label: 'Technical', desc: 'Detailed insights' },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          playCyberSound('click');
                          setBotPersonality(mode.id);
                        }}
                        className={`golden-os-feedback-filter-btn ${botPersonality === mode.id ? 'active' : ''}`}
                        style={{ borderRadius: '10px', padding: '10px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px' }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{mode.label}</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.78 }}>{mode.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="golden-os-form-section" style={{ gap: '10px' }}>
                  <div className="golden-os-form-section-title">Topic Focus</div>
                  <select
                    className="golden-os-input"
                    value={botSuggestionCategory}
                    onChange={(e) => setBotSuggestionCategory(e.target.value)}
                  >
                    <option value="general">General Campus Assistant</option>
                    <option value="attendance">Attendance & Geofencing</option>
                    <option value="profile">Profile & Biometrics</option>
                    <option value="security">Account & Security</option>
                  </select>
                </div>

                <div className="golden-os-form-section" style={{ gap: '12px' }}>
                  <div className="golden-os-form-section-title">Voice & Audio</div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, color: '#2b2112' }}>
                    <span>Auto-Read Replies</span>
                    <input
                      type="checkbox"
                      checked={botAutoSpeak}
                      onChange={(e) => setBotAutoSpeak(e.target.checked)}
                    />
                  </label>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', fontWeight: 600, color: '#2b2112' }}>
                    <span>Wake Word ("Hey Raj")</span>
                    <input
                      type="checkbox"
                      checked={botWakeWordEnabled}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setBotWakeWordEnabled(enabled);
                        localStorage.setItem('botWakeWordEnabled', enabled ? 'true' : 'false');
                      }}
                    />
                  </label>
                  <div>
                    <label className="golden-os-field-label">Voice Accent</label>
                    <select
                      className="golden-os-input"
                      value={botVoiceSelected}
                      onChange={(e) => setBotVoiceSelected(e.target.value)}
                    >
                      {availableVoices.length === 0 ? (
                        <option>System Default Voice</option>
                      ) : (
                        availableVoices.map((v, idx) => (
                          <option key={idx} value={v.name}>
                            {v.name} ({v.lang})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="golden-os-field-label">Speech Speed ({botVoiceSpeed.toFixed(1)}x)</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={botVoiceSpeed}
                      onChange={(e) => setBotVoiceSpeed(parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="golden-os-field-label">Voice Pitch ({botVoicePitch.toFixed(1)})</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={botVoicePitch}
                      onChange={(e) => setBotVoicePitch(parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {chatMessages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      clearChatHistory();
                      setShowSettingsDrawer(false);
                    }}
                    className="golden-os-feedback-filter-btn"
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', color: '#b91c1c', borderColor: '#fecaca', background: '#fff5f5' }}
                  >
                    Delete Current Conversation
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Floating Mini Drawer (kept clean in Golden Gate theme)
  if (!isVisible) return null;

  return (
    <div className="ai-chatbot-drawer-overlay">
      <div className="ai-chatbot-drawer-container">
        <div className="ai-chatbot-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="ai-chatbot-name">Campus Assistant</span>
            <span className="ai-personality-badge">{MODE_LABELS[botPersonality] || 'Standard'}</span>
          </div>
          <div className="ai-chatbot-header-actions">
            <button type="button" className="ai-icon-btn" onClick={clearChatHistory} title="Clear Chat">
              <Trash2 size={15} />
            </button>
            <button
              type="button"
              className="ai-icon-btn"
              onClick={() => toggleVisibility(false)}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="ai-chatbot-body">
          <div className="ai-chat-pane">
            <div className="gg-ai-messages">{renderMessageList()}</div>
            <div className="ai-chat-suggestions">
              {getSuggestions().map((s, idx) => (
                <button key={idx} type="button" className="ai-suggestion-chip" onClick={() => handleSendChatMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
            {botAttachedImage && (
              <div className="ai-attachment-preview-bar">
                <img src={`data:${botAttachedImageMime};base64,${botAttachedImage}`} alt="Preview" className="ai-attachment-thumbnail" />
                <div className="ai-attachment-file-pill">
                  <span>{botAttachedImageName || 'image.png'}</span>
                  <button type="button" className="ai-attachment-remove-btn" onClick={() => { setBotAttachedImage(null); setBotAttachedImageMime(null); setBotAttachedImageName(''); }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
            <div className="gg-ai-composer-wrap">
              <form
                className="gg-ai-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
              >
                <input type="file" accept="image/*,.txt,.py,.js,.json,.csv" onChange={handleBotFileSelect} style={{ display: 'none' }} id="bot-drawer-file" />
                <label htmlFor="bot-drawer-file" className="gg-ai-composer-btn" title="Attach">
                  <Paperclip size={15} />
                </label>
                <textarea
                  rows={1}
                  className="gg-ai-textarea"
                  placeholder="Ask Campus Assistant..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isChatLoading}
                />
                <button type="button" onClick={handleSpeechToText} className={`gg-ai-composer-btn ${isListeningSpeech ? 'is-recording' : ''}`}>
                  <Mic size={15} />
                </button>
                <button type="submit" className="gg-ai-send-btn" disabled={isChatLoading || (!chatInput.trim() && !botAttachedImage)}>
                  <ArrowUp size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
