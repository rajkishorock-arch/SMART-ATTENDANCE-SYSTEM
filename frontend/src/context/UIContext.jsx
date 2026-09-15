import { createContext, useState, useEffect, useCallback } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  // Theme & Audio Preferences State
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('theme') || 'cyberpunk');
  const [audioVolume, setAudioVolume] = useState(() => parseFloat(localStorage.getItem('audioVolume') || '0.5'));
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') === 'true');
  const [synthModulator, setSynthModulator] = useState(() => localStorage.getItem('synthModulator') || 'classic');
  const [synthPitchScale, setSynthPitchScale] = useState(() => parseFloat(localStorage.getItem('synthPitchScale') || '1.0'));

  // Theme Side Effect
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', activeTheme);
    }
  }, [activeTheme]);

  // Handler helpers
  const changeTheme = useCallback((themeName) => {
    setActiveTheme(themeName);
    localStorage.setItem('theme', themeName);
  }, []);

  const setVolume = useCallback((volume) => {
    const vol = typeof volume === 'number' ? volume : parseFloat(volume);
    setAudioVolume(vol);
    localStorage.setItem('audioVolume', vol.toString());
  }, []);

  const toggleSound = useCallback((enabled) => {
    setSoundEnabled(enabled);
    localStorage.setItem('soundEnabled', enabled ? 'true' : 'false');
  }, []);

  // Web Audio API Cyber Sound Synthesizer
  const playCyberSound = useCallback((type) => {
    if (!soundEnabled) return;
    if (typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(audioVolume, now);

      const scale = synthPitchScale || 1.0;

      if (type === 'click') {
        osc.type = synthModulator === 'classic' ? 'sine' : synthModulator;
        osc.frequency.setValueAtTime(1200 * scale, now);
        osc.frequency.exponentialRampToValueAtTime(800 * scale, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'success') {
        osc.type = synthModulator === 'classic' ? 'triangle' : synthModulator;
        osc.frequency.setValueAtTime(600 * scale, now);
        osc.frequency.setValueAtTime(800 * scale, now + 0.08);
        gain.gain.setValueAtTime(audioVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'error' || type === 'denied') {
        osc.type = synthModulator === 'classic' ? 'sawtooth' : synthModulator;
        osc.frequency.setValueAtTime(150 * scale, now);
        osc.frequency.linearRampToValueAtTime(100 * scale, now + 0.3);
        gain.gain.setValueAtTime(audioVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'scan' || type === 'beep') {
        osc.type = synthModulator === 'classic' ? 'sine' : synthModulator;
        osc.frequency.setValueAtTime(400 * scale, now);
        osc.frequency.exponentialRampToValueAtTime(1000 * scale, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.error(e);
    }
  }, [soundEnabled, audioVolume, synthPitchScale, synthModulator]);

  // Expose global window helper for non-component audio invocations
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.playCyberSound = playCyberSound;
    }
  }, [playCyberSound]);

  const value = {
    activeTheme,
    setActiveTheme,
    changeTheme,
    audioVolume,
    setAudioVolume,
    setVolume,
    soundEnabled,
    setSoundEnabled,
    toggleSound,
    synthModulator,
    setSynthModulator,
    synthPitchScale,
    setSynthPitchScale,
    playCyberSound,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export default UIContext;
