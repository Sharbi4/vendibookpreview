// Notification sound utility using Web Audio API
// Creates a pleasant, subtle notification chime

let audioContext: AudioContext | null = null;
let isMuted = false;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
      return null;
    }
  }
  
  return audioContext;
};

export const playNotificationSound = () => {
  if (isMuted) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;
  
  // Resume context if suspended (required by browsers after user interaction)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  
  const now = ctx.currentTime;
  
  // Create a pleasant two-tone chime
  const frequencies = [830, 1046]; // G5 and C6 - a pleasant interval
  
  frequencies.forEach((freq, index) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, now);
    
    // Envelope for a soft, pleasant sound
    const startTime = now + index * 0.1;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.5);
  });
};

export const setNotificationSoundMuted = (muted: boolean) => {
  isMuted = muted;
};

export const isNotificationSoundMuted = () => isMuted;

// Storage key for persisting sound preference
const SOUND_PREFERENCE_KEY = 'vendibook_notification_sound_enabled';

export const getStoredSoundPreference = (): boolean => {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(SOUND_PREFERENCE_KEY);
  return stored === null ? true : stored === 'true';
};

export const setStoredSoundPreference = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_PREFERENCE_KEY, String(enabled));
  setNotificationSoundMuted(!enabled);
};

// Initialize from stored preference
if (typeof window !== 'undefined') {
  setNotificationSoundMuted(!getStoredSoundPreference());
}
