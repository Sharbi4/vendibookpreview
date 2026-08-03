ALTER TABLE public.payout_actions ALTER COLUMN payable_id DROP NOT NULL;
ALTER TABLE public.payout_actions ADD COLUMN IF NOT EXISTS subject_user_id uuid;
CREATE INDEX IF NOT EXISTS idx_payout_actions_subject_user ON public.payout_actions (subject_user_id);
