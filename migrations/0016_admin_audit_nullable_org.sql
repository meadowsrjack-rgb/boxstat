-- Task #353 follow-up: orphan auto-cleanups can occur for users with no
-- organization (e.g. abandoned signup flows). We still need to record an
-- audit row for them so the cleanup is observable, so make
-- organization_id nullable on admin_removal_audits.
ALTER TABLE "admin_removal_audits" ALTER COLUMN "organization_id" DROP NOT NULL;
