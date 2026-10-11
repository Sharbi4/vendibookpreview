/**
 * Vendibook meeting-type model and room profiles.
 *
 * Every live Vendibook video meeting has exactly one meeting type, and each
 * meeting type has one deterministic room profile. Nothing else in the code
 * base is allowed to invent room settings ad hoc: rooms and tokens are always
 * built from `roomProfileFor()`.
 *
 * Hard rules encoded here:
 *  - Every room is private. There is no public Vendibook room.
 *  - Chat, breakout rooms, live captions and transcription storage are OFF for
 *    every meeting type.
 *  - Screen share is OFF everywhere except a Vendibook support/dispute session,
 *    and there only for the Vendibook moderator.
 *  - Recording is cloud-only, server-started, and requires explicit consent
 *    from every required participant first.
 */

export const MEETING_TYPES = [
  'listing_walkthrough',
  'rental_walkthrough',
  'handoff_inspection',
  'support_dispute',
] as const;

export type MeetingType = (typeof MEETING_TYPES)[number];

/** Bump when the room/token property set materially changes. */
export const ROOM_PROFILE_VERSION = '2026-09-18-A';

export type RoomProfile = {
  meetingType: MeetingType;
  /** Human label used in UI and notifications. */
  label: string;
  maxParticipants: number;
  /** Minutes before the scheduled start that the room becomes joinable. */
  joinBeforeMinutes: number;
  /** Minutes after the scheduled end that the room closes. */
  joinAfterMinutes: number;
  /** Screen share is only ever available to a Vendibook moderator. */
  moderatorScreenShare: boolean;
  /** The only recording policy Vendibook operates. */
  recordingPolicy: 'required_explicit_consent';
  /** Extra minutes of recording headroom beyond the scheduled duration. */
  recordingBufferMinutes: number;
  /** Party labels shown in the call UI for this meeting type. */
  roles: { host: string; guest: string };
};

const PROFILES: Record<MeetingType, RoomProfile> = {
  listing_walkthrough: {
    meetingType: 'listing_walkthrough',
    label: 'Video walkthrough',
    maxParticipants: 4,
    joinBeforeMinutes: 15,
    joinAfterMinutes: 30,
    moderatorScreenShare: false,
    recordingPolicy: 'required_explicit_consent',
    recordingBufferMinutes: 15,
    roles: { host: 'seller', guest: 'buyer' },
  },
  rental_walkthrough: {
    meetingType: 'rental_walkthrough',
    label: 'Rental walkthrough',
    maxParticipants: 4,
    joinBeforeMinutes: 15,
    joinAfterMinutes: 30,
    moderatorScreenShare: false,
    recordingPolicy: 'required_explicit_consent',
    recordingBufferMinutes: 15,
    roles: { host: 'host', guest: 'renter' },
  },
  handoff_inspection: {
    meetingType: 'handoff_inspection',
    label: 'Handoff inspection',
    maxParticipants: 4,
    joinBeforeMinutes: 15,
    joinAfterMinutes: 45,
    moderatorScreenShare: false,
    recordingPolicy: 'required_explicit_consent',
    recordingBufferMinutes: 30,
    roles: { host: 'seller', guest: 'buyer' },
  },
  support_dispute: {
    meetingType: 'support_dispute',
    label: 'Vendibook support session',
    maxParticipants: 5,
    joinBeforeMinutes: 15,
    joinAfterMinutes: 30,
    moderatorScreenShare: true,
    recordingPolicy: 'required_explicit_consent',
    recordingBufferMinutes: 30,
    roles: { host: 'admin', guest: 'participant' },
  },
};

export function isMeetingType(value: unknown): value is MeetingType {
  return typeof value === 'string' && (MEETING_TYPES as readonly string[]).includes(value);
}

export function roomProfileFor(meetingType: unknown): RoomProfile {
  return PROFILES[isMeetingType(meetingType) ? meetingType : 'listing_walkthrough'];
}

/**
 * The real join window for a meeting. A token may never outlive the room, so
 * both are derived from the same pair of timestamps.
 */
export function meetingWindow(profile: RoomProfile, startsAt: string | Date, endsAt: string | Date) {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  return {
    nbf: new Date(start - profile.joinBeforeMinutes * 60_000),
    exp: new Date(end + profile.joinAfterMinutes * 60_000),
    scheduledMinutes: Math.max(1, Math.round((end - start) / 60_000)),
  };
}

/** Maximum cloud-recording duration in seconds for a meeting. */
export function recordingMaxDurationSeconds(profile: RoomProfile, startsAt: string | Date, endsAt: string | Date) {
  const { scheduledMinutes } = meetingWindow(profile, startsAt, endsAt);
  return (scheduledMinutes + profile.recordingBufferMinutes) * 60;
}

/** The two party roles for a meeting type, used for notifications and records. */
export function roleForUser(
  meetingType: unknown,
  walkthrough: { buyer_id: string; seller_id: string },
  userId: string,
): 'buyer' | 'seller' | 'renter' | 'host' | 'admin' | null {
  const profile = roomProfileFor(meetingType);
  if (userId === walkthrough.seller_id) return profile.roles.host === 'host' ? 'host' : 'seller';
  if (userId === walkthrough.buyer_id) return profile.roles.guest === 'renter' ? 'renter' : 'buyer';
  return null;
}

export const counterpartyRoleLabel = (role: string) =>
  role === 'seller' ? 'seller'
    : role === 'host' ? 'host'
      : role === 'renter' ? 'renter'
        : role === 'admin' ? 'Vendibook support'
          : 'buyer';
