import { useState, useEffect, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';

type VapiStatus = 'idle' | 'connecting' | 'active' | 'ending';

const VAPI_PUBLIC_KEY = '928649b5-8507-42d1-bb35-31db32a5d6a6';

export const useVapiAssistant = () => {
  const [status, setStatus] = useState<VapiStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    if (!VAPI_PUBLIC_KEY) {
      console.warn('VITE_VAPI_PUBLIC_KEY not configured');
      return;
    }

    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on('call-start', () => setStatus('active'));
    vapi.on('call-end', () => {
      setStatus('idle');
      setIsMuted(false);
      setVolumeLevel(0);
    });
    vapi.on('volume-level', (level: number) => setVolumeLevel(level));
    vapi.on('error', (error: any) => {
      console.error('Vapi error:', error);
      setStatus('idle');
    });

    return () => {
      vapi.stop();
      vapiRef.current = null;
    };
  }, []);

  const startCall = useCallback(() => {
    if (!vapiRef.current || status !== 'idle') return;
    setStatus('connecting');
    // Use the persistent Vapi assistant with all tools configured in the dashboard
    vapiRef.current.start('3896c198-a43b-4c5f-8f25-d3e77dc81dc6');
  }, [status]);

  const endCall = useCallback(() => {
    if (!vapiRef.current || status === 'idle') return;
    setStatus('ending');
    vapiRef.current.stop();
  }, [status]);

  const toggleMute = useCallback(() => {
    if (!vapiRef.current || status !== 'active') return;
    const newMuted = !isMuted;
    vapiRef.current.setMuted(newMuted);
    setIsMuted(newMuted);
  }, [isMuted, status]);

  return {
    status,
    isMuted,
    volumeLevel,
    startCall,
    endCall,
    toggleMute,
    isConfigured: !!VAPI_PUBLIC_KEY,
  };
};
