/**
 * Client mirror of the server room-profile model in
 * `supabase/functions/_shared/videoMeetings.ts`.
 *
 * Only labels, join windows and on-call checklists live here. Room and token
 * settings are decided entirely on the server — the browser never proposes them.
 */
export const MEETING_TYPES = [
  'listing_walkthrough',
  'rental_walkthrough',
  'handoff_inspection',
  'support_dispute',
] as const;

export type MeetingType = (typeof MEETING_TYPES)[number];

export type MeetingProfile = {
  label: string;
  /** Short line under the title on the walkthrough page. */
  blurb: string;
  joinBeforeMinutes: number;
  joinAfterMinutes: number;
  /** Party labels for this meeting type. */
  hostLabel: string;
  guestLabel: string;
  checklist: string[];
};

const PROFILES: Record<MeetingType, MeetingProfile> = {
  listing_walkthrough: {
    label: 'Video walkthrough',
    blurb: 'A private live video walkthrough inside Vendibook.',
    joinBeforeMinutes: 15,
    joinAfterMinutes: 30,
    hostLabel: 'Seller',
    guestLabel: 'Buyer',
    checklist: [
      'Exterior, body and roof',
      'Kitchen equipment running',
      'Generator and electrical',
      'Plumbing, tanks and water system',
      'Engine, chassis and tires',
      'VIN, title and documentation',
    ],
  },
  rental_walkthrough: {
    label: 'Rental walkthrough',
    blurb: 'A private live video walkthrough of the rental before you book.',
    joinBeforeMinutes: 15,
    joinAfterMinutes: 30,
    hostLabel: 'Host',
    guestLabel: 'Renter',
    checklist: [
      'Layout and usable space',
      'Equipment included with the rental',
      'Power, water and utilities',
      'Cleaning, storage and waste',
      'Parking and site access',
      'House rules and hours',
    ],
  },
  handoff_inspection: {
    label: 'Handoff inspection',
    blurb: 'A live video record of the handoff between both parties.',
    joinBeforeMinutes: 15,
    joinAfterMinutes: 45,
    hostLabel: 'Seller',
    guestLabel: 'Buyer',
    checklist: [
      'Confirm the item matches the listing',
      'Walk the exterior and interior on camera',
      'Test the key equipment together',
      'Show any damage or missing item',
      'Confirm keys, documents and accessories',
      'Confirm pickup or delivery details',
    ],
  },
  support_dispute: {
    label: 'Vendibook support session',
    blurb: 'A private session with Vendibook Support about this transaction.',
    joinBeforeMinutes: 15,
    joinAfterMinutes: 30,
    hostLabel: 'Vendibook Support',
    guestLabel: 'Participant',
    checklist: [
      'Describe what happened, in order',
      'Confirm the order and dates on record',
      'Show any photos, messages or documents',
      'Agree the next step and who does it',
    ],
  },
};

export const meetingProfile = (value?: string | null): MeetingProfile =>
  PROFILES[(MEETING_TYPES as readonly string[]).includes(value || '') ? (value as MeetingType) : 'listing_walkthrough'];
