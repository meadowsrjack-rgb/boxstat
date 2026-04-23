-- Task #295 one-off backfill: link customer Chin Ting Yeh's payment row to
-- the real Stripe charge and clear the duplicate trial enrollment.
--
-- Stripe references (platform account, live mode):
--   invoice         in_1TPTYjDRfocrx1ETG1aiO2yL
--   payment intent  pi_3TPTYjDRfocrx1ET0ar9sLqU
--   charge          py_3TPTYjDRfocrx1ET0pQ3zY95
--   amount          $393.68
--   subscription    sub_1TPTYoDRfocrx1ETHfwmiwBZ
--
-- Run once. Both updates are idempotent: re-running them on already-fixed
-- rows changes nothing.

UPDATE payments
SET stripe_payment_id = 'pi_3TPTYjDRfocrx1ET0ar9sLqU',
    fulfillment_status = 'fulfilled'
WHERE id = 63
  AND (stripe_payment_id IS NULL OR stripe_payment_id = '');

UPDATE product_enrollments
SET status = 'expired'
WHERE id = 172
  AND status = 'active'
  AND source = 'admin';

-- Verification:
--   SELECT id, stripe_payment_id, status FROM payments WHERE id = 63;
--     -> stripe_payment_id = 'pi_3TPTYjDRfocrx1ET0ar9sLqU'
--   SELECT id, status FROM product_enrollments WHERE id IN (172, 173);
--     -> 172 expired, 173 active
