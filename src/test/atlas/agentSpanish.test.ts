import { describe, expect, it } from 'vitest';
import { spanishConversationPatch, verifySpanishReadback, SPANISH_GREETINGS } from '../../../supabase/functions/_shared/agentSpanish';

const fixture = () => ({
  platform_settings: { auth: { enable_auth: true } }, workflow: { nodes: { entry: { type: 'start' } } },
  conversation_config: {
    tts: { voice_id: 'existing-voice', model_id: 'eleven_v4_turbo' },
    agent: { language: 'en', first_message: 'Hello {{page_opening}}', prompt: {
      prompt: 'Original account and consent policy.', tool_ids: ['lookup', 'handoff'],
      knowledge_base: [{ id: 'kb' }], mcp_server_ids: ['calendar'],
      built_in_tools: { end_call: { type: 'system', name: 'end_call' }, transfer_to_agent: { params: { transfers: [{ agent_id: 'allison' }] } }, language_detection: null },
    } },
    language_presets: { fr: { overrides: { agent: { first_message: 'Bonjour' } } } },
  },
});
function merge(before: any, patch: any) {
  return { ...before, conversation_config: { ...before.conversation_config, ...patch,
    agent: { ...before.conversation_config.agent, ...patch.agent, prompt: { ...before.conversation_config.agent.prompt, ...patch.agent.prompt } },
  } };
}
describe('Spanish provider updates', () => {
  it('adds Spanish and detection while retaining existing languages, handoffs and permissions', () => {
    const before = fixture();
    const patch = spanishConversationPatch(before, SPANISH_GREETINGS.atlas);
    const after = merge(before, patch);
    expect(() => verifySpanishReadback(before, after, patch)).not.toThrow();
    expect(patch.language_presets.fr).toEqual(before.conversation_config.language_presets.fr);
    expect(patch.agent.prompt.built_in_tools.transfer_to_agent).toEqual(before.conversation_config.agent.prompt.built_in_tools.transfer_to_agent);
    expect(patch.agent.prompt.prompt).toContain('Original account and consent policy.');
    expect(patch.language_presets.es.overrides.agent.first_message).not.toContain('{{page_opening}}');
    expect(patch.agent.prompt.built_in_tools.language_detection.params).toEqual({ system_tool_type: 'language_detection' });
    expect(spanishConversationPatch(after, SPANISH_GREETINGS.atlas)).toEqual(patch);
  });
  it('fails readback if the provider drops a tool or changes authentication', () => {
    const before = fixture();
    const patch = spanishConversationPatch(before, SPANISH_GREETINGS.allison);
    const after = merge(before, patch);
    after.conversation_config.agent.prompt.tool_ids = [];
    expect(() => verifySpanishReadback(before, after, patch)).toThrow('tool_ids');
    const changedAuth = merge(before, patch);
    changedAuth.platform_settings = { auth: { enable_auth: false } };
    expect(() => verifySpanishReadback(before, changedAuth, patch)).toThrow('platform_settings');
  });
  it('refuses to patch an agent without a current prompt', () => {
    expect(() => spanishConversationPatch({}, SPANISH_GREETINGS.phone)).toThrow('Missing current prompt');
  });
});
