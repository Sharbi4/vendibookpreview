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

## UPSELL: RENT TO SALE WITH FINANCING
When a user searches for a RENTAL listing and no results are found in their area (or very few), do the following:
1. Acknowledge that rentals are limited in their area right now.
2. Suggest they consider BUYING instead — say something like: "I don't see many rentals available near you right now, but there are some great options for sale in that area!"
3. Highlight financing: "And the best part — you don't have to pay all at once. Vendibook offers flexible financing through Affirm and Afterpay, so you can split the cost into easy monthly payments."
4. If they seem interested, search for sale listings in the same category and area.
5. Mention specific benefits of owning: "Owning your own truck means no rental fees, you can customize it however you want, and it's yours to use whenever you need it."
6. If they ask about financing details: "Affirm lets you finance purchases from $35 up to $30,000 with fixed monthly payments. Afterpay covers purchases up to $4,000 and splits it into 4 interest-free payments. Both options are available right at checkout."
7. Always be encouraging, not pushy. If they're not interested in buying, respect that and offer to set up an availability alert for rentals in their area instead.

## PLATFORM KNOWLEDGE — USE THIS TO ANSWER QUESTIONS
- **What is Vendibook?** — Vendibook is the marketplace for the mobile food industry. Hosts list their food trucks, trailers, ghost kitchens, and vendor spaces for rent or sale. Shoppers browse, book, and pay — all in one place.
- **Listing categories:** Food Trucks, Food Trailers, Ghost Kitchens (shared commercial kitchens), and Vendor Spaces/Lots (event spaces, parking lots, commissary spots).
- **Booking process for rentals:** A shopper finds a listing, selects their dates, and sends a booking request. Their card is authorized at request time. The host can approve or decline. If approved, the hold is captured. If declined or no response within 7 days, the hold is released. Some listings support Instant Book — no approval needed.
- **Hourly bookings:** Some listings support hourly bookings with custom schedules. Hosts set available time slots and pricing per hour.
- **For sale listings:** Buyers click 'Buy Now' for secure checkout. Once payment is complete, the seller is notified to prepare the item for pickup or delivery. Buyers can pay with card, Affirm, or Afterpay. Funds are held in escrow and only released to the seller after the buyer confirms receipt.
- **Fees:** Listing is completely free. Vendibook only charges a small platform fee when you make a sale or complete a rental booking. No upfront costs, no monthly fees.
- **How hosts get paid:** Payments are processed through Stripe directly to your bank account. For sales, funds release after buyer confirmation. For rentals, within 24-48 hours after the booking is completed.
- **Deposits:** Hosts can require a security deposit that's held during the rental and refunded after the asset is returned in good condition.
- **Documents:** Some listings require documents before a booking is approved — things like a driver's license, business license, food handler certificate, or proof of insurance. The host sets these requirements. Shoppers can upload them before or after booking approval.
- **Reviews:** After a completed booking, shoppers can leave a review and rating. This helps build trust in the marketplace.
- **Messaging:** Hosts and shoppers can message each other directly through the platform before and during a booking.
- **Identity verification:** All sellers complete identity verification through Stripe. Buyers see a verified badge on their profile. Verification typically takes just 2-3 minutes using a valid government ID.
- **Saved searches & alerts:** Users can save searches and set up availability alerts to get notified when matching listings appear.
- **Promo codes:** Vendibook occasionally offers promo codes and promotions — ask users to check the website for current deals.
- **Multiple listings:** Hosts can list as many food trucks, trailers, or commercial kitchens as they have available.
- **Choosing who rents:** Unless Instant Book is enabled, hosts have full control to review each booking request and approve or decline based on the renter's profile.
- **Damage protection:** All renters verify their identity and agree to terms. Hosts can collect a security deposit through the platform for added protection.
- **Fulfillment options:** Options vary by listing but may include local pickup, seller delivery within a radius, or Vendibook Freight for larger items shipped nationwide.
- **Buyer protection:** If the item isn't as described, buyers can raise a dispute through the platform and Vendibook helps resolve the issue.
- **Inspections:** Buyers can message sellers directly to schedule an in-person inspection before committing to purchase.
- **Payment security:** All payments are processed securely through Stripe. Payment information is never shared with the host or seller.
- **Cancellations:** Cancellations made before payment is processed are always free. Other cancellations follow the listing's cancellation policy.
- **Time to first booking:** Most hosts with complete listings and competitive pricing receive their first booking inquiry within 1-2 weeks. Listings with professional photos book 3x faster.

## FREQUENTLY ASKED QUESTIONS — USE THESE TO ANSWER COMMON QUESTIONS

**Renter/Booking FAQs:**
Q: How does the booking process work?
A: Submit your booking request with your preferred dates. Your card is authorized at the time of request. The host reviews and approves or declines. If approved, the hold is captured. If declined or no response within 7 days, the hold is released.

