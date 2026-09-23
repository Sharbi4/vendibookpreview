# Removed spam message links

Use `public.remove_confirmed_spam_conversation(conversation_id, sender_id)` with an administrator or service-role session after confirming a conversation is spam, BEFORE deleting the sender account. It retains only the conversation ID, recipient ID, sender ID, and removal time, and removes the conversation and messages. Delete/close the offending account through the existing account moderation process; this function does not delete accounts.

The recipient-only `get_removed_conversation_notice` RPC returns a spam notice and checks whether the sender's auth account was actually deleted before claiming account deletion. There is no public directory of removed conversations.

For previously deleted threads, backfill `removed_spam_conversations` only when the original conversation ID, intended recipient, and spam sender can be established from trusted records. Never infer spam from a missing conversation or permission error. No historical IDs were recoverable during the September 23 fix, so legacy missing links show a neutral unavailable notice mentioning spam removal as a possibility.

Do not restore phishing content, send new alerts, or mark all unavailable links as spam.
