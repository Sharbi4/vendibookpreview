import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, MicOff, Mic, Loader2, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVapiAssistant } from '@/hooks/useVapiAssistant';
import { cn } from '@/lib/utils';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';

const VoiceAssistantButton = () => {
  const { status, isMuted, volumeLevel, startCall, endCall, toggleMute, isConfigured } = useVapiAssistant();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('vendi-fab-minimized') === '1';
  });
  const callStartRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('vendi-fab-minimized', isMinimized ? '1' : '0');
  }, [isMinimized]);

  // Track call start/end times
  useEffect(() => {
    if (status === 'active' && !callStartRef.current) {
      callStartRef.current = Date.now();
    }
    if (status === 'idle' && callStartRef.current) {
      const durationMs = Date.now() - callStartRef.current;
      const durationSec = Math.round(durationMs / 1000);
      trackEventToDb('voice_call_end', 'voice', { duration_seconds: durationSec });
      callStartRef.current = null;
    }
  }, [status]);

  // Listen for external trigger (e.g., from List page "Set Up with Vendi" button)
  useEffect(() => {
    const handleStartCall = () => {
      if (status === 'idle') {
        startCall();
      }
    };
    window.addEventListener('start-vendi-call', handleStartCall);
    return () => window.removeEventListener('start-vendi-call', handleStartCall);
  }, [status, startCall]);

  if (!isConfigured) return null;

  const isActive = status === 'active';
  const isConnecting = status === 'connecting';
  const isIdle = status === 'idle';

  const handleMainClick = () => {
    if (isIdle) {
      trackEventToDb('voice_widget_open', 'voice', { source: 'fab' });
      startCall();
    } else if (isActive) {
      setIsExpanded(!isExpanded);
    }
  };

  // Dynamic glow based on volume
  const glowIntensity = Math.min(volumeLevel * 40, 30);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2"
    >
      {/* Minimized chip */}
      {isMinimized && isIdle ? (
        <motion.button
          onClick={() => setIsMinimized(false)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          aria-label="Show Talk to Vendi"
          className="w-10 h-10 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg border-2 border-white/20 cursor-pointer outline-none"
          title="Talk to Vendi"
        >
          <MessageSquare className="w-4 h-4" />
        </motion.button>
      ) : (
      <>
      {/* Expanded controls */}
      <AnimatePresence>
        {isExpanded && isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="flex flex-col gap-2"
          >
            {/* Mute button */}
            <motion.button
              onClick={toggleMute}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors cursor-pointer border-none outline-none',
                isMuted
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-card text-card-foreground border border-border'
              )}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </motion.button>

            {/* End call button */}
            <motion.button
              onClick={endCall}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg cursor-pointer border-none outline-none"
              title="End call"
            >
              <PhoneOff className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Concierge pill — combined button + label */}
      <div className="relative flex items-center">
        {/* Floating label (idle only) */}
        {isIdle && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="absolute right-[60px] flex items-center pointer-events-none"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-md border-2 border-border/70 shadow-lg whitespace-nowrap">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/80">
                Concierge
              </span>
              <span className="text-[11px] text-muted-foreground">·</span>
              <span className="text-[11px] text-muted-foreground">Talk to Vendi</span>
            </div>
          </motion.div>
        )}

        {/* Main button */}
        <motion.button
          onClick={handleMainClick}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={cn(
            'relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer border-2 outline-none transition-colors duration-300',
            isIdle && 'bg-primary text-primary-foreground border-white/20 hover:bg-primary/90 shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.5),0_0_0_1px_hsl(var(--primary)/0.3)]',
            isConnecting && 'bg-primary/70 text-primary-foreground border-white/20',
            isActive && 'bg-emerald-600 text-white border-white/20'
          )}
          style={isActive ? {
            boxShadow: `0 0 ${glowIntensity}px ${glowIntensity / 2}px hsl(var(--primary) / 0.4)`,
          } : undefined}
          title={isIdle ? 'Talk to Vendi' : isActive ? 'Call controls' : 'Connecting...'}
        >
          {/* Soft idle pulse */}
          {isIdle && (
            <motion.span
              className="absolute inset-0 rounded-full bg-primary/30 pointer-events-none"
              animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* Pulse ring when active */}
          {isActive && (
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-green-400 pointer-events-none"
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {isConnecting ? (
            <Loader2 className="w-6 h-6 animate-spin relative" />
          ) : (
            <Phone className="w-5 h-5 relative" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default VoiceAssistantButton;
