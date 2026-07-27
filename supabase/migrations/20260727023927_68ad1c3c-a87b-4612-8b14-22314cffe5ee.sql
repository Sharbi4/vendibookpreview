DELETE FROM host_subscriptions WHERE stripe_subscription_id LIKE 'sub_e2e_%';
DELETE FROM stripe_webhook_events WHERE stripe_event_id LIKE 'evt_e2e_%';