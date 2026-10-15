import { useState } from 'react';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ATLAS_FIRST_MESSAGE, ATLAS_SYSTEM_PROMPT, ATLAS_TOOL_DEFINITIONS } from '@/lib/atlas/atlasConfig';

type ToolResult = { name: string; ok: boolean; status: number };
type SyncResult = { agent_updated?: boolean; tools?: ToolResult[]; error?: string };

/**
 * Pushes Atlas's prompt, first message and client tools (src/lib/atlas/atlasConfig.ts)
 * to the Atlas agent in ElevenLabs through the admin-only elevenlabs-agent-configure
 * function. The ElevenLabs key stays on the server.
 */
export default function AtlasSyncCard() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const sync = async () => {
    setBusy(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke('elevenlabs-agent-configure', {
      body: {
        action: 'apply',
        agent: 'atlas',
        prompt: ATLAS_SYSTEM_PROMPT,
        first_message: ATLAS_FIRST_MESSAGE,
        tools: ATLAS_TOOL_DEFINITIONS,
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
        <CardTitle className="text-lg">Atlas sales agent (ElevenLabs)</CardTitle>
        <CardDescription>
          Sends Atlas's current prompt, first message and {ATLAS_TOOL_DEFINITIONS.length} client tools to the Atlas agent.
          Run it again whenever Atlas's setup changes. Vendi Voice is not touched.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={sync} disabled={busy}>
          <RefreshCw className={busy ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
          {busy ? 'Syncing…' : 'Sync Atlas to ElevenLabs'}
        </Button>
        {result && (
          <div className="flex items-start gap-2 text-sm" role="status">
            {ok ? (
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            )}
            <p>
              {ok
                ? `Atlas is up to date: prompt, first message and ${result.tools?.length ?? 0} tools.`
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
