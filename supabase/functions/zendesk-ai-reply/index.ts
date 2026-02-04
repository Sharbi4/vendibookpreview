import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-smooch-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ZENDESK-AI-REPLY] ${step}${detailsStr}`);
};

// Knowledge base for common Vendibook questions (reused from faq-chatbot)
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
- Phone: 1-877-8-VENDI-2 (1-877-883-6342)
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

// Keywords that trigger human handoff
const HUMAN_HANDOFF_KEYWORDS = [
  'human', 'agent', 'support', 'representative', 'person', 'real person',
  'speak to someone', 'talk to someone', 'customer service', 'help desk',
  'operator', 'live agent', 'manager', 'supervisor', 'escalate'
];

// Sunshine Conversations webhook payload types
interface SunshineMessage {
  id: string;
  type: string;
  text?: string;
  received: string;
  author: {
    type: string;
    userId?: string;
    displayName?: string;
  };
}

interface SunshineConversation {
  id: string;
  type: string;
}

interface SunshineWebhookPayload {
  app: { id: string };
  webhook: { id: string; version: string };
  events: Array<{
    id: string;
    type: string;
    createdAt: string;
    payload: {
      conversation: SunshineConversation;
      message: SunshineMessage;
    };
  }>;
}

// Verify Zendesk webhook signature
async function verifySignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) {
    logStep("Signature verification skipped - missing signature or secret");
    return true; // Skip verification if not configured
  }

  try {
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const data = encoder.encode(payload);
    
    const hmac = createHmac("sha256", key);
    hmac.update(data);
    const expectedSignature = hmac.digest("hex");
    
    const isValid = signature === `sha256=${expectedSignature}`;
    logStep("Signature verification", { isValid });
    return isValid;
  } catch (error) {
    logStep("Signature verification error", { error: String(error) });
    return false;
  }
}

// Check if message requires human handoff
function needsHumanHandoff(text: string): boolean {
  const lowerText = text.toLowerCase();
  return HUMAN_HANDOFF_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

// Generate AI response using the knowledge base
async function generateAIResponse(userMessage: string): Promise<{ answer: string; confidence: number }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const messages = [
    {
      role: "system",
      content: `You are VendiBot, a helpful FAQ assistant for Vendibook - a marketplace for renting and buying food trucks, trailers, ghost kitchens, and vendor lots.

Use this knowledge base to answer questions accurately:
${knowledgeBase}

Guidelines:
- Be concise and helpful (2-4 sentences max)
- If unsure or the question is outside your knowledge, respond with "I'm not sure about that" and suggest contacting support
- Be friendly and professional
- For complex issues, recommend contacting support at support@vendibook.com or 1-877-8-VENDI-2
- Don't make up information not in the knowledge base
- At the end of your response, add a confidence score in the format: [CONFIDENCE: X] where X is a number from 1-10`
    },
    {
      role: "user",
      content: userMessage
    }
  ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
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
  let answer = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't understand that. Please try rephrasing your question.";
  
  // Extract confidence score
  let confidence = 5; // Default medium confidence
  const confidenceMatch = answer.match(/\[CONFIDENCE:\s*(\d+)\]/i);
  if (confidenceMatch) {
    confidence = parseInt(confidenceMatch[1], 10);
    answer = answer.replace(/\[CONFIDENCE:\s*\d+\]/i, '').trim();
  }

  return { answer, confidence };
}

// Send message back to Zendesk Sunshine Conversations
async function sendZendeskReply(
  appId: string,
  conversationId: string,
  message: string
): Promise<boolean> {
  const keyId = Deno.env.get("ZENDESK_API_KEY_ID");
  const keySecret = Deno.env.get("ZENDESK_API_KEY_SECRET");

  if (!keyId || !keySecret) {
    throw new Error("Zendesk API credentials not configured");
  }

  const authToken = btoa(`${keyId}:${keySecret}`);
  
  const response = await fetch(
    `https://api.smooch.io/v2/apps/${appId}/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authToken}`,
      },
      body: JSON.stringify({
        author: {
          type: "business",
          displayName: "VendiBot"
        },
        content: {
          type: "text",
          text: message
        }
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    logStep("Zendesk reply error", { status: response.status, error: errorText });
    return false;
  }

  logStep("Reply sent to Zendesk", { conversationId });
  return true;
}

