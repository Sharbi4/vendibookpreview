import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useScribe } from '@elevenlabs/react';
import { trackLeadEvent } from '@/lib/leadTracking';

const AI_PLACEHOLDERS = [
  'Search food trucks or trailers...',
  'Taco truck in Miami this weekend',
  'Food trailer for sale under $30k',
  'Shared kitchen near Houston',
  'Commercial kitchen in New York City',
  'Buy a food truck in Dallas',
];

export const useHeroSearch = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isAIParsing, setIsAIParsing] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnectingMic, setIsConnectingMic] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nativeRecognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const appendTranscript = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLocation((prev) => (prev ? prev + ' ' : '') + trimmed);
  }, []);

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: 'vad' as any,
    onCommittedTranscript: (data: any) => appendTranscript(data?.text ?? ''),
  });

  // Fallback: browser-native speech recognition (Chrome/Edge/Safari) so voice
  // search keeps working when the hosted transcription token is unavailable.
  const startNativeRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any[])
        .map((r: any) => r[0]?.transcript ?? '')
        .join(' ');
      appendTranscript(transcript);
    };
    recognition.onerror = () => {
      setIsRecording(false);
      nativeRecognitionRef.current = null;
    };
    recognition.onend = () => {
      setIsRecording(false);
      nativeRecognitionRef.current = null;
    };

    recognition.start();
    nativeRecognitionRef.current = recognition;
    setIsRecording(true);
    return true;
  }, [appendTranscript]);

  const toggleVoiceSearch = useCallback(async () => {
    if (isRecording) {
      if (nativeRecognitionRef.current) {
        nativeRecognitionRef.current.stop();
        nativeRecognitionRef.current = null;
      } else {
        scribe.disconnect();
      }
      setIsRecording(false);
      return;
    }

    setIsConnectingMic(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setIsConnectingMic(false);
      toast({
        title: 'Microphone blocked',
        description: 'Allow microphone access in your browser to use voice search.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (error || !data?.token) throw new Error('Failed to get voice token');

      await scribe.connect({
        token: data.token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      });
      setIsRecording(true);
    } catch (err) {
      console.error('Voice search error:', err);
      if (!startNativeRecognition()) {
        toast({
          title: 'Voice search unavailable',
          description: 'Try Chrome or Safari, or type your search instead.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsConnectingMic(false);
    }
  }, [isRecording, scribe, toast, startNativeRecognition]);

  useEffect(() => {
    return () => {
      if (nativeRecognitionRef.current) {
        try { nativeRecognitionRef.current.stop(); } catch { /* noop */ }
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % AI_PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleAISearch = async () => {
    const query = location.trim();
    if (!query) {
      trackLeadEvent('search_performed', { query: '', source: 'home_hero' });
      navigate('/search?mode=rent');
      return;
    }

    const wordCount = query.split(/\s+/).length;
    if (wordCount >= 3) {
      setIsAIParsing(true);
      try {
        const { data, error } = await supabase.functions.invoke('ai-search-parse', {
          body: { query },
        });
        if (error) throw error;
        const params = new URLSearchParams();
        if (data.location) params.set('q', data.location);
        if (data.mode) params.set('mode', data.mode === 'sale' ? 'sale' : 'rent');
        if (data.category) params.set('category', data.category);
        trackLeadEvent('search_performed', {
          query,
          city: data.location,
          category: data.category,
          intent: data.mode,
          source: 'home_hero_ai',
        });
        navigate(`/search?${params.toString()}`);
      } catch {
        const params = new URLSearchParams();
        params.set('q', query);
        trackLeadEvent('search_performed', { query, source: 'home_hero' });
        navigate(`/search?${params.toString()}`);
      } finally {
        setIsAIParsing(false);
      }
    } else {
      const params = new URLSearchParams();
      params.set('q', query);
      trackLeadEvent('search_performed', { query, source: 'home_hero' });
      navigate(`/search?${params.toString()}`);
    }
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
          );
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || '';
          const state = data.address?.state || '';
          setLocation(city && state ? `${city}, ${state}` : city || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        } catch {
          setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        } finally {
          setIsLocating(false);
        }
      },
      () => setIsLocating(false)
    );
  };

  return {
    location,
    setLocation,
    isLocating,
    isAIParsing,
    placeholderIndex,
    isInputFocused,
    setIsInputFocused,
    isRecording,
    isConnectingMic,
    inputRef,
    toggleVoiceSearch,
    handleAISearch,
    handleGeolocation,
    placeholders: AI_PLACEHOLDERS,
  };
};
