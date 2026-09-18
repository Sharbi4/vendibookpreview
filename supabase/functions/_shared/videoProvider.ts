export type VideoRoom = { roomName: string; roomUrl: string; expiresAt: string };
export type VideoJoin = { roomUrl: string; token: string; expiresAt: string };
export interface VideoProvider {
  createPrivateRoom(walkthroughId: string, expiresAt: Date): Promise<VideoRoom>;
  createMeetingToken(roomName: string, user: { id: string; name: string }, expiresAt: Date, isOwner: boolean): Promise<VideoJoin>;
  deleteRoom(roomName: string): Promise<void>;
}

export class VideoProviderUnavailableError extends Error {
  constructor() { super('Native video is not configured yet. Scheduling remains available.'); }
}

/** Room name convention — also parsed by the post-call fallback route. */
export const roomNameForWalkthrough = (walkthroughId: string) => `vw-${walkthroughId}`;

class DailyProvider implements VideoProvider {
  private key = Deno.env.get('DAILY_API_KEY');
  private domain = Deno.env.get('DAILY_DOMAIN');
  private assertConfigured() { if (!this.key || !this.domain) throw new VideoProviderUnavailableError(); }
  private async request(path: string, init: RequestInit) {
    this.assertConfigured();
    const response = await fetch(`https://api.daily.co/v1${path}`, { ...init, headers: { Authorization: `Bearer ${this.key}`, 'Content-Type':'application/json', ...(init.headers || {}) } });
    if (!response.ok) throw new Error(`Video provider request failed (${response.status}).`);
    return response.json();
  }

  /**
   * The join hook is how Vendibook learns that somebody REALLY entered the
   * meeting. Token issuance is not a join. The secret lives only on the
   * server; it never reaches the browser.
   */
  private joinHookUrl(): string | null {
    const base = Deno.env.get('SUPABASE_URL');
    const secret = Deno.env.get('DAILY_JOIN_HOOK_SECRET');
    if (!base || !secret) return null;
    return `${base}/functions/v1/daily-meeting-join-hook?s=${encodeURIComponent(secret)}`;
  }

  async createPrivateRoom(walkthroughId: string, expiresAt: Date): Promise<VideoRoom> {
    const name = roomNameForWalkthrough(walkthroughId);
    const hook = this.joinHookUrl();
    const properties: Record<string, unknown> = {
      exp: Math.floor(expiresAt.getTime() / 1000),
      enable_prejoin_ui: false,
      enable_recording: false,
      enable_transcription_storage: false,
    };
    if (hook) properties.meeting_join_hook = hook;
    await this.request('/rooms', { method:'POST', body:JSON.stringify({ name, privacy:'private', properties }) });
    return { roomName:name, roomUrl:`https://${this.domain}/${name}`, expiresAt:expiresAt.toISOString() };
  }

  async createMeetingToken(roomName: string, user: { id:string; name:string }, expiresAt: Date, isOwner:boolean): Promise<VideoJoin> {
    const data = await this.request('/meeting-tokens', { method:'POST', body:JSON.stringify({ properties:{ room_name:roomName, user_id:user.id, user_name:user.name.slice(0,80), is_owner:isOwner, exp:Math.floor(expiresAt.getTime()/1000) } }) });
    return { roomUrl:`https://${this.domain}/${roomName}`, token:data.token, expiresAt:expiresAt.toISOString() };
  }

  async deleteRoom(roomName:string) { await this.request(`/rooms/${encodeURIComponent(roomName)}`, { method:'DELETE' }); }
}

export function getVideoProvider(provider='daily'): VideoProvider {
  if (provider !== 'daily') throw new VideoProviderUnavailableError();
  return new DailyProvider();
}
