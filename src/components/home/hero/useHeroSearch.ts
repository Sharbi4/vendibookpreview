import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useScribe } from '@elevenlabs/react';
import { trackLeadEvent } from '@/lib/leadTracking';

const AI_PLACEHOLDERS = [
  'I need a taco truck in Miami this weekend',
  'Shared kitchen for rent near Houston',
  'Food trailer for sale under $30k',
  'Vendor space in Los Angeles',
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
  const { toast } = useToast();

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: 'vad' as any,
    onCommittedTranscript: (data: any) => {
      if (data.text?.trim()) {
        setLocation((prev) => (prev ? prev + ' ' : '') + data.text.trim());
      }
    },
  });

  const toggleVoiceSearch = useCallback(async () => {
    if (isRecording) {
      scribe.disconnect();
      setIsRecording(false);
      return;
    }

    setIsConnectingMic(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (error || !data?.token) throw new Error('Failed to get voice token');

      await scribe.connect({
        token: data.token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      });
      setIsRecording(true);
    } catch (err) {
      console.error('Voice search error:', err);
      toast({ title: 'Could not start voice search', description: 'Please check microphone permissions', variant: 'destructive' });
    } finally {
      setIsConnectingMic(false);
    }
  }, [isRecording, scribe, toast]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % AI_PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleAISearch = async () => {
    const query = location.trim();
    if (!query) {
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
        navigate(`/search?${params.toString()}`);
      } catch {
        const params = new URLSearchParams();
        params.set('q', query);
        navigate(`/search?${params.toString()}`);
      } finally {
        setIsAIParsing(false);
      }
    } else {
      const params = new URLSearchParams();
      params.set('q', query);
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
