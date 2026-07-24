import { Badge } from '@/components/ui/badge';
import type { Database } from '@/integrations/supabase/types';

type Status = Database['public']['Enums']['protected_sale_status'];

const LABELS: Record<Status, string> = {
  initiated: 'Getting started',
  id_verified: 'ID verified',
  agreement_signed: 'Agreement signed',
  deposit_paid: 'Deposit received',
  balance_authorized: 'Balance authorized',
  handoff_scheduled: 'Handoff scheduled',
  funds_released: 'Funds released',
  completed: 'Completed',
  disputed: 'Disputed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const TONE: Record<Status, string> = {
  initiated: 'bg-white/10 text-white/80',
  id_verified: 'bg-blue-500/15 text-blue-300',
  agreement_signed: 'bg-blue-500/15 text-blue-300',
  deposit_paid: 'bg-orange-500/15 text-orange-300',
  balance_authorized: 'bg-orange-500/15 text-orange-300',
  handoff_scheduled: 'bg-orange-500/15 text-orange-300',
  funds_released: 'bg-emerald-500/15 text-emerald-300',
  completed: 'bg-emerald-500/15 text-emerald-300',
  disputed: 'bg-red-500/15 text-red-300',
  cancelled: 'bg-white/10 text-white/60',
  refunded: 'bg-white/10 text-white/60',
};

export function ProtectedSaleStatusBadge({ status }: { status: Status }) {
  return (
    <Badge className={`${TONE[status]} border-0 font-medium`}>
      {LABELS[status]}
    </Badge>
  );
}
