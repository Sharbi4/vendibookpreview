export interface RegionMetric { state: string; supply: number; demand: number; signups: number }
export interface OperationsSnapshot {
  generated_at: string; days: number;
  metrics: { signups: number; previous_signups: number; published: number; active_supply: number; demand: number; paid_orders: number; gross_cents: number; subscribers: number; signup_requests: number; receipt_resends: number; feedback_received: number; feedback_pending: number };
  daily: { day: string; signups: number; published: number; demand: number }[];
  regions: RegionMetric[];
  email: { status: string; count: number }[];
  marketing: { status: string; count: number }[];
  sms: { status: string; count: number }[];
  sms_delivery?: { status: string; count: number }[];
  legacy_sms?: { status: string; count: number }[];
  recent_email: { id: string; template_name: string; status: string; created_at: string; recipient: string }[];
  recent_sms?: {id:string;template_id:string;send_status:string;delivery_status:string|null;failure_reason:string|null;created_at:string;recipient:string}[];
  feedback: { id: string; context_type: string; rating: number | null; nps: number | null; message: string | null; created_at: string; reviewed_at: string | null }[];
  inbound: { id: string; body: string; action_taken: string; created_at: string; user_id: string | null }[];
  orders: { id: string; reference: string; title: string; status: string; shipping_status: string | null; captured_at: string | null; gross_amount_cents: number; fulfillment_type: string | null }[];
  workflow: { enabled: boolean; delay_hours: number; sent: number; failed: number; suppressed: number; pending: number };
}
