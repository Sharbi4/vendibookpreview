import { useState } from 'react';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ATLAS_FIRST_MESSAGE, ATLAS_SYSTEM_PROMPT, ATLAS_TOOL_DEFINITIONS } from '@/lib/atlas/atlasConfig';
import { ALLISON_FIRST_MESSAGE, ALLISON_SYSTEM_PROMPT, ALLISON_TOOL_DEFINITIONS } from '@/lib/atlas/allisonConfig';

type ToolResult = { name: string; ok: boolean; status: number };
type SyncResult = { agent_updated?: boolean; tools?: ToolResult[]; error?: string };

/**
 * Pushes Atlas's prompt, first message and client tools (src/lib/atlas/atlasConfig.ts)
 * to the Atlas agent in ElevenLabs through the admin-only elevenlabs-agent-configure
 * function. The ElevenLabs key stays on the server.
 */
export default function AtlasSyncCard({ agent = 'atlas' }: { agent?: 'atlas' | 'allison' }) {
  const name = agent === 'allison' ? 'Allison' : 'Atlas';
  const definitions = agent === 'allison' ? ALLISON_TOOL_DEFINITIONS : ATLAS_TOOL_DEFINITIONS;
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [liveSetup, setLiveSetup] = useState<string>('');

  const inspect = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-agent-configure', { body: { action: 'status', agent } });
      setLiveSetup(error ? `Inspection failed: ${error.message}` : JSON.stringify(data, null, 2));
    } catch { setLiveSetup('Could not inspect the live setup.'); }
    finally { setBusy(false); }
  };

  const sync = async () => {
    setBusy(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke('elevenlabs-agent-configure', {
      body: {
        action: 'apply',
        agent,
        prompt: agent === 'allison' ? ALLISON_SYSTEM_PROMPT : ATLAS_SYSTEM_PROMPT,
        first_message: agent === 'allison' ? ALLISON_FIRST_MESSAGE : ATLAS_FIRST_MESSAGE,
        tools: definitions,
      },
    });
    setBusy(false);
    setResult(error ? { error: error.message } : (data as SyncResult));
  };

  const failed = result?.tools?.filter((t) => !t.ok) ?? [];
  const ok = Boolean(result?.agent_updated) && failed.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{name} {agent === 'allison' ? 'customer success' : 'sales agent'} (ElevenLabs)</CardTitle>
        <CardDescription>
          Sends {name}'s current prompt, first message and {definitions.length} client tools to the configured agent.
          {agent === 'allison' && ' Create Allison in ElevenLabs, select her female voice and configure ALLISON_AGENT_ID first. '}
          Other agents are not changed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={sync} disabled={busy}>
          <RefreshCw className={busy ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
          {busy ? 'Syncing…' : `Sync ${name} to ElevenLabs`}
        </Button>
        <Button variant="outline" onClick={inspect} disabled={busy} className="ml-2">Inspect live {name} setup</Button>
        {liveSetup && <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border p-3 text-xs" aria-label="Live Atlas configuration status">{liveSetup}</pre>}
        {result && (
          <div className="flex items-start gap-2 text-sm" role="status">
            {ok ? (
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            )}
            <p>
              {ok
                ? `${name} is up to date: prompt, first message and ${result.tools?.length ?? 0} tools.`
                : result.error
                  ? `Sync failed: ${result.error}`
                  : `Agent ${result.agent_updated ? 'updated' : 'not updated'}${failed.length ? `; tools that failed: ${failed.map((t) => t.name).join(', ')}` : ''}.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
