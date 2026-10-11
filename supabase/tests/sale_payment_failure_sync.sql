-- Run against the migrated database. All fixtures and functions are temporary.
BEGIN;
CREATE TEMP TABLE sale_transactions (id uuid PRIMARY KEY, status text, last_error jsonb);
CREATE TEMP TABLE payment_records (id uuid PRIMARY KEY, sale_transaction_id uuid, provider text DEFAULT 'paypal', transaction_type text DEFAULT 'sale', payment_status text, last_error jsonb, created_at timestamptz DEFAULT now());
DO $$ BEGIN
  IF to_regprocedure('pg_temp.sync_sale_payment_attempt_status()') IS NULL THEN
    EXECUTE replace(pg_get_functiondef('public.sync_sale_payment_attempt_status()'::regprocedure), 'public.', 'pg_temp.');
  END IF;
END $$;
CREATE TRIGGER sync_test AFTER INSERT OR UPDATE OF payment_status ON payment_records FOR EACH ROW EXECUTE FUNCTION pg_temp.sync_sale_payment_attempt_status();
CREATE FUNCTION pg_temp.expect_sale(expected text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  IF (SELECT status FROM pg_temp.sale_transactions WHERE id='00000000-0000-0000-0000-000000000001') IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Expected sale status %', expected; END IF;
END $$;
INSERT INTO sale_transactions VALUES ('00000000-0000-0000-0000-000000000001','pending',NULL);
INSERT INTO payment_records(id,sale_transaction_id,payment_status,last_error) VALUES ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','declined','{"issue":"INSTRUMENT_DECLINED"}');
SELECT pg_temp.expect_sale('payment_failed');
UPDATE payment_records SET payment_status='declined';
SELECT pg_temp.expect_sale('payment_failed');
INSERT INTO payment_records(id,sale_transaction_id,payment_status,created_at) VALUES ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001','created',now()+interval '1 second');
SELECT pg_temp.expect_sale('pending');
UPDATE payment_records SET payment_status='failed' WHERE id='00000000-0000-0000-0000-000000000010';
SELECT pg_temp.expect_sale('pending');
UPDATE payment_records SET payment_status='pending' WHERE id='00000000-0000-0000-0000-000000000020';
SELECT pg_temp.expect_sale('pending');
UPDATE payment_records SET payment_status='declined' WHERE id='00000000-0000-0000-0000-000000000020';
SELECT pg_temp.expect_sale('payment_failed');
UPDATE payment_records SET payment_status='completed' WHERE id='00000000-0000-0000-0000-000000000010';
SELECT pg_temp.expect_sale('pending'); -- Trigger must NOT mark paid itself.
UPDATE payment_records SET payment_status='failed' WHERE id='00000000-0000-0000-0000-000000000020';
SELECT pg_temp.expect_sale('pending'); -- Verified completion outranks another attempt's failure.
UPDATE sale_transactions SET status='paid';
UPDATE payment_records SET payment_status='declined' WHERE id='00000000-0000-0000-0000-000000000020';
SELECT pg_temp.expect_sale('paid');
TRUNCATE payment_records;
UPDATE sale_transactions SET status='pending';
INSERT INTO payment_records(id,sale_transaction_id,payment_status,transaction_type) VALUES ('00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000001','declined','freight');
SELECT pg_temp.expect_sale('pending'); -- Add-on refusal must not change purchase payment.
UPDATE sale_transactions SET status='cancelled';
INSERT INTO payment_records(id,sale_transaction_id,payment_status) VALUES ('00000000-0000-0000-0000-000000000040','00000000-0000-0000-0000-000000000001','declined');
SELECT pg_temp.expect_sale('cancelled');
ROLLBACK;
SELECT '11 sale-payment status regression checks passed; fixtures rolled back' AS result;
