import { useState, useEffect, useRef, useCallback } from 'react';
import useAuth from './useAuth';
import useUI from './useUI';
import { getApiBaseUrl } from '../utils/platform';

function getThreadsStorageKey(user, role) {
  const uid = user?.id || user?.email || role || 'guest';
  return `gg_ai_threads_${String(uid).toLowerCase()}`;
}

function readSavedThreads(key) {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function useCyberBot() {
  const { currentUser, userRole, token } = useAuth();
  const { playCyberSound, soundEnabled, audioVolume } = useUI();

  const API_BASE_URL = getApiBaseUrl();
  const storageKey = getThreadsStorageKey(currentUser, userRole);

  // Primary AI Chat States
  const [showChatBot, setShowChatBot] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [threadState, setThreadState] = useState(() => ({
    key: storageKey,
    items: readSavedThreads(storageKey),
    activeId: null,
    messages: [],
  }));
  const [isChatLoading, setIsChatLoading] = useState(false);

  const isSameAccount = threadState.key === storageKey;
  const threads = isSameAccount ? threadState.items : readSavedThreads(storageKey);
  const activeThreadId = isSameAccount ? threadState.activeId : null;
  const chatMessages = isSameAccount ? threadState.messages : [];

  const updateActiveSession = useCallback(
    (updaterFn) => {
      setThreadState(prev => {
        const base = prev.key === storageKey
          ? prev
          : { key: storageKey, items: readSavedThreads(storageKey), activeId: null, messages: [] };
        const next = updaterFn(base);
        return { ...next, key: storageKey };
      });
    },
    [storageKey]
  );

  const setChatMessages = useCallback(
    (msgsOrUpdater) => {
      updateActiveSession(base => {
        const nextMsgs = typeof msgsOrUpdater === 'function' ? msgsOrUpdater(base.messages) : msgsOrUpdater;
        if (!Array.isArray(nextMsgs) || nextMsgs.length === 0) {
          return { ...base, messages: [] };
        }
        const tid = base.activeId || `thread_${Date.now()}`;
        const firstUser = nextMsgs.find(m => m.role === 'user');
        const titleRaw = (firstUser?.content || 'New Conversation')
          .replace(/\[Attached File Content:.*?\]/gs, '')
          .trim();
        const title = titleRaw.length > 44 ? `${titleRaw.slice(0, 44)}...` : titleRaw || 'New Conversation';
        const compactMsgs = nextMsgs.slice(-40).map(m => ({
          ...m,
          attachedImage: m.attachedImage && m.attachedImage.length < 40000 ? m.attachedImage : null,
        }));
        const existingIdx = base.items.findIndex(t => t.id === tid);
        const updated = { id: tid, title, updatedAt: Date.now(), messages: compactMsgs };
        const nextItems = (
          existingIdx >= 0
            ? base.items.map((t, i) => (i === existingIdx ? updated : t))
            : [updated, ...base.items]
        ).slice(0, 20);
        try {
          localStorage.setItem(storageKey, JSON.stringify(nextItems));
        } catch {
          // ignore quota errors
        }
        return { ...base, activeId: tid, messages: nextMsgs, items: nextItems };
      });
    },
    [storageKey, updateActiveSession]
  );

  // Assistant Mode & Speech States
  const [botPersonality, setBotPersonality] = useState('casual');
  const [botVoiceEnabled, setBotVoiceEnabled] = useState(false);
  const [botWakeWordEnabled, setBotWakeWordEnabled] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('botWakeWordEnabled') === 'true'
  );
  const [botVoiceSpeed, setBotVoiceSpeed] = useState(1.0);
  const [botVoicePitch, setBotVoicePitch] = useState(1.0);
  const [botSuggestionCategory, setBotSuggestionCategory] = useState('general');
  const [botAttachedImage, setBotAttachedImage] = useState(null);
  const [botAttachedImageMime, setBotAttachedImageMime] = useState(null);
  const [botAttachedImageName, setBotAttachedImageName] = useState('');
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);

  const [botVoiceSelected, setBotVoiceSelected] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [botAutoSpeak, setBotAutoSpeak] = useState(false);
  const [isVoiceAssistantMode, setIsVoiceAssistantMode] = useState(false);
  const [showVoicePulseFlash, setShowVoicePulseFlash] = useState(false);

  // Refs for audio / abort / scrolling
  const chatBottomRef = useRef(null);
  const chatListRef = useRef(null);
  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const voiceAssistantActiveRef = useRef(false);
  const abortControllerRef = useRef(null);

  // Load available speech voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        if (voices.length > 0 && !botVoiceSelected) {
          const defaultVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
          setBotVoiceSelected(defaultVoice.name);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [botVoiceSelected]);

  // Text to speech helper
  const handleSpeakText = useCallback((text, onEndCallback = null) => {
    if (!text) return;
    if (playCyberSound) playCyberSound('click');

    if (soundEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/```[\s\S]*?```/g, 'code snippet').replace(/[*#_`~]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);

      if (botVoiceSelected) {
        const voices = window.speechSynthesis.getVoices();
        const selected = voices.find(v => v.name === botVoiceSelected);
        if (selected) utterance.voice = selected;
      }

      utterance.rate = botVoiceSpeed;
      utterance.pitch = botVoicePitch;
      utterance.volume = audioVolume || 1.0;

      utterance.onstart = () => { isSpeakingRef.current = true; };
      utterance.onend = () => {
        isSpeakingRef.current = false;
        if (onEndCallback) onEndCallback();
      };
      utterance.onerror = () => {
        isSpeakingRef.current = false;
        if (onEndCallback) onEndCallback();
      };

      window.speechSynthesis.speak(utterance);
    } else if (onEndCallback) {
      setTimeout(onEndCallback, 400);
    }
  }, [playCyberSound, soundEnabled, botVoiceSelected, botVoiceSpeed, botVoicePitch, audioVolume]);

  // Image attachment helper
  const handleImageUpload = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please attach an image file (PNG, JPG, etc.).');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const parts = result.split(',');
        const mimeMatch = result.match(/data:(.*?);base64/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const base64 = parts[1];
        setBotAttachedImage(base64);
        setBotAttachedImageMime(mime);
        setBotAttachedImageName(file.name);
        if (playCyberSound) playCyberSound('success');
      }
    };
    reader.readAsDataURL(file);
  }, [playCyberSound]);

  // Text file attachment helper
  const handleTextFileAttach = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileText = e.target.result;
      setChatInput((prev) => `${prev ? `${prev}\n\n` : ''}[Attached File: ${file.name}]\n${fileText}\n[End File]`);
      if (playCyberSound) playCyberSound('success');
    };
    reader.readAsText(file);
  }, [playCyberSound]);

  const handleBotFileSelect = useCallback((e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      handleImageUpload(file);
    } else {
      handleTextFileAttach(file);
    }
    e.target.value = '';
  }, [handleImageUpload, handleTextFileAttach]);

  const handleChatPaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        handleImageUpload(blob);
        e.preventDefault();
        break;
      }
    }
  }, [handleImageUpload]);

  const handleChatDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleChatDrop = useCallback((e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleImageUpload(file);
      } else {
        handleTextFileAttach(file);
      }
    }
  }, [handleImageUpload, handleTextFileAttach]);

  const startNewChat = useCallback(() => {
    if (abortControllerRef.current) {
      try { abortControllerRef.current.abort(); } catch { /* ignore */ }
    }
    updateActiveSession(base => ({ ...base, activeId: `thread_${Date.now()}`, messages: [] }));
    setChatInput('');
    setBotAttachedImage(null);
    setBotAttachedImageMime(null);
    setBotAttachedImageName('');
    setIsChatLoading(false);
    if (playCyberSound) playCyberSound('click');
  }, [playCyberSound, updateActiveSession]);

  const loadThread = useCallback((threadId) => {
    updateActiveSession(base => {
      const match = base.items.find(t => t.id === threadId);
      if (!match) return base;
      return {
        ...base,
        activeId: match.id,
        messages: Array.isArray(match.messages) ? match.messages : [],
      };
    });
    if (abortControllerRef.current) {
      try { abortControllerRef.current.abort(); } catch { /* ignore */ }
    }
    setIsChatLoading(false);
    if (playCyberSound) playCyberSound('click');
  }, [updateActiveSession, playCyberSound]);

  const deleteThread = useCallback((threadId) => {
    updateActiveSession(base => {
      const nextItems = base.items.filter(t => t.id !== threadId);
      try {
        localStorage.setItem(storageKey, JSON.stringify(nextItems));
      } catch { /* ignore */ }
      const deletedActive = base.activeId === threadId;
      return {
        ...base,
        items: nextItems,
        activeId: deletedActive ? null : base.activeId,
        messages: deletedActive ? [] : base.messages,
      };
    });
    if (playCyberSound) playCyberSound('click');
  }, [storageKey, updateActiveSession, playCyberSound]);

  const clearChatHistory = useCallback(() => {
    if (activeThreadId) {
      deleteThread(activeThreadId);
    } else {
      setChatMessages([]);
    }
    setChatInput('');
    setBotAttachedImage(null);
    setBotAttachedImageMime(null);
    setBotAttachedImageName('');
    if (playCyberSound) playCyberSound('click');
  }, [activeThreadId, deleteThread, playCyberSound]);

  const exportChatHistory = useCallback(() => {
    if (playCyberSound) playCyberSound('success');
    let transcript = `AI Assistant Transcript - Smart Attendance System\n`;
    transcript += `Generated: ${new Date().toLocaleString()}\n`;
    transcript += `User: ${currentUser?.name || 'Unknown'} (${userRole || 'member'})\n`;
    transcript += `=========================================\n\n`;

    chatMessages.forEach(m => {
      const sender = m.role === 'user' ? 'USER' : 'ASSISTANT';
      transcript += `[${sender}]: ${m.content}\n`;
      if (m.attachedImageName) {
        transcript += `(Attachment: ${m.attachedImageName})\n`;
      }
      transcript += `\n`;
    });

    const element = document.createElement('a');
    const file = new Blob([transcript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `assistant_chat_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }, [chatMessages, currentUser, userRole, playCyberSound]);

  const buildUserContext = useCallback(() => {
    let userContextStr = '';
    if (!currentUser) return userContextStr;
    userContextStr += `[Current User Profile Context]:\n`;
    userContextStr += `- Name: ${currentUser.name}\n`;
    userContextStr += `- Role: ${userRole}\n`;
    if (currentUser.details) {
      if (currentUser.details.roll) userContextStr += `- Roll Number: ${currentUser.details.roll}\n`;
      if (currentUser.details.dep) userContextStr += `- Department/Branch: ${currentUser.details.dep}\n`;
      if (currentUser.details.course) userContextStr += `- Course: ${currentUser.details.course}\n`;
      if (currentUser.details.year) userContextStr += `- Year: ${currentUser.details.year}\n`;
      if (currentUser.details.semester) userContextStr += `- Semester: ${currentUser.details.semester}\n`;
      if (currentUser.details.phone) userContextStr += `- Contact Phone: ${currentUser.details.phone}\n`;
      if (currentUser.details.teacher) userContextStr += `- Mentor / Assigned Teacher: ${currentUser.details.teacher}\n`;
    }
    try {
      const cachedLogsStr = localStorage.getItem('cached_student_logs');
      if (userRole === 'student' && cachedLogsStr) {
        const studentLogs = JSON.parse(cachedLogsStr);
        if (Array.isArray(studentLogs) && studentLogs.length > 0) {
          const total = studentLogs.length;
          const present = studentLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late').length;
          const absent = studentLogs.filter(l => l.attendance === 'Absent').length;
          const rate = ((present / total) * 100).toFixed(1);
          userContextStr += `- Student Attendance Rate: ${rate}%\n`;
          userContextStr += `- Attendance Count: ${present} Present, ${absent} Absent out of ${total} total classes\n`;
        }
      }
    } catch {
      // ignore parse errors
    }
    return userContextStr;
  }, [currentUser, userRole]);

  const dispatchChatRequest = useCallback(async ({ promptText, history, imageBase64 = null, imageMime = null, replaceModelMsgId = null }) => {
    if (abortControllerRef.current) {
      try { abortControllerRef.current.abort(); } catch { /* ignore */ }
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsChatLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/chat/`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          message: promptText,
          history: history.map(m => ({ role: m.role, content: m.content })),
          image_base64: imageBase64,
          image_mime_type: imageMime,
          personality: botPersonality,
          user_context: buildUserContext(),
        }),
      });

      const replyContent = res.ok
        ? (await res.json()).response
        : 'Sorry, I encountered an issue reaching the assistant server. Please try again.';

      if (playCyberSound) playCyberSound(res.ok ? 'success' : 'error');

      setChatMessages(prev => {
        if (replaceModelMsgId) {
          return prev.map(m =>
            m.id === replaceModelMsgId
              ? { ...m, content: replyContent, timestamp: Date.now() }
              : m
          );
        }
        return [
          ...prev,
          { id: Date.now() + 1, role: 'model', content: replyContent, timestamp: Date.now() },
        ];
      });

      if (res.ok && botAutoSpeak) {
        handleSpeakText(replyContent);
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        setChatMessages(prev => [
          ...prev,
          { id: Date.now() + 1, role: 'model', content: '_Response generation stopped._', timestamp: Date.now() },
        ]);
      } else {
        if (playCyberSound) playCyberSound('error');
        setChatMessages(prev => [
          ...prev,
          { id: Date.now() + 1, role: 'model', content: 'Unable to connect right now. Please check your connection and try again.', timestamp: Date.now() },
        ]);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsChatLoading(false);
    }
  }, [API_BASE_URL, token, botPersonality, buildUserContext, botAutoSpeak, handleSpeakText, playCyberSound]);

  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      try { abortControllerRef.current.abort(); } catch { /* ignore */ }
      abortControllerRef.current = null;
      setIsChatLoading(false);
    }
  }, []);

  const handleSendChatMessage = useCallback(async (customMessage = null) => {
    const textToSend = (typeof customMessage === 'string' ? customMessage : chatInput) || '';
    if (!textToSend.trim() && !botAttachedImage) return;

    if (playCyberSound) playCyberSound('click');
    const newUserMessage = {
      id: Date.now(),
      role: 'user',
      content: textToSend.trim() || 'Analyze this attached image.',
      attachedImage: botAttachedImage ? `data:${botAttachedImageMime};base64,${botAttachedImage}` : null,
      attachedImageName: botAttachedImageName,
      timestamp: Date.now(),
    };

    const nextHistory = [...chatMessages];
    setChatMessages(prev => [...prev, newUserMessage]);
    if (typeof customMessage !== 'string') setChatInput('');

    const tempImage = botAttachedImage;
    const tempImageMime = botAttachedImageMime;
    setBotAttachedImage(null);
    setBotAttachedImageMime(null);
    setBotAttachedImageName('');

    await dispatchChatRequest({
      promptText: newUserMessage.content,
      history: nextHistory,
      imageBase64: tempImage,
      imageMime: tempImageMime,
    });
  }, [chatInput, botAttachedImage, botAttachedImageMime, botAttachedImageName, chatMessages, dispatchChatRequest, playCyberSound]);

  const regenerateResponse = useCallback(async (modelMsgId) => {
    const idx = chatMessages.findIndex(m => m.id === modelMsgId);
    if (idx <= 0) return;
    let userMsg = null;
    let userIdx = -1;
    for (let i = idx - 1; i >= 0; i--) {
      if (chatMessages[i].role === 'user') {
        userMsg = chatMessages[i];
        userIdx = i;
        break;
      }
    }
    if (!userMsg) return;
    await dispatchChatRequest({
      promptText: userMsg.content,
      history: chatMessages.slice(0, userIdx),
      replaceModelMsgId: modelMsgId,
    });
  }, [chatMessages, dispatchChatRequest]);

  const getSuggestions = useCallback(() => {
    if (botSuggestionCategory === 'attendance') {
      return [
        'How many classes can I skip cleanly?',
        'How does face check-in & geofence work?',
        'How to review pending disputes?',
      ];
    }
    if (botSuggestionCategory === 'profile') {
      return [
        'How do I update my face biometric photo?',
        'Where can I check my mentor details?',
        'How do I update my profile info?',
      ];
    }
    if (botSuggestionCategory === 'security') {
      return [
        'How to update my account password?',
        'How are biometric records secured?',
        'What are geofence campus rules?',
      ];
    }
    if (userRole === 'student') {
      return [
        'Calculate classes needed for 75% attendance',
        'Draft a formal medical leave application',
        'How do I submit an attendance dispute?',
      ];
    }
    return [
      'Draft an official student attendance circular',
      'How to resolve borderline face reviews?',
      'Steps to export period attendance logs',
    ];
  }, [botSuggestionCategory, userRole]);

  // Speech to text toggle helper
  const handleSpeechToText = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser environment.');
      return;
    }

    if (isListeningSpeech) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
      setIsListeningSpeech(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListeningSpeech(true);
        if (playCyberSound) playCyberSound('click');
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setChatInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.onerror = () => setIsListeningSpeech(false);
      recognition.onend = () => setIsListeningSpeech(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListeningSpeech(false);
    }
  }, [isListeningSpeech, playCyberSound]);

  const startVoiceAssistantMode = useCallback(() => {
    if (playCyberSound) playCyberSound('click');
    setIsVoiceAssistantMode(true);
    voiceAssistantActiveRef.current = true;
  }, [playCyberSound]);

  const stopVoiceAssistantMode = useCallback(() => {
    if (playCyberSound) playCyberSound('click');
    setIsVoiceAssistantMode(false);
    voiceAssistantActiveRef.current = false;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [playCyberSound]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatLoading]);

  return {
    showChatBot,
    setShowChatBot,
    chatInput,
    setChatInput,
    threads,
    activeThreadId,
    chatMessages,
    setChatMessages,
    isChatLoading,
    botPersonality,
    setBotPersonality,
    botVoiceEnabled,
    setBotVoiceEnabled,
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
    isVoiceAssistantMode,
    setIsVoiceAssistantMode,
    showVoicePulseFlash,
    setShowVoicePulseFlash,
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
    handleImageUpload,
    handleTextFileAttach,
    handleBotFileSelect,
    handleChatPaste,
    handleChatDragOver,
    handleChatDrop,
    clearChatHistory,
    exportChatHistory,
    getSuggestions,
    startVoiceAssistantMode,
    stopVoiceAssistantMode,
  };
}
