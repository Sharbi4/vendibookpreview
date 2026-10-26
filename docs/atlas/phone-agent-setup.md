# Vendibook phone line (866-690-6227)

The phone line uses Allison, the support agent, on ElevenLabs. It is a separate agent so its phone-only prompt and tools don't change the website assistant.

- Number: +1 866 690 6227, a Twilio toll-free number imported into ElevenLabs as `phnum_9001m5tnf446f4sbmch182jzvfq1`. It is also `TWILIO_FROM_NUMBER`.
- Website Allison: `agent_8301m5nh7dq6e1x9wgqk2yx7k4pd`. The phone agent is created from it and keeps the same voice, LLM, knowledge base and Calendly tools.

## Call flow (owner 2026-10-26)

1. Greeting: `phone-agent-first-message.txt`. Allison asks how the caller's day is going.
2. Before anything else, she collects:
   - first and last name;
   - a good callback number (she confirms the last four digits of caller ID or takes another number);
   - an email address, which is optional.

   `save_caller_details` saves these to a support ticket straight away, so a dropped call can still be returned.
3. While tools load, she makes light small talk. She never states weather facts.
4. Account questions need verification. She uses `start_account_verification` to send a 6-digit code by text or email to the contact details already on the account, then `check_account_code`. Only after a correct code does `get_my_account_summary` share bookings, sales, listings or tickets. Caller ID alone is never trusted.
5. If the caller wants a live person, she offers four options. `request_live_follow_up` turns the saved ticket into a high-priority follow-up due within 2 business hours (Mon–Fri 8 AM–8 PM ET).
   - **Phone call:** a call back from 866-690-6227.
   - **Text:** a text from 866-690-6227. She first reads the text disclosure, and the caller must say yes. Texts only go to the calling number and never to a number that has opted out with STOP.
   - **Email:** a reply from support@vendibook.com.
   - **Meeting:** a Calendly "Customer Success Meeting" (30 min, Zoom).

Files:

- `phone-agent-system-prompt.txt`: the prompt.
- `phone-agent-first-message.txt`: the greeting.
- `phone-agent-tools.json`: the six webhook tools. Add the system `end_call` tool alongside them.

## Calling or texting back from the 866 number

To call or text a caller back, open **Admin → Support tickets** and pick a phone ticket.

- **Call back from (866) 690-6227:** Twilio first rings the phone you enter on that card. When you answer, it connects you to the customer, who sees 866-690-6227. The phone you enter is saved in your browser only.
- **Text from (866) 690-6227:** sends your message with a "Vendibook:" prefix and STOP wording. This only works if the customer agreed to texts and hasn't opted out.

Both actions are admin-only (`admin-phone-actions`). Call-backs are limited to US/Canada numbers and 20 per hour.

## 2-hour contact report

The `agent-contact-report` cron runs at minute 5 of every second hour. It emails support@vendibook.com and atlasmom421@gmail.com. The report covers:

- phone, Atlas and Allison tickets;
- overdue call-backs;
- listing leads;
- guest inquiries waiting for review;
- member messages held, relayed or declined;
- ElevenLabs conversation counts per agent.

It contains names and admin links only, never contact details. To run it manually, an admin can call the function with `{"dry_run": true}`.

Caveat: support@vendibook.com has been suppressed in Resend since a 2026-08-04 bounce. Until that suppression is removed, only the atlasmom421 copy arrives.

## Provisioning

This setup needs no new Supabase secrets. The tool secret is derived from `ELEVENLABS_API_KEY` (`_shared/phoneLine.ts`), and the report looks up the phone agent from the number's assignment. If you set `PHONE_AGENT_TOOL_SECRET` or `PHONE_AGENT_ID` explicitly, those values are used instead.

1. **Deploy the database first, then the functions.**
   1. Apply migrations `20261025233000_member_message_relay.sql` and `20261026010000_phone_agent_verification_and_contact_report.sql`.
   2. Deploy `phone-support-tools`, `admin-phone-actions` and `agent-contact-report`.
   3. Publish the frontend only after the owner's go-ahead.
2. **Tool secret.** As an admin, call `admin-phone-actions` with `{"action": "register_tool_secret"}`.
   - It writes the value into the ElevenLabs workspace secret `PHONE_AGENT_TOOL_SECRET` and returns only the secret's ID. Nobody sees or copies the value.
   - Run it again after rotating the ElevenLabs API key, because the derived value changes with the key.
3. **Agent.**
   1. Duplicate Allison.
   2. Replace its prompt and first message with the files above.
   3. Add the webhook tools from `phone-agent-tools.json`, with the `x-vendibook-tool-secret` header referencing that workspace secret, plus the system `end_call` tool. Keep the Calendly tools.
4. **Number.** Assign `phnum_9001m5tnf446f4sbmch182jzvfq1` to the new agent.
5. **Check.** Call `admin-phone-actions` with `{"action": "phone_line_status"}`. It should show the new agent and `tool_secret_registered: true`.

The older Vapi functions (`vapi-*`, `schedule-callback`) are still deployed. They don't use this number once it points at ElevenLabs. Retire them separately.
