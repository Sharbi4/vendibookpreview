# Read-only check: Vendibook phone support line (results)

No changes were made. Nothing to approve. These are the findings only.

## 1. ElevenLabs number +1 866 690 6227
- Provider: Twilio import (not a SIP trunk)
- Label: "Vendibook (866) 690-6227"
- Assigned agent: agent_8301m5nh7dq6e1x9wgqk2yx7k4pd (Allison)
- Inbound: enabled. Outbound: enabled.

## 2. Allison agent
- Name: "Vendibook Site Customer Service and Tech Agent"
- Voice: YyRJWuwyhKdMZRRnm464
- LLM: claude-haiku-4-5
- Provider authentication: enabled (no allowlist, no shareable token)
- Tools (30):
  - Calendly integration (9): list_event_type_available_times, list_event_types, create_event_invitee, cancel_event, get_event_type, list_events_by_invitee, get_event, get_calendar_owner, list_events
  - Client (17): search_listings, show_listing, get_delivery_quote, start_request_to_buy, draft_offer, draft_seller_message, get_operator_guidance, set_navigation, get_permit_requirements, get_faq, get_pricing, open_page, look_at_page, page_action, request_follow_up, get_support_knowledge, transfer_to_sales
  - System (4): flag_issue_for_review, end_call, play_keypad_touch_tone, voicemail_detection
  - Webhook: none. MCP servers: none.
- Calendly: Lovable's Calendly connection (shawnnaharbin@vendibook.com) has one active meeting type: "Customer Success Meeting", 30 min, Zoom. Unverified: whether ElevenLabs' Calendly integration uses that same account. Nothing was booked.
- Knowledge base: Vendibook_Guide_Current.pdf; https://vendibook.com/ (site crawl); "Allison Current Subscription Rules 2026-10-24"; "Allison Support and Guided Sales — d8b9fb0da"

## 3. Twilio
- The account owns +18666906227 (toll-free, status in-use)
- Calls go to ElevenLabs (inbound_call). Backup if that fails: Vapi.
- Texts go to ElevenLabs (inbound-sms). Backup if that fails: Vendibook's twilio-inbound-webhook.
- Status updates go to ElevenLabs.
- Capabilities: voice yes, SMS yes, MMS yes, fax no
- Toll-free verification: TWILIO_APPROVED (approved by Twilio; use cases account notifications, customer care, delivery notifications)
- TWILIO_FROM_NUMBER equals +18666906227: yes

## 4. Twilio connector for calls
- Calls.json: supported. A read-only call list returned HTTP 200.
- Messages.json: supported per connector docs. Not called live in this check.
- Toll-free verification lookup (messaging subdomain): also worked.

## 5. Secrets
- ELEVENLABS_API_KEY: exists (connector-managed)
- ALLISON_AGENT_ID: exists
- TWILIO_AUTH_TOKEN: does not exist (the Twilio connector uses TWILIO_API_KEY instead)

## Worth noting
- Backup call route still points to Vapi. If ElevenLabs fails, calls fall to the old Vapi line.
- Text replies go to ElevenLabs first, not Vendibook's own handler.