// Tag conversation for human handoff
async function tagConversationForHandoff(
  appId: string,
  conversationId: string
): Promise<void> {
  const keyId = Deno.env.get("ZENDESK_API_KEY_ID");
  const keySecret = Deno.env.get("ZENDESK_API_KEY_SECRET");

  if (!keyId || !keySecret) {
    logStep("Cannot tag conversation - missing credentials");
    return;
  }

  const authToken = btoa(`${keyId}:${keySecret}`);
  
  // Update conversation metadata to indicate human handoff needed
  try {
    await fetch(
      `https://api.smooch.io/v2/apps/${appId}/conversations/${conversationId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${authToken}`,
        },
        body: JSON.stringify({
          metadata: {
            handoff_requested: true,
            handoff_requested_at: new Date().toISOString(),
            ai_stopped: true
          }
        }),
      }
    );
    logStep("Conversation tagged for human handoff", { conversationId });
  } catch (error) {
    logStep("Failed to tag conversation", { error: String(error) });
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-smooch-signature");
    const webhookSecret = Deno.env.get("ZENDESK_WEBHOOK_SECRET");

    // Verify signature if secret is configured
    if (webhookSecret) {
      const isValid = await verifySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        logStep("Invalid webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const payload: SunshineWebhookPayload = JSON.parse(rawBody);
    const appId = Deno.env.get("ZENDESK_APP_ID") || payload.app?.id;

    if (!appId) {
      throw new Error("ZENDESK_APP_ID not configured and not in payload");
    }

    logStep("Payload parsed", { 
      appId,
      eventCount: payload.events?.length || 0 
    });

    // Process each event
    for (const event of payload.events || []) {
      // Only process user messages (not bot messages)
      if (event.type !== "conversation:message") {
        logStep("Skipping non-message event", { type: event.type });
        continue;
      }

      const { conversation, message } = event.payload;

      // Skip if this is a business/bot message (prevent loops)
      if (message.author?.type === "business") {
        logStep("Skipping business message", { messageId: message.id });
        continue;
      }

      // Skip non-text messages
      if (message.type !== "text" || !message.text) {
        logStep("Skipping non-text message", { type: message.type });
        continue;
      }

      const userMessage = message.text.trim();
      logStep("Processing user message", { 
        conversationId: conversation.id,
        messageLength: userMessage.length 
      });

      // Check for human handoff request
      if (needsHumanHandoff(userMessage)) {
        logStep("Human handoff requested");
        
        // Send handoff message
        await sendZendeskReply(
          appId,
          conversation.id,
          "I understand you'd like to speak with a human agent. Let me connect you to our support team. A representative will be with you shortly. In the meantime, you can also reach us at support@vendibook.com or call 1-877-8-VENDI-2."
        );

        // Tag conversation for handoff
        await tagConversationForHandoff(appId, conversation.id);
        
        continue;
      }

      // Generate AI response
      try {
        const { answer, confidence } = await generateAIResponse(userMessage);
        
        logStep("AI response generated", { confidence, answerLength: answer.length });

        // If confidence is too low, trigger handoff
        if (confidence <= 3) {
          logStep("Low confidence - triggering handoff", { confidence });
          
          await sendZendeskReply(
            appId,
            conversation.id,
            `${answer}\n\nI'm not entirely sure about this, so let me connect you with a human agent who can help you better. Someone will be with you shortly!`
          );
          
          await tagConversationForHandoff(appId, conversation.id);
          continue;
        }

        // Send AI response
        await sendZendeskReply(appId, conversation.id, answer);
        
      } catch (aiError) {
        logStep("AI generation failed", { error: String(aiError) });
        
        // Send fallback message
        await sendZendeskReply(
          appId,
          conversation.id,
          "I'm having trouble processing your request right now. Please try again, or contact our support team at support@vendibook.com or 1-877-8-VENDI-2 for immediate assistance."
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
