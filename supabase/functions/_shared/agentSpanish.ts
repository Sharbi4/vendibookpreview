/** Narrow language-only updates: keep identity, tools, workflow, voice and auth unchanged. */
export const SPANISH_GUIDANCE = `LANGUAGE — ENGLISH AND SPANISH: Support English and Spanish in voice and text. When the customer speaks Spanish or requests it, call language_detection with es when available and continue in clear, neutral Spanish. Switch back to en on request. Keep their chosen language when tool results, knowledge, Journey/Attention updates or page labels are English. Explain results in their language, preserving actual button labels when helpful. Never translate tool names, enum values, IDs, URLs, brand names or dynamic-variable keys. Preserve exact prices, units, policy qualifications, AI identity, processing disclosures, consent and privacy requirements. Include the preferred language in non-sensitive handoff summaries and continue in that language when receiving a handoff. Spanish alone is not a reason to transfer. Never promise a Spanish-speaking human unless availability is confirmed. Language support never authorizes a call, message, payment or booking.`;

export const SPANISH_GREETINGS = {
  atlas: 'Hola, soy Atlas, el asistente de ventas de inteligencia artificial de Vendibook. ¿Cómo puedo ayudarte hoy?',
  allison: 'Hola, soy Allison, la asistente de atención al cliente de inteligencia artificial de Vendibook. ¿En qué puedo ayudarte hoy?',
  vendi: 'Hola, soy Vendi, el asistente de inteligencia artificial de Vendibook. Puedo ayudarte a preparar tu anuncio. ¿Qué equipo quieres anunciar?',
  phone: '¡Gracias por llamar a Vendibook! Soy Allison, la asistente de inteligencia artificial de Vendibook. ¿Cómo va tu día?',
};

// Spanish presets deliberately use a complete Spanish greeting: page_opening is
// generated in English by the website. The base English first message remains
// journey-aware; subsequent context still reaches the agent in either language.
export function spanishConversationPatch(current: any, firstMessage: string, guidance = SPANISH_GUIDANCE) {
  const cc = current.conversation_config ?? {};
  const prompt = cc.agent?.prompt ?? {};
  if (typeof prompt.prompt !== 'string' || !prompt.prompt.trim()) throw new Error('Missing current prompt; refusing to overwrite');
  const presets = cc.language_presets ?? {};
  const es = presets.es ?? {};
  const builtins = Object.fromEntries(Object.entries(prompt.built_in_tools ?? {}).filter(([, v]) => v != null));
  return {
    language_presets: { ...presets, es: { ...es, overrides: { ...es.overrides,
      agent: { ...es.overrides?.agent, first_message: firstMessage },
    } } },
    agent: { prompt: {
      prompt: prompt.prompt.includes(guidance) ? prompt.prompt : `${prompt.prompt}\n\n${guidance}`,
      built_in_tools: { ...builtins, language_detection: {
        type: 'system', name: 'language_detection',
        description: 'Switch to Spanish when the customer speaks Spanish or requests Spanish; switch back to English on request. Do not change language because a tool or page uses English.',
        params: { system_tool_type: 'language_detection' },
      } },
    } },
  };
}

export function verifySpanishReadback(before: any, after: any, patch: ReturnType<typeof spanishConversationPatch>) {
  const a = after.conversation_config;
  if (a?.language_presets?.es?.overrides?.agent?.first_message !== patch.language_presets.es.overrides.agent.first_message
    || a?.agent?.prompt?.prompt !== patch.agent.prompt.prompt
    || a?.agent?.prompt?.built_in_tools?.language_detection?.params?.system_tool_type !== 'language_detection') {
    throw new Error('Spanish readback mismatch');
  }
  // Only the managed language paths may change. Ignore provider metadata/echoed
  // inline tools, but compare the actual registry, KB, workflow and auth.
  for (const key of ['tool_ids', 'knowledge_base', 'rag', 'llm', 'mcp_server_ids', 'native_mcp_server_ids']) {
    if (JSON.stringify(before.conversation_config?.agent?.prompt?.[key]) !== JSON.stringify(a?.agent?.prompt?.[key])) throw new Error(`Unexpected prompt change: ${key}`);
  }
  for (const key of ['tts', 'asr', 'turn', 'conversation']) {
    if (JSON.stringify(before.conversation_config?.[key]) !== JSON.stringify(a?.[key])) throw new Error(`Unexpected configuration change: ${key}`);
  }
  for (const key of ['platform_settings', 'workflow']) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) throw new Error(`Unexpected configuration change: ${key}`);
  }
  for (const [key, value] of Object.entries(before.conversation_config?.agent?.prompt?.built_in_tools ?? {})) {
    if (key !== 'language_detection' && value != null && JSON.stringify(value) !== JSON.stringify(a?.agent?.prompt?.built_in_tools?.[key])) throw new Error(`Changed built-in tool: ${key}`);
  }
  if (before.conversation_config?.agent?.first_message !== a?.agent?.first_message || before.conversation_config?.agent?.language !== a?.agent?.language) throw new Error('Changed default greeting/language');
}
