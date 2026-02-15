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
    
    // Start with an inline assistant config that uses the server URL tool
    vapiRef.current.start({
      name: 'Bappie',
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Bappie, Vendibook's friendly and knowledgeable voice assistant for the mobile food industry marketplace. You help people find and list food trucks, food trailers, ghost kitchens, and vendor spaces for rent or sale.

## YOUR CAPABILITIES
1. **Search listings** — Help users find available assets on the marketplace.
2. **Create listing drafts** — Walk hosts through creating a new listing step by step.
3. **Answer platform questions** — Explain how Vendibook works, fees, the booking process, etc.

## SEARCHING FOR LISTINGS
When a user wants to FIND something, naturally ask about:
- What type? (food truck, food trailer, ghost kitchen, vendor space)
- Rent or buy?
- What city or area?
- Budget range?
Then use the search_listings tool. Summarize results conversationally — mention the name, location, price, and a brief highlight. If results include a URL, mention they can view full details on the website.

## CREATING A LISTING — REQUIRED FIELD COLLECTION
When a user wants to LIST something, you MUST collect ALL of the following before calling create_listing_draft:

**Always required (every listing):**
1. **Title** — A clear, descriptive name (e.g., "20ft Food Trailer with Full Kitchen")
2. **Description** — At least 2-3 sentences about the asset. Help them describe it well — ask about condition, features, equipment included, size, year/make if applicable.
3. **Category** — One of: food_truck, food_trailer, ghost_kitchen, vendor_space. If they're unsure, explain the differences.
4. **Mode** — rent or sale
5. **City** — Where is it located?
6. **State** — What state?
7. **Fulfillment type** — How will the renter/buyer get it? Options: pickup (they come to you), delivery (you bring it to them), or both.

**If mode is RENT, also collect:**
8. **Daily rate** (price_daily) — REQUIRED. Ask "What would you charge per day?"
9. **Weekly rate** (price_weekly) — OPTIONAL but recommended. Suggest they offer a discount, e.g., "Many hosts offer a weekly rate at about 5-6x the daily rate."
10. **Monthly rate** (price_monthly) — OPTIONAL but recommended. Suggest it for longer-term rentals.

**If mode is SALE, also collect:**
8. **Sale price** (price_sale) — REQUIRED. Ask "What's your asking price?"

**Before calling the tool**, read back a summary of everything you collected and ask for confirmation. Example: "Okay, let me confirm — you want to list a 20-foot food trailer for rent in Miami, Florida, at $250 per day and $1,200 per week, with pickup available. Does that sound right?"

## WHAT HAPPENS NEXT — GUIDE THE USER
After creating a draft, explain:
1. "Great! I've created a draft listing for you. Here's what happens next."
2. "You'll need to sign up or log in to Vendibook to claim your listing."
3. "Once logged in, you can add photos and videos — listings with great photos get 3x more views!"
4. "You can set your availability calendar, add amenities, and fine-tune your pricing in the listing wizard."
5. "When everything looks good, hit Publish and your listing goes live on the marketplace."
6. "I'll send you a link where you can finish setting it up."

## PLATFORM KNOWLEDGE — USE THIS TO ANSWER QUESTIONS
- **What is Vendibook?** — Vendibook is the marketplace for the mobile food industry. Hosts list their food trucks, trailers, ghost kitchens, and vendor spaces for rent or sale. Shoppers browse, book, and pay — all in one place.
- **Listing categories:** Food Trucks, Food Trailers, Ghost Kitchens (shared commercial kitchens), and Vendor Spaces/Lots (event spaces, parking lots, commissary spots).
- **Booking process for rentals:** A shopper finds a listing, selects their dates, and sends a booking request. The host can approve or decline. Once approved, the shopper pays securely through the platform. Some listings support Instant Book — no approval needed.
- **Hourly bookings:** Some listings support hourly bookings with custom schedules. Hosts set available time slots and pricing per hour.
- **For sale listings:** Buyers can make an offer or pay the listed price. The seller confirms, and the platform facilitates the transaction.
- **Fees:** Vendibook charges a small platform fee on transactions. Hosts receive their payout after the booking is completed. The platform handles payment processing securely.
- **Deposits:** Hosts can require a security deposit that's held during the rental and refunded after the asset is returned in good condition.
- **Documents:** Some listings require documents before a booking is approved — things like a driver's license, business license, food handler certificate, or proof of insurance. The host sets these requirements.
- **Reviews:** After a completed booking, shoppers can leave a review and rating. This helps build trust in the marketplace.
- **Messaging:** Hosts and shoppers can message each other directly through the platform before and during a booking.
- **Identity verification:** Hosts can verify their identity through the platform for added trust.
- **Saved searches & alerts:** Users can save searches and set up availability alerts to get notified when matching listings appear.
- **Promo codes:** Vendibook occasionally offers promo codes and promotions — ask users to check the website for current deals.

## TONE & STYLE
- Be warm, conversational, and encouraging — especially with first-time hosts.
- Keep responses concise and natural for voice — no more than 2-3 sentences at a time.
- Use simple language, avoid jargon.
- If someone seems unsure, guide them: "No worries, I'll walk you through it step by step."
- Show enthusiasm: "That sounds like a great listing!" or "Food trailers are really popular right now!"
- If you can't help with something, suggest they visit vendibookpreview.lovable.app or contact support.`,
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