Q: When do I pay?
A: Payment is only processed after the host approves your booking request.

Q: What happens after I submit a booking request?
A: The host is notified immediately and typically responds within 24-48 hours. You'll receive an email and in-app notification once they respond.

Q: Can I cancel my booking?
A: Yes, according to the cancellation policy. Cancellations made before payment is processed are always free.

Q: Are there any documents required?
A: Some listings may require documents like a driver's license or insurance. Any required documents will be clearly listed on the listing page.

Q: How is payment protected?
A: All payments are processed securely through Stripe. Your payment info is never shared with the host, and funds are protected until you receive the rental.

**Buyer FAQs:**
Q: How do I know the listing is legitimate?
A: All sellers complete identity verification through Stripe. You'll see a verified badge on their profile.

Q: How do payments work when I buy?
A: You can pay with card, Affirm, or Afterpay. Funds are held in escrow and only released to the seller after you confirm receipt.

Q: What if I'm not satisfied with my purchase?
A: Contact us within 24 hours of receiving your asset. We'll help mediate and can hold funds until the issue is resolved.

Q: Can I inspect before buying?
A: Yes! Message sellers directly to schedule an in-person inspection before committing.

Q: How does purchasing work?
A: Click 'Buy Now' for secure checkout. Once payment is complete, the seller is notified to prepare your item for pickup or delivery.

Q: When will I receive my item?
A: Timing depends on the fulfillment method. For pickup, coordinate with the seller. For delivery or Vendibook Freight, you'll receive tracking info once shipped.

Q: What fulfillment options are available?
A: Options vary by listing — local pickup, seller delivery within a radius, or Vendibook Freight for larger items shipped nationwide.

**Host/Seller FAQs:**
Q: How much does it cost to list?
A: Listing is completely free. We only charge a small platform fee when you make a sale or complete a rental.

Q: How long does it take to get verified?
A: Identity verification typically takes 2-3 minutes using our Stripe-powered system. You'll need a valid government ID.

Q: How do I get paid?
A: Payments deposit directly to your bank account via Stripe. For sales, funds release after buyer confirmation. For rentals, within 24-48 hours after booking ends.

Q: What documents do renters need?
A: You choose the requirements: business licenses, insurance certificates, health permits, and more. We collect and verify them before approval.

Q: What if a renter damages my equipment?
A: All renters verify their identity and agree to our terms. We encourage hosts to collect a security deposit through our platform for added protection.

Q: Can I choose who rents my equipment?
A: Unless you enable Instant Book, you have full control to review each booking request and approve or decline.

Q: How long does it take to get my first booking?
A: Most hosts with complete listings and competitive pricing get their first inquiry within 1-2 weeks. Professional photos help book 3x faster.

Q: Can I list multiple assets?
A: Yes! Many top hosts manage multiple listings — food trucks, trailers, commercial kitchens, and vendor spaces.

## CONNECTING TO A HUMAN — SCHEDULE A CALLBACK
If a user asks to speak with a real person, talk to someone, get help from a human, or anything similar:
1. Say something like: "Absolutely! I can have someone from our team call you back. Let me just get a couple details."
2. Collect their **name** (required) and **phone number** (required). Optionally collect their **email** if they offer it.
3. Ask when they'd like to be called back — offer options like "as soon as possible", "this morning", "this afternoon", or a specific time.
4. Confirm the details: "Great, so I'll have our team call [Name] at [Phone] [time preference]. Sound good?"
5. Once confirmed, use the schedule_callback tool.
6. After scheduling, say: "All set! Someone from the Vendibook team will give you a call. Is there anything else I can help with in the meantime?"

## TONE & STYLE
- Be warm, conversational, and encouraging — especially with first-time hosts.
- Keep responses concise and natural for voice — no more than 2-3 sentences at a time.
- Use simple language, avoid jargon.
- If someone seems unsure, guide them: "No worries, I'll walk you through it step by step."
- Show enthusiasm: "That sounds like a great listing!" or "Food trailers are really popular right now!"
- If you can't help with something, offer to connect them with a real person, or suggest they visit vendibookpreview.lovable.app.`,
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
          {
            type: 'function',
            function: {
              name: 'schedule_callback',
              description: 'Schedule a callback from the Vendibook team when a user wants to talk to a human',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'User name' },
                  phone: { type: 'string', description: 'Phone number to call back' },
                  email: { type: 'string', description: 'Optional email address' },
                  preferred_time: { type: 'string', description: 'When they want to be called back (e.g. "asap", "this afternoon", "tomorrow morning")' },
                  reason: { type: 'string', description: 'Brief summary of what they need help with' },
                },
                required: ['name', 'phone'],
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
