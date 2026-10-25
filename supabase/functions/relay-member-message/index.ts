// Owner decision 2026-10-25: every member chat message is held for review.
// Admins (or the backend relay monitor) relay a screened copy to the other
// participant under the sender's name, or decline it. The database function
// re-runs every send guard for the sender and refuses contact details, so a
// relay can never post anything the sender could not.
import { getCaller, isAdminUser, isBackendCaller, serviceRoleClient } from '../_shared/callerGuard.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TABLES = new Set(['conversation_messages', 'booking_messages'])

const json = (data: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // The acting admin is recorded as the reviewer; backend callers relay as Vendibook (null).
  let actor: string | null = null
  if (!(await isBackendCaller(req))) {
    const caller = await getCaller(req)
    if (!caller || !(await isAdminUser(caller.id))) return json({ error: 'Forbidden' }, 403)
    actor = caller.id
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const action = body.action
  const table = typeof body.table === 'string' ? body.table : 'conversation_messages'
  const messageId = typeof body.message_id === 'string' ? body.message_id : ''
  if (!TABLES.has(table)) return json({ error: 'Unsupported message table' }, 400)
  if (!UUID_RE.test(messageId)) return json({ error: 'message_id is required' }, 400)

  const db = serviceRoleClient()
  if (action === 'relay') {
    const text = typeof body.body === 'string' ? body.body : null
    const { data, error } = await db.rpc('relay_held_member_message', {
      p_table: table,
      p_message: messageId,
      p_body: text,
      p_relayed_by: actor,
      p_include_attachment: body.include_attachment === true,
    })
    if (error) return json({ error: error.message }, 422)
    return json({ ok: true, relayed_message_id: data })
  }
  if (action === 'decline') {
    const reason = typeof body.reason === 'string' ? body.reason : ''
    const { error } = await db.rpc('decline_held_member_message', {
      p_table: table,
      p_message: messageId,
      p_reason: reason,
      p_declined_by: actor,
    })
    if (error) return json({ error: error.message }, 422)
    return json({ ok: true })
  }
  return json({ error: 'action must be relay or decline' }, 400)
})
