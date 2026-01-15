import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FAQ-CHATBOT] ${step}${detailsStr}`);
};

// Knowledge base for common Vendibook questions
const knowledgeBase = `
# Vendibook FAQ Knowledge Base

## How Rentals Work
- Browse listings by location, category (food truck, trailer, ghost kitchen, vendor lot)
- Request to book with your dates and a message to the host
- Host reviews and approves your request
- Pay securely through Vendibook (funds held until rental begins)
- Pick up or access the equipment as instructed
- Return clean and document condition with photos
- Security deposit released within 48 hours after successful return

## How Buying Works
- Browse "For Sale" listings with detailed photos and specs
- Contact seller through the platform with questions
- Arrange inspection (in-person or via mobile mechanic)
- Pay through Vendibook's secure escrow system
- Receive title, bill of sale, and documentation
- Confirm receipt to release funds to seller

## Payments & Security
- All payments processed through Stripe (secure, PCI compliant)
- Funds held in escrow until transaction completes
- Vendibook charges a platform fee (typically 10-15%)
- Sellers receive payouts after buyer confirms receipt
- Disputes can be raised within 48 hours of issues

## Documents & Requirements
- Hosts may require documents like driver's license, business license, food handler certificate
- Documents are reviewed before booking approval
- Upload documents through your dashboard
- Some documents required before booking, others after approval

## Cancellation Policy
- Cancel before host approval: Full refund
- Cancel after approval but 48+ hours before start: Refund minus service fee
- Cancel within 48 hours: Subject to host's cancellation policy
- Hosts can set their own cancellation terms

## Insurance
- Renters should have liability insurance
- Hosts may require proof of insurance
- Vendibook offers optional protection plans
- Commercial auto insurance needed for food trucks

## Contact Support
- Phone: 1877-8VENDI2 (1-877-883-6342)
- Email: support@vendibook.com
- Live chat available on website
- Response within 2 minutes during business hours (Mon-Fri 9am-6pm, Sat 10am-4pm EST)

## Account & Verification
- Create account with email
- Verify identity through Stripe Identity
- Hosts need to complete Stripe Connect onboarding
- Identity verification increases trust and booking approval rates

## Delivery & Freight
- Some listings offer delivery within a radius
- Vendibook Freight available for long-distance transport
- Delivery fees shown at checkout
- Track shipments through your dashboard
`;

interface ChatRequest {
  question: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("FAQ chatbot started");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { question, conversationHistory = [] }: ChatRequest = await req.json();
    logStep("Question received", { question: question.substring(0, 100) });

    const messages = [
      {
        role: "system",
        content: `You are VendiBot, a helpful FAQ assistant for Vendibook - a marketplace for renting and buying food trucks, trailers, ghost kitchens, and vendor lots.

Use this knowledge base to answer questions accurately:
${knowledgeBase}

Guidelines:
- Be concise and helpful (2-4 sentences max)
- If unsure, suggest contacting support at support@vendibook.com or 1877-8VENDI2
- Be friendly and professional
- For complex issues, recommend scheduling a callback or using live chat
- Don't make up information not in the knowledge base`
      },
      ...conversationHistory.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      })),
      {
        role: "user",
        content: question
      }
    ];

    const response = await fetch("https://api.lovable.dev/ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("AI API error", { status: response.status, error: errorText });
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";
    
    logStep("Response generated", { answerLength: answer.length });

    return new Response(
      JSON.stringify({ answer }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);
