# Automatic Pro Featured activation

Pro retains one included 30-day Featured Boost per paid billing period. Activation is automatic when an active, paid-through Pro membership is recorded or a listing becomes publicly eligible. It does not publish drafts or change billing.

`activate_pro_featured` grants a missing period credit (including Square memberships without a period start), then atomically records its redemption, a zero-dollar fulfilled purchase, the promotion, Featured listing fields, and an in-app notification. A member lock and credit row lock prevent repeat grants. Period-start and period-end uniqueness also protect against webhook retries. Anonymous/member direct execution is denied.

Selection prefers the newest eligible listing without active Featured placement. If all eligible listings are already Featured for at least the full Boost duration, the credit remains available. A renewal can extend a shorter placement to 30 days from activation, without stacking another 30 days onto already-covered time. The member can still manually select a listing for an available credit.

Only published, dated, non-deleted, listed, moderation-cleared, unsold listings qualify. Suspended accounts do not activate. Membership purchased before publication keeps its credit until an eligible listing is published. A fully consumed credit never boosts additional listings in the same period.

Deploy `20261030180000_auto_pro_featured.sql`. Then reconcile existing active Pro users with `activate_pro_featured(user_id)` using the service/administrator backend. Do not alter subscription dates or create payment records. Dennis's existing complimentary placement is preserved if it already covers the full duration.

Verification: `node scripts/test-auto-pro-featured.mjs` exercises the SQL in isolated PostgreSQL, including retries, renewal, publish timing, eligibility, failure rollback, and access restrictions.
