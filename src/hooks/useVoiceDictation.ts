import { useCallback, useEffect, useRef, useState } from 'react';
import { useScribe } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Options {
  /** Live words while the person is still talking. */
  onPartial?: (text: string) => void;
  /** Final sentence once they stop talking. Recording ends automatically. */
  onFinal: (text: string) => void;
}

/**
 * Shared voice input: ElevenLabs realtime transcription with the browser's
 * built-in speech recognition as a fallback. Used by every mic button.
 */
export function useVoiceDictation({ onPartial, onFinal }: Options) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [partial, setPartial] = useState('');
  const nativeRef = useRef<any>(null);
  const onPartialRef = useRef(onPartial);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onPartialRef.current = onPartial;
    onFinalRef.current = onFinal;
  });

  const scribeRef = useRef<any>(null);
  const finish = useCallback((text: string) => {
    setPartial('');
    onPartialRef.current?.('');
    const t = text.trim();
    if (nativeRef.current) {
      try { nativeRef.current.stop(); } catch { /* already stopped */ }
      nativeRef.current = null;
    } else {
      try { scribeRef.current?.disconnect(); } catch { /* already closed */ }
    }
    setIsRecording(false);
    if (t) onFinalRef.current(t);
  }, []);

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: 'vad' as any,
    onPartialTranscript: (data: any) => {
      const text = data?.text ?? '';
      setPartial(text);
      onPartialRef.current?.(text);
    },
    onCommittedTranscript: (data: any) => finish(data?.text ?? ''),
  });
  scribeRef.current = scribe;

  const startNative = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return false;
    const rec = new SR();
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (event: any) => {
      const results = Array.from(event.results as any[]);
      const text = results.map((r: any) => r[0]?.transcript ?? '').join(' ');
      if (results.every((r: any) => r.isFinal)) finish(text);
      else { setPartial(text); onPartialRef.current?.(text); }
    };
    rec.onerror = rec.onend = () => {
      nativeRef.current = null;
      setIsRecording(false);
      setPartial('');
    };
    rec.start();
    nativeRef.current = rec;
    setIsRecording(true);
    return true;
  }, [finish]);

  const stop = useCallback(() => {
    if (nativeRef.current) {
      try { nativeRef.current.stop(); } catch { /* noop */ }
      nativeRef.current = null;
    } else {
      try { scribe.disconnect(); } catch { /* noop */ }
    }
    setIsRecording(false);
    setPartial('');
  }, [scribe]);

  const toggle = useCallback(async () => {
    if (isRecording) return stop();
    setIsConnecting(true);
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
      probe.getTracks().forEach((t) => t.stop());
    } catch {
      setIsConnecting(false);
      toast({
        title: 'Microphone blocked',
        description: 'Allow microphone access in your browser to use voice input.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (error || !data?.token) throw new Error('Failed to get voice token');
      setPartial('');
      await scribe.connect({
        token: data.token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      });
      setIsRecording(true);
    } catch (err) {
      console.error('Voice input error:', err);
      if (!startNative()) {
        toast({
          title: 'Voice input unavailable',
          description: 'Try Chrome or Safari, or type instead.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isRecording, stop, scribe, startNative, toast]);

  useEffect(() => () => { try { nativeRef.current?.abort(); } catch { /* noop */ } }, []);

  return { isRecording, isConnecting, partial, toggle, stop };
}
