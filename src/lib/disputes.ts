export const ISSUE_TYPES = [
  { value: 'item_not_received', label: 'Item not received' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'damaged_in_transit', label: 'Damaged on delivery or in transit' },
  { value: 'seller_unresponsive', label: 'Seller unresponsive' },
  { value: 'buyer_unresponsive', label: 'Buyer unresponsive' },
  { value: 'walkthrough_never_happened', label: 'Walkthrough never happened' },
  { value: 'agreement_not_signed', label: 'Agreement not signed' },
  { value: 'other', label: 'Something else' },
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number]['value'];

export const issueLabel = (value?: string | null) =>
  ISSUE_TYPES.find((i) => i.value === value)?.label ?? 'Issue reported';

export const CASE_STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  awaiting_buyer: 'Waiting on buyer',
  awaiting_seller: 'Waiting on seller',
  awaiting_admin: 'With Vendibook',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const CASE_OUTCOME_LABEL: Record<string, string> = {
  resolved_between_parties: 'Resolved between the parties',
  refunded_full: 'Refunded in full',
  refunded_partial: 'Refunded in part',
  released_to_seller: 'Released to the seller',
  closed_no_action: 'Closed with no action',
};

export const isCaseOpen = (status?: string | null) =>
  !!status && !['resolved', 'closed'].includes(status);
