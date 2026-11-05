# English and Spanish agent support

Language-only maintenance uses `scripts/sync-spanish-agents.ts --apply` for the four inbound/listing agents and `scripts/sync-outbound-atlas.ts --language-only --apply` for the isolated outbound agent. Both use the server-held ElevenLabs key; without `--apply` they only read and prepare patches. No calls or messages are dispatched.

The patch adds the `es` language preset and `language_detection` built-in system tool. English stays the default. Customers can speak Spanish or ask to switch at any point, and request English again. Existing voices, tools, knowledge, workflows, authentication and privacy settings are verified unchanged after each patch. Do not replace tool arrays to add a language.

Atlas and Allison's canonical prompts also contain language guidance so normal Admin Sync preserves the behavior. English tool results and journey context must be explained in the customer's chosen language; internal tool keys and enum values remain unchanged. Consent, policy qualifications and privacy rules apply equally in Spanish. Do not promise a Spanish-speaking human without confirmed availability.

Spanish presets use a complete Spanish greeting rather than interpolating the website's English `page_opening`. The default English greeting still uses that journey variable, and live journey updates remain available after either opening. This change enables switching during a conversation; it does not add a website language picker or translate the website itself. Outbound keeps its AI identity and processing disclosure, with the existing `call_purpose` variable.

Reference: https://elevenlabs.io/docs/eleven-agents/customization/tools/system-tools/language-detection

Configuration readback and tests establish enabled settings and preservation of integrations. They do not establish acoustic quality or a completed real customer call; voice acceptance should cover Spanish input, English-to-Spanish-to-English switching, Spanish tool explanations, and a consented Atlas/Allison handoff.

## Production verification — November 5, 2026

The ElevenLabs maintenance runtime executed both scripts from Git commit `b8e065a2a` and performed independent GET readbacks. All five agents have an `es` greeting, enabled `language_detection`, and one appended bilingual guidance section. Default English greetings and voices remain unchanged. Script preservation checks passed for tools, knowledge, model, speech recognition, turn settings, workflow, authentication and platform settings.

| Agent | Registry tools | Knowledge documents |
| --- | ---: | ---: |
| Atlas website | 30 | 3 |
| Allison website | 26 | 5 |
| Vendi Voice | 9 | 0 |
| Support phone | 17 | 5 |
| Outbound Atlas | 4 | 2 |

Eleven focused local tests passed. Provider conversation-simulation requests were rejected because that endpoint is no longer available; no simulated exchange completed. Real Spanish speech, switch-back, and handoff quality remain untested. No customer calls/messages, phone routing changes or frontend publication were performed.
