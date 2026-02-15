import { useState, useEffect, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';

type VapiStatus = 'idle' | 'connecting' | 'active' | 'ending';

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY;

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
    
    // Start with an inline assistant config that uses the server URL tool
    vapiRef.current.start({
      name: 'Bappie',
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Bappie, Vendibook's friendly voice assistant for the mobile food industry marketplace. You help users:

1. **Search listings**: Find food trucks, food trailers, ghost kitchens, and vendor spaces available for rent or sale.
2. **Create listing drafts**: Help users describe what they want to list (food truck, trailer, kitchen, vendor space) and create a draft listing for them.

When searching, ask about:
- What type they're looking for (food truck, trailer, kitchen, vendor space)
- Whether they want to rent or buy
- What city/area
- Any budget constraints

When creating listings, gather:
- Title and description
- Category (food_truck, food_trailer, ghost_kitchen, vendor_space)
- Mode (rent or sale)
- City and state
- Pricing info

Be conversational, warm, and helpful. Keep responses concise for voice. Use the tools available to search listings and create drafts.`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'search_listings',
              description: 'Search for listings on Vendibook marketplace',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search term' },
                  category: { type: 'string', enum: ['food_truck', 'food_trailer', 'ghost_kitchen', 'vendor_space'] },
                  mode: { type: 'string', enum: ['rent', 'sale'] },
                  city: { type: 'string', description: 'City to search in' },
                  max_price: { type: 'number' },
                  min_price: { type: 'number' },
                  limit: { type: 'number', description: 'Max results (default 5)' },
                },
              },
            },
            server: {
              url: `https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/vapi-listings-lookup`,
            },
          },
          {
            type: 'function',
            function: {
              name: 'get_listing_details',
              description: 'Get detailed info about a specific listing',
              parameters: {
                type: 'object',
                properties: {
                  listing_id: { type: 'string', description: 'UUID of the listing' },
                },
                required: ['listing_id'],
              },
            },
            server: {
              url: `https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/vapi-listings-lookup`,
            },
          },
          {
            type: 'function',
            function: {
              name: 'get_categories',
              description: 'Get available listing categories and modes',
              parameters: { type: 'object', properties: {} },
            },
            server: {
              url: `https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/vapi-listings-lookup`,
            },
          },
          {
            type: 'function',
            function: {
              name: 'check_availability',
              description: 'Check if a listing is available for specific dates',
              parameters: {
                type: 'object',
                properties: {
                  listing_id: { type: 'string' },
                  start_date: { type: 'string', description: 'YYYY-MM-DD' },
                  end_date: { type: 'string', description: 'YYYY-MM-DD' },
                },
                required: ['listing_id', 'start_date', 'end_date'],
              },
            },
            server: {
              url: `https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/vapi-listings-lookup`,
            },
          },
          {
            type: 'function',
            function: {
              name: 'create_listing_draft',
              description: 'Create a draft listing from voice-gathered info',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Listing title' },
                  description: { type: 'string', description: 'Full description' },
                  category: { type: 'string', enum: ['food_truck', 'food_trailer', 'ghost_kitchen', 'vendor_space'] },
                  mode: { type: 'string', enum: ['rent', 'sale'] },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  price_daily: { type: 'number' },
                  price_weekly: { type: 'number' },
                  price_monthly: { type: 'number' },
                  price_sale: { type: 'number' },
                  fulfillment_type: { type: 'string', enum: ['pickup', 'delivery', 'both'] },
                },
                required: ['title', 'description', 'category', 'mode'],
              },
            },
            server: {
              url: `https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/vapi-listings-lookup`,
            },
          },
        ],
      },
      voice: {
        provider: '11labs',
        voiceId: 'paula',
      },
      firstMessage: "Hey! I'm Bappie, your Vendibook assistant. I can help you find food trucks, trailers, kitchens, or vendor spaces — or help you create a new listing. What can I do for you?",
    } as any);
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
