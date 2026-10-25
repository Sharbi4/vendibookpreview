/**
 * Screening label for one chat message (owner decision 2026-10-25). Every
 * member message is held until Vendibook relays a reviewed copy, so the sender
 * sees their own message as "In review" until the relayed copy replaces it.
 */
interface RelayStatusProps {
  message: { held_for_relay?: boolean; relayed_from?: string | null; relay_declined_at?: string | null };
  isOwn: boolean;
}

const RelayStatus = ({ message, isOwn }: RelayStatusProps) => {
  const label = message.relayed_from
    ? 'Relayed by Vendibook'
    : isOwn && message.held_for_relay
      ? message.relay_declined_at
        ? 'Not delivered'
        : 'In review'
      : null;
  if (!label) return null;
  return <span className="text-[11.5px] text-muted-foreground">{label}</span>;
};

export default RelayStatus;
