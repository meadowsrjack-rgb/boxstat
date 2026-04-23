-- Task #289: Persist the gear size chosen at checkout on the payment row.
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "selected_size" varchar;
