/**
 * Daily video provider client.
 *
 * All room and token properties come from the Vendibook room-profile model in
 * `videoMeetings.ts`. The Daily API key never leaves the server, and no
 * recording URL — permanent or temporary — is returned to a caller that has
 * not been authorised by the calling edge function.
 */
import {
  MeetingType,
  ROOM_PROFILE_VERSION,
  RoomProfile,
  roomProfileFor,
} from './videoMeetings.ts';

export type VideoRoom = { roomName: string; roomUrl: string; expiresAt: string; notBefore: string; created: boolean };
export type VideoJoin = { roomUrl: string; token: string; expiresAt: string };

export type TokenOptions = {
  /** Vendibook moderator (support/dispute only). Normal users are never owners. */
  moderator?: boolean;
  notBefore: Date;
  expiresAt: Date;
};

export class VideoProviderUnavailableError extends Error {
  constructor() { super('Native video is not configured yet. Scheduling remains available.'); }
}

/** Room name convention — also parsed by the post-call fallback route. */
export const roomNameForWalkthrough = (walkthroughId: string) => `vw-${walkthroughId}`;

export interface VideoProvider {
  ensureRoom(walkthroughId: string, profile: RoomProfile, nbf: Date, exp: Date): Promise<VideoRoom>;
  createMeetingToken(roomName: string, user: { id: string; name: string }, profile: RoomProfile, options: TokenOptions): Promise<VideoJoin>;
  startCloudRecording(roomName: string, maxDurationSeconds: number): Promise<{ recordingId: string | null; instanceId: string | null }>;
  recordingAccessLink(recordingId: string, ttlSeconds: number): Promise<{ url: string; expiresAt: string }>;
  deleteRoom(roomName: string): Promise<void>;
}

const secondsAt = (d: Date) => Math.floor(d.getTime() / 1000);

class DailyProvider implements VideoProvider {
  private key = Deno.env.get('DAILY_API_KEY');
  private domain = Deno.env.get('DAILY_DOMAIN');

  private assertConfigured() { if (!this.key || !this.domain) throw new VideoProviderUnavailableError(); }

  private async request(path: string, init: RequestInit, allowStatus: number[] = []) {
    this.assertConfigured();
    const response = await fetch(`https://api.daily.co/v1${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    if (!response.ok && !allowStatus.includes(response.status)) {
      // Never surface the provider body: it can echo request properties.
      throw new Error(`Video provider request failed (${response.status}).`);
    }
    if (response.status === 204) return {};
    return await response.json().catch(() => ({}));
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

  /** Deterministic room properties for a meeting type — the only builder. */
  private roomProperties(profile: RoomProfile, nbf: Date, exp: Date) {
    const properties: Record<string, unknown> = {
      nbf: secondsAt(nbf),
      exp: secondsAt(exp),
      eject_at_room_exp: true,
      max_participants: profile.maxParticipants,
      enable_prejoin_ui: false,
      enable_knocking: false,
      enable_chat: false,
      enable_breakout_rooms: false,
      enable_live_captions_ui: false,
      enable_transcription_storage: false,
      // Screen share stays off at the room level for every meeting type except
      // a support/dispute session, where only the moderator token enables it.
      enable_screenshare: profile.moderatorScreenShare,
      enable_recording: 'cloud',
      enable_people_ui: false,
      enable_network_ui: true,
    };
    const hook = this.joinHookUrl();
    if (hook) properties.meeting_join_hook = hook;
    return properties;
  }

  /**
   * Create the room, or PATCH the existing one when the meeting was
   * rescheduled. Existing `vw-*` rooms keep their name and URL forever.
   */
  async ensureRoom(walkthroughId: string, profile: RoomProfile, nbf: Date, exp: Date): Promise<VideoRoom> {
    const name = roomNameForWalkthrough(walkthroughId);
    const properties = this.roomProperties(profile, nbf, exp);
    const existing = await this.request(`/rooms/${encodeURIComponent(name)}`, { method: 'GET' }, [404]);
    const created = !existing || !(existing as { name?: string }).name;
    if (created) {
      await this.request('/rooms', { method: 'POST', body: JSON.stringify({ name, privacy: 'private', properties }) });
    } else {
      await this.request(`/rooms/${encodeURIComponent(name)}`, { method: 'POST', body: JSON.stringify({ properties }) });
    }
    return {
      roomName: name,
      roomUrl: `https://${this.domain}/${name}`,
      expiresAt: exp.toISOString(),
      notBefore: nbf.toISOString(),
      created,
    };
  }

  async createMeetingToken(
    roomName: string,
    user: { id: string; name: string },
    profile: RoomProfile,
    options: TokenOptions,
  ): Promise<VideoJoin> {
    const moderator = Boolean(options.moderator) && profile.meetingType === 'support_dispute';
    const properties: Record<string, unknown> = {
      room_name: roomName,
      user_id: user.id,
      user_name: user.name.slice(0, 80),
      nbf: secondsAt(options.notBefore),
      exp: secondsAt(options.expiresAt),
      eject_at_token_exp: true,
      // Normal participants are never owners: no admin controls, no recording
      // control, no screen share.
      is_owner: moderator,
      enable_screenshare: moderator && profile.moderatorScreenShare,
      enable_recording: moderator ? 'cloud' : false,
      start_video_off: false,
      start_audio_off: false,
      enable_recording_ui: false,
    };
    if (moderator) properties.permissions = { canAdmin: ['participants'] };
    const data = await this.request('/meeting-tokens', { method: 'POST', body: JSON.stringify({ properties }) });
    return {
      roomUrl: `https://${this.domain}/${roomName}`,
      token: (data as { token: string }).token,
      expiresAt: options.expiresAt.toISOString(),
    };
  }

  /** Server-controlled cloud recording. Participants can never start or stop it. */
  async startCloudRecording(roomName: string, maxDurationSeconds: number) {
    const data = await this.request(`/rooms/${encodeURIComponent(roomName)}/recordings/start`, {
      method: 'POST',
      body: JSON.stringify({ type: 'cloud', maxDuration: maxDurationSeconds }),
    });
    const body = data as { recordingId?: string; recording_id?: string; instanceId?: string; instance_id?: string };
    return {
      recordingId: body.recordingId ?? body.recording_id ?? null,
      instanceId: body.instanceId ?? body.instance_id ?? null,
    };
  }

  /**
   * Short-lived playback link. It is handed straight to an authorised viewer
   * and is never written to the database, a log, or a cache.
   */
  async recordingAccessLink(recordingId: string, ttlSeconds: number) {
    const data = await this.request(
      `/recordings/${encodeURIComponent(recordingId)}/access-link?valid_for_secs=${ttlSeconds}`,
      { method: 'GET' },
    );
    const body = data as { download_link?: string; link?: string; expires?: number };
    const url = body.download_link || body.link;
    if (!url) throw new Error('Video provider returned no access link.');
    return {
      url,
      expiresAt: new Date((body.expires ? body.expires * 1000 : Date.now() + ttlSeconds * 1000)).toISOString(),
    };
  }

  async deleteRoom(roomName: string) {
    await this.request(`/rooms/${encodeURIComponent(roomName)}`, { method: 'DELETE' }, [404]);
  }
}

export function getVideoProvider(provider = 'daily'): VideoProvider {
  if (provider !== 'daily') throw new VideoProviderUnavailableError();
  return new DailyProvider();
}

export { ROOM_PROFILE_VERSION, roomProfileFor };
export type { MeetingType, RoomProfile };
