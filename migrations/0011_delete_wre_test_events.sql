-- One-time cleanup: Delete 'wre' test events (IDs 456, 457, 458) from org-1774974791043
-- These test events were visible to all roles (player, coach, parent, admin) and generated
-- hundreds of spurious reminder notifications for every new account in the organization.
-- This script is idempotent: steps 1 and 2 scope by organization_id directly so they
-- work even if the events rows are already deleted.

-- Step 1: Remove notification_recipients for notifications tied to these org-scoped events
DELETE FROM notification_recipients
WHERE notification_id IN (
  SELECT id FROM notifications
  WHERE related_event_id IN (456, 457, 458)
    AND organization_id = 'org-1774974791043'
);

-- Step 2: Remove the notifications themselves (scoped by org directly)
DELETE FROM notifications
WHERE related_event_id IN (456, 457, 458)
  AND organization_id = 'org-1774974791043';

-- Step 3: Remove the test events (scoped to the owning org for safety)
DELETE FROM events
WHERE id IN (456, 457, 458)
  AND organization_id = 'org-1774974791043';
