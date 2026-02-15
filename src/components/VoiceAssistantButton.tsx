import { useState, useEffect } from 'react';
import { Phone, PhoneOff, MicOff, Mic, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVapiAssistant } from '@/hooks/useVapiAssistant';
import { cn } from '@/lib/utils';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';

const VoiceAssistantButton = () => {
  const { status, isMuted, volumeLevel, startCall, endCall, toggleMute, isConfigured } = useVapiAssistant();
  const [isExpanded, setIsExpanded] = useState(false);

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

      {/* Main button */}
      <motion.button
        onClick={handleMainClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl cursor-pointer border-none outline-none transition-all duration-300',
          isIdle && 'bg-primary text-primary-foreground hover:bg-primary/90',
          isConnecting && 'bg-primary/70 text-primary-foreground',
          isActive && 'bg-emerald-600 text-white'
        )}
        style={isActive ? {
          boxShadow: `0 0 ${glowIntensity}px ${glowIntensity / 2}px hsl(var(--primary) / 0.4)`,
        } : undefined}
        title={isIdle ? 'Talk to Vendi' : isActive ? 'Call controls' : 'Connecting...'}
      >
        {/* Pulse ring when active */}
        {isActive && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-green-400"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {isConnecting ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : isActive ? (
          <Phone className="w-6 h-6" />
        ) : (
          <Phone className="w-6 h-6" />
        )}
      </motion.button>

      {/* Label */}
      {isIdle && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs font-medium text-muted-foreground bg-card px-2 py-0.5 rounded-full shadow-sm border border-border"
        >
          Talk to Vendi
        </motion.span>
      )}
    </motion.div>
  );
};

export default VoiceAssistantButton;
