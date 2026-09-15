import { useState, useEffect, useRef, useCallback } from 'react';
import useAuth from './useAuth';
import useUI from './useUI';
import { getApiBaseUrl } from '../utils/platform';

export default function useCyberBot() {
  const { currentUser, userRole, token } = useAuth();
  const { playCyberSound, soundEnabled, audioVolume } = useUI();

  const API_BASE_URL = getApiBaseUrl();

  // Primary CyberBot States
  const [showChatBot, setShowChatBot] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Advanced CyberBot & Speech States
  const [botPersonality, setBotPersonality] = useState('futuristic');
  const [botVoiceEnabled, setBotVoiceEnabled] = useState(false);
  const [botWakeWordEnabled, setBotWakeWordEnabled] = useState(
    () => localStorage.getItem('botWakeWordEnabled') === 'true'
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

  // Refs for audio / speech engines
  const chatBottomRef = useRef(null);
  const chatListRef = useRef(null);
  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const voiceAssistantActiveRef = useRef(false);

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
      const cleanText = text.replace(/[*#_`~]/g, '');
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
      setChatInput((prev) => `${prev}\n\n[Attached File Content: ${file.name}]\n${fileText}\n[End of File Content]\n`);
      if (playCyberSound) playCyberSound('success');
    };
    reader.readAsText(file);
  }, [playCyberSound]);

  // Bot file select handler
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

  // Paste handler
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

  // Drag over handler
  const handleChatDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  // Drop handler
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

  // Clear chat helper
  const clearChatHistory = useCallback(() => {
    setChatMessages([]);
    setChatInput('');
    setBotAttachedImage(null);
    setBotAttachedImageMime(null);
    setBotAttachedImageName('');
    if (playCyberSound) playCyberSound('click');
  }, [playCyberSound]);

  // Export chat transcript helper
  const exportChatHistory = useCallback(() => {
    if (playCyberSound) playCyberSound('success');
    let transcript = `AI Chat Transcript - Smart Attendance System\n`;
    transcript += `Generated: ${new Date().toLocaleString()}\n`;
    transcript += `User: ${currentUser?.name || 'Unknown'} (${userRole})\n`;
    transcript += `=========================================\n\n`;

    chatMessages.forEach(m => {
      const sender = m.role === 'user' ? 'USER' : 'AI BOT';
      transcript += `[${sender}]: ${m.content}\n`;
      if (m.attachedImageName) {
        transcript += `(Attached Image: ${m.attachedImageName})\n`;
      }
      transcript += `\n`;
    });

    const element = document.createElement("a");
    const file = new Blob([transcript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `smart_attendance_chat_transcript.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }, [chatMessages, currentUser, userRole, playCyberSound]);

  // Dynamic help suggestions
  const getSuggestions = useCallback(() => {
    if (botSuggestionCategory === 'attendance') {
      return [
        "Why did face scan show already marked?",
        "How to view session-wise history?",
        "What is geofencing location filter?"
      ];
    } else if (botSuggestionCategory === 'profile') {
      return [
        "How to register my face photo?",
        "Can I change my registered email?",
        "Where do I find my teacher/mentor info?"
      ];
    } else if (botSuggestionCategory === 'security') {
      return [
        "How to update account password?",
        "Is my webcam biometric data safe?",
        "How to check local geofence parameters?"
      ];
    }
    return [
      "How does this system work?",
      "What features does this app have?",
      "How to submit feature feedback?"
    ];
  }, [botSuggestionCategory]);

  // Send AI Chat message handler
  const handleSendChatMessage = useCallback(async (customMessage = null) => {
    const textToSend = customMessage || chatInput;
    if (!textToSend || !textToSend.trim()) return;

    if (playCyberSound) playCyberSound('click');
    const userMsgId = Date.now();
    const newUserMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
      attachedImage: botAttachedImage ? `data:${botAttachedImageMime};base64,${botAttachedImage}` : null,
      attachedImageName: botAttachedImageName
    };

    setChatMessages((prev) => [...prev, newUserMessage]);
    if (!customMessage) setChatInput('');

    const tempImage = botAttachedImage;
    const tempImageMime = botAttachedImageMime;

    setBotAttachedImage(null);
    setBotAttachedImageMime(null);
    setBotAttachedImageName('');
    setIsChatLoading(true);

    let userContextStr = "";
    if (currentUser) {
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
      } catch (err) {
        console.warn('Failed to parse cached student logs for user context:', err);
      }
    }

    try {
      const historyPayload = chatMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch(`${API_BASE_URL}/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          image_base64: tempImage,
          image_mime_type: tempImageMime,
          personality: botPersonality,
          user_context: userContextStr
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (playCyberSound) playCyberSound('success');
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: 'model',
            content: data.response
          }
        ]);
        if (botAutoSpeak) {
          handleSpeakText(data.response);
        }
      } else {
        if (playCyberSound) playCyberSound('error');
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: 'model',
            content: 'Sorry, I encountered an error communicating with the chat server. Please try again.'
          }
        ]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      if (playCyberSound) playCyberSound('error');
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'model',
          content: 'Network error. Please check your internet connection.'
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, botAttachedImage, botAttachedImageMime, botAttachedImageName, currentUser, userRole, chatMessages, API_BASE_URL, token, botPersonality, botAutoSpeak, handleSpeakText, playCyberSound]);

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
        try { recognitionRef.current.stop(); } catch (err) {
          console.warn('Speech recognition stop error:', err);
        }
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
          setChatInput(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListeningSpeech(false);
      };

      recognition.onend = () => {
        setIsListeningSpeech(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
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

  // Auto scroll chat to bottom when messages change
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
